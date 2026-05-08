from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_classic.chains import ConversationalRetrievalChain
from langchain_community.memory import ConversationBufferWindowMemory
from retriever import get_retriever

load_dotenv()

def build_agent():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash", 
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