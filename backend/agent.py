import os
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

def get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        temperature=0,
    )
