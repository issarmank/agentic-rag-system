'use client';
import { useState, useRef } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Welcome from './Welcome';
import MessageList from './MessageList';
import Composer from './Composer';
import type { Chat, Message } from './types';

function makeId() {
  return 'c' + Date.now();
}

export default function AgentifyApp() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [q, setQ] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const charBufferRef = useRef('');
  const streamDoneRef = useRef(false);
  const dripIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const active = chats.find((c) => c.id === activeId);
  const isEmpty = !active || active.messages.length === 0;

  const onNewChat = () => {
    const id = makeId();
    setChats((prev) => [{ id, title: 'New chat', updated: Date.now(), messages: [] }, ...prev]);
    setActiveId(id);
    setInput('');
  };

  const onDelete = (id: string) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const onSend = async (text: string) => {
    // Capture or create a chat id synchronously before any awaits
    let currentId = activeId;

    if (!currentId) {
      currentId = makeId();
      setChats((prev) => [
        { id: currentId!, title: text.slice(0, 38), updated: Date.now(), messages: [{ role: 'user', text }] },
        ...prev,
      ]);
      setActiveId(currentId);
    } else {
      setChats((cs) =>
        cs.map((c) =>
          c.id === currentId
            ? {
                ...c,
                title: c.messages.length === 0 ? text.slice(0, 38) : c.title,
                updated: Date.now(),
                messages: [...c.messages, { role: 'user', text }],
              }
            : c
        )
      );
    }

    setInput('');
    setThinking(true);

    // Reset drip state for this request
    charBufferRef.current = '';
    streamDoneRef.current = false;
    if (dripIntervalRef.current) {
      clearInterval(dripIntervalRef.current);
      dripIntervalRef.current = null;
    }

    // Drip one character at a time from the buffer into the last assistant message.
    // Adjust the interval (ms) to control typing speed — lower = faster.
    const CHAR_DELAY_MS = 18;

    const startDrip = (chatId: string) => {
      if (dripIntervalRef.current) return;
      dripIntervalRef.current = setInterval(() => {
        if (charBufferRef.current.length === 0) {
          if (streamDoneRef.current) {
            clearInterval(dripIntervalRef.current!);
            dripIntervalRef.current = null;
          }
          return;
        }
        const char = charBufferRef.current[0];
        charBufferRef.current = charBufferRef.current.slice(1);
        setChats((cs) =>
          cs.map((c) => {
            if (c.id !== chatId) return c;
            const msgs = [...c.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, text: last.text + char };
            }
            return { ...c, messages: msgs };
          })
        );
      }, CHAR_DELAY_MS);
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let event: { type: string; content?: string; sources?: Message['sources'] };
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === 'token' && event.content) {
            if (firstToken) {
              firstToken = false;
              setThinking(false);
              // Add empty assistant message — drip will fill it character by character
              setChats((cs) =>
                cs.map((c) =>
                  c.id === currentId
                    ? { ...c, messages: [...c.messages, { role: 'assistant' as const, text: '', sources: [] }] }
                    : c
                )
              );
            }
            charBufferRef.current += event.content;
            startDrip(currentId!);
          } else if (event.type === 'done' && event.sources?.length) {
            const sources = event.sources;
            // Attach sources once the drip finishes draining
            const attachSources = () => {
              if (charBufferRef.current.length > 0 || dripIntervalRef.current) {
                setTimeout(attachSources, 50);
                return;
              }
              setChats((cs) =>
                cs.map((c) => {
                  if (c.id !== currentId) return c;
                  const msgs = [...c.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === 'assistant') {
                    msgs[msgs.length - 1] = { ...last, sources };
                  }
                  return { ...c, messages: msgs };
                })
              );
            };
            attachSources();
          }
        }
      }
    } catch {
      setChats((cs) =>
        cs.map((c) =>
          c.id === currentId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { role: 'assistant' as const, text: 'Something went wrong. Please try again.' },
                ],
              }
            : c
        )
      );
    } finally {
      setThinking(false);
      streamDoneRef.current = true;
    }
  };

  const onStop = () => setThinking(false);
  const onAttach = () => fileInputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploadStatus('Uploading…');

    let targetId = activeId;
    if (!targetId) {
      targetId = makeId();
      setChats((prev) => [
        { id: targetId!, title: 'New chat', updated: Date.now(), messages: [] },
        ...prev,
      ]);
      setActiveId(targetId);
    }

    const form = new FormData();
    form.append('file', f);
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: form });
      const data = await res.json();
      setUploadStatus(data.message || data.detail || 'Document uploaded successfully');
      setChats((cs) =>
        cs.map((c) =>
          c.id === targetId ? { ...c, doc: { name: f.name, pages: '–' } } : c
        )
      );
    } catch {
      setUploadStatus('Upload failed. Please try again.');
    }
    setTimeout(() => setUploadStatus(''), 3000);
  };

  return (
    <div className="h-full w-full flex" style={{ background: 'var(--bg)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onFile}
      />

      <Sidebar
        open={sidebarOpen}
        chats={chats}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={onNewChat}
        onDelete={onDelete}
        onToggle={() => setSidebarOpen((s) => !s)}
        q={q}
        setQ={setQ}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((s) => !s)}
          chat={active}
          onNewChat={onNewChat}
          onDeleteChat={() => activeId && onDelete(activeId)}
        />

        {isEmpty ? (
          <Welcome onPick={onSend} serif />
        ) : (
          <MessageList
            messages={active!.messages}
            thinking={thinking}
            showSources
            density="comfortable"
          />
        )}

        <Composer
          value={input}
          onChange={setInput}
          onSend={onSend}
          onAttach={onAttach}
          thinking={thinking}
          onStop={onStop}
          uploadStatus={uploadStatus}
        />
      </main>
    </div>
  );
}
