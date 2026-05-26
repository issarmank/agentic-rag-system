'use client';
import type { Source } from './types';

export default function Sources({ sources: _sources, docName }: { sources: Source[]; docName?: string }) {
  const label = docName ?? 'uploaded document';
  return (
    <div className="mt-2">
      <span
        className="inline-flex items-center gap-1.5 text-[12px] px-2.5 h-7 rounded-full"
        style={{ background: 'var(--panel)', color: 'var(--ink-soft)' }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: 'var(--accent)' }}
        />
        Source: {label}
      </span>
    </div>
  );
}
