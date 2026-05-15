"use client";
import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";


type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  grounded?: boolean;
};
type Source = { page: string | number; snippet: string };

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus("Uploading...");

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/ingest", { method: "POST", body: form });
    const data = await res.json();

    setUploadStatus(data.message || data.detail || "Document uploaded successfully ✓");
    setUploading(false);
    setTimeout(() => setUploadStatus(""), 3000);
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        grounded: data.grounded !== false // Default to true if not provided
      },
    ]);
    setLoading(false);
  }

  const suggestedPrompts = [
    { icon: "📄", text: "Summarize the document", query: "Please summarize the key points covered in this document." },
    { icon: "📋", text: "Main topics", query: "What are the main topics and sections covered in this document?" },
    { icon: "🎯", text: "Key requirements", query: "What are the key requirements or deliverables mentioned in this document?" },
    { icon: "💡", text: "Explain a concept", query: "Can you explain [specific concept from document]?" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* Messages or Landing Page */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          // Landing Page
          <div className="h-full flex flex-col items-center justify-center animate-fade-in">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-[#4a90e2] to-[#6bb6ff] mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-white mb-2">
                Welcome to Agentify
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl">
                Upload a PDF document and ask questions about its content. Get accurate, grounded answers directly from your document.
              </p>
              <div className="mt-4 px-4 py-2 bg-[#1a2942] border border-[#4a90e2]/30 rounded-lg text-sm text-gray-300 max-w-2xl">
                <span className="font-semibold text-[#6bb6ff]">💡 Pro tip:</span> Answers are derived exclusively from your uploaded document - no external knowledge or hallucinations.
              </div>
            </div>

            {/* Suggested Prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl mb-8">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt.query)}
                  className="group p-4 rounded-xl bg-[#1a2942] hover:bg-[#2a3f5f] border border-white/10 hover:border-[#4a90e2] transition-all duration-200 text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{prompt.icon}</span>
                    <div>
                      <div className="text-white font-medium mb-1">{prompt.text}</div>
                      <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                        Click to try
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4a90e2]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Document-Only Answers</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4a90e2]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Source Citations</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4a90e2]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No Hallucinations</span>
              </div>
            </div>
          </div>
        ) : (
          // Messages
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-[#4a90e2] to-[#6bb6ff] text-white"
                    : "bg-[#1a2942] text-gray-100 border border-white/10"
                }`}>
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <details className="mt-3 text-xs opacity-80">
                      <summary className="cursor-pointer hover:opacity-100 transition-opacity flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>View sources ({msg.sources.length})</span>
                      </summary>
                      <div className="mt-2 space-y-1 pl-5">
                        {msg.sources.map((s, j) => (
                          <p key={j} className="py-1">
                            <span className="font-semibold">Page {s.page}:</span> {s.snippet}...
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-[#1a2942] border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#4a90e2] rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-[#4a90e2] rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-[#4a90e2] rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                  <span className="text-gray-400 text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-white/10 bg-[#0a1628]/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          {uploadStatus && (
            <div className="mb-2 text-sm text-[#6bb6ff] animate-fade-in">
              {uploadStatus}
            </div>
          )}
          <div className="flex items-end gap-2 bg-[#1a2942] rounded-2xl border border-white/10 focus-within:border-[#4a90e2] transition-colors p-2">
            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2.5 hover:bg-[#2a3f5f] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload PDF"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-[#4a90e2] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUpload}
              />
            </button>

            {/* Text Input */}
            <input
              className="flex-1 bg-transparent text-white px-3 py-2.5 text-[15px] focus:outline-none placeholder-gray-500"
              placeholder="Ask anything about your documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-[#4a90e2] to-[#6bb6ff] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500">
            <span>Powered by AI</span>
            <span>•</span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}