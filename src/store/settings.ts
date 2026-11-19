import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

export interface SettingsState {
  theme: Theme;
  locale: 'id-ID' | 'en-US';
  currency: string;
  decimals: number;
  analystName: string;
  setTheme: (t: Theme) => void;
  update: (patch: Partial<Omit<SettingsState, 'update' | 'setTheme'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: 'id-ID',
      currency: '$',
      decimals: 2,
      analystName: '',
      setTheme: (theme) => set({ theme }),
      update: (patch) => set(patch),
    }),
    { name: 'eoq-studio-settings', version: 1 },
  ),
);

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}
