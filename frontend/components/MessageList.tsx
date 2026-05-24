'use client';
import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Sources from './Sources';
import { IconCopy, IconCheck, IconThumbUp, IconThumbDn, IconRefresh } from './Icons';
import type { Message } from './types';

interface MessageListProps {
  messages: Message[];
  thinking: boolean;
  showSources?: boolean;
  density?: 'compact' | 'comfortable' | 'roomy';
}

export default function MessageList({
  messages,
  thinking,
  showSources = true,
  density = 'comfortable',
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
      <div className={`max-w-[760px] mx-auto px-6 ${pad} flex flex-col`}>
        {messages.map((m, i) => (
          <ChatMessage key={i} m={m} showSources={showSources} />
        ))}
        {thinking && <ThinkingDots />}
      </div>
    </div>
  );
}

function ChatMessage({ m, showSources }: { m: Message; showSources: boolean }) {
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
      <div className="prose text-[14.5px]" style={{ color: 'var(--ink)' }}>
        <ReactMarkdown>{m.text}</ReactMarkdown>
      </div>
      {showSources && m.sources && m.sources.length > 0 && (
        <Sources sources={m.sources} />
      )}
      <MsgActions text={m.text} />
    </div>
  );
}

function MsgActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const Btn = ({
    children,
    onClick,
    title,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className="h-7 w-7 grid place-items-center rounded-md hover:bg-black/5 transition"
      style={{ color: 'var(--muted)' }}
    >
      {children}
    </button>
  );

  return (
    <div className="mt-2 -ml-1.5 flex items-center gap-0.5">
      <Btn onClick={copy} title="Copy">
        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      </Btn>
      <Btn title="Good response"><IconThumbUp size={14} /></Btn>
      <Btn title="Bad response"><IconThumbDn size={14} /></Btn>
      <Btn title="Regenerate"><IconRefresh size={14} /></Btn>
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
