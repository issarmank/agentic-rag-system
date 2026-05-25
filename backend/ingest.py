import os
from dotenv import load_dotenv
from llama_parse import LlamaParse
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings import SentenceTransformerEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

load_dotenv()

COLLECTION = os.getenv("QDRANT_COLLECTION")
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output size

_HEADERS_TO_SPLIT = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]

def get_embeddings():
    return SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")


def ensure_collection_exists(client: QdrantClient):
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )

def ingest_pdf(file_path: str) -> int:
    client = QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
    )

    # Parse with LlamaParse vision model → structured markdown
    parser = LlamaParse(
        api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
        result_type="markdown",
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

    # Embed and store
    QdrantVectorStore.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
        collection_name=COLLECTION,
    )
    return len(chunks)