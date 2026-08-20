import numpy as np
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import chatbot_backend.config as config

# In-memory database of document indexes
# Structure: { jobId: { "chunks": [{"text": str, "source": str}], "embeddings": np.ndarray } }
document_indexes: Dict[str, Dict[str, Any]] = {}

class RAGEngine:
    def __init__(self, api_key: Optional[str] = None):
        # Local semantic embedding model (runs on CPU, no API key needed)
        print("[RAG] Loading local embedding model (all-MiniLM-L6-v2)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.client = self.model  # keep truthy so downstream "if not self.client" checks pass
        self.embedding_model = "all-MiniLM-L6-v2"
        print("[RAG] Embedding model loaded successfully.")

    def ingest_report(self, job_id: str, report_data: Dict[str, Any]) -> bool:
        """
        Parses report JSON, splits it into semantic chunks, generates embeddings,
        and saves them in the in-memory document store.
        """
        chunks = self.extract_chunks(report_data)
        if not chunks:
            print("[RAG] Ingestion failed: No text chunks extracted from report.")
            return False

        try:
            chunk_texts = [chunk["text"] for chunk in chunks]

            print(f"[RAG] Generating embeddings for {len(chunk_texts)} chunks...")
            embeddings_array = self.model.encode(
                chunk_texts,
                convert_to_numpy=True,
                normalize_embeddings=True
            ).astype(np.float32)

            document_indexes[job_id] = {
                "chunks": chunks,
                "embeddings": embeddings_array
            }
            print(f"[RAG] Successfully indexed job {job_id} with {len(chunks)} chunks.")
            return True

        except Exception as e:
            print(f"[RAG] Unexpected error during embedding: {e}")
            return False

    def extract_chunks(self, report: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Parses structured fields in the report and creates logical context chunks.
        """
        chunks = []

        sections = {
            "overview": "Company Overview",
            "businessModel": "Business Model & Monetization",
            "technologyDetail": "Technology Stack & Core Systems",
            "financialsDetail": "Financial Health & Analysis",
            "leadershipDetail": "Executive Leadership Profile",
            "competitionDetail": "Competitor Landscape & Positioning",
            "strategicInitiativesDetail": "Corporate Goals & Strategic Initiatives"
        }

        for field, section_name in sections.items():
            content = report.get(field)
            if content and isinstance(content, str):
                paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
                for p in paragraphs:
                    if len(p) > 20:
                        chunks.append({
                            "text": p,
                            "source": section_name
                        })

        tech_list = report.get("techStack", [])
        if tech_list and isinstance(tech_list, list):
            tech_str = ", ".join(tech_list)
            chunks.append({
                "text": f"Identified tools, systems, and developer frameworks in use: {tech_str}.",
                "source": "Technology Stack & Core Systems"
            })

        competitor_list = report.get("competitors", [])
        if competitor_list and isinstance(competitor_list, list):
            comp_str = ", ".join(competitor_list)
            chunks.append({
                "text": f"Primary direct competitors and industry market peers: {comp_str}.",
                "source": "Competitor Landscape & Positioning"
            })

        leadership_list = report.get("leadership", [])
        if leadership_list and isinstance(leadership_list, list):
            leaders_str = "; ".join([f"{l.get('name')} ({l.get('role')})" for l in leadership_list if isinstance(l, dict)])
            chunks.append({
                "text": f"Key executive officers and board composition: {leaders_str}.",
                "source": "Executive Leadership Profile"
            })

        initiatives_list = report.get("strategicInitiatives", [])
        if initiatives_list and isinstance(initiatives_list, list):
            for idx, init in enumerate(initiatives_list):
                if isinstance(init, dict):
                    title = init.get("title", "Strategic Milestone")
                    desc = init.get("description", "")
                    chunks.append({
                        "text": f"Strategic Initiative #{idx+1}: {title} - {desc}",
                        "source": "Corporate Goals & Strategic Initiatives"
                    })

        news_list = report.get("recentNews", [])
        if news_list and isinstance(news_list, list):
            for news in news_list:
                if isinstance(news, dict):
                    title = news.get("title", "")
                    src = news.get("source", "")
                    date = news.get("date", "")
                    chunks.append({
                        "text": f"Recent Corporate Event ({date}): {title} (Source: {src})",
                        "source": "Recent Grounded News"
                    })

        return chunks

    def retrieve_relevant_context(
        self, job_id: str, query: str, min_k: int = 2, max_k: int = 5, threshold: float = 0.30
    ) -> List[Dict[str, str]]:
        """
        Retrieves relevant chunks dynamically based on similarity score.
        Includes every chunk scoring above `threshold`, bounded between min_k and max_k,
        so narrow questions get few, focused chunks and broad questions get more coverage.
        """
        if job_id not in document_indexes:
            print(f"[RAG] Index not found for jobId {job_id}.")
            return []

        index = document_indexes[job_id]
        chunks = index["chunks"]
        embeddings_matrix = index["embeddings"]

        try:
            query_vector = self.model.encode(
                query, convert_to_numpy=True, normalize_embeddings=True
            ).astype(np.float32)

            similarities = np.dot(embeddings_matrix, query_vector)

            ranked_indices = np.argsort(similarities)[::-1]

            selected = [idx for idx in ranked_indices if similarities[idx] >= threshold][:max_k]

            if len(selected) < min_k:
                selected = ranked_indices[:min_k].tolist()

            retrieved_chunks = []
            print(f"[RAG] Dynamic retrieval for query '{query}' — {len(selected)} chunks selected:")
            for idx in selected:
                score = float(similarities[idx])
                print(f" - [{chunks[idx]['source']}] Score: {score:.4f}")
                retrieved_chunks.append({
                    "text": chunks[idx]["text"],
                    "source": chunks[idx]["source"],
                    "score": score
                })

            return retrieved_chunks

        except Exception as e:
            print(f"[RAG] Error during similarity retrieval: {e}")
            return []