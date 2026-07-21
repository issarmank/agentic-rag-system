import os
from dotenv import load_dotenv
from llama_parse import LlamaParse
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings import SentenceTransformerEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from jobs import set_status

load_dotenv()

COLLECTION = os.getenv("QDRANT_COLLECTION")
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output size
EMBED_BATCH_SIZE = 32

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


def ingest_pdf(file_path: str, job_id: str | None = None) -> int:
    def progress(stage: str, **extra):
        if job_id:
            set_status(job_id, stage, **extra)

    client = QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
    )

    # Parse with LlamaParse vision model → structured markdown
    progress("parsing")
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
    lc_docs = [
        Document(
            page_content=doc.text,
            metadata={"page": doc.metadata.get("page_label", doc.metadata.get("page", i + 1))},
        )
        for i, doc in enumerate(llama_docs)
    ]

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

    # Only AFTER we have data: clear + recreate + store
    if COLLECTION in [c.name for c in client.get_collections().collections]:
        client.delete_collection(COLLECTION)
    ensure_collection_exists(client)

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
