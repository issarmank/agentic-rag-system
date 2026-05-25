'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconEdit, IconSidebar, IconSearch, IconMore, IconTrash, IconSettings, IconHelpCircle } from './Icons';
import type { Chat } from './types';

type BucketKey = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Previous 30 days' | 'Older';

function groupChats(chats: Chat[]): [string, Chat[]][] {
  const now = Date.now();
  const buckets: Record<BucketKey, Chat[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 days': [],
    'Previous 30 days': [],
    Older: [],
  };
  for (const c of chats) {
    const d = (now - c.updated) / (1000 * 60 * 60 * 24);
    if (d < 1) buckets.Today.push(c);
    else if (d < 2) buckets.Yesterday.push(c);
    else if (d < 7) buckets['Previous 7 days'].push(c);
    else if (d < 30) buckets['Previous 30 days'].push(c);
    else buckets.Older.push(c);
  }
  return (Object.entries(buckets) as [BucketKey, Chat[]][]).filter(([, v]) => v.length > 0);
}

interface SidebarProps {
  open: boolean;
  chats: Chat[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onToggle: () => void;
  q: string;
  setQ: (q: string) => void;
}

export default function Sidebar({
  open,
  chats,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onToggle,
  q,
  setQ,
}: SidebarProps) {
  const filtered = useMemo(() => {
    if (!q.trim()) return chats;
    const n = q.toLowerCase();
    return chats.filter((c) => c.title.toLowerCase().includes(n));
  }, [chats, q]);

  const grouped = groupChats(filtered);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="sb"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 272, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'tween', duration: 0.28, ease: [0.2, 0.0, 0.0, 1] }}
          className="shrink-0 overflow-hidden"
          style={{ background: 'var(--panel)' }}
        >
          <div
            className="h-full w-68 flex flex-col"
            style={{ borderRight: '1px solid var(--line)' }}
          >
            {/* Header */}
            <div className="h-14 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 pl-1">
                <div
                  className="h-7 w-7 rounded-md grid place-items-center"
                  style={{ background: 'var(--ink)', color: 'var(--bg)' }}
                >
                  <span className="font-serif text-[15px] leading-none -mt-px">A</span>
                </div>
                <span
                  className="text-[14px] font-medium tracking-tight"
                  style={{ color: 'var(--ink)' }}
                >
                  Agentify
                </span>
              </div>
              <div className="flex items-center -mr-1">
                <button
                  onClick={onNewChat}
                  className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 transition"
                  title="New chat"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  <IconEdit size={18} />
                </button>
                <button
                  onClick={onToggle}
                  className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 transition"
                  title="Hide sidebar"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  <IconSidebar size={18} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
              <div
                className="flex items-center gap-2 h-9 px-3 rounded-lg"
                style={{ background: 'var(--panel-2)' }}
              >
                <IconSearch size={16} style={{ color: 'var(--muted)' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search"
                  className="bg-transparent outline-none text-[13px] flex-1 placeholder:opacity-60"
                  style={{ color: 'var(--ink)' }}
                />
              </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto scroll-clean px-2 pb-3">
              {grouped.length === 0 && (
                <div className="px-3 py-8 text-[12.5px]" style={{ color: 'var(--muted)' }}>
                  {q ? `No chats match "${q}".` : 'No chats yet. Start a conversation below.'}
                </div>
              )}
              {grouped.map(([label, items]) => (
                <div key={label} className="mt-3">
                  <div
                    className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    {label}
                  </div>
                  <div className="flex flex-col">
                    {items.map((c) => (
                      <ChatRow
                        key={c.id}
                        chat={c}
                        active={c.id === activeId}
                        onClick={() => onSelect(c.id)}
                        onDelete={() => onDelete(c.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
              <SidebarFooterMenu />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function SidebarFooterMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = [
    {
      label: 'Settings',
      icon: <IconSettings size={15} />,
      onClick: () => { window.location.href = '/settings'; },
    },
    {
      label: 'FAQ',
      icon: <IconHelpCircle size={15} />,
      onClick: () => { window.location.href = '/faq'; },
    },
  ];

  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            key="footer-menu"
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute bottom-full mb-2 left-0 right-0 rounded-xl overflow-hidden z-50"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line-2)',
              boxShadow: '0 -4px 24px rgba(43,37,32,0.10), 0 2px 6px rgba(43,37,32,0.06)',
            }}
          >
            <div className="py-1">
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { setOpen(false); item.onClick(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left hover:bg-black/5 transition"
                  style={{ color: 'var(--ink)' }}
                >
                  <span style={{ color: 'var(--muted)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-black/5 transition">
        <div
          className="h-8 w-8 rounded-full grid place-items-center text-[12px] font-semibold shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          A
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
            You
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="h-7 w-7 grid place-items-center rounded-md hover:bg-black/10 transition shrink-0"
          style={{ color: 'var(--muted)' }}
          title="More options"
        >
          <IconMore size={16} />
        </button>
      </div>
    </div>
  );
}

function ChatRow({
  chat,
  active,
  onClick,
  onDelete,
}: {
  chat: Chat;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      className="group relative flex items-center gap-2 h-9 px-3 rounded-lg cursor-pointer transition"
      style={{
        background: active ? 'var(--panel-2)' : 'transparent',
        color: active ? 'var(--ink)' : 'var(--ink-soft)',
      }}
    >
      <div
        className="flex-1 truncate text-[13px]"
        style={{ fontWeight: active ? 500 : 400 }}
      >
        {chat.title}
      </div>
      <AnimatePresence>
        {hover && (
          <motion.button
            key="del"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-black/10"
            style={{ color: 'var(--muted)' }}
            title="Delete chat"
          >
            <IconTrash size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
