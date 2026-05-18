import os, tempfile
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import build_agent
from ingest import ingest_pdf
from retriever import check_relevance

app = FastAPI()

_origins = ["http://localhost:3000"]
if frontend_url := os.getenv("FRONTEND_URL"):
    _origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# One agent per server process (holds session memory)
agent = build_agent()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        # Call the agent which will retrieve and process
        result = agent({"question": req.message})
        
        # Get the retrieved documents
        retrieved_docs = result.get("source_documents", [])
        
        # Check if documents are actually relevant (prevents hallucination)
        relevance = check_relevance(req.message, retrieved_docs)
        
        # Check if LLM response indicates it couldn't answer from the document
        answer_lower = result["answer"].lower()
        is_grounded = relevance["is_relevant"] and not any(phrase in answer_lower for phrase in [
            "cannot answer this question",
            "does not contain information",
            "not in the document",
            "no information about"
        ])
        
        sources = [
            {
                "page": doc.metadata.get("page", "?"),
                "snippet": doc.page_content[:200],
            }
            for doc in retrieved_docs
        ]
        
        return {
            "answer": result["answer"],
            "sources": sources,
            "grounded": is_grounded,
            "relevance_score": relevance["max_score"]
        }
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDFs supported")
    # Save upload to a temp file, then ingest
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    count = ingest_pdf(tmp_path)
    os.unlink(tmp_path)
    return {"message": f"Ingested {count} chunks successfully"}

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}