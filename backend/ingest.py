import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings import SentenceTransformerEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

load_dotenv()

COLLECTION = os.getenv("QDRANT_COLLECTION")
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output size

def get_embeddings():
    return SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")

def ensure_collection_exists(client: QdrantClient):
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
        print(f"Created collection: {COLLECTION}")

def ingest_pdf(file_path: str):
    client = QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
    )
    ensure_collection_exists(client)

    # Load + chunk
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    # Embed + store in Qdrant Cloud
    QdrantVectorStore.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
        collection_name=COLLECTION,
    )
    print(f"Ingested {len(chunks)} chunks into Qdrant Cloud")
    return len(chunks)