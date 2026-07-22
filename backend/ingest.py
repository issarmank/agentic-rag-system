import os
import fitz  # PyMuPDF
import pymupdf4llm
from dotenv import load_dotenv
from llama_parse import LlamaParse
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings import SentenceTransformerEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, Filter, FieldCondition, MatchValue, FilterSelector

from jobs import set_status

load_dotenv()

COLLECTION = os.getenv("QDRANT_COLLECTION")
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output size
EMBED_BATCH_SIZE = 32

# Heuristic thresholds for routing between the fast local extractor and LlamaParse.
SCANNED_TEXT_CHARS = 20    # a page with fewer chars than this (but with images) is likely scanned
SCANNED_PAGE_RATIO = 0.3   # escalate if more than this fraction of pages look scanned
TABLE_PAGE_RATIO = 0.3     # escalate if more than this fraction of pages contain a detected table

_HEADERS_TO_SPLIT = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]

# Loaded once per process instead of once per ingest call.
_embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")


def get_embeddings():
    return _embeddings


def ensure_collection_exists(client: QdrantClient):
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )


def _needs_llamaparse(file_path: str) -> str | None:
    """Cheap local pass over the PDF to decide whether it needs LlamaParse's
    vision model. Returns a reason string to escalate, or None to use the fast
    local extractor."""
    doc = fitz.open(file_path)
    try:
        total_pages = doc.page_count
        if total_pages == 0:
            return "empty"

        scanned_pages = 0
        table_pages = 0
        for page in doc:
            text = page.get_text("text").strip()
            if len(text) < SCANNED_TEXT_CHARS and page.get_images():
                scanned_pages += 1
            if page.find_tables().tables:
                table_pages += 1

        if scanned_pages / total_pages > SCANNED_PAGE_RATIO:
            return "scanned"
        if table_pages / total_pages > TABLE_PAGE_RATIO:
            return "table-heavy"
        return None
    finally:
        doc.close()


def _parse_with_llamaparse(file_path: str) -> list[Document]:
    parser = LlamaParse(
        api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
        result_type="markdown",
        parsing_instruction=(
            "Extract all text, tables, and figures. "
            "Preserve section headings, numbered lists, and table structure. "
            "For tables, output them in markdown table format."
        ),
    )
    llama_docs = parser.load_data(file_path)
    if not llama_docs:
        raise ValueError("LlamaParse returned no documents. Check LLAMA_CLOUD_API_KEY.")

    # Convert LlamaIndex Documents → LangChain Documents
    return [
        Document(
            page_content=doc.text,
            metadata={"page": doc.metadata.get("page_label", doc.metadata.get("page", i + 1))},
        )
        for i, doc in enumerate(llama_docs)
    ]


def _parse_with_pymupdf(file_path: str) -> list[Document]:
    pages = pymupdf4llm.to_markdown(file_path, page_chunks=True)
    if not pages:
        raise ValueError("PyMuPDF returned no pages.")

    return [
        Document(
            page_content=page["text"],
            metadata={"page": page.get("metadata", {}).get("page", i + 1)},
        )
        for i, page in enumerate(pages)
    ]


def ingest_pdf(file_path: str, job_id: str | None = None, document_id: str | None = None) -> int:
    if document_id is None:
        document_id = os.path.basename(file_path)

    def progress(stage: str, **extra):
        if job_id:
            set_status(job_id, stage, **extra)

    client = QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
    )

    # Fast path for normal text PDFs; only escalate to LlamaParse's vision
    # model for scanned pages or table-heavy layouts it handles better.
    progress("parsing")
    escalate_reason = _needs_llamaparse(file_path)
    if escalate_reason:
        progress("parsing", parser="llamaparse", reason=escalate_reason)
        lc_docs = _parse_with_llamaparse(file_path)
    else:
        progress("parsing", parser="pymupdf")
        lc_docs = _parse_with_pymupdf(file_path)

    # Split on markdown headers first (semantic boundaries)
    progress("chunking")
    md_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=_HEADERS_TO_SPLIT,
        strip_headers=False,
    )
    header_chunks: list[Document] = []
    for doc in lc_docs:
        splits = md_splitter.split_text(doc.page_content)
        for split in splits:
            split.metadata = {**doc.metadata, **split.metadata}
        header_chunks.extend(splits)

    if not header_chunks:
        raise ValueError("PDF produced zero chunks after splitting.")

    # Safety net: break any oversized chunks
    char_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)
    chunks = char_splitter.split_documents(header_chunks)

    # Tag every chunk so we can target-delete by document later
    for chunk in chunks:
        chunk.metadata["document_id"] = document_id

    # Ensure collection exists, then evict only the stale chunks for this
    # document — other documents' chunks are left untouched (incremental upsert).
    ensure_collection_exists(client)
    client.delete(
        collection_name=COLLECTION,
        points_selector=FilterSelector(
            filter=Filter(
                must=[FieldCondition(key="metadata.document_id", match=MatchValue(value=document_id))]
            )
        ),
    )

    vectorstore = QdrantVectorStore(
        client=client,
        collection_name=COLLECTION,
        embedding=get_embeddings(),
    )

    # Embed and store in batches so progress can be reported incrementally.
    total = len(chunks)
    progress("embedding", completed=0, total=total)
    for start in range(0, total, EMBED_BATCH_SIZE):
        batch = chunks[start:start + EMBED_BATCH_SIZE]
        vectorstore.add_documents(batch)
        progress("embedding", completed=min(start + EMBED_BATCH_SIZE, total), total=total)

    progress("done", chunks=total)
    return total
