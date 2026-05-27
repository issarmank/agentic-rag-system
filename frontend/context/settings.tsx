'use client';
import { createContext, useContext, useSyncExternalStore, useCallback, useEffect } from 'react';

export type Palette = 'bone' | 'sand' | 'linen' | 'paper';
export type Theme = 'light' | 'dark';
export type Density = 'compact' | 'comfortable' | 'roomy';

export interface Settings {
  palette: Palette;
  theme: Theme;
  serifWelcome: boolean;
  showSources: boolean;
  density: Density;
}

const DEFAULTS: Settings = {
  palette: 'bone',
  theme: 'light',
  serifWelcome: true,
  showSources: true,
  density: 'comfortable',
};

const PALETTE_VARS: Record<Palette, Record<string, string>> = {
  bone:  { '--bg': '#faf7f2', '--panel': '#f1ebe1', '--panel-2': '#ece4d6' },
  sand:  { '--bg': '#faf6ec', '--panel': '#eadfc9', '--panel-2': '#e0d3b6' },
  linen: { '--bg': '#f9f4ed', '--panel': '#ece6d8', '--panel-2': '#e2d9c8' },
  paper: { '--bg': '#f9f5ee', '--panel': '#f0ece4', '--panel-2': '#e6e0d4' },
};

const LIGHT_INK = {
  '--ink':         '#2b2520',
  '--ink-soft':    '#5a4f44',
  '--muted':       '#8a7f72',
  '--line':        'rgba(43,37,32,0.08)',
  '--line-2':      'rgba(43,37,32,0.14)',
  '--accent':      'oklch(0.58 0.13 45)',
  '--accent-soft': 'oklch(0.94 0.03 60)',
};

const DARK_VARS = {
  '--bg':          '#1a1714',
  '--panel':       '#231f1b',
  '--panel-2':     '#2c2823',
  '--ink':         '#e8e0d6',
  '--ink-soft':    '#b0a89a',
  '--muted':       '#7a7068',
  '--line':        'rgba(255,255,255,0.08)',
  '--line-2':      'rgba(255,255,255,0.14)',
  '--accent':      'oklch(0.68 0.13 45)',
  '--accent-soft': 'oklch(0.22 0.05 45)',
};

function applyVars(s: Settings) {
  const root = document.documentElement;
  const vars =
    s.theme === 'dark'
      ? DARK_VARS
      : { ...PALETTE_VARS[s.palette], ...LIGHT_INK };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

// ---------------------------------------------------------------------------
// Module-level external store — lives outside React, no setState in effects
// ---------------------------------------------------------------------------

function readStorage(): Settings {
  try {
    const raw = localStorage.getItem('app-settings');
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let _current: Settings = DEFAULTS;
const _listeners = new Set<() => void>();

// Initialise from localStorage on the client as soon as this module loads
if (typeof window !== 'undefined') {
  _current = readStorage();
}

function getSnapshot(): Settings { return _current; }
function getServerSnapshot(): Settings { return DEFAULTS; }
function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function writeSettings(next: Settings) {
  _current = next;
  localStorage.setItem('app-settings', JSON.stringify(next));
  _listeners.forEach(fn => fn());
  applyVars(next);
}

// ---------------------------------------------------------------------------
// Context + Provider
// ---------------------------------------------------------------------------

interface SettingsCtx {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Apply CSS vars on mount and whenever settings change
  useEffect(() => { applyVars(settings); }, [settings]);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    writeSettings({ ..._current, [key]: value });
  }, []);

  return <Ctx.Provider value={{ settings, set }}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
