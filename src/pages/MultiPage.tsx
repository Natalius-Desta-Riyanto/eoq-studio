import { useState } from 'react';
import { ChartLine, ListOrdered, Plus, Sigma, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { multiDefaults, solveMulti, stepsMulti, validateMulti, type Product } from '@/lib/models/multi';
import { multiPresets } from '@/data/presets';
import { useFormatter } from '@/lib/format';
import { Badge, Callout, Card, NumberField, Segmented, Stat, Tabs } from '@/components/ui';
import { InputCard, InvalidState, ModelHeader, ModelLayout, PrintHeader, ResultActions, StepsPanel, useModel } from '@/components/model';
import { CurveChart, SimpleBar } from '@/components/charts';

type Tab = 'summary' | 'charts' | 'steps';

export default function MultiPage() {
  const m = useModel('multi', multiDefaults, validateMulti, solveMulti);
  const { input: i, patch, errors, result: r } = m;
  const f = useFormatter();
  const [tab, setTab] = useState<Tab>('summary');

  const setProduct = (k: number, p: Partial<Product>) => patch({ products: i.products.map((x, idx) => (idx === k ? { ...x, ...p } : x)) });
  const addProduct = () => {
    const n = i.products.length + 1;
    patch({ products: [...i.products, { name: `Produk ${n}`, D: 500, unitCost: 100, holdingRate: 20, orderCost: 100 }], manualM: [...i.manualM, 1] });
  };
  const removeProduct = (k: number) => patch({
    products: i.products.filter((_, idx) => idx !== k),
    manualM: i.manualM.filter((_, idx) => idx !== k - 1),
  });

  return (
    <>
      <PrintHeader title="Model Pemesanan Multi-Produk" />
      <ModelHeader kind="multi" presets={multiPresets} onPreset={m.loadPreset} onReset={m.reset} source={m.source} />
      <ModelLayout
        inputs={
          <InputCard formula="TC = n\big(K_T+\sum_j K_j/m_j\big)+\frac1n\sum_j \frac{h_jD_jm_j}{2}">
            <NumberField label="Biaya pengiriman gabungan (truk)" symbol="K_T" unit={`${f.currency}/pengiriman`} value={i.truckCost} onChange={(v) => patch({ truckCost: v })} error={errors.truckCost} />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label mb-0">Produk</span>
                <button type="button" className="btn-ghost btn-sm" onClick={addProduct} disabled={i.products.length >= 8}><Plus className="h-3.5 w-3.5" /> Tambah</button>
              </div>
              <div className="space-y-3">
                {i.products.map((p, k) => (
                  <div key={k} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="mb-2 flex items-center gap-2">
                      <input className="input py-1.5 font-medium" value={p.name} onChange={(e) => setProduct(k, { name: e.target.value })} aria-label={`Nama produk ${k + 1}`} />
                      {k === 0 && <Badge tone="blue">acuan</Badge>}
                      <button type="button" className="btn-ghost btn-sm px-1.5" disabled={i.products.length <= 2} onClick={() => removeProduct(k)} aria-label="Hapus produk"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 [&_.label]:text-xs">
                      <NumberField label="Permintaan/thn" value={p.D} onChange={(v) => setProduct(k, { D: v })} error={errors[`p-${k}-D`]} />
                      <NumberField label="Biaya unit" value={p.unitCost} onChange={(v) => setProduct(k, { unitCost: v })} error={errors[`p-${k}-unitCost`]} />
                      <NumberField label="Simpan (%/thn)" value={p.holdingRate} onChange={(v) => setProduct(k, { holdingRate: v })} error={errors[`p-${k}-holdingRate`]} />
                      <NumberField label="Biaya pesan produk" value={p.orderCost} onChange={(v) => setProduct(k, { orderCost: v })} error={errors[`p-${k}-orderCost`]} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Produk pertama menjadi acuan dan ikut dalam setiap pengiriman.</p>
            </div>
            <div>
              <span className="label">Metode</span>
              <Segmented value={i.mode} onChange={(mode) => patch({ mode })} className="w-full [&>button]:flex-1"
                options={[{ value: 'optimize', label: 'Optimasi otomatis' }, { value: 'manual', label: 'Trial manual' }]} />
            </div>
            {i.mode === 'optimize' ? (
              <NumberField label="Batas atas pengali mⱼ" value={i.maxMultiplier} onChange={(v) => patch({ maxMultiplier: v })} error={errors.maxMultiplier} integer min={1}
                hint="Semua kombinasi pengali bulat 1…batas diperiksa (pengganti Evolutionary Solver)." />
            ) : (
              <>
                <NumberField label={`Frekuensi pesanan ${i.products[0]?.name ?? 'acuan'}`} symbol="n" unit="kali/tahun" value={i.manualN} onChange={(v) => patch({ manualN: v })} error={errors.manualN} />
                <div className="grid grid-cols-2 gap-2">
                  {i.products.slice(1).map((p, k) => (
                    <NumberField key={k} label={`${p.name}: tiap … pengiriman`} value={i.manualM[k] ?? 1} integer min={1}
                      onChange={(v) => { const mm = [...i.manualM]; mm[k] = v; patch({ manualM: mm }); }} error={errors[`m-${k}`]} />
                  ))}
                </div>
              </>
            )}
          </InputCard>
        }
        results={!r ? <InvalidState errors={errors} /> : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat accent label="Total biaya tahunan" value={f.money(r.plan.total)} sub={i.mode === 'optimize' ? 'optimal' : 'hasil trial'} />
              <Stat label={`Pengiriman / tahun`} value={f.num(r.plan.n, 4)} sub={`setiap ${f.num(365 / r.plan.n, 1)} hari`} />
              <Stat label="Pengali (m)" value={r.plan.m.join(' : ')} sub="produk ikut tiap m pengiriman" />
              <Stat label="Hemat vs pesan terpisah" value={f.money(r.saving)} sub={`${f.num((r.saving / r.separate.total) * 100, 1)}% lebih murah`} />
            </div>

            <ResultActions kind="multi" input={i} source={m.source} setSource={m.setSource}
              defaultTitle={`Multi-Produk · ${i.products.length} produk`}
              csv={() => [
                { title: 'Input produk', headers: ['Produk', 'D', 'Biaya unit', 'Simpan %', 'Biaya pesan'], rows: i.products.map((p) => [p.name, p.D, p.unitCost, p.holdingRate, p.orderCost]) },
                { title: 'Biaya truk', rows: [['K_T', i.truckCost]] },
                { title: 'Kebijakan', headers: ['Produk', 'm', 'Pesanan/thn', 'Q', 'Persediaan rata-rata', 'Biaya simpan', 'Biaya pesan produk'], rows: r.rows.map((x) => [x.name, x.m, x.ordersPerYear, x.Q, x.avgInv, x.holding, x.ordering]) },
                { title: 'Ringkasan', rows: [['n', r.plan.n], ['Biaya truk', r.plan.truck], ['Biaya pesan produk', r.plan.productOrdering], ['Biaya simpan', r.plan.holding], ['Total', r.plan.total], ['Total jika terpisah', r.separate.total]] },
              ]}
              summary={() => `Multi-produk: n = ${f.num(r.plan.n, 4)} pengiriman/tahun, pengali ${r.plan.m.join(':')}, total biaya ${f.money(r.plan.total)} (hemat ${f.money(r.saving)} dibanding pesan terpisah).`}
            />

            <Tabs<Tab> value={tab} onChange={setTab} tabs={[
              { value: 'summary', label: 'Ringkasan', icon: <Sigma className="h-4 w-4" /> },
              { value: 'charts', label: 'Grafik', icon: <ChartLine className="h-4 w-4" /> },
              { value: 'steps', label: 'Langkah penyelesaian', short: 'Langkah', icon: <ListOrdered className="h-4 w-4" /> },
            ]} />

            {tab === 'summary' && (
              <div className="space-y-6">
                <Card title="Kebijakan pemesanan per produk" bodyClass="p-0">
                  <div className="overflow-x-auto">
                    <table className="table-base table-compact">
                      <thead><tr><th>Produk</th><th className="num">EOQ awal</th><th className="num">m</th><th className="num">Frek./thn</th><th className="num">Q</th><th className="num">Rata-rata</th><th className="num">Simpan</th><th className="num">Pesan</th></tr></thead>
                      <tbody>
                        {r.rows.map((x, k) => (
                          <tr key={k}>
                            <td className="whitespace-nowrap font-medium">{x.name}</td><td className="num">{f.num(x.eoqAlone)}</td><td className="num">{x.m}</td>
                            <td className="num">{f.num(x.ordersPerYear, 4)}</td><td className="num">{f.num(x.Q)}</td><td className="num">{f.num(x.avgInv)}</td>
                            <td className="num">{f.money(x.holding)}</td><td className="num">{f.money(x.ordering)}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 dark:bg-slate-900/60"><td colSpan={6}>Biaya pengiriman gabungan (truk) = n × K<sub>T</sub></td><td colSpan={2} className="num">{f.money(r.plan.truck)}</td></tr>
                        <tr className="bg-brand-50/60 font-semibold dark:bg-brand-950/40"><td colSpan={6}>Total biaya tahunan</td><td colSpan={2} className="num">{f.money(r.plan.total)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
                {i.mode === 'optimize' && (
                  <Card title="Kombinasi pengali terbaik" subtitle={`${r.evaluated.toLocaleString('id-ID')} kombinasi diperiksa`} bodyClass="p-0">
                    <div className="overflow-x-auto">
                      <table className="table-base table-compact">
                        <thead><tr><th>#</th><th>Pengali m</th><th className="num">n*</th><th className="num">Biaya pesan</th><th className="num">Simpan</th><th className="num">Total</th><th className="num">Selisih</th></tr></thead>
                        <tbody>
                          {r.alternatives.map((a, k) => (
                            <tr key={a.m.join('-')} className={clsx(k === 0 && 'bg-emerald-50/70 font-semibold dark:bg-emerald-950/30')}>
                              <td>{k + 1}</td><td className="font-mono text-xs">{a.m.join(' : ')}</td><td className="num">{f.num(a.n, 4)}</td>
                              <td className="num">{f.money(a.truck + a.productOrdering)}</td><td className="num">{f.money(a.holding)}</td>
                              <td className="num">{f.money(a.total)}</td>
                              <td className="num">{k === 0 ? <Badge tone="green">optimal</Badge> : a.total - r.plan.total < 0.005 ? <Badge tone="blue">setara</Badge> : `+${f.money(a.total - r.plan.total)}`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
                <Callout tone="insight" title="Interpretasi">
                  {r.rows.slice(1).map((x) => `${x.name} ikut setiap ${x.m === 1 ? 'pengiriman' : `${x.m} pengiriman`}`).join('; ')}.
                  {r.alternatives.filter((a) => a.total - r.plan.total < 0.005).length > 1 && ' Ada kombinasi pengali lain dengan biaya yang sama (solusi optimal tidak tunggal).'}
                  {' '}Dibanding memesan setiap produk dengan truk sendiri ({f.money(r.separate.total)}), koordinasi menghemat {f.money(r.saving)} per tahun.
                </Callout>
              </div>
            )}

            {tab === 'charts' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Total biaya terhadap frekuensi pengiriman" subtitle={`Pengali tetap ${r.plan.m.join(' : ')}`} className="lg:col-span-2">
                  <CurveChart data={r.curve} x="n" xLabel="Pengiriman per tahun n" optimum={{ x: r.plan.n, y: r.plan.total, label: 'n' }}
                    series={[{ key: 'total', label: 'Total', width: 2.5 }, { key: 'ordering', label: 'Biaya pesan (truk + produk)' }, { key: 'holding', label: 'Biaya simpan' }]} />
                </Card>
                <Card title="Gabungan vs terpisah">
                  <SimpleBar data={[{ name: 'Pesan terpisah', v: r.separate.total }, { name: 'Pesanan gabungan', v: r.plan.total }]} x="name" y="v" money label="Total biaya" highlight={(row) => row.name === 'Pesanan gabungan'} />
                </Card>
                <Card title="Biaya simpan per produk">
                  <SimpleBar data={r.rows.map((x) => ({ name: x.name, v: x.holding }))} x="name" y="v" money label="Biaya simpan" horizontal height={Math.max(180, r.rows.length * 52)} highlight={() => true} />
                </Card>
              </div>
            )}

            {tab === 'steps' && <Card title="Langkah penyelesaian"><StepsPanel steps={stepsMulti(i, r, f.tex)} /></Card>}
          </>
        )}
      />
    </>
  );
}
