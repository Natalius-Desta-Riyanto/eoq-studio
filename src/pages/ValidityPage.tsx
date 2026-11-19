import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChartColumn, ListOrdered } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { parseDemands, solveValidity, stepsValidity, validateValidity, validityDefaults } from '@/lib/models/validity';
import { validityPresets } from '@/data/presets';
import { useFormatter } from '@/lib/format';
import { Callout, Card, KV, NumberField, Stat, Tabs, TextField } from '@/components/ui';
import { InputCard, InvalidState, ModelHeader, ModelLayout, PrintHeader, ResultActions, StepsPanel, useModel } from '@/components/model';

type Tab = 'summary' | 'steps';

export default function ValidityPage() {
  const m = useModel('validity', validityDefaults, validateValidity, solveValidity);
  const { input: i, patch, errors, result: r } = m;
  const f = useFormatter();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('summary');
  const [text, setText] = useState(i.demands.join(', '));
  useEffect(() => {
    // sinkronkan teks saat contoh/riwayat dimuat
    if (parseDemands(text).join(',') !== i.demands.join(',')) setText(i.demands.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i.demands]);

  const label = i.periodLabel || 'Periode';
  const gaugePct = r ? Math.min(100, (r.FC / (i.threshold * 2)) * 100) : 0;

  return (
    <>
      <PrintHeader title="Validitas Model EOQ" />
      <ModelHeader kind="validity" presets={validityPresets} onPreset={m.loadPreset} onReset={m.reset} source={m.source} />
      <ModelLayout
        inputs={
          <InputCard formula="FC=\dfrac{\widehat{\mathrm{var}}\,D}{\bar d^{\,2}}<0{,}20">
            <TextField label="Data permintaan historis" multiline rows={5} value={text}
              onChange={(t) => { setText(t); patch({ demands: parseDemands(t) }); }}
              placeholder="Contoh: 80, 100, 130, 90 — pisahkan dengan koma, spasi, atau baris baru" />
            {errors.demands ? <p className="-mt-2 text-xs text-red-600 dark:text-red-400">{errors.demands}</p>
              : <p className="-mt-2 text-xs text-slate-500">{i.demands.length} periode terbaca. Bisa ditempel langsung dari Excel.</p>}
            <TextField label="Nama periode" value={i.periodLabel} onChange={(v) => patch({ periodLabel: v })} placeholder="Kuartal, Bulan, Minggu…" />
            <NumberField label="Ambang batas" symbol="FC" value={i.threshold} onChange={(v) => patch({ threshold: v })} error={errors.threshold} step={0.05}
              hint="Peterson & Silver (1998) menyarankan 0,20." />
          </InputCard>
        }
        results={!r ? <InvalidState errors={errors} /> : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat accent label="Koefisien FC" value={f.num(r.FC, 4)} sub={`ambang ${f.num(i.threshold, 2)}`} />
              <Stat label={`Rata-rata / ${label.toLowerCase()}`} value={f.num(r.mean)} sub={`${r.n} periode`} />
              <Stat label="Varians (est.)" value={f.num(r.variance)} sub={`simpangan baku ${f.num(r.sd)}`} />
              <Stat label="Total permintaan" value={f.num(r.sum)} sub={`koef. variasi ${f.num(r.cv * 100, 1)}%`} />
            </div>

            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Keputusan</p>
                  <p className={`mt-1 text-lg font-semibold ${r.valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {r.valid ? '✓ Asumsi permintaan konstan wajar — model EOQ layak' : '✕ Variabilitas tinggi — model EOQ tidak memadai'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {r.valid ? 'Gunakan EOQ dengan D = total permintaan tahunan.' : 'Pertimbangkan pemrograman dinamis (Wagner–Whitin) atau heuristik Silver–Meal.'}
                  </p>
                </div>
                {r.valid && (
                  <button className="btn-primary no-print" onClick={() => nav(`/model/eoq-dasar?D=${r.sum}`)}>
                    Lanjut ke EOQ Dasar (D = {f.num(r.sum)}) <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="px-5 pb-5">
                <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-300 dark:from-emerald-900 dark:via-amber-900 dark:to-red-900">
                  <div className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded bg-slate-400" style={{ left: '50%' }} title="ambang" />
                  <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-slate-900 shadow dark:border-slate-900 dark:bg-white" style={{ left: `${gaugePct}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500"><span>0</span><span>ambang {f.num(i.threshold, 2)}</span><span>≥ {f.num(i.threshold * 2, 2)}</span></div>
              </div>
            </div>

            <ResultActions kind="validity" input={i} source={m.source} setSource={m.setSource}
              defaultTitle={`Validitas EOQ · ${r.n} ${label.toLowerCase()}`}
              csv={() => [
                { title: 'Data', headers: [label, 'd', 'd^2', 'd - mean'], rows: r.rows.map((x) => [x.period, x.d, x.d2, x.dev]) },
                { title: 'Hasil', headers: ['Metrik', 'Nilai'], rows: [['n', r.n], ['Rata-rata', r.mean], ['Varians', r.variance], ['FC', r.FC], ['Ambang', i.threshold], ['Keputusan', r.valid ? 'EOQ layak' : 'EOQ tidak layak']] },
              ]}
              summary={() => `Validitas EOQ: d̄ = ${f.num(r.mean)}, var = ${f.num(r.variance)}, FC = ${f.num(r.FC, 4)} ${r.valid ? '<' : '≥'} ${f.num(i.threshold, 2)} ⇒ ${r.valid ? 'EOQ layak' : 'EOQ tidak layak'}.`}
            />

            <Tabs<Tab> value={tab} onChange={setTab} tabs={[
              { value: 'summary', label: 'Data & grafik', icon: <ChartColumn className="h-4 w-4" /> },
              { value: 'steps', label: 'Langkah penyelesaian', icon: <ListOrdered className="h-4 w-4" /> },
            ]} />

            {tab === 'summary' && (
              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <Card title={`Permintaan per ${label.toLowerCase()}`} subtitle="Garis putus-putus = rata-rata d̄">
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={r.rows.map((x) => ({ name: `${label.slice(0, 3)} ${x.period}`, d: x.d }))} margin={{ top: 16, right: 12, bottom: 4, left: 0 }} barCategoryGap="22%">
                        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval="preserveStartEnd" />
                        <YAxis tickLine={false} axisLine={false} width={48} />
                        <Tooltip cursor={{ fill: 'var(--chart-grid)', opacity: 0.5 }} content={({ active, payload, label: l }) => active && payload?.length ? (
                          <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
                            <p className="text-slate-500">{String(l)}</p>
                            <p className="font-semibold tabular-nums">Permintaan: {f.num(Number(payload[0].value))}</p>
                            <p className="tabular-nums text-slate-500">Selisih dari d̄: {f.num(Number(payload[0].value) - r.mean)}</p>
                          </div>
                        ) : null} />
                        <Bar dataKey="d" fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={56} />
                        <ReferenceLine y={r.mean} stroke="var(--chart-ink-2)" strokeDasharray="5 4" label={{ value: `d̄ = ${f.num(r.mean)}`, position: 'insideTopRight', fill: 'var(--chart-ink-2)', fontSize: 11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Tabel perhitungan" bodyClass="p-0">
                  <div className="max-h-[320px] overflow-auto">
                    <table className="table-base table-compact">
                      <thead className="sticky top-0"><tr><th>{label}</th><th className="num">dᵢ</th><th className="num">dᵢ²</th><th className="num">dᵢ − d̄</th></tr></thead>
                      <tbody>
                        {r.rows.map((x) => <tr key={x.period}><td>{x.period}</td><td className="num">{f.num(x.d)}</td><td className="num">{f.num(x.d2)}</td><td className="num">{f.num(x.dev)}</td></tr>)}
                        <tr className="bg-slate-50 font-semibold dark:bg-slate-900/60"><td>Σ</td><td className="num">{f.num(r.sum)}</td><td className="num">{f.num(r.sumSq)}</td><td className="num">0</td></tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card title="Statistik" className="lg:col-span-2">
                  <div className="grid gap-6 md:grid-cols-2">
                    <KV rows={[
                      { label: 'n', value: r.n },
                      { label: 'Rata-rata d̄', value: f.num(r.mean) },
                      { label: 'Σ dᵢ²', value: f.num(r.sumSq) },
                    ]} />
                    <KV rows={[
                      { label: 'Est. var D = Σdᵢ²/n − d̄²', value: f.num(r.variance) },
                      { label: 'FC = var / d̄²', value: f.num(r.FC, 4), strong: true },
                      { label: 'Keputusan', value: r.valid ? 'EOQ layak' : 'EOQ tidak layak', strong: true },
                    ]} />
                  </div>
                  <Callout className="mt-4" tone="info">FC adalah kuadrat koefisien variasi (σ/d̄)². Varians memakai pembagi n sesuai prosedur Peterson & Silver pada materi.</Callout>
                </Card>
              </div>
            )}

            {tab === 'steps' && <Card title="Langkah penyelesaian"><StepsPanel steps={stepsValidity(i, r, f.tex)} /></Card>}
          </>
        )}
      />
    </>
  );
}
