import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowDown, BookOpen, ChevronDown, Copy, FileSpreadsheet, Printer, RotateCcw, Save, Sparkles, CircleAlert,
} from 'lucide-react';
import type { FieldErrors, ModelKind, Step } from '@/lib/models/common';
import { PRESETS_BY_KIND, type Preset } from '@/data/presets';
import { modelByKind } from '@/lib/registry';
import { useHistory } from '@/store/history';
import { toast } from '@/store/toast';
import { downloadCsv, slug, stamp, type CsvSection } from '@/lib/export';
import { formatDate } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { Badge, Callout, Modal, Tex, TextField } from './ui';

/* ---------- State hook ---------- */
export function useModel<I, R>(kind: ModelKind, defaults: I, validate: (i: I) => FieldErrors, solve: (i: I) => R) {
  const [params, setParams] = useSearchParams();
  const entries = useHistory((s) => s.entries);
  const [input, setInput] = useState<I>(() => structuredClone(defaults));
  const [source, setSource] = useState<{ type: 'history'; id: string; title: string } | { type: 'preset'; name: string } | null>(null);

  // Muat dari riwayat (?h=id) atau prefill parameter (?D=...)
  useEffect(() => {
    const hid = params.get('h');
    if (hid) {
      const e = entries.find((x) => x.id === hid && x.kind === kind);
      if (e) {
        setInput({ ...structuredClone(defaults), ...(structuredClone(e.input) as I) });
        setSource({ type: 'history', id: e.id, title: e.title });
      } else toast('Entri riwayat tidak ditemukan.', 'error');
      params.delete('h');
      setParams(params, { replace: true });
      return;
    }
    const pid = params.get('preset');
    if (pid) {
      const p = PRESETS_BY_KIND[kind].find((x) => x.id === pid);
      if (p) {
        setInput(structuredClone(p.input) as I);
        setSource({ type: 'preset', name: p.name });
      }
      setParams({}, { replace: true });
      return;
    }
    const prefill: Record<string, number> = {};
    params.forEach((v, k) => { const n = Number(v); if (Number.isFinite(n)) prefill[k] = n; });
    if (Object.keys(prefill).length) {
      setInput((cur) => ({ ...cur, ...prefill }));
      setSource(null);
      setParams({}, { replace: true });
      toast('Parameter dimuat dari analisis sebelumnya.', 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const errors = useMemo(() => validate(input), [input, validate]);
  const valid = Object.keys(errors).length === 0;
  const result = useMemo<R | null>(() => {
    if (!valid) return null;
    try { return solve(input); } catch { return null; }
  }, [input, valid, solve]);

  const patch = useCallback((p: Partial<I>) => setInput((cur) => ({ ...cur, ...p })), []);
  const reset = useCallback(() => { setInput(structuredClone(defaults)); setSource(null); }, [defaults]);
  const loadPreset = useCallback((p: Preset<I>) => {
    setInput(structuredClone(p.input));
    setSource({ type: 'preset', name: p.name });
    toast(`Contoh dimuat: ${p.name}`, 'info');
  }, []);

  return { input, setInput, patch, errors, valid, result, reset, loadPreset, source, setSource };
}

/* ---------- Page header ---------- */
export function ModelHeader<I>({ kind, presets, onPreset, onReset, source }: {
  kind: ModelKind; presets: Preset<I>[]; onPreset: (p: Preset<I>) => void; onReset: () => void;
  source: ReturnType<typeof useModel>['source'];
}) {
  const meta = modelByKind(kind);
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(true);
  const btnRef = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    // Buka ke arah yang masih muat di layar (penting di ponsel)
    if (r) setAlignRight(r.right - 320 >= 8);
    setOpen((o) => !o);
  };
  const Icon = meta.icon;
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
        <div className="shrink-0 rounded-xl bg-brand-600 p-2 text-white shadow-sm shadow-brand-600/30 sm:p-2.5"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{meta.name}</h1>
            <Badge tone="blue">Subbab {meta.section}</Badge>
            {source?.type === 'history' && <Badge tone="green">Dari riwayat: {source.title}</Badge>}
            {source?.type === 'preset' && <Badge tone="amber">{source.name}</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 sm:text-sm">{meta.description}</p>
        </div>
      </div>
      <div className="no-print flex w-full items-center gap-2 sm:w-auto">
        <div className="relative flex-1 sm:flex-none">
          <button ref={btnRef} className="btn-secondary w-full sm:w-auto" onClick={toggle} aria-expanded={open}>
            <Sparkles className="h-4 w-4 text-amber-500" /> Contoh soal <ChevronDown className="h-4 w-4 opacity-60" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <div className={clsx('absolute z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900', alignRight ? 'right-0' : 'left-0')}>
                <div className="max-h-[60vh] overflow-y-auto p-1.5">
                {presets.map((p) => (
                  <button key={p.id} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => { onPreset(p); setOpen(false); }}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-[11px] text-slate-400">{p.source}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{p.description}</span>
                  </button>
                ))}
                </div>
              </div>
            </>
          )}
        </div>
        <button className="btn-ghost" onClick={onReset} title="Kembalikan input awal"><RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">Reset</span></button>
      </div>
    </div>
  );
}

