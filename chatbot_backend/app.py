import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import uvicorn
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List

import chatbot_backend.config as config
from chatbot_backend.services.rag_engine import RAGEngine
from chatbot_backend.services.llm_service import LLMService

app = FastAPI(
    title="Account Intelligence Chatbot API",
    description="RAG-powered conversational assistant to query company intelligence reports.",
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
rag_engine = RAGEngine()
llm_service = LLMService()

@app.on_event("startup")
def startup_event():
    print("[Startup] Validating Gemini API configuration...")
    if not config.GEMINI_API_KEY:
        print("[Startup] Warning: GEMINI_API_KEY is not defined in the environment. Chatbot inference will fail.")
        return
        
    try:
        from google import genai
        client = genai.Client(api_key=config.GEMINI_API_KEY)
        client.models.get(model=config.GEMINI_MODEL)
        print(f"[Startup] Gemini API client successfully validated and online. Model configured: {config.GEMINI_MODEL}")
    except Exception as e:
        print(f"[Startup] Warning: Failed to connect to Gemini API on startup: {e}")

# Pydantic Schemas
class IngestRequest(BaseModel):
    jobId: str
    report: Dict[str, Any]

class QueryRequest(BaseModel):
    jobId: str
    query: str

class QueryResponse(BaseModel):
    answer: str
    citations: List[str]

class StatusResponse(BaseModel):
    success: bool
    message: str

@app.get("/")
def read_root():
    return {"status": "online", "service": "Account Intelligence Chatbot Service"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/ingest", response_model=StatusResponse)
def ingest_report(payload: IngestRequest):
    print(f"[API] Ingestion requested for job: {payload.jobId}")
    try:
        success = rag_engine.ingest_report(payload.jobId, payload.report)
        if not success:
            raise HTTPException(
                status_code=500, 
                detail="Failed to index document report locally."
            )
        return {"success": True, "message": f"Successfully indexed report for job {payload.jobId}."}
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        print("[API] Exception during ingestion:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Chatbot Ingestion Service Error: {str(e)}"
        )

@app.post("/query", response_model=QueryResponse)
def query_report(payload: QueryRequest):
    print(f"[API] Query received for job {payload.jobId}: '{payload.query}'")
    
    retrieved_chunks = rag_engine.retrieve_relevant_context(payload.jobId, payload.query)
    
    if not retrieved_chunks:
        return {
            "answer": "This report has not been ingested by the chatbot assistant yet, or contains empty details.",
            "citations": []
        }

    try:
      result = llm_service.generate_grounded_answer(payload.jobId, payload.query, retrieved_chunks)
      return result
    except Exception as e:
      import traceback
      print("[API] Exception during query generation:")
      traceback.print_exc()
      raise HTTPException(status_code=500, detail=f"Chatbot Query Service Error: {str(e)}")

@app.delete("/session/{job_id}", response_model=StatusResponse)
def clear_session(job_id: str):
    print(f"[API] Resetting memory for job: {job_id}")
    llm_service.clear_session(job_id)
    return {"success": True, "message": f"Session memory cleared for job {job_id}."}

class SummarizeSectionRequest(BaseModel):
    sectionName: str
    textContent: str

@app.post("/summarize-section")
def summarize_section(payload: SummarizeSectionRequest):
    highlights = llm_service.summarize_section_highlights(payload.sectionName, payload.textContent)
    return {"highlights": highlights}

if __name__ == "__main__":
    # Start server programmatically if run directly
    print(f"Starting chatbot backend server on port {config.PORT}...")
    uvicorn.run(app, host="127.0.0.1", port=config.PORT)
