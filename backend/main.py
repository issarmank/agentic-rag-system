import os, json, tempfile, asyncio, traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import get_llm
from retriever import search_with_scores
from ingest import ingest_pdf

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

_llm = get_llm()

# Cosine similarity threshold — below this score we consider the question out of scope.
RELEVANCE_THRESHOLD = 0.30

PROMPT = """\
You are a precise document assistant. Your ONLY source of information is the document excerpts below.

STRICT RULES:
- Answer exclusively using the DOCUMENT EXCERPTS provided.
- If the answer is not found in the excerpts, say exactly:
  "This topic isn't covered in the uploaded document. Please ask something related to its content."
- Never draw on external knowledge or training data.
- Never guess, infer, or fill gaps from memory.

FORMAT (follow this for every response):
- Lead with a direct, one-sentence answer.
- Use **bold** for key terms.
- Use bullet points for lists or multiple points.
- Use numbered steps for processes or sequences.
- Keep paragraphs short (2–3 sentences max).
- If quoting the document, use "quotation marks" and note the page.

DOCUMENT EXCERPTS:
{context}

QUESTION: {question}

ANSWER:"""


class ChatRequest(BaseModel):
    message: str


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@app.post("/chat")
async def chat(req: ChatRequest):
    async def generate():
        # --- retrieve ---
        try:
            docs_with_scores = await asyncio.to_thread(search_with_scores, req.message, 4)
        except Exception as e:
            yield _sse({"type": "token", "content": f"Search error: {e}"})
            yield _sse({"type": "done", "sources": [], "grounded": False})
            return

        if not docs_with_scores:
            yield _sse({"type": "token", "content": "No document has been uploaded yet. Please attach a PDF using the paperclip button."})
            yield _sse({"type": "done", "sources": [], "grounded": False})
            return

        max_score = max(score for _, score in docs_with_scores)

        if max_score < RELEVANCE_THRESHOLD:
            yield _sse({"type": "token", "content": "This topic isn't covered in the uploaded document. Please ask something related to its content."})
            yield _sse({"type": "done", "sources": [], "grounded": False})
            return

        # --- build context ---
        relevant_docs = [doc for doc, _ in docs_with_scores]
        context = "\n\n---\n\n".join(
            f"[Page {doc.metadata.get('page', '?')}]\n{doc.page_content}"
            for doc in relevant_docs
        )
        sources = [
            {"page": doc.metadata.get("page", "?"), "snippet": doc.page_content[:200]}
            for doc in relevant_docs
        ]
        prompt = PROMPT.format(context=context, question=req.message)

        # --- stream LLM tokens ---
        try:
            async for chunk in _llm.astream(prompt):
                if chunk.content:
                    yield _sse({"type": "token", "content": chunk.content})
        except Exception as e:
            yield _sse({"type": "token", "content": f"\n\n[Error while generating: {e}]"})

        yield _sse({"type": "done", "sources": sources, "grounded": True})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDFs supported")
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
