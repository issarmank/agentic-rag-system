import os, json, tempfile, asyncio, traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import get_llm
from retriever import search_with_scores
from ingest import ingest_pdf
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

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

_BROAD_KEYWORDS = {
    "summarize", "summary", "overview", "what topics", "what is covered",
    "what does this", "what's in this", "what is this document", "tell me about",
    "what topic", "explain this document",
}

_CONVERSATIONAL_SIGNALS = {
    "thanks", "thank you", "thx", "ty", "sounds good", "great", "awesome",
    "cool", "perfect", "nice", "ok", "okay", "got it", "makes sense", "i see",
    "interesting", "hi", "hello", "hey", "good morning", "good afternoon",
    "good evening", "bye", "goodbye", "cheers", "appreciate it", "helpful",
    "that helps", "no worries", "sure", "yep", "yeah", "nope",
}

def _is_conversational(message: str) -> bool:
    q = message.lower().strip().rstrip("!.,?")
    if q in _CONVERSATIONAL_SIGNALS:
        return True
    if any(q.startswith(sig) for sig in _CONVERSATIONAL_SIGNALS):
        return True
    return False

def _is_broad_query(query: str) -> bool:
    q = query.lower()
    return any(kw in q for kw in _BROAD_KEYWORDS)

def _retrieval_query(message: str, history: list) -> str:
    if history:
        last_user = next(
            (h.content for h in reversed(history) if h.role == "user"), None
        )
        if last_user:
            return f"{last_user} {message}"
    return message

SYSTEM_TEMPLATE = """\
You are a helpful, friendly document assistant. The user has uploaded a document and you help them understand it.

When answering questions about the document:
- Ground your answer in the DOCUMENT EXCERPTS provided below.
- Be direct and clear — lead with the key fact, then add detail if useful.
- Keep paragraphs short (2–3 sentences).
- If the excerpts don't contain the answer, say so naturally — e.g. "I don't see that in the document."
- If quoting the document, use "quotation marks".

FORMATTING RULES (follow exactly):
- Use ## for top-level section headings (e.g. ## Technical Skills)
- Use ### for sub-section headings (e.g. ### Languages)
- NEVER use **bold text followed by a colon** as a heading — always use ## or ### instead
- Under each heading, write content as plain paragraphs or a flat bullet list — no nested bullets
- Use **bold** only for emphasis within a sentence, not as a substitute for headings

DOCUMENT EXCERPTS:
{context}"""

CONVERSATIONAL_SYSTEM = """\
You are a warm, friendly AI assistant. Keep replies concise and natural.
If the user asks a general knowledge question, answer it helpfully.
If the conversation turns to a document, let them know they can upload one."""

class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = []

def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@app.post("/chat")
async def chat(req: ChatRequest):
    async def generate():
        # --- conversational bypass (no retrieval needed) ---
        if _is_conversational(req.message):
            messages = [SystemMessage(content=CONVERSATIONAL_SYSTEM)]
            for h in req.history[-12:]:
                messages.append(HumanMessage(content=h.content) if h.role == "user" else AIMessage(content=h.content))
            messages.append(HumanMessage(content=req.message))
            async for chunk in _llm.astream(messages):
                raw = chunk.content
                text = (
                    "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw)
                    if isinstance(raw, list) else str(raw)
                )
                if text:
                    yield _sse({"type": "token", "content": text})
            yield _sse({"type": "done", "sources": [], "grounded": False})
            return

        # --- retrieve ---
        broad = _is_broad_query(req.message)
        query = "document overview summary" if broad else _retrieval_query(req.message, req.history)
        try:
            docs_with_scores = await asyncio.to_thread(search_with_scores, query, 4)
        except Exception as e:
            yield _sse({"type": "token", "content": f"Search error: {e}"})
            yield _sse({"type": "done", "sources": [], "grounded": False})
            return

        if not docs_with_scores:
            yield _sse({"type": "token", "content": "No document has been uploaded yet. Please attach a PDF using the paperclip button."})
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
        system_content = SYSTEM_TEMPLATE.format(context=context)
        messages = [SystemMessage(content=system_content)]
        for h in req.history[-12:]:
            messages.append(HumanMessage(content=h.content) if h.role == "user" else AIMessage(content=h.content))
        messages.append(HumanMessage(content=req.message))

        async for chunk in _llm.astream(messages):
            raw = chunk.content
            text = (
                "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw)
                if isinstance(raw, list)
                else str(raw)
            )
            if text:
                yield _sse({"type": "token", "content": text})

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
