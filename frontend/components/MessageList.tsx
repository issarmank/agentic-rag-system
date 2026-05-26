'use client';
import { useRef, useEffect, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import Sources from './Sources';
import { IconCopy, IconCheck, IconThumbUp, IconThumbDn } from './Icons';
import type { Message } from './types';

interface MessageListProps {
  messages: Message[];
  thinking: boolean;
  showSources?: boolean;
  density?: 'compact' | 'comfortable' | 'roomy';
  docName?: string;
}

export default function MessageList({
  messages,
  thinking,
  showSources = true,
  density = 'comfortable',
  docName,
}: MessageListProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages.length, thinking]);

  const pad =
    density === 'compact' ? 'py-4 gap-4' : density === 'roomy' ? 'py-10 gap-10' : 'py-7 gap-7';

  return (
    <div ref={ref} className="flex-1 overflow-y-auto scroll-clean">
      <div className={`max-w-190 mx-auto px-6 ${pad} flex flex-col`}>
        {messages.map((m, i) => (
          <ChatMessage key={i} m={m} showSources={showSources} docName={docName} />
        ))}
        {thinking && <ThinkingDots />}
      </div>
    </div>
  );
}

function ChatMessage({ m, showSources, docName }: { m: Message; showSources: boolean; docName?: string }) {
  if (m.role === 'user') {
    return (
      <div className="self-end max-w-[78%]">
        <div
          className="px-4 py-2.5 rounded-2xl rounded-br-md text-[14.5px] leading-relaxed"
          style={{ background: 'var(--panel)', color: 'var(--ink)' }}
        >
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="self-stretch">
      <div className="prose text-[14.5px] [&_ul]:pl-4 [&_ol]:pl-4 [&_blockquote]:pl-3" style={{ color: 'var(--ink)' }}>
        <ReactMarkdown>{m.text}</ReactMarkdown>
      </div>
      {showSources && m.sources && m.sources.length > 0 && (
        <Sources sources={m.sources} docName={docName} />
      )}
      <MsgActions text={m.text} />
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  title,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-7 w-7 grid place-items-center rounded-md hover:bg-black/5 transition"
      style={{ color: 'var(--muted)', ...style }}
    >
      {children}
    </button>
  );
}

function MsgActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="mt-2 -ml-1.5 flex items-center gap-0.5">
      <ActionBtn onClick={copy} title="Copy">
        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      </ActionBtn>
      <ActionBtn
        onClick={() => setVote(vote === 'up' ? null : 'up')}
        title="Good response"
        style={{ color: vote === 'up' ? '#22c55e' : 'var(--muted)' }}
      >
        <IconThumbUp size={14} />
      </ActionBtn>
      <ActionBtn
        onClick={() => setVote(vote === 'down' ? null : 'down')}
        title="Bad response"
        style={{ color: vote === 'down' ? '#ef4444' : 'var(--muted)' }}
      >
        <IconThumbDn size={14} />
      </ActionBtn>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="self-stretch">
      <div className="flex items-center gap-2 h-6">
        <span className="dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ink-soft)' }} />
        <span className="dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ink-soft)' }} />
        <span className="dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ink-soft)' }} />
      </div>
    </div>
  );
}
