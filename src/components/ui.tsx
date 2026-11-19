import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import katex from 'katex';
import { CircleAlert, Info, X, CircleCheck, TriangleAlert, Lightbulb } from 'lucide-react';
import { parseNumber, useFormatter } from '@/lib/format';
import type { Metric } from '@/store/history';

/* ---------- Card ---------- */
export function Card({ title, subtitle, actions, children, className, bodyClass }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5 sm:py-3.5">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex min-w-0 max-w-full shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(!(bodyClass && /(^|\s)p-\d/.test(bodyClass)) && 'p-4 sm:p-5', bodyClass)}>{children}</div>
    </section>
  );
}

/* ---------- Number field ---------- */
export function NumberField({ label, value, onChange, unit, hint, error, symbol, step, min, className, integer }: {
  label: ReactNode; value: number; onChange: (v: number) => void; unit?: string; hint?: ReactNode; error?: string;
  symbol?: string; step?: number; min?: number; className?: string; integer?: boolean;
}) {
  const id = useId();
  const fmt = useFormatter();
  const toText = (v: number) => (Number.isFinite(v) ? String(v).replace('.', fmt.locale === 'id-ID' ? ',' : '.') : '');
  const [text, setText] = useState(toText(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current && !(Number.isNaN(value) && Number.isNaN(last.current))) {
      setText(toText(value));
      last.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const commit = (t: string) => {
    setText(t);
    let v = parseNumber(t);
    if (integer && Number.isFinite(v)) v = Math.round(v);
    last.current = v;
    onChange(v);
  };
  const nudge = (dir: 1 | -1) => {
    const base = Number.isFinite(value) ? value : 0;
    const s = step ?? (Math.abs(base) >= 100 ? 10 : 1);
    let v = +(base + dir * s).toPrecision(12);
    if (min != null) v = Math.max(min, v);
    setText(toText(v));
    last.current = v;
    onChange(v);
  };
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {symbol && <span className="ml-1.5 font-mono text-[12px] text-slate-400">({symbol})</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className={clsx('input font-medium tabular-nums', unit ? 'pr-16' : 'pr-3', error && 'input-error')}
          value={text}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1); }
          }}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-d` : undefined}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">{unit}</span>
        )}
      </div>
      {(error || hint) && (
        <p id={`${id}-d`} className={clsx('mt-1 text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

/* ---------- Select ---------- */
export function SelectField<T extends string>({ label, value, onChange, options, className, hint }: {
  label?: ReactNode; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <select id={id} className="input pr-8" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, className, multiline, rows = 3 }: {
  label?: ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; className?: string; multiline?: boolean; rows?: number;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      {multiline
        ? <textarea id={id} rows={rows} className="input resize-y" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input id={id} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ value, onChange, options, size = 'md', className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: 'sm' | 'md'; className?: string;
}) {
  return (
    <div role="tablist" className={clsx('no-scrollbar inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'shrink-0 whitespace-nowrap rounded-md font-medium transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { value: T; label: ReactNode; short?: ReactNode; icon?: ReactNode }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="no-print no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={clsx(
            '-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-3.5',
            value === t.value
              ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          <span className="hidden sm:inline-flex">{t.icon}</span>
          {t.short ? <><span className="sm:hidden">{t.short}</span><span className="hidden sm:inline">{t.label}</span></> : t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Badge ---------- */
const badgeTone = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  blue: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-800',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800',
};
export function Badge({ tone = 'gray', children, className }: { tone?: keyof typeof badgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', badgeTone[tone], className)}>
      {typeof children === 'string' ? <span className="truncate">{children}</span> : children}
    </span>
  );
}

/* ---------- Callout ---------- */
const calloutStyle = {
  info: { cls: 'border-brand-200 bg-brand-50/70 text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100', Icon: Info },
  success: { cls: 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100', Icon: CircleCheck },
  warning: { cls: 'border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100', Icon: TriangleAlert },
  error: { cls: 'border-red-200 bg-red-50/70 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100', Icon: CircleAlert },
  insight: { cls: 'border-violet-200 bg-violet-50/70 text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100', Icon: Lightbulb },
};
export function Callout({ tone = 'info', title, children, className }: {
  tone?: keyof typeof calloutStyle; title?: ReactNode; children?: ReactNode; className?: string;
}) {
  const { cls, Icon } = calloutStyle[tone];
  return (
    <div className={clsx('flex gap-3 rounded-lg border px-4 py-3 text-sm', cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && 'mt-0.5', 'leading-relaxed opacity-90')}>{children}</div>}
      </div>
    </div>
  );
}

/* ---------- KaTeX ---------- */
export function Tex({ children, block = false, className }: { children: string; block?: boolean; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, { displayMode: block, throwOnError: false, strict: 'ignore' });
    } catch {
      return children;
    }
  }, [children, block]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------- Stat tiles ---------- */
export function Stat({ label, value, sub, accent, icon }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; accent?: boolean; icon?: ReactNode;
}) {
  return (
    <div className={clsx(
      'min-w-0 rounded-xl border p-3.5 sm:p-4',
      accent
        ? 'border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:border-brand-900 dark:from-brand-950/70 dark:to-slate-900'
        : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900',
    )}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-[12px]">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className={clsx('mt-1.5 truncate text-lg font-semibold sm:text-[22px] tabular-nums tracking-tight', accent ? 'text-brand-700 dark:text-brand-300' : 'text-slate-900 dark:text-white')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export function MetricValue({ m }: { m: Metric }) {
  const f = useFormatter();
  if (typeof m.value === 'string') return <>{m.value}</>;
  if (m.kind === 'money') return <>{f.money(m.value)}</>;
  if (m.kind === 'pct') return <>{f.pct(m.value)}</>;
  return <>{f.num(m.value, m.key === 'FC' ? 4 : undefined)}{m.unit ? <span className="ml-1 text-xs font-normal text-slate-400">{m.unit}</span> : null}</>;
}

/* ---------- Key–value list ---------- */
export function KV({ rows }: { rows: { label: ReactNode; value: ReactNode; strong?: boolean }[] }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
      {rows.map((r, k) => (
        <div key={k} className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-slate-500 dark:text-slate-400">{r.label}</dt>
          <dd className={clsx('text-right tabular-nums', r.strong ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200')}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={clsx('relative w-full rounded-t-2xl border sm:rounded-2xl border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900', wide ? 'max-w-3xl' : 'max-w-md')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn-ghost btn-sm -mr-2" onClick={onClose} aria-label="Tutup"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4 sm:max-h-[70vh]">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t pb-[max(0.75rem,env(safe-area-inset-bottom))] border-slate-100 px-5 pt-3 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
