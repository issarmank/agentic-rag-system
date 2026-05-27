'use client';
import { useState } from 'react';
import Link from 'next/link';

const IconArrowLeft = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const IconChevron = ({ open }: { open: boolean }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
       style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const faqs: { q: string; a: string }[] = [
  {
    q: 'What is Agentify?',
    a: 'Agentify is an AI-powered document chat tool. You upload a PDF and ask questions about it — every answer is grounded exclusively in the content of your file, with no hallucinations or outside knowledge mixed in.',
  },
  {
    q: 'How do I upload a document?',
    a: 'Click the paperclip icon in the bottom-left of the composer bar. Select any PDF from your device. Once uploaded, a document pill appears in the top bar confirming the file is ready, and you can start asking questions immediately.',
  },
  {
    q: 'Are answers guaranteed to be accurate?',
    a: 'Answers are grounded to your document — the AI only draws from the content you uploaded. Each response includes source citations showing the exact page and passage used. That said, always verify critical information yourself.',
  },
  {
    q: 'Can I have multiple conversations about the same document?',
    a: 'Yes. Use the New Chat button (pencil icon) in the sidebar header to start a fresh conversation at any time. Previous chats are grouped by date so you can revisit them easily.',
  },
  {
    q: 'What file types are supported?',
    a: 'Currently only PDF files are supported. Support for Word documents, plain text, and other formats is planned for a future release.',
  },
  {
    q: 'How do I delete a conversation?',
    a: 'Hover over any chat in the sidebar and click the trash icon that appears, or use the three-dot menu in the top-right corner and choose "Delete conversation".',
  },
  {
    q: 'Is my data stored on your servers?',
    a: 'Uploaded documents are processed server-side to build the search index and are not retained beyond your session. No conversation history is saved between browser refreshes.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--line)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left transition hover:opacity-80"
      >
        <span className="text-[14.5px] font-medium" style={{ color: 'var(--ink)' }}>{q}</span>
        <span style={{ color: 'var(--muted)' }} className="shrink-0">
          <IconChevron open={open} />
        </span>
      </button>
      {open && (
        <p className="pb-4 text-[14px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 h-14 px-3 flex items-center gap-2"
           style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
        <Link href="/"
              className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 transition"
              style={{ color: 'var(--ink-soft)' }}
              title="Back">
          <IconArrowLeft />
        </Link>
        <span className="text-[15px] font-semibold ml-1" style={{ color: 'var(--ink)' }}>
          FAQ
        </span>
      </div>

      {/* Body */}
      <div className="max-w-150 mx-auto px-6 pb-20">
        <p className="mt-8 mb-6 text-[14px]" style={{ color: 'var(--ink-soft)' }}>
          Common questions about using Agentify.
        </p>
        <div>
          {faqs.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </div>
  );
}
