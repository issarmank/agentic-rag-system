import logging
import os

from dotenv import load_dotenv
from langchain_qdrant import QdrantVectorStore
from qdrant_client.models import FieldCondition, Filter, MatchValue

from embeddings import get_embeddings

load_dotenv()

logger = logging.getLogger(__name__)

_vectorstore = None


def get_vectorstore() -> QdrantVectorStore:
    global _vectorstore
    if _vectorstore is None:
        _vectorstore = QdrantVectorStore.from_existing_collection(
            embedding=get_embeddings(),
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY"),
            collection_name=os.getenv("QDRANT_COLLECTION"),
        )
    return _vectorstore


def search_with_scores(query: str, owner: str, k: int = 4) -> list:
    """Returns list of (Document, float) sorted by descending relevance score,
    restricted to chunks tagged with the given owner (session id)."""
    owner_filter = Filter(
        must=[FieldCondition(key="metadata.owner", match=MatchValue(value=owner))]
    )
    try:
        return get_vectorstore().similarity_search_with_score(query, k=k, filter=owner_filter)
    except Exception:
        logger.exception("Qdrant similarity search failed (owner=%s)", owner)
        raise
