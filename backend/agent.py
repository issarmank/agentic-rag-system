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
    template="""You are a document Q&A system. Your ONLY job is to answer questions using EXCLUSIVELY the information in the provided document context below.

🚨 CRITICAL RULES - NEVER BREAK THESE:
1. ONLY use information from the DOCUMENT CONTEXT below
2. NEVER use your training data, general knowledge, or external information
3. If the answer is not in the context, say: "I cannot answer this question based on the uploaded document."
4. NEVER make assumptions or fill in gaps with outside knowledge
5. When citing information, stick closely to the original wording

DOCUMENT CONTEXT:
{context}

CONVERSATION HISTORY:
{chat_history}

USER QUESTION:
{question}

INSTRUCTIONS FOR YOUR ANSWER:
- If the context contains the answer: Provide a clear, comprehensive response using ONLY that information
- Start with a brief summary, then provide details with structure (bullet points, sections as appropriate)
- Quote or closely paraphrase from the document to support your points
- If listing items (deliverables, steps, requirements, etc.), enumerate ALL of them
- End with a brief key takeaway

- If the context does NOT contain enough information: Respond with "I cannot answer this question based on the uploaded document. The document does not contain information about [topic of question]."

ANSWER (using ONLY the document context above):"""
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
        combine_docs_chain_kwargs={"prompt": QA_PROMPT}
    )
    return chain