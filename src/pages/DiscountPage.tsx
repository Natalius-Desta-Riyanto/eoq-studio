import { useState } from 'react';
import { ChartLine, ListOrdered, Plus, Sigma, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { discountDefaults, solveDiscount, stepsDiscount, validateDiscount, type PriceTier } from '@/lib/models/discount';
import { discountPresets } from '@/data/presets';
import { useFormatter } from '@/lib/format';
import { Badge, Callout, Card, KV, NumberField, Stat, Tabs } from '@/components/ui';
import { InputCard, InvalidState, ModelHeader, ModelLayout, PrintHeader, ResultActions, StepsPanel, useModel } from '@/components/model';
import { CurveChart, SERIES, type SeriesDef } from '@/components/charts';

type Tab = 'summary' | 'charts' | 'steps';

export default function DiscountPage() {
  const m = useModel('discount', discountDefaults, validateDiscount, solveDiscount);
  const { input: i, patch, errors, result: r } = m;
  const f = useFormatter();
  const [tab, setTab] = useState<Tab>('summary');

  const setTier = (k: number, p: Partial<PriceTier>) => patch({ tiers: i.tiers.map((t, idx) => (idx === k ? { ...t, ...p } : t)) });
  const addTier = () => {
    const last = i.tiers[i.tiers.length - 1];
    patch({ tiers: [...i.tiers, { min: Math.max(1, (last?.min || 50) * 2), price: +((last?.price ?? 10) * 0.98).toFixed(2) }] });
  };
  const removeTier = (k: number) => patch({ tiers: i.tiers.filter((_, idx) => idx !== k) });

  const series: SeriesDef[] = r ? r.tiers.flatMap((t, k) => [
    { key: `act${t.index}`, label: `Harga p${t.index} = ${f.money(t.price)}`, color: SERIES[k], width: 2.5 },
    { key: `_tc${t.index}`, label: `TC${t.index}`, color: SERIES[k], dashed: true, width: 1, hideInLegend: true },
  ]) : [];

  return (
    <>
      <PrintHeader title="Model Diskon Kuantitas" />
      <ModelHeader kind="discount" presets={discountPresets} onPreset={m.loadPreset} onReset={m.reset} source={m.source} />
      <ModelLayout
        inputs={
          <InputCard formula="TC_i(q)=\frac{KD}{q}+Dp_i+\frac{q}{2}Ip_i">
            <NumberField label="Permintaan tahunan" symbol="D" unit="unit/tahun" value={i.D} onChange={(v) => patch({ D: v })} error={errors.D} />
            <NumberField label="Biaya pesan per pesanan" symbol="K" unit={f.currency} value={i.K} onChange={(v) => patch({ K: v })} error={errors.K} />
            <NumberField label="Biaya simpan" symbol="I" unit="% harga/tahun" value={i.I} onChange={(v) => patch({ I: v })} error={errors.I} />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label mb-0">Tingkat harga (all-units)</span>
                <button type="button" className="btn-ghost btn-sm" onClick={addTier}><Plus className="h-3.5 w-3.5" /> Tambah</button>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-[28px_1fr_1fr_32px] gap-2 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
                  <span>i</span><span>Mulai q ≥</span><span>Harga p<sub>i</sub></span><span />
                </div>
                {i.tiers.map((t, k) => (
                  <div key={k} className="grid grid-cols-[28px_1fr_1fr_32px] items-start gap-2 border-t border-slate-100 px-2.5 py-2 dark:border-slate-800">
                    <span className="pt-2 text-xs font-semibold text-slate-400">{k + 1}</span>
                    <NumberField label={<span className="sr-only">Batas bawah {k + 1}</span>} value={t.min} onChange={(v) => setTier(k, { min: v })}
                      error={errors[`tier-${k}-min`]} className="[&_label]:hidden" />
                    <NumberField label={<span className="sr-only">Harga {k + 1}</span>} value={t.price} onChange={(v) => setTier(k, { price: v })}
                      error={errors[`tier-${k}-price`]} className="[&_label]:hidden" step={0.5} />
                    <button type="button" className="btn-ghost btn-sm mt-0.5 px-1.5" disabled={i.tiers.length <= 1} onClick={() => removeTier(k)} aria-label={`Hapus tingkat ${k + 1}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Harga berlaku untuk seluruh unit pesanan bila q mencapai batas tingkat tersebut.</p>
            </div>
          </InputCard>
        }
        results={!r ? <InvalidState errors={errors} /> : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat accent label="Pesanan optimal q*" value={f.num(r.best.q)} sub={r.best.source === 'break' ? 'di titik putus harga' : 'EOQ admissible'} />
              <Stat label="Harga terpakai" value={f.money(i.tiers[r.best.tier - 1].price)} sub={`tingkat ${r.best.tier}`} />
              <Stat label="Pesanan / tahun" value={f.num(r.ordersPerYear)} sub={`setiap ${f.num(r.cycleYears * 12, 2)} bulan`} />
              <Stat label="Total biaya minimum" value={f.money(r.best.total)} sub={r.savingVsNoDiscount > 0 ? `hemat ${f.money(r.savingVsNoDiscount)} vs tanpa diskon` : undefined} />
            </div>

            <ResultActions kind="discount" input={i} source={m.source} setSource={m.setSource}
              defaultTitle={`Diskon Kuantitas · D=${f.num(i.D)} · ${i.tiers.length} tingkat`}
              csv={() => [
                { title: 'Input', headers: ['Parameter', 'Nilai'], rows: [['D', i.D], ['K', i.K], ['I (%)', i.I]] },
                { title: 'Analisis tingkat harga', headers: ['i', 'Batas bawah', 'Batas atas', 'Harga', 'EOQ_i', 'Status', 'q terbaik', 'TC'], rows: r.tiers.map((t) => [t.index, t.lower, Number.isFinite(t.upper) ? t.upper : 'inf', t.price, t.eoq, t.status, t.qBest, t.tcBest]) },
                { title: 'Kandidat', headers: ['Tingkat', 'q', 'Pesan', 'Pembelian', 'Simpan', 'Total'], rows: r.candidates.map((c) => [c.tier, c.q, c.ordering, c.purchase, c.holding, c.total]) },
                { title: 'Optimal', rows: [['q*', r.best.q], ['TC*', r.best.total], ['Pesanan per tahun', r.ordersPerYear]] },
              ]}
              summary={() => `Diskon kuantitas: q* = ${f.num(r.best.q)} unit pada harga ${f.money(i.tiers[r.best.tier - 1].price)}, ${f.num(r.ordersPerYear)} pesanan/tahun, TC minimum ${f.money(r.best.total)}.`}
            />

            <Tabs<Tab> value={tab} onChange={setTab} tabs={[
              { value: 'summary', label: 'Ringkasan', icon: <Sigma className="h-4 w-4" /> },
              { value: 'charts', label: 'Grafik', icon: <ChartLine className="h-4 w-4" /> },
              { value: 'steps', label: 'Langkah penyelesaian', icon: <ListOrdered className="h-4 w-4" /> },
            ]} />

            {tab === 'summary' && (
              <div className="space-y-6">
                <Card title="Perbandingan kandidat" subtitle="Algoritma buku: mulai dari harga termurah, turun hingga EOQ admissible" bodyClass="p-0">
                  <div className="overflow-x-auto">
                    <table className="table-base table-compact">
                      <thead><tr><th>Tingkat</th><th className="num">q kandidat</th><th>Asal</th><th className="num">Pemesanan</th><th className="num">Pembelian</th><th className="num">Penyimpanan</th><th className="num">Total</th></tr></thead>
                      <tbody>
                        {r.candidates.map((c) => {
                          const best = c === r.best;
                          return (
                            <tr key={c.tier} className={clsx(best && 'bg-emerald-50/70 font-semibold dark:bg-emerald-950/30')}>
                              <td className="whitespace-nowrap">p{c.tier} = {f.money(i.tiers[c.tier - 1].price)}</td>
                              <td className="num">{f.num(c.q)}</td>
                              <td><span className="flex gap-1">{c.source === 'eoq' ? <Badge tone="blue">EOQ</Badge> : <Badge>Titik putus</Badge>}{best && <Badge tone="green">optimal</Badge>}</span></td>
                              <td className="num">{f.money(c.ordering)}</td><td className="num">{f.money(c.purchase)}</td>
                              <td className="num">{f.money(c.holding)}</td>
                              <td className="num">{f.money(c.total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card title="Analisis seluruh tingkat harga" subtitle="Logika spreadsheet Qd.xls — q yang meminimumkan TC pada tiap interval" bodyClass="p-0">
                  <div className="overflow-x-auto">
                    <table className="table-base table-compact">
                      <thead><tr><th>i</th><th>Interval</th><th className="num">Harga</th><th className="num">h = I·p</th><th className="num">EOQ<sub>i</sub></th><th>Status</th><th className="num">q terbaik</th><th className="num">TC</th></tr></thead>
                      <tbody>
                        {r.tiers.map((t) => (
                          <tr key={t.index}>
                            <td>{t.index}</td>
                            <td className="whitespace-nowrap">{f.num(t.lower, 0)} ≤ q {Number.isFinite(t.upper) ? `< ${f.num(t.upper, 0)}` : ''}</td>
                            <td className="num">{f.money(t.price)}</td><td className="num">{f.money(t.hold)}</td>
                            <td className="num">{f.num(t.eoq)}</td>
                            <td>{t.status === 'admissible' ? <Badge tone="green">admissible</Badge> : t.status === 'below' ? <Badge tone="amber">di bawah interval</Badge> : <Badge tone="amber">di atas interval</Badge>}</td>
                            <td className="num">{f.num(t.qBest)}</td><td className="num">{f.money(t.tcBest)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card title="Kebijakan optimal">
                    <KV rows={[
                      { label: 'Ukuran pesanan', value: `${f.num(r.best.q)} unit`, strong: true },
                      { label: 'Harga per unit', value: f.money(i.tiers[r.best.tier - 1].price) },
                      { label: 'Banyak pesanan per tahun', value: f.num(r.ordersPerYear) },
                      { label: 'Selang antarpesanan', value: `${f.num(r.cycleYears * 12, 2)} bulan` },
                      { label: 'Total biaya tahunan', value: f.money(r.best.total), strong: true },
                    ]} />
                  </Card>
                  {(() => {
                    const eoqCand = r.candidates.find((c) => c.source === 'eoq');
                    if (!eoqCand || eoqCand === r.best) return (
                      <Callout tone="success" title="EOQ admissible adalah optimum">Tidak ada titik putus dengan harga lebih rendah yang menghasilkan total biaya lebih kecil.</Callout>
                    );
                    const extra = (r.best.ordering + r.best.holding) - (eoqCand.ordering + eoqCand.holding);
                    const saved = eoqCand.purchase - r.best.purchase;
                    return (
                      <Callout tone="insight" title="Mengapa titik putus menang?">
                        Memesan {f.num(r.best.q)} unit menaikkan biaya pesan + simpan sebesar {f.money(extra)}, tetapi biaya pembelian turun {f.money(saved)}.
                        Selisih bersih {f.money(saved - extra)} lebih hemat. Biaya pembelian mendominasi ({f.num((r.best.purchase / r.best.total) * 100, 1)}% dari TC), jadi potongan harga kecil pun dapat mengalahkan kenaikan biaya simpan.
                      </Callout>
                    );
                  })()}
                </div>
              </div>
            )}

            {tab === 'charts' && (
              <Card title="Total biaya tahunan TC(q)" subtitle="Garis tebal: bagian kurva yang benar-benar berlaku · putus-putus: TCᵢ di luar intervalnya">
                <CurveChart data={r.curve} x="q" xLabel="Kuantitas pesanan q" height={360} series={series}
                  optimum={{ x: r.best.q, y: r.best.total }}
                  refLines={i.tiers.slice(1).map((t, k) => ({ x: t.min, label: `b${k + 1}` }))} />
              </Card>
            )}

            {tab === 'steps' && <Card title="Langkah penyelesaian"><StepsPanel steps={stepsDiscount(i, r, f.tex)} /></Card>}
          </>
        )}
      />
    </>
  );
}
