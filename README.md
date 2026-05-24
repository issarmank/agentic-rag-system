# Agentic RAG System

A production-deployed Retrieval-Augmented Generation (RAG) system that enables users to upload PDF documents and query them conversationally. Every LLM response is strictly grounded in the document's content using vector similarity search, hallucination detection, and conversational memory.

**Live Demo → [agentic-rag-system-ashy.vercel.app](https://agentic-rag-system-ashy.vercel.app)**

---

## Features

- **PDF ingestion** — upload any PDF and have it chunked, embedded, and stored in a vector database
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
| Containerisation | Docker (CPU-optimised, multi-layer caching) |
| CI/CD | GitHub Actions (build → push → deploy) |
| Registry | GitHub Container Registry (GHCR) |
| Hosting | Vercel (frontend), Render (backend) |

---

## Architecture

```
User
 │
 ▼
Vercel (Next.js)          ← CDN-hosted frontend
 │  /api/chat proxy
 │  /api/ingest proxy
 ▼
Render (FastAPI + Docker)  ← containerised backend
 │
 ├──► Qdrant Cloud         ← vector similarity search
 └──► OpenRouter API       ← LLM inference (Gemini 2.5 Flash)
```

**RAG Pipeline:**
1. PDF is chunked (500 chars, 50 char overlap) and embedded using `all-MiniLM-L6-v2`
2. Embeddings are stored in Qdrant Cloud
3. On each query, MMR retrieval fetches the top 4 diverse relevant chunks (from a pool of 8)
4. LangChain's `ConversationalRetrievalChain` passes chunks + conversation history to the LLM
5. Response is validated — if the LLM cannot answer from the document, `grounded: false` is returned

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
```

```bash
docker compose up --build
```

Frontend at `http://localhost:3000` — backend at `http://localhost:8000`.

### Running without Docker

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
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
| `POST` | `/ingest` | Upload a PDF (`multipart/form-data`) |
| `POST` | `/chat` | Send a message `{"message": "..."}` |

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

### Frontend
| Variable | Description |
|---|---|
| `BACKEND_URL` | Deployed backend URL |
