import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModelKind } from '@/lib/models/common';

export type MetricKind = 'qty' | 'money' | 'num' | 'pct' | 'text';
export interface Metric { key: string; label: string; value: number | string; kind: MetricKind; unit?: string }

export interface HistoryEntry {
  id: string;
  kind: ModelKind;
  title: string;
  note: string;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
  input: unknown;
  metrics: Metric[];
}

interface HistoryState {
  entries: HistoryEntry[];
  add: (e: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'starred'>) => HistoryEntry;
  update: (id: string, patch: Partial<HistoryEntry>) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  toggleStar: (id: string) => void;
  clear: () => void;
  importMany: (entries: HistoryEntry[]) => number;
}

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

export const useHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      add: (e) => {
        const now = Date.now();
        const entry: HistoryEntry = { ...e, id: uid(), starred: false, createdAt: now, updatedAt: now };
        set({ entries: [entry, ...get().entries] });
        return entry;
      },
      update: (id, patch) =>
        set({ entries: get().entries.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)) }),
      remove: (id) => set({ entries: get().entries.filter((x) => x.id !== id) }),
      removeMany: (ids) => set({ entries: get().entries.filter((x) => !ids.includes(x.id)) }),
      toggleStar: (id) => set({ entries: get().entries.map((x) => (x.id === id ? { ...x, starred: !x.starred } : x)) }),
      clear: () => set({ entries: [] }),
      importMany: (incoming) => {
        const existing = new Set(get().entries.map((x) => x.id));
        const valid = incoming.filter((x) => x && x.id && x.kind && x.input && !existing.has(x.id));
        set({ entries: [...valid, ...get().entries].sort((a, b) => b.createdAt - a.createdAt) });
        return valid.length;
      },
    }),
    { name: 'eoq-studio-history', version: 1 },
  ),
);
