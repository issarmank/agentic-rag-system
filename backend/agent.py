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
3. NEVER make assumptions or fill in gaps with outside knowledge
4. When citing information, stick closely to the original wording

DOCUMENT CONTEXT:
{context}

CONVERSATION HISTORY:
{chat_history}

USER QUESTION:
{question}

INSTRUCTIONS FOR YOUR ANSWER:

**If the user asks you to SUMMARIZE, EXPLAIN, or DESCRIBE the document:**
- Provide a comprehensive answer using ONLY the information from the document context above
- Structure your response clearly (use brief summary, bullet points, sections as appropriate)
- Quote or closely paraphrase from the document to support your points

**If the user asks a SPECIFIC QUESTION about a topic:**
- Check if the document context contains information about that topic
- If YES: Provide a clear answer using ONLY that information
- If NO: Say "I cannot answer this question based on the uploaded document. The document does not contain information about [topic]."

**Remember:** Questions like "summarize this document" or "what is this about" are asking about the content IN the context above, not asking about topics external to the document.

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