/* ---------- Action bar (simpan, CSV, cetak, salin) ---------- */
export function ResultActions<I>({ kind, input, source, setSource, defaultTitle, csv, summary, disabled }: {
  kind: ModelKind; input: I; source: ReturnType<typeof useModel>['source']; setSource: ReturnType<typeof useModel>['setSource'];
  defaultTitle: string; csv: () => CsvSection[]; summary: () => string; disabled?: boolean;
}) {
  const meta = modelByKind(kind);
  const { add, update, entries } = useHistory();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const existing = source?.type === 'history' ? entries.find((e) => e.id === source.id) : undefined;

  const openSave = () => {
    setTitle(existing?.title ?? (source?.type === 'preset' ? source.name : defaultTitle));
    setNote(existing?.note ?? '');
    setOpen(true);
  };
  const doSave = (asNew: boolean) => {
    const metrics = meta.metrics(input);
    const t = title.trim() || defaultTitle;
    if (existing && !asNew) {
      update(existing.id, { title: t, note, input: structuredClone(input), metrics });
      setSource({ type: 'history', id: existing.id, title: t });
      toast('Entri riwayat diperbarui.');
    } else {
      const e = add({ kind, title: t, note, input: structuredClone(input), metrics });
      setSource({ type: 'history', id: e.id, title: t });
      toast('Tersimpan ke riwayat.');
    }
    setOpen(false);
  };

  return (
    <>
      <div className="no-print grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center [&>button]:max-sm:flex-col [&>button]:max-sm:gap-1 [&>button]:max-sm:px-1 [&>button]:max-sm:py-2 [&>button]:max-sm:text-xs">
        <button className="btn-primary" onClick={openSave} disabled={disabled}><Save className="h-4 w-4" /> Simpan</button>
        <button className="btn-secondary" disabled={disabled}
          onClick={() => { downloadCsv(`${slug(meta.name)}-${stamp()}.csv`, csv()); toast('File CSV diunduh.'); }}>
          <FileSpreadsheet className="h-4 w-4" /> CSV
        </button>
        <button className="btn-secondary" disabled={disabled} onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> <span className="sm:hidden">Cetak</span><span className="hidden sm:inline">Cetak / PDF</span>
        </button>
        <button className="btn-secondary sm:btn-ghost sm:border-0 sm:bg-transparent sm:shadow-none" disabled={disabled}
          onClick={async () => { try { await navigator.clipboard.writeText(summary()); toast('Ringkasan disalin.'); } catch { toast('Clipboard tidak tersedia.', 'error'); } }}>
          <Copy className="h-4 w-4" /> <span className="sm:hidden">Salin</span><span className="hidden sm:inline">Salin ringkasan</span>
        </button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={existing ? 'Simpan perubahan' : 'Simpan ke riwayat'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>Batal</button>
            {existing && <button className="btn-secondary" onClick={() => doSave(true)}>Simpan sebagai baru</button>}
            <button className="btn-primary" onClick={() => doSave(false)}>{existing ? 'Perbarui entri' : 'Simpan'}</button>
          </>
        }>
        <div className="space-y-4">
          <TextField label="Judul analisis" value={title} onChange={setTitle} placeholder={defaultTitle} />
          <TextField label="Catatan (opsional)" value={note} onChange={setNote} multiline placeholder="Konteks, asumsi, atau keputusan…" />
          {existing && <p className="text-xs text-slate-500">Terakhir diubah {formatDate(existing.updatedAt)}.</p>}
        </div>
      </Modal>
    </>
  );
}

