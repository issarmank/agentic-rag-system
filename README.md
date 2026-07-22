# Agentic RAG System

<img width="2934" height="1658" alt="image" src="https://github.com/user-attachments/assets/07f4d0d2-999f-4020-be44-437f7bef4c42" />

A production-deployed Retrieval-Augmented Generation (RAG) system that enables users to upload PDF documents and query them conversationally. Every LLM response is strictly grounded in the document's content using vector similarity search, hallucination detection, and conversational memory.

**Live Demo → [agentic-rag-system-ashy.vercel.app](https://agentic-rag-system-ashy.vercel.app)**

---

## Features

- **PDF ingestion** — upload any PDF and have it chunked, embedded, and stored in a vector database
- **Async ingestion pipeline** — uploads return instantly; parsing/chunking/embedding runs in a background worker (arq + Redis) with live progress streamed back over SSE
- **Conversational querying** — ask follow-up questions with full conversation memory (last 6 exchanges)
- **Hallucination detection** — responses are blocked if the LLM cannot ground its answer in the retrieved document chunks
- **MMR retrieval** — Maximal Marginal Relevance search surfaces diverse, relevant chunks rather than redundant ones
- **Source citations** — every answer includes the page number and snippet of the source chunks used
- **Fully containerised** — Docker image with CPU-optimised PyTorch and baked-in embedding model for fast cold starts
- **CI/CD pipeline** — automated build, test, and deploy on every push to `main`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Markdown |
| Backend | FastAPI (Python 3.11), async REST API |
| LLM | OpenRouter API — Google Gemini 2.5 Flash |
| Embeddings | Sentence Transformers `all-MiniLM-L6-v2` (384-dim vectors) |
| Vector Database | Qdrant Cloud (MMR retrieval, cosine similarity) |
| AI Orchestration | LangChain (RAG pipeline, conversational memory) |
| Background Jobs | arq (Redis-backed async task queue) — runs ingestion off the request path |
| Containerisation | Docker (CPU-optimised, multi-layer caching) |
| CI/CD | GitHub Actions (build → push → deploy) |
| Registry | GitHub Container Registry (GHCR) |
| Hosting | Vercel (frontend), Azure Container Apps (backend) |

---

## Architecture

```
User
 │
 ▼
Vercel (Next.js)          ← CDN-hosted frontend
 │  /api/chat proxy (SSE)
 │  /api/ingest proxy            /api/ingest/status/[jobId] proxy (SSE)
 ▼
Render (FastAPI + Docker)  ← containerised backend (web process)
 │
 ├──► enqueues ingest job ──► Redis ──► arq worker (separate process)
 │                                        │
 │                                        ├──► LlamaParse       ← PDF parsing
 │                                        ├──► Qdrant Cloud     ← chunk embed + upsert
 │                                        └──► writes job progress back to Redis
 │
 ├──► Qdrant Cloud         ← vector similarity search (chat)
 └──► OpenRouter API       ← LLM inference (Gemini 2.5 Flash)
```

**Ingestion pipeline (async):**
1. `POST /ingest` saves the upload to a temp file, enqueues an arq job, and returns a `job_id` immediately — the request never blocks on parsing or embedding.
2. The arq worker (a separate process from the web server) parses the PDF with LlamaParse, splits it (markdown headers, then a 512-char/64-char-overlap safety net), and embeds+upserts chunks into Qdrant in batches of 32.
3. The worker writes progress (`parsing` → `chunking` → `embedding N/total` → `done`/`error`) to Redis after each stage.
4. The frontend opens an `EventSource` on `GET /ingest/status/{job_id}`, which polls Redis and streams progress over SSE until the job finishes.

**Query pipeline:**
1. On each query, MMR retrieval fetches the top 4 diverse relevant chunks (from a pool of 8)
2. LangChain's `ConversationalRetrievalChain` passes chunks + conversation history to the LLM
3. Response is validated — if the LLM cannot answer from the document, `grounded: false` is returned

---

## CI/CD Pipeline

Every push to `main` triggers GitHub Actions:

```
Push to main
 │
 ├── backend/** changed
 │    ├── Build Docker image
 │    ├── Push to GHCR (tagged with git SHA)
 │    └── Trigger Render deploy via webhook
 │
 └── frontend/** changed
      ├── Type check (tsc --noEmit)
      ├── Build (npm run build)
      └── Vercel auto-deploys via GitHub integration
```

Pull requests run the build and type-check steps without deploying — broken code cannot reach production.

> **Note:** Render's free tier doesn't support a separate Background Worker service, so the container runs both processes itself — `backend/start.sh` starts `arq worker.WorkerSettings` in the background and `uvicorn` in the foreground within the single free web service. Redis is [Upstash](https://upstash.com) (free tier, standard Redis protocol over `rediss://`) rather than Render's own Redis, which no longer has a free plan.

---

## Local Development

### Prerequisites
- Docker and Docker Compose
- Node.js 20+
- Python 3.11+

### Running with Docker Compose

```bash
git clone https://github.com/issarmank/agentic-rag-system.git
cd agentic-rag-system
```

Create `backend/.env`:
```env
OPENROUTER_API_KEY=your_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=google/gemini-2.5-flash
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
QDRANT_COLLECTION=rag_docs
LLAMA_CLOUD_API_KEY=your_llama_cloud_key
REDIS_URL=redis://redis:6379
```

```bash
docker compose up --build
```

This starts four services: `redis`, `backend` (FastAPI web server), `worker` (arq — runs PDF parsing/embedding), and `frontend`. Frontend at `http://localhost:3000` — backend at `http://localhost:8000`.

### Running without Docker

**Redis** (required by the ingestion worker):
```bash
redis-server
```

**Backend web server:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
echo "REDIS_URL=redis://localhost:6379" >> .env
uvicorn main:app --reload
```

**Backend worker** (in a separate terminal, same venv/`.env`):
```bash
cd backend
arq worker.WorkerSettings
```

**Frontend:**
```bash
cd frontend
npm install
echo "BACKEND_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/ingest` | Upload a PDF (`multipart/form-data`) — returns `{"job_id": "..."}` immediately, processing happens in the background |
| `GET` | `/ingest/status/{job_id}` | SSE stream of ingestion progress (`parsing` → `chunking` → `embedding N/total` → `done`/`error`) |
| `POST` | `/chat` | Send a message `{"message": "..."}` — SSE token stream |

**Chat response shape:**
```json
{
  "answer": "...",
  "sources": [{ "page": 3, "snippet": "..." }],
  "grounded": true,
  "relevance_score": 0.87
}
```

---

## Environment Variables

### Backend
| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_BASE_URL` | OpenRouter base URL |
| `OPENROUTER_MODEL` | Model ID (e.g. `google/gemini-2.5-flash`) |
| `QDRANT_URL` | Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Qdrant Cloud API key |
| `QDRANT_COLLECTION` | Collection name |
| `FRONTEND_URL` | Deployed frontend URL (for CORS) |
| `LLAMA_CLOUD_API_KEY` | LlamaParse API key (used by the ingestion worker) |
| `REDIS_URL` | Redis connection string, shared by the web service and the worker (e.g. `redis://localhost:6379`) |

### Frontend
| Variable | Description |
|---|---|
| `BACKEND_URL` | Deployed backend URL |
