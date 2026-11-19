import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { GitCompareArrows } from 'lucide-react';
import type { ModelKind } from '@/lib/models/common';
import { MODELS, modelByKind } from '@/lib/registry';
import { useHistory } from '@/store/history';
import { useFormatter } from '@/lib/format';
import { Card, Empty, MetricValue, Segmented, SelectField } from '@/components/ui';
import { SimpleBar } from '@/components/charts';

const INPUT_LABEL: Record<string, string> = {
  period: 'Satuan waktu', D: 'Permintaan D', K: 'Biaya pesan/setup K', holdingMode: 'Mode biaya simpan', h: 'Biaya simpan h',
  p: 'Harga / nilai p', holdingRate: 'Biaya simpan (%)', L: 'Lead time L', leadUnit: 'Satuan lead time', I: 'Biaya simpan I (%)',
  r: 'Laju produksi r', s: 'Biaya kekurangan s', threshold: 'Ambang FC', periodLabel: 'Nama periode', truckCost: 'Biaya truk',
  mode: 'Metode', maxMultiplier: 'Batas pengali', tiers: 'Tingkat harga', products: 'Produk', demands: 'Data permintaan',
};
const HIDDEN = new Set(['evalQ', 'manualN', 'manualM']);

export default function ComparePage() {
  const entries = useHistory((s) => s.entries);
  const f = useFormatter();
  const [params] = useSearchParams();
  const initial = (params.get('ids') ?? '').split(',').filter(Boolean);
  const firstKind = entries.find((e) => initial.includes(e.id))?.kind;
  const [kind, setKind] = useState<ModelKind>(firstKind ?? (entries[0]?.kind ?? 'basic'));
  const [ids, setIds] = useState<string[]>(initial);
  const pool = entries.filter((e) => e.kind === kind);
  useEffect(() => { setIds((cur) => cur.filter((id) => pool.some((e) => e.id === id))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kind]);

  const chosen = pool.filter((e) => ids.includes(e.id));
  const metricKeys = chosen[0]?.metrics.map((m) => m.key) ?? [];
  const numericMetrics = chosen[0]?.metrics.filter((m) => typeof m.value === 'number') ?? [];
  const [chartKey, setChartKey] = useState<string>('');
  const activeKey = numericMetrics.some((m) => m.key === chartKey) ? chartKey : numericMetrics.find((m) => m.kind === 'money')?.key ?? numericMetrics[0]?.key;
  const activeMetric = numericMetrics.find((m) => m.key === activeKey);

  const inputKeys = useMemo(() => {
    const keys = new Set<string>();
    chosen.forEach((e) => Object.keys(e.input as object).forEach((k) => !HIDDEN.has(k) && keys.add(k)));
    return [...keys];
  }, [chosen]);

  const show = (v: unknown): string => {
    if (Array.isArray(v)) return `${v.length} item`;
    if (typeof v === 'number') return f.num(v, 4);
    if (v === 'absolute') return 'nominal';
    if (v === 'percent') return '% harga';
    if (v === 'optimize') return 'optimasi';
    return String(v ?? '–');
  };

  if (!entries.length) {
    return (
      <Card><Empty icon={<GitCompareArrows className="h-5 w-5" />} title="Belum ada data untuk dibandingkan" action={<Link to="/" className="btn-primary">Ke dashboard</Link>}>
        Simpan minimal dua analisis dari model yang sama, lalu bandingkan skenarionya di sini.
      </Empty></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Bandingkan skenario</h1>
        <p className="mt-1 text-sm text-slate-500">Pilih model, lalu centang hingga 6 analisis tersimpan untuk dibandingkan berdampingan.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card title="Pilih analisis" bodyClass="space-y-3">
          <SelectField<ModelKind> label="Model" value={kind} onChange={setKind}
            options={MODELS.map((m) => ({ value: m.kind, label: `${m.name} (${entries.filter((e) => e.kind === m.kind).length})` }))} />
          {pool.length === 0 ? <p className="text-sm text-slate-500">Belum ada analisis untuk model ini.</p> : (
            <ul className="max-h-[420px] space-y-1 overflow-y-auto">
              {pool.map((e) => (
                <li key={e.id}>
                  <label className={clsx('flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50', ids.includes(e.id) && 'bg-brand-50/70 dark:bg-brand-950/40')}>
                    <input type="checkbox" className="mt-0.5" checked={ids.includes(e.id)} disabled={!ids.includes(e.id) && ids.length >= 6}
                      onChange={() => setIds((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id]))} />
                    <span className="min-w-0"><span className="block truncate font-medium">{e.title}</span><span className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleDateString('id-ID')}</span></span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {chosen.length < 2 ? (
          <Card><Empty icon={<GitCompareArrows className="h-5 w-5" />} title="Pilih minimal dua analisis">Centang analisis {modelByKind(kind).name} di panel kiri.</Empty></Card>
        ) : (
          <div className="space-y-6">
            <Card title="Tabel perbandingan" bodyClass="p-0">
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead><tr><th>Parameter / hasil</th>{chosen.map((e) => <th key={e.id} className="num normal-case">{e.title}</th>)}</tr></thead>
                  <tbody>
                    <tr><td colSpan={chosen.length + 1} className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60">Input</td></tr>
                    {inputKeys.map((k) => {
                      const vals = chosen.map((e) => (e.input as Record<string, unknown>)[k]);
                      const differs = new Set(vals.map((v) => JSON.stringify(v))).size > 1;
                      return (
                        <tr key={k}>
                          <td className={clsx(differs && 'font-medium')}>{INPUT_LABEL[k] ?? k}{differs && <span className="ml-1.5 text-[10px] font-semibold uppercase text-amber-600">beda</span>}</td>
                          {vals.map((v, idx) => <td key={idx} className={clsx('num', differs && 'bg-amber-50/50 dark:bg-amber-950/20')}>{show(v)}</td>)}
                        </tr>
                      );
                    })}
                    <tr><td colSpan={chosen.length + 1} className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60">Hasil</td></tr>
                    {metricKeys.map((k) => {
                      const ms = chosen.map((e) => e.metrics.find((m) => m.key === k));
                      const nums = ms.map((m) => (typeof m?.value === 'number' ? m.value : NaN));
                      const isCost = ms[0]?.kind === 'money';
                      const best = isCost ? Math.min(...nums.filter(Number.isFinite)) : NaN;
                      return (
                        <tr key={k}>
                          <td>{ms[0]?.label}</td>
                          {ms.map((m, idx) => (
                            <td key={idx} className={clsx('num', isCost && nums[idx] === best && 'font-semibold text-emerald-700 dark:text-emerald-400')}>{m ? <MetricValue m={m} /> : '–'}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            {activeMetric && (
              <Card title={`Perbandingan: ${activeMetric.label}`}
                actions={numericMetrics.length > 1 && (
                  <Segmented size="sm" value={activeKey!} onChange={setChartKey} options={numericMetrics.slice(0, 4).map((m) => ({ value: m.key, label: m.label.split(' (')[0] }))} />
                )}>
                <SimpleBar data={chosen.map((e) => ({ name: e.title.length > 22 ? `${e.title.slice(0, 21)}…` : e.title, v: Number(e.metrics.find((m) => m.key === activeKey)?.value ?? 0) }))}
                  x="name" y="v" money={activeMetric.kind === 'money'} label={activeMetric.label} highlight={() => true} height={260} />
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
