'use client';

interface WelcomeProps {
  onPick: (text: string) => void;
  serif?: boolean;
}

export default function Welcome({ onPick, serif = true }: WelcomeProps) {
  return (
    <div className="flex-1 grid place-items-center px-6">
      <div className="max-w-[680px] w-full text-center">
        <h1
          className={
            serif
              ? 'font-serif text-[44px] sm:text-[56px] leading-[1.05] tracking-tight'
              : 'text-[34px] font-medium tracking-tight'
          }
          style={{ color: 'var(--ink)' }}
        >
          {serif ? (
            <>
              Ask anything about your{' '}
              <span style={{ color: 'var(--accent)' }}>document</span>.
            </>
          ) : (
            <>Ask anything.</>
          )}
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--ink-soft)' }}>
          Drop a PDF, then ask away. Answers stay grounded to your document.
        </p>
      </div>
    </div>
  );
}
