import os, tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import build_agent
from ingest import ingest_pdf

app = FastAPI()

# Allow Next.js dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
        result = agent({"question": req.message})
        sources = [
            {
                "page": doc.metadata.get("page", "?"),
                "snippet": doc.page_content[:200],
            }
            for doc in result["source_documents"]
        ]
        return {"answer": result["answer"], "sources": sources}
    except Exception as e:
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

@app.get("/health")
def health():
    return {"status": "ok"}