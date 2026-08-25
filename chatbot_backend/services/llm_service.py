from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError
import chatbot_backend.config as config

class LLMService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.GEMINI_API_KEY
        self.generation_model = config.GEMINI_MODEL or "gemini-2.5-flash"
        
        # Initialize Gemini client
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)

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

    def summarize_grand_text(self, section_name: str, text_content: str) -> str:
        """
        Uses Gemini to synthesize long/grand text for a section into a single,
        focused, professional 2-3 sentence executive paragraph.
        """
        if not self.client or not text_content or len(text_content.strip()) < 30:
            return text_content

        prompt = (
            f"You are an executive research intelligence analyst. Synthesize and condense the following grand text for '{section_name}' "
            f"into a single, clean, highly readable 2-3 sentence executive summary paragraph for enterprise leadership.\n"
            f"Do NOT use bullet points, list items, or conversational filler. Return ONLY the executive paragraph.\n\n"
            f"Grand Text:\n{text_content[:4000]}"
        )

        try:
            response = self.client.models.generate_content(
                model=self.generation_model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2)
            )
            summary = (response.text or "").strip()
            return summary if len(summary) > 20 else text_content
        except Exception as e:
            print(f"[LLM] Error generating executive paragraph summary for {section_name}: {e}")
            return text_content

