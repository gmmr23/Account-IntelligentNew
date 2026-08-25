import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import uvicorn
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List

import chatbot_backend.config as config
from chatbot_backend.services.llm_service import LLMService

app = FastAPI(
    title="Account Intelligence Summary API",
    description="Text and section intelligence summarization server.",
    version="1.0.0"
)

# Enable CORS for local cross-port requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
llm_service = LLMService()

@app.on_event("startup")
def startup_event():
    print("[Startup] Validating Gemini API configuration...")
    if not config.GEMINI_API_KEY:
        print("[Startup] Warning: GEMINI_API_KEY is not defined in the environment. Summarizer will fail.")
        return
        
    try:
        from google import genai
        client = genai.Client(api_key=config.GEMINI_API_KEY)
        client.models.get(model=config.GEMINI_MODEL)
        print(f"[Startup] Gemini API client successfully validated and online. Model configured: {config.GEMINI_MODEL}")
    except Exception as e:
        print(f"[Startup] Warning: Failed to connect to Gemini API on startup: {e}")

@app.get("/")
def read_root():
    return {"status": "online", "service": "Account Intelligence Summary Service"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

class SummarizeSectionRequest(BaseModel):
    sectionName: str
    textContent: str

@app.post("/summarize-section")
def summarize_section(payload: SummarizeSectionRequest):
    highlights = llm_service.summarize_section_highlights(payload.sectionName, payload.textContent)
    return {"highlights": highlights}

@app.post("/summarize-text")
def summarize_text(payload: SummarizeSectionRequest):
    summary = llm_service.summarize_grand_text(payload.sectionName, payload.textContent)
    return {"summary": summary}

if __name__ == "__main__":
    # Start server programmatically if run directly
    print(f"Starting chatbot backend server on port {config.PORT}...")
    uvicorn.run(app, host="127.0.0.1", port=config.PORT)
