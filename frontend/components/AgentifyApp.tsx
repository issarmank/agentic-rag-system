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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        text: data.answer ?? data.detail ?? 'No response.',
        sources: data.sources,
      };
      setChats((cs) =>
        cs.map((c) =>
          c.id === currentId
            ? { ...c, messages: [...c.messages, assistantMsg] }
            : c
        )
      );
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
