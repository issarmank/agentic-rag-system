'use client';
import { useRef, useLayoutEffect, useState } from 'react';
import { IconAttach, IconArrowUp, IconStop } from './Icons';

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  onAttach: () => void;
  thinking: boolean;
  onStop: () => void;
  uploadStatus?: string;
}

export default function Composer({
  value,
  onChange,
  onSend,
  onAttach,
  thinking,
  onStop,
  uploadStatus,
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [sendHover, setSendHover] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '24px';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const submit = () => {
    if (thinking) { onStop(); return; }
    const t = value.trim();
    if (!t) return;
    onSend(t);
  };

  return (
    <div className="px-6 pb-6 pt-2 shrink-0">
      <div className="max-w-190 mx-auto">
        {uploadStatus && (
          <div className="mb-2 text-[12.5px]" style={{ color: 'var(--accent)' }}>
            {uploadStatus}
          </div>
        )}
        <div
          className="flex items-end gap-2 px-3 py-2.5 rounded-2xl"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            boxShadow: '0 1px 0 rgba(43,37,32,0.02)',
          }}
        >
          <button
            onClick={onAttach}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-black/5 transition shrink-0"
            style={{ color: 'var(--ink-soft)' }}
            title="Attach PDF"
          >
            <IconAttach size={18} />
          </button>
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder="Ask anything"
            className="composer flex-1 bg-transparent outline-none text-[15px] leading-6 py-1.5 placeholder:opacity-50"
            style={{ color: 'var(--ink)' }}
            rows={1}
          />
          <button
            onClick={submit}
            disabled={!thinking && !value.trim()}
            onMouseEnter={() => setSendHover(true)}
            onMouseLeave={() => setSendHover(false)}
            className="h-9 w-9 grid place-items-center rounded-lg transition shrink-0 disabled:opacity-30"
            style={{
              background: thinking
                ? (sendHover ? 'rgba(0,0,0,0.08)' : 'var(--panel-2)')
                : value.trim()
                ? (sendHover ? '#3d3530' : 'var(--ink)')
                : 'var(--panel-2)',
              color: thinking ? 'var(--ink)' : value.trim() ? 'var(--bg)' : 'var(--muted)',
            }}
            title={thinking ? 'Stop' : 'Send'}
          >
            {thinking ? <IconStop size={14} /> : <IconArrowUp size={18} />}
          </button>
        </div>
        <div className="mt-2 text-center text-[11.5px]" style={{ color: 'var(--muted)' }}>
          Answers are grounded to your uploaded document.
        </div>
      </div>
    </div>
  );
}
