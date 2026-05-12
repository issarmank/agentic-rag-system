"use client";

type Source = { page: string | number; snippet: string };
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-xl rounded-2xl px-4 py-3 text-sm",
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {!!message.sources?.length && (
          <details className="mt-2 text-xs opacity-70">
            <summary className="cursor-pointer">📄 Sources</summary>
            <div className="mt-1 space-y-1">
              {message.sources.map((s, i) => (
                <p key={i}>
                  Page {s.page}: {s.snippet}...
                </p>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}