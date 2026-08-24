from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError
import chatbot_backend.config as config

# Session history database: { jobId: [{"role": "user" | "model", "text": str}] }
session_memories: Dict[str, List[Dict[str, str]]] = {}

class LLMService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.GEMINI_API_KEY
        self.generation_model = config.GEMINI_MODEL or "gemini-2.5-flash"
        
        # Initialize Gemini client
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)

    def get_session_history(self, job_id: str) -> List[Dict[str, str]]:
        if job_id not in session_memories:
            session_memories[job_id] = []
        return session_memories[job_id]

    def clear_session(self, job_id: str):
        if job_id in session_memories:
            session_memories[job_id] = []
            print(f"[LLM] Cleared conversation memory for jobId {job_id}.")

    def generate_grounded_answer(
        self, job_id: str, query: str, retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Builds a grounded prompt from retrieved chunks, queries Google Gemini,
        manages conversation memory, and returns the response with citations.
        """
        if not self.client:
            return {
                "answer": "System Error: Gemini Client is not configured on the server. Please check the API key.",
                "citations": []
            }

        # 1. Compile context text and list of unique sources
        context_parts = []
        citations_set = set()

        for idx, chunk in enumerate(retrieved_chunks):
            context_parts.append(f"--- Context Segment {idx+1} [Source: {chunk['source']}] ---\n{chunk['text']}")
            citations_set.add(chunk["source"])

        context_text = "\n\n".join(context_parts)
        citations = list(citations_set)

        # 2. Strict grounding instructions
        system_instruction = (
            "You are an Account Intelligence Assistant. Your task is to answer questions about the target company.\n"
            "You MUST answer the question using ONLY the supplied report context segments. Follow these strict rules:\n"
            "1. Ground your answer completely and literally in the context. Do not use external knowledge, "
            "do not guess, and do not infer facts that are not directly and explicitly stated.\n"
            "2. If the context does not contain a DIRECT, EXPLICIT answer to the query, reply with EXACTLY this "
            "and nothing else:\n"
            "   \"I couldn't find that information in this report.\"\n"
            "3. Do NOT reason about what 'might be possible', what a company 'may have', or what could 'likely' "
            "be true based on loosely related information. Mentioning a related topic (e.g. a technology "
            "integration, a partnership, a market segment) is NOT the same as answering the actual question "
            "(e.g. job openings, pricing, headcount). If the specific fact asked for is absent, treat it as "
            "absent — do not bridge the gap with speculation.\n"
            "4. Never construct hypothetical answers, examples, or illustrative possibilities (e.g. 'such as a "
            "Salesforce Developer role') that are not verbatim present in the context.\n"
            "5. Structure responses professionally using Markdown (use bold text, headers, and lists where "
            "appropriate) — but ONLY when you do have a real, grounded answer.\n"
            "6. Include section references or citations (e.g., [Source: Section Name]) whenever possible.\n"
            "7. Never extrapolate or speculate on financial figures, job openings, headcount, or technology "
            "systems unless explicitly and directly stated in the context."
        )

        # 3. Retrieve and structure conversation memory
        history = self.get_session_history(job_id)
        
        # Prepare contents list for Gemini API
        contents: List[types.Content] = []
        
        # Add conversation history (bounded to last 4 messages to prevent token limits)
        recent_history = history[-4:]
        for msg in recent_history:
            role = msg["role"]
            gemini_role = "model" if role == "model" else "user"
            content_text = msg["text"]
            if gemini_role == "model" and len(content_text) > 400:
                content_text = content_text[:400] + "..."
            contents.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part.from_text(text=content_text)]
                )
            )

        # Add current query formatted with context wrapper
        user_prompt = (
            f"Context Extracted from Intelligence Report:\n"
            f"==================================================\n"
            f"{context_text}\n"
            f"==================================================\n\n"
            f"User Question: {query}"
        )
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_prompt)]
            )
        )

        try:
            print(f"[LLM] Querying Gemini ({self.generation_model}) for jobId {job_id}...")
            response = self.client.models.generate_content(
                model=self.generation_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.1,  # Low temperature for precise grounding
                ),
            )

            answer = response.text or "I couldn't generate a response."
            
            # If the model states it can't find information, return empty citations
            is_unsupported = "couldn't find" in answer.lower() or "not find" in answer.lower() or "unsupported" in answer.lower()
            active_citations = [] if is_unsupported else citations

            # 4. Save to conversation memory
            # Save the clean user query (without the injected context block) to history
            history.append({"role": "user", "text": query})
            # Save the generated model answer to history
            history.append({"role": "model", "text": answer})

            return {
                "answer": answer,
                "citations": active_citations
            }

        except APIError as e:
            print(f"[LLM] Gemini API Error: {e}")
            if e.code == 429:
                return {
                    "answer": "Rate Limit Error: Too many requests to Gemini API. Please wait a moment before trying again.",
                    "citations": []
                }
            elif e.code == 400 or e.code == 413:
                self.clear_session(job_id)
                return {
                    "answer": "Request Payload Too Large or Invalid: Memory has been reset — please try asking your question again.",
                    "citations": []
                }
            return {
                "answer": f"API Error: Gemini server returned an error status ({e.code}): {e.message}",
                "citations": []
            }
        except Exception as e:
            print(f"[LLM] Unexpected error during content generation: {e}")
            return {
                "answer": f"API Error: Failed to generate response from LLM server ({str(e)}).",
                "citations": []
            }

    def summarize_section_highlights(self, section_name: str, text_content: str) -> List[str]:
        """
        Uses Gemini to generate 3 to 5 concise executive bullet point highlights
        for a specific section based ONLY on the provided text.
        """
        if not self.client or not text_content or len(text_content.strip()) < 20:
            return []

        prompt = (
            f"You are an executive research analyst. Summarize the following '{section_name}' text into "
            f"3 to 5 clear, high-impact bullet points representing key takeaways for enterprise leadership.\n"
            f"Return ONLY the bullet points, one per line starting with '- ' without any intro or conversational text.\n\n"
            f"Text:\n{text_content[:4000]}"
        )

        try:
            response = self.client.models.generate_content(
                model=self.generation_model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2)
            )
            lines = (response.text or "").strip().split("\n")
            bullets = [
                l.strip().lstrip("-*• ").strip()
                for l in lines
                if l.strip() and len(l.strip().lstrip("-*• ").strip()) > 10
            ]
            return bullets[:5]
        except Exception as e:
            print(f"[LLM] Error generating section highlights for {section_name}: {e}")
            return []

