import { useEffect, useState, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps,
} from 'recharts';
import { useFormatter } from '@/lib/format';

/** true untuk layar sempit (< 640px): grafik memakai margin, sumbu, dan legenda yang lebih ringkas. */
export function useNarrow(bp = 640) {
  const q = `(max-width: ${bp - 1}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setNarrow(mq.matches);
    h();
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return narrow;
}

export const SERIES = Array.from({ length: 8 }, (_, k) => `var(--series-${k + 1})`);

export interface SeriesDef { key: string; label: string; color?: string; dashed?: boolean; width?: number; hideInLegend?: boolean }

function compact(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { notation: Math.abs(n) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: Math.abs(n) < 10 ? 2 : 1 }).format(n);
}

function ChartTooltip({ active, payload, label, xLabel, valueFmt, xFmt }: TooltipProps<number, string> & {
  xLabel: string; valueFmt: (n: number) => string; xFmt: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value != null && !String(p.dataKey ?? '').startsWith('_'));
  const seen = new Set<string>();
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">{xLabel} = <span className="tabular-nums text-slate-900 dark:text-white">{xFmt(Number(label))}</span></p>
      {items.map((p) => {
        const name = String(p.name);
        if (seen.has(name)) return null;
        seen.add(name);
        return (
          <div key={name} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{name}
            </span>
            <span className="font-medium tabular-nums text-slate-900 dark:text-white">{valueFmt(Number(p.value))}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Sumbu dengan langkah "bagus" (1–2–5) dan sedikit ruang di atas/bawah. */
function niceAxis(min: number, max: number) {
  const span = Math.max(max - min, 1e-9);
  const raw = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const lo = min < 0 ? Math.floor((min - span * 0.05) / step) * step : 0;
  const hi = Math.ceil((max + span * 0.05) / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(+t.toPrecision(10));
  return { lo, hi, ticks };
}

export function ChartFrame({ height = 300, children }: { height?: number; children: ReactNode }) {
  return <div style={{ height }} className="w-full">{children as never}</div>;
}

/** Kurva biaya terhadap kuantitas (atau variabel lain) dengan penanda optimum. */
export function CurveChart({ data, x, series, xLabel, yLabel, optimum, height = 300, money = true, refLines = [], yDomain }: {
  data: Record<string, number | null>[]; x: string; series: SeriesDef[]; xLabel: string; yLabel?: string;
  optimum?: { x: number; y: number; label?: string }; height?: number; money?: boolean;
  refLines?: { x: number; label: string }[]; yDomain?: [number | string, number | string];
}) {
  const f = useFormatter();
  const narrow = useNarrow();
  const vf = (n: number) => (money ? f.money(n) : f.num(n));
  const legendItems = series.filter((s) => !s.hideInLegend);
  const h = narrow ? Math.min(height, 260) + (legendItems.length > 1 ? 24 * Math.ceil(legendItems.length / 2) : 0) : height;
  return (
    <ChartFrame height={h}>
      <ResponsiveContainer>
        <LineChart data={data} margin={narrow ? { top: 12, right: 8, bottom: 18, left: -8 } : { top: 16, right: 18, bottom: 22, left: 8 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey={x} type="number" domain={['dataMin', 'dataMax']} tickLine={false} minTickGap={narrow ? 24 : 5}
            axisLine={{ stroke: 'var(--chart-axis)' }} tickFormatter={(v) => compact(v, f.locale)}
            label={{ value: xLabel, position: 'insideBottom', offset: -12, fill: 'var(--chart-muted)', fontSize: 12 }}
          />
          <YAxis
            tickLine={false} axisLine={false} width={narrow ? 48 : 64} tickFormatter={(v) => compact(v, f.locale)} domain={yDomain ?? ['auto', 'auto']}
            label={yLabel && !narrow ? { value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--chart-muted)', fontSize: 12, dx: 2, dy: 30 } : undefined}
          />
          <Tooltip
            cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
            content={<ChartTooltip xLabel={xLabel} valueFmt={vf} xFmt={(n) => f.num(n)} />}
          />
          <Legend verticalAlign={narrow ? 'bottom' : 'top'} align={narrow ? 'left' : 'right'} height={narrow ? undefined : 28} iconType="plainline" iconSize={16}
            wrapperStyle={narrow ? { paddingTop: 22, fontSize: 12, lineHeight: '18px' } : undefined}
            payload={legendItems.map((s, k) => ({
              value: s.label, type: 'plainline', color: s.color ?? SERIES[k], id: s.key,
              payload: { strokeDasharray: s.dashed ? '5 4' : '0' } as never,
            }))}
          />
          {refLines.map((r) => (
            <ReferenceLine key={r.label} x={r.x} stroke="var(--chart-axis)" strokeDasharray="3 3"
              label={{ value: r.label, position: 'insideTopLeft', fill: 'var(--chart-muted)', fontSize: 11 }} />
          ))}
          {series.map((s, k) => (
            <Line
              key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? SERIES[k]}
              strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? '5 4' : undefined} dot={false}
              activeDot={s.dashed ? false : { r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
              isAnimationActive={false} connectNulls={false} legendType="plainline"
            />
          ))}
          {optimum && (
            <>
              <ReferenceLine x={optimum.x} stroke="var(--chart-muted)" strokeDasharray="4 4" />
              <ReferenceDot x={optimum.x} y={optimum.y} r={6} fill="var(--series-1)" stroke="var(--chart-surface)" strokeWidth={2}
                label={{ value: optimum.label ?? 'q*', position: 'top', fill: 'var(--chart-ink)', fontSize: 12, fontWeight: 600, offset: 10 }} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Pola persediaan I(t) terhadap waktu. */
export function InventoryChart({ data, height = 260, refs = [], xLabel = 'Waktu', unitLabel = 'unit', negative }: {
  data: { t: number; I: number }[]; height?: number; refs?: { y: number; label: string; tone?: 'warn' | 'muted' }[];
  xLabel?: string; unitLabel?: string; negative?: boolean;
}) {
  const f = useFormatter();
  const narrow = useNarrow();
  const axis = niceAxis(Math.min(0, ...data.map((d) => d.I)), Math.max(...data.map((d) => d.I), ...refs.map((r) => r.y)));
  return (
    <ChartFrame height={narrow ? Math.min(height, 230) : height}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={narrow ? { top: 12, right: 8, bottom: 18, left: -8 } : { top: 16, right: 18, bottom: 22, left: 8 }}>
          <defs>
            <linearGradient id="invFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} minTickGap={narrow ? 24 : 5}
            tickFormatter={(v) => f.num(v, 3)}
            label={{ value: xLabel, position: 'insideBottom', offset: -12, fill: 'var(--chart-muted)', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={narrow ? 44 : 56} tickFormatter={(v) => compact(v, f.locale)}
            domain={[axis.lo, axis.hi]} ticks={axis.ticks} />
          <Tooltip content={<ChartTooltip xLabel="t" valueFmt={(n) => `${f.num(n)} ${unitLabel}`} xFmt={(n) => f.num(n, 4)} />} />
          {negative && <ReferenceLine y={0} stroke="var(--chart-axis)" />}
          {refs.map((r) => (
            <ReferenceLine key={r.label} y={r.y} stroke={r.tone === 'warn' ? 'var(--series-2)' : 'var(--chart-muted)'} strokeDasharray="5 4"
              label={{ value: r.label, position: r.y < 0 ? 'insideBottomRight' : 'insideTopRight', fill: 'var(--chart-ink-2)', fontSize: 11 }} />
          ))}
          <Area type="linear" dataKey="I" name="Persediaan I(t)" stroke="var(--series-1)" strokeWidth={2} fill="url(#invFill)" isAnimationActive={false} baseValue={0} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Batang sederhana satu seri (warna tunggal; highlight opsional). */
export function SimpleBar({ data, x, y, height = 240, money = false, highlight, label, colorFor, horizontal }: {
  data: Record<string, number | string>[]; x: string; y: string; height?: number; money?: boolean; highlight?: (row: Record<string, number | string>) => boolean;
  label: string; colorFor?: (row: Record<string, number | string>, k: number) => string; horizontal?: boolean;
}) {
  const f = useFormatter();
  const narrow = useNarrow();
  const vf = (n: number) => (money ? f.money(n) : f.num(n));
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 10, right: 16, bottom: 4, left: horizontal ? 8 : 0 }} barCategoryGap="28%">
          <CartesianGrid stroke="var(--chart-grid)" vertical={!!horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => compact(v, f.locale)} allowDecimals={false} />
              <YAxis type="category" dataKey={x} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} width={narrow ? 84 : 110} />
            </>
          ) : (
            <>
              <XAxis dataKey={x} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval={narrow ? 'preserveStartEnd' : 0} />
              <YAxis tickLine={false} axisLine={false} width={narrow ? 40 : 56} tickFormatter={(v) => compact(v, f.locale)} allowDecimals={false} />
            </>
          )}
          <Tooltip cursor={{ fill: 'var(--chart-grid)', opacity: 0.5 }}
            content={({ active, payload, label: l }) => active && payload?.length ? (
              <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
                <p className="font-medium text-slate-500">{String(l)}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-slate-900 dark:text-white">{label}: {vf(Number(payload[0].value))}</p>
              </div>
            ) : null} />
          <Bar dataKey={y} name={label} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false} maxBarSize={48}>
            {data.map((row, k) => (
              <Cell key={k} fill={colorFor ? colorFor(row, k) : highlight?.(row) ? 'var(--series-1)' : 'color-mix(in srgb, var(--series-1) 45%, transparent)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
