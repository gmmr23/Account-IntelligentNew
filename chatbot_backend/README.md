# RAG Chatbot Backend (Python)

This service provides a Retrieval-Augmented Generation (RAG) conversational agent interface utilizing FastAPI and the Groq SDK. It chunks company intelligence reports, performs semantic search to retrieve relevant context in memory, and uses Groq's LLM to answer user questions using strict grounding rules.

## Setup Instructions

### 1. Prerequisites
Ensure you have Python 3.9+ installed on your system.

### 2. Install Dependencies
Navigate to the root project or the `chatbot_backend` folder, and install the required packages:

```bash
pip install -r chatbot_backend/requirements.txt
```

### 3. Environment Config
The service automatically loads environment variables from the root `.env` file. Ensure that `GROQ_API_KEY` is set correctly:

```ini
GROQ_API_KEY="your-groq-api-key-here"
GROQ_MODEL="llama-3.3-70b-versatile"
```

### 4. Run the API Server
Start the development server using Uvicorn:

```bash
python chatbot_backend/app.py
# or
uvicorn chatbot_backend.app:app --reload --port 8000
```

The service will run locally at `http://127.0.0.1:8000`.

---

## API Endpoints

### 1. Ingest Report
* **Path**: `POST /ingest`
* **Body**:
  ```json
  {
    "jobId": "h-abc123xyz",
    "report": { ... } // Full ResearchReport object
  }
  ```

### 2. Query Chatbot
* **Path**: `POST /query`
* **Body**:
  ```json
  {
    "jobId": "h-abc123xyz",
    "query": "What are the company's tech stacks?"
  }
  ```
* **Response**:
  ```json
  {
    "answer": "The company uses React, TypeScript, and AWS...",
    "citations": ["Technology Stack & Core Systems"]
  }
  ```

### 3. Clear Chat Session
* **Path**: `DELETE /session/{jobId}`
* **Response**:
  ```json
  {
    "success": true,
    "message": "Session memory cleared."
  }
  ```
