import os
from dotenv import load_dotenv
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings import SentenceTransformerEmbeddings

load_dotenv()

_embedding_model = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
_vectorstore = None


def get_vectorstore() -> QdrantVectorStore:
    global _vectorstore
    if _vectorstore is None:
        _vectorstore = QdrantVectorStore.from_existing_collection(
            embedding=_embedding_model,
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY"),
            collection_name=os.getenv("QDRANT_COLLECTION"),
        )
    return _vectorstore


def search_with_scores(query: str, k: int = 4) -> list:
    """Returns list of (Document, float) sorted by descending relevance score."""
    try:
        return get_vectorstore().similarity_search_with_score(query, k=k)
    except Exception:
        return []
