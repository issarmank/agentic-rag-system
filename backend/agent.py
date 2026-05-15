import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_classic.chains.conversational_retrieval.base import ConversationalRetrievalChain
from langchain_classic.memory import ConversationBufferWindowMemory
from langchain_core.prompts import PromptTemplate
from retriever import get_retriever

load_dotenv()

QA_PROMPT = PromptTemplate(
    input_variables=["context", "question", "chat_history"],
    template="""You are an expert document analyst. Your job is to provide thorough, well-structured answers grounded in the provided document context.

DOCUMENT CONTEXT:
{context}

CONVERSATION HISTORY:
{chat_history}

USER QUESTION:
{question}

INSTRUCTIONS:
- Give a detailed, comprehensive response — never a one-liner unless the question is trivially simple.
- Start with a concise executive summary (2-3 sentences) of the direct answer.
- Then expand with a structured breakdown using clear sections or bullet points where helpful.
- Quote or closely paraphrase specific language from the document to support your points.
- If the document lists deliverables, steps, roles, or categories — enumerate ALL of them with explanation for each.
- End with a "Key Takeaway" sentence tying it together.
- If the context doesn't contain enough information, say so explicitly rather than guessing.

DETAILED ANSWER:"""
)

def build_agent():
    llm = ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        temperature=0,
    )
    memory = ConversationBufferWindowMemory(
        k=6,
        memory_key="chat_history",
        return_messages=True,
        output_key="answer",
    )
    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=get_retriever(),
        memory=memory,
        return_source_documents=True,
    )
    return chain