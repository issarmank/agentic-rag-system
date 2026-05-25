'use client';
import { useState } from 'react';
import Link from 'next/link';

const IconArrowLeft = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
      style={{ background: value ? 'var(--ink)' : 'var(--panel-2)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: value ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="mt-8 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
         style={{ color: 'var(--muted)' }}>
      {title}
    </div>
  );
}

function Row({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4"
         style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="min-w-0">
        <div className="text-[14px] font-medium" style={{ color: 'var(--ink)' }}>{label}</div>
        {description && (
          <div className="text-[12.5px] mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>
            {description}
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Pill({ options, value, onChange }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden shrink-0"
         style={{ border: '1px solid var(--line-2)', background: 'var(--panel)' }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="px-3 py-1.5 text-[12.5px] capitalize transition"
          style={{
            background: value === opt ? 'var(--ink)' : 'transparent',
            color: value === opt ? 'var(--bg)' : 'var(--ink-soft)',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [showSources, setShowSources] = useState(true);
  const [density, setDensity] = useState('comfortable');
  const [serifWelcome, setSerifWelcome] = useState(true);
  const [palette, setPalette] = useState('bone');

  const palettes = [
    { id: 'bone',  swatch: '#f1ebe1' },
    { id: 'sand',  swatch: '#eadfc9' },
    { id: 'linen', swatch: '#ece6d8' },
    { id: 'paper', swatch: '#f0ece4' },
  ];

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
          Settings
        </span>
      </div>

      {/* Body */}
      <div className="max-w-150 mx-auto px-6 pb-20">
        <SectionLabel title="Appearance" />

        <Row label="Theme" description="Colour palette used across the app.">
          <div className="flex items-center gap-2">
            {palettes.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                title={p.id}
                className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                style={{
                  background: p.swatch,
                  border: palette === p.id ? '2px solid var(--ink)' : '1.5px solid var(--line-2)',
                }}
              />
            ))}
          </div>
        </Row>

        <Row label="Welcome style" description="Font used on the home screen greeting.">
          <Pill
            options={['serif', 'sans']}
            value={serifWelcome ? 'serif' : 'sans'}
            onChange={(v) => setSerifWelcome(v === 'serif')}
          />
        </Row>

        <SectionLabel title="Chat" />

        <Row label="Show sources"
             description="Display page citations below each AI response.">
          <Toggle value={showSources} onChange={setShowSources} />
        </Row>

        <Row label="Message density" description="Spacing between messages in the chat.">
          <Pill
            options={['compact', 'comfortable', 'roomy']}
            value={density}
            onChange={setDensity}
          />
        </Row>

        <SectionLabel title="About" />

        <Row label="Version">
          <span className="text-[13px] tabular-nums" style={{ color: 'var(--muted)' }}>1.0.0</span>
        </Row>

        <Row label="Model">
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>RAG · LangChain</span>
        </Row>
      </div>
    </div>
  );
}
