'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSidebar, IconEdit, IconMore, IconDoc, IconShare, IconTrash } from './Icons';
import type { Chat } from './types';

interface TopBarProps {
  sidebarOpen: boolean;
  onToggle: () => void;
  chat: Chat | undefined;
  onNewChat: () => void;
  onDeleteChat: () => void;
}

export default function TopBar({ sidebarOpen, onToggle, chat, onNewChat, onDeleteChat }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const menuItems = [
    {
      label: 'Share conversation',
      icon: <IconShare size={15} />,
      onClick: () => {
        navigator.clipboard?.writeText(window.location.href);
        setMenuOpen(false);
      },
    },
    {
      label: 'Delete conversation',
      icon: <IconTrash size={15} />,
      danger: true,
      onClick: () => {
        onDeleteChat();
        setMenuOpen(false);
      },
    },
  ];

  return (
    <div
      className="h-14 px-3 flex items-center gap-1 shrink-0"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {!sidebarOpen && (
        <>
          <button
            onClick={onToggle}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 transition"
            style={{ color: 'var(--ink-soft)' }}
            title="Show sidebar"
          >
            <IconSidebar size={18} />
          </button>
          <button
            onClick={onNewChat}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 transition"
            style={{ color: 'var(--ink-soft)' }}
            title="New chat"
          >
            <IconEdit size={18} />
          </button>
          <div className="flex items-center gap-2 px-2 ml-1">
            <div
              className="h-7 w-7 rounded-md grid place-items-center"
              style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            >
              <span className="font-serif text-[15px] leading-none -mt-px">A</span>
            </div>
            <span className="text-[14px] font-medium tracking-tight" style={{ color: 'var(--ink)' }}>
              Agentify
            </span>
          </div>
        </>
      )}

      <div className="flex-1 min-w-0 flex items-center justify-center px-2">
        {chat?.doc && (
          <div
            className="inline-flex items-center gap-2 px-3 h-8 rounded-full text-[12.5px] max-w-full"
            style={{ background: 'var(--panel)', color: 'var(--ink-soft)' }}
          >
            <IconDoc size={14} />
            <span className="truncate">{chat.doc.name}</span>
            <span className="opacity-60 shrink-0">·</span>
            <span className="opacity-60 shrink-0">{chat.doc.pages}p</span>
          </div>
        )}
      </div>

      {/* Three-dot menu */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 transition"
          style={{ color: menuOpen ? 'var(--ink)' : 'var(--ink-soft)' }}
          title="More"
        >
          <IconMore size={18} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-1.5 w-52 rounded-xl overflow-hidden z-50"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line-2)',
                boxShadow: '0 8px 24px rgba(43,37,32,0.12), 0 2px 6px rgba(43,37,32,0.06)',
              }}
            >
              <div className="py-1">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left transition hover:bg-black/5"
                    style={{ color: item.danger ? '#c0392b' : 'var(--ink)' }}
                  >
                    <span style={{ color: item.danger ? '#c0392b' : 'var(--muted)' }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