/* ---------- Steps ---------- */
export function StepsPanel({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, k) => (
        <li key={k} className="relative flex gap-3 sm:gap-4">
          <div className="flex flex-col items-center">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{k + 1}</span>
            {k < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-800" />}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="font-medium">{s.title}</p>
            {s.text && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{s.text}</p>}
            {s.tex && (
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-[0.85em] sm:px-4 sm:text-base dark:border-slate-800 dark:bg-slate-950/50">
                <Tex block>{s.tex}</Tex>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Layout ---------- */
export function ModelLayout({ inputs, results }: { inputs: ReactNode; results: ReactNode }) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);

  // Di layar kecil input dan hasil bertumpuk: tampilkan tombol mengambang "Lihat hasil"
  // selama bagian hasil belum terlihat.
  useEffect(() => {
    const el = resultsRef.current;
    if (!el) return;
    const mq = window.matchMedia('(max-width: 1279px)');
    const update = () => {
      if (!mq.matches) return setShowJump(false);
      setShowJump(el.getBoundingClientRect().top > window.innerHeight - 40);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      mq.removeEventListener('change', update);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="no-print min-w-0 xl:sticky xl:top-20 xl:self-start">{inputs}</aside>
      <div ref={resultsRef} className="min-w-0 scroll-mt-16 space-y-5 sm:space-y-6">{results}</div>
      {showJump && (
        <button
          className="no-print fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/30 transition hover:bg-brand-700 xl:hidden"
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Lihat hasil <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function InputCard({ children, formula }: { children: ReactNode; formula?: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5 sm:py-3.5">
        <h2 className="text-[15px] font-semibold">Parameter input</h2>
        <span className="text-xs text-slate-400">Hasil diperbarui otomatis</span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
      {formula && (
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 overflow-x-auto"><Tex>{formula}</Tex></div>
        </div>
      )}
    </div>
  );
}

export function InvalidState({ errors }: { errors: FieldErrors }) {
  const msgs = Array.from(new Set(Object.values(errors)));
  return (
    <div className="card p-8">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="rounded-full bg-red-50 p-3 text-red-500 dark:bg-red-950/50"><CircleAlert className="h-6 w-6" /></div>
        <p className="mt-3 font-semibold">Input belum valid</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">{msgs.map((m) => <li key={m}>{m}</li>)}</ul>
      </div>
    </div>
  );
}

export function PrintHeader({ title }: { title: string }) {
  const name = useSettings((s) => s.analystName);
  return (
    <div className="print-only mb-4 border-b pb-3">
      <p className="text-lg font-semibold">EOQ Studio — {title}</p>
      <p className="text-xs text-slate-500">Dicetak {formatDate(Date.now())}{name ? ` · Analis: ${name}` : ''}</p>
    </div>
  );
}

export function HoldingToggle({ mode, onChange }: { mode: 'absolute' | 'percent'; onChange: (m: 'absolute' | 'percent') => void }) {
  return (
    <div>
      <span className="label">Cara menyatakan biaya simpan</span>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
        {(['absolute', 'percent'] as const).map((m) => (
          <button key={m} type="button" onClick={() => onChange(m)}
            className={clsx('rounded-md px-2 py-1.5 text-[13px] font-medium transition', mode === m
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400')}>
            {m === 'absolute' ? 'Nominal (h)' : '% dari harga'}
          </button>
        ))}
      </div>
    </div>
  );
}

export { Callout };
