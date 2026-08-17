from typing import List, Dict, Any, Optional
import groq
from groq import Groq
import chatbot_backend.config as config

# Session history database: { jobId: [{"role": "user" | "model", "text": str}] }
session_memories: Dict[str, List[Dict[str, str]]] = {}

class LLMService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.GROQ_API_KEY
        self.generation_model = config.GROQ_MODEL or "llama-3.3-70b-versatile"
        
        # Initialize Groq client
        self.client = None
        if self.api_key:
            base_url = config.GROQ_BASE_URL
            self.client = Groq(api_key=self.api_key, base_url=base_url) if base_url else Groq(api_key=self.api_key)

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
        Builds a grounded prompt from retrieved chunks, queries Groq,
        manages conversation memory, and returns the response with citations.
        """
        if not self.client:
            return {
                "answer": "System Error: Groq Client is not configured on the server. Please check the API key.",
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
        
        # Prepare messages array for Groq API
        messages = [
            {"role": "system", "content": system_instruction}
        ]
        
        # Add conversation history
        for msg in history:
            role = msg["role"]
            # Map "model" to "assistant" for Groq API format compatibility
            groq_role = "assistant" if role == "model" else role
            messages.append({"role": groq_role, "content": msg["text"]})

        # Add the current query formatted with context wrapper
        user_prompt = (
            f"Context Extracted from Intelligence Report:\n"
            f"==================================================\n"
            f"{context_text}\n"
            f"==================================================\n\n"
            f"User Question: {query}"
        )
        messages.append({"role": "user", "content": user_prompt})

        try:
            print(f"[LLM] Querying Groq ({self.generation_model}) for jobId {job_id}...")
            response = self.client.chat.completions.create(
                model=self.generation_model,
                messages=messages,
                temperature=0.1,  # Low temperature for precise grounding
            )

            answer = response.choices[0].message.content or "I couldn't generate a response."
            
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

        except groq.AuthenticationError as e:
            print(f"[LLM] Groq Authentication Error (Invalid API Key): {e}")
            return {
                "answer": "Authentication Error: The configured Groq API Key is invalid. Please update your environment settings.",
                "citations": []
            }
        except groq.RateLimitError as e:
            print(f"[LLM] Groq Rate Limit Error: {e}")
            return {
                "answer": "Rate Limit Error: Too many requests. Please wait a moment before trying again.",
                "citations": []
            }
        except groq.APITimeoutError as e:
            print(f"[LLM] Groq API Timeout Error: {e}")
            return {
                "answer": "Timeout Error: The request to Groq API timed out. Please try again.",
                "citations": []
            }
        except groq.APIConnectionError as e:
            print(f"[LLM] Groq API Connection Error (Network Failure): {e}")
            return {
                "answer": "Network Error: Failed to connect to Groq API servers. Please check your network connection.",
                "citations": []
            }
        except groq.APIStatusError as e:
            print(f"[LLM] Groq API Status Error: {e}")
            return {
                "answer": f"API Error: Groq server returned an error status ({e.status_code}).",
                "citations": []
            }
        except Exception as e:
            print(f"[LLM] Unexpected error during content generation: {e}")
            return {
                "answer": f"API Error: Failed to generate response from LLM server ({str(e)}).",
                "citations": []
            }

