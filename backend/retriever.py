import os
from dotenv import load_dotenv
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings import SentenceTransformerEmbeddings

load_dotenv()

def get_retriever():
    vectorstore = QdrantVectorStore.from_existing_collection(
        embedding=SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2"),
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
        collection_name=os.getenv("QDRANT_COLLECTION"),
    )
    return vectorstore.as_retriever(search_kwargs={"k": 4})