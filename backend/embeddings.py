from langchain_community.embeddings import SentenceTransformerEmbeddings

# Loaded once per process and shared by both ingest.py (embedding chunks) and
# retriever.py (embedding queries) — instantiating this twice in the same
# process doubles torch/onnxruntime memory for no benefit, which is what was
# tipping the Render free-tier container (512MB) into OOM.
_embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")


def get_embeddings() -> SentenceTransformerEmbeddings:
    return _embeddings
