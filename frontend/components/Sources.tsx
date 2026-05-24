'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Source } from './types';

export default function Sources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-[12px] px-2.5 h-7 rounded-full transition"
        style={{ background: 'var(--panel)', color: 'var(--ink-soft)' }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
        <span>
          {sources.length} source{sources.length > 1 ? 's' : ''}
        </span>
        <span className="opacity-50 ml-0.5">{open ? '−' : '+'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            key="src"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="mt-2 grid gap-2">
              {sources.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 text-[12.5px] leading-relaxed"
                  style={{ background: 'var(--panel)', color: 'var(--ink-soft)' }}
                >
                  <div
                    className="text-[11px] font-medium uppercase tracking-[0.06em] mb-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    Page {s.page}
                  </div>
                  <div>&ldquo;{s.snippet}&rdquo;</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
