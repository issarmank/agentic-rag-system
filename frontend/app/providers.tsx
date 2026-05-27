'use client';
import { SettingsProvider } from '@/context/settings';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
