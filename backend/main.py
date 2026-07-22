import json, logging, os, tempfile, asyncio, uuid
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from agent import get_llm
from retriever import search_with_scores
from jobs import REDIS_URL, get_status, job_channel
from ingest import ensure_collection_exists
from qdrant_client import QdrantClient
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

logger = logging.getLogger(__name__)

_arq_pool: ArqRedis | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _arq_pool
    _arq_pool = await create_pool(RedisSettings.from_dsn(REDIS_URL))
    # Ensure the collection and its payload indexes exist before any search
    # request can race ahead of the first ingest.
    qdrant_client = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_API_KEY"))
    ensure_collection_exists(qdrant_client)
    qdrant_client.close()
    yield
    await _arq_pool.close()


app = FastAPI(lifespan=lifespan)

_origins = ["http://localhost:3000"]
if frontend_url := os.getenv("FRONTEND_URL"):
    _origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- auth: shared secret between the Next.js server and this backend -------
# There's no end-user login system. The secret is held only by the Next.js
# server (never sent to the browser) so the backend can't be hit directly,
# while /chat and /ingest still stay open to whoever the frontend lets in.
APP_SHARED_SECRET = os.getenv("APP_SHARED_SECRET")


async def require_shared_secret(x_app_secret: str | None = Header(default=None)):
    if not APP_SHARED_SECRET or x_app_secret != APP_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


# --- rate limiting: keyed by session id (falls back to IP) -----------------
def _rate_limit_key(request: Request) -> str:
    return request.headers.get("x-session-id") or get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_llm = get_llm()

# Empirically tune these against real queries/documents — MiniLM cosine
# similarity for a genuinely relevant chunk is usually well above the floor,
# but the right cutoff depends on document domain and query phrasing.
RETRIEVAL_SCORE_THRESHOLD = float(os.getenv("RETRIEVAL_SCORE_THRESHOLD", "0.35"))
CHUNK_SCORE_FLOOR = float(os.getenv("CHUNK_SCORE_FLOOR", "0.25"))

JUDGE_SYSTEM = """\
You are a strict fact-checker. You will be given DOCUMENT EXCERPTS and an ANSWER \
generated from them. Decide whether every factual claim in the ANSWER is directly \
supported by the EXCERPTS.
Reply with exactly one word: YES if fully supported, NO if the answer contains any \
claim, number, or detail that is not present in the excerpts."""


async def _check_groundedness(answer: str, context: str) -> bool:
    if not answer.strip():
        return True
    judge_messages = [
        SystemMessage(content=JUDGE_SYSTEM),
        HumanMessage(
            content=f"DOCUMENT EXCERPTS:\n{context}\n\nANSWER:\n{answer}\n\nSupported? Reply YES or NO."
        ),
    ]
    try:
        result = await _llm.ainvoke(judge_messages)
        verdict = str(result.content).strip().upper()
        return verdict.startswith("YES")
    except Exception:
        # fail open — a judge error shouldn't block a valid answer — but log
        # so a persistently down judge model doesn't go unnoticed.
        logger.warning("Groundedness judge call failed; failing open", exc_info=True)
        return True


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


@app.post("/chat", dependencies=[Depends(require_shared_secret)])
@limiter.limit("20/minute")
async def chat(request: Request, req: ChatRequest, x_session_id: str = Header(...)):
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
            docs_with_scores = await asyncio.to_thread(search_with_scores, query, x_session_id, 4)
        except Exception:
            logger.exception("Retrieval failed for session %s", x_session_id)
            yield _sse({"type": "token", "content": "Something went wrong while searching your document. Please try again."})
            yield _sse({"type": "done", "sources": [], "grounded": False})
            return

        if not docs_with_scores:
            yield _sse({"type": "token", "content": "No document has been uploaded yet. Please attach a PDF using the paperclip button."})
            yield _sse({"type": "done", "sources": [], "grounded": False})
            return

        # --- retrieval-confidence gate ---
        # "broad" queries are retrieved with a synthetic query ("document overview
        # summary"), so their scores measure similarity to that stand-in, not to
        # the user's real question — skip the gate rather than misread them.
        top_score = max(score for _, score in docs_with_scores)
        if not broad and top_score < RETRIEVAL_SCORE_THRESHOLD:
            yield _sse({"type": "token", "content": "I don't see anything in the document about that."})
            yield _sse({"type": "done", "sources": [], "grounded": False})
            return

        # --- build context ---
        relevant_docs = [doc for doc, score in docs_with_scores if broad or score >= CHUNK_SCORE_FLOOR]
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

        answer_parts = []
        async for chunk in _llm.astream(messages):
            raw = chunk.content
            text = (
                "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw)
                if isinstance(raw, list)
                else str(raw)
            )
            if text:
                answer_parts.append(text)
                yield _sse({"type": "token", "content": text})

        grounded = await _check_groundedness("".join(answer_parts), context)
        yield _sse({"type": "done", "sources": sources, "grounded": grounded})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
UPLOAD_CHUNK_BYTES = 1024 * 1024


@app.post("/ingest", dependencies=[Depends(require_shared_secret)])
@limiter.limit("10/minute")
async def ingest(request: Request, file: UploadFile = File(...), x_session_id: str = Header(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDFs supported")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp_path = tmp.name
            total = 0
            while chunk := await file.read(UPLOAD_CHUNK_BYTES):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="File too large")
                tmp.write(chunk)
    except HTTPException:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise

    job_id = uuid.uuid4().hex
    document_id = os.path.basename(file.filename).strip() or job_id
    await _arq_pool.enqueue_job(
        "run_ingest", tmp_path, job_id, x_session_id, document_id, _job_id=job_id
    )
    return {"job_id": job_id, "document_id": document_id}


@app.get("/ingest/status/{job_id}", dependencies=[Depends(require_shared_secret)])
async def ingest_status(job_id: str):
    async def generate():
        # Event-driven via redis pubsub instead of busy-polling — avoids
        # spinning up a dedicated poll thread per open SSE stream.
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        pubsub = r.pubsub()
        channel = job_channel(job_id)
        await pubsub.subscribe(channel)
        try:
            last_sent = await asyncio.to_thread(get_status, job_id)
            if last_sent:
                yield _sse(last_sent)
                if last_sent.get("stage") in ("done", "error"):
                    return

            waited = 0.0
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=5.0)
                if message is None:
                    waited += 5.0
                    if waited > 600:
                        yield _sse({"stage": "error", "message": "Timed out waiting for ingestion"})
                        return
                    continue
                payload = json.loads(message["data"])
                if payload == last_sent:
                    continue
                last_sent = payload
                yield _sse(payload)
                if payload.get("stage") in ("done", "error"):
                    return
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
            await r.aclose()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}
