import { useState } from 'react';
import { ChartLine, ListOrdered, Sigma, Table2 } from 'lucide-react';
import { basicDefaults, solveBasic, stepsBasic, validateBasic, type BasicInput } from '@/lib/models/basic';
import { PERIOD_OPTIONS, type Period } from '@/lib/models/common';
import { basicPresets } from '@/data/presets';
import { useFormatter } from '@/lib/format';
import { Card, Callout, KV, NumberField, SelectField, Stat, Tabs, Tex } from '@/components/ui';
import {
  HoldingToggle, InputCard, InvalidState, ModelHeader, ModelLayout, PrintHeader, ResultActions, StepsPanel, useModel,
} from '@/components/model';
import { CurveChart, InventoryChart } from '@/components/charts';
import { SensitivityPanel } from '@/components/SensitivityPanel';

type Tab = 'summary' | 'charts' | 'steps' | 'table' | 'sensitivity';

export default function BasicPage() {
  const m = useModel('basic', basicDefaults, validateBasic, solveBasic);
  const { input: i, patch, errors, result: r } = m;
  const f = useFormatter();
  const [tab, setTab] = useState<Tab>('summary');
  const per = i.period;

  return (
    <>
      <PrintHeader title="Model EOQ Dasar" />
      <ModelHeader kind="basic" presets={basicPresets} onPreset={m.loadPreset} onReset={m.reset} source={m.source} />
      <ModelLayout
        inputs={
          <InputCard formula="q^*=\sqrt{2KD/h},\quad R = LD \bmod q^*">
            <SelectField<Period> label="Satuan waktu (untuk D dan h)" value={per} onChange={(v) => patch({ period: v })} options={PERIOD_OPTIONS} />
            <NumberField label="Permintaan" symbol="D" unit={`unit/${per}`} value={i.D} onChange={(v) => patch({ D: v })} error={errors.D} />
            <NumberField label="Biaya pesan per pesanan" symbol="K" unit={f.currency} value={i.K} onChange={(v) => patch({ K: v })} error={errors.K} />
            <HoldingToggle mode={i.holdingMode} onChange={(holdingMode) => patch({ holdingMode })} />
            {i.holdingMode === 'absolute' ? (
              <NumberField label="Biaya simpan per unit" symbol="h" unit={`${f.currency}/unit/${per}`} value={i.h} onChange={(v) => patch({ h: v })} error={errors.h} step={0.01} />
            ) : (
              <NumberField label="Biaya simpan" symbol="i" unit={`% harga/${per}`} value={i.holdingRate} onChange={(v) => patch({ holdingRate: v })} error={errors.holdingRate} />
            )}
            <NumberField label="Harga per unit" symbol="p" unit={f.currency} value={i.p} onChange={(v) => patch({ p: v })} error={errors.p}
              hint={i.holdingMode === 'absolute' ? 'Hanya memengaruhi biaya pembelian pD, bukan EOQ.' : undefined} step={0.1} />
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <NumberField label="Lead time" symbol="L" value={i.L} onChange={(v) => patch({ L: v })} error={errors.L} min={0} />
              <SelectField<Period> label="Satuan" value={i.leadUnit} onChange={(v) => patch({ leadUnit: v })} options={PERIOD_OPTIONS} />
            </div>
            <NumberField label="Bandingkan dengan q tertentu (opsional)" value={i.evalQ ?? NaN}
              onChange={(v) => patch({ evalQ: Number.isFinite(v) ? v : null })} error={errors.evalQ} unit="unit"
              hint="Hitung kenaikan biaya jika memesan selain EOQ." />
          </InputCard>
        }
        results={!r ? <InvalidState errors={errors} /> : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat accent label="EOQ (q*)" value={`${f.num(r.q)}`} sub="unit per pesanan" />
              <Stat label={`Pesanan / ${per}`} value={f.num(r.ordersPerPeriod)} sub={`siklus T = ${f.num(r.cycle, 4)} ${per}`} />
              <Stat label="Reorder point" value={f.num(r.R)} sub={i.L > 0 ? `Kasus ${r.reorderCase} · LD = ${f.num(r.LD)}` : 'lead time nol'} />
              <Stat label="Total biaya" value={f.money(r.TC)} sub={`simpan + pesan ${f.money(r.relevant)}`} />
            </div>

            <ResultActions kind="basic" input={i} source={m.source} setSource={m.setSource}
              defaultTitle={`EOQ Dasar · D=${f.num(i.D)} K=${f.num(i.K)}`}
              csv={() => [
                { title: 'Input', headers: ['Parameter', 'Nilai'], rows: [['Satuan waktu', per], ['D', i.D], ['K', i.K], ['h (efektif)', r.h], ['p', i.p], ['L', i.L], ['Satuan L', i.leadUnit]] },
                { title: 'Hasil', headers: ['Metrik', 'Nilai'], rows: [['EOQ', r.q], [`Pesanan per ${per}`, r.ordersPerPeriod], ['Siklus T', r.cycle], ['Biaya simpan', r.HC], ['Biaya pesan', r.OC], ['Biaya pembelian', r.purchase], ['Total biaya', r.TC], ['LD', r.LD], ['Reorder point', r.R]] },
                { title: 'Tabel sensitivitas', headers: ['q', 'HC', 'OC', 'HC+OC', '% di atas minimum'], rows: r.table.map((t) => [t.q, t.HC, t.OC, t.total, t.pctAbove]) },
              ]}
              summary={() => `EOQ Dasar (D=${f.num(i.D)}, K=${f.num(i.K)}, h=${f.num(r.h, 4)}): q* = ${f.num(r.q)} unit, ${f.num(r.ordersPerPeriod)} pesanan/${per}, T = ${f.num(r.cycle, 4)} ${per}, HC = OC = ${f.money(r.HC)}, TC = ${f.money(r.TC)}, R = ${f.num(r.R)}.`}
            />

            <Tabs<Tab> value={tab} onChange={setTab} tabs={[
              { value: 'summary', label: 'Ringkasan', icon: <Sigma className="h-4 w-4" /> },
              { value: 'charts', label: 'Grafik', icon: <ChartLine className="h-4 w-4" /> },
              { value: 'steps', label: 'Langkah penyelesaian', icon: <ListOrdered className="h-4 w-4" /> },
              { value: 'table', label: 'Tabel biaya', icon: <Table2 className="h-4 w-4" /> },
              { value: 'sensitivity', label: 'Sensitivitas' },
            ]} />

            {tab === 'summary' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Kebijakan optimal">
                  <KV rows={[
                    { label: 'Biaya simpan efektif h', value: `${f.money(r.h, 4)} /unit/${per}` },
                    { label: 'Kuantitas pesanan q*', value: `${f.num(r.q)} unit`, strong: true },
                    { label: 'Pembulatan bilangan bulat', value: r.rounding.length === 1 && Math.abs(r.rounding[0].diffPct) < 1e-9 ? `${r.rounding[0].q} (sudah bulat)` : r.rounding.map((x) => `${x.q} (+${f.num(x.diffPct, 3)}%)`).join(' · ') },
                    { label: `Frekuensi pesanan D/q*`, value: `${f.num(r.ordersPerPeriod)} kali/${per}` },
                    { label: 'Waktu antarpesanan T', value: `${f.num(r.cycle, 4)} ${per}` },
                    { label: 'Persediaan rata-rata q*/2', value: `${f.num(r.q / 2)} unit` },
                    { label: 'Permintaan selama lead time LD', value: `${f.num(r.LD)} unit` },
                    { label: 'Reorder point R', value: `${f.num(r.R)} unit`, strong: true },
                  ]} />
                </Card>
                <Card title="Rincian biaya">
                  <KV rows={[
                    { label: <>Biaya pesan <Tex>{'KD/q^*'}</Tex></>, value: f.money(r.OC) },
                    { label: <>Biaya simpan <Tex>{'hq^*/2'}</Tex></>, value: f.money(r.HC) },
                    { label: 'Biaya relevan (simpan + pesan)', value: f.money(r.relevant), strong: true },
                    { label: <>Biaya pembelian <Tex>{'pD'}</Tex></>, value: f.money(r.purchase) },
                    { label: 'Total biaya TC(q*)', value: f.money(r.TC), strong: true },
                  ]} />
                  <Callout tone="insight" className="mt-4" title="Ciri solusi optimal">
                    Pada q*, biaya simpan = biaya pesan = <Tex>{`\\sqrt{KDh/2} = ${f.tex(r.HC)}`}</Tex>.
                  </Callout>
                </Card>
                {i.L > 0 && (
                  <Callout tone={r.reorderCase === 1 ? 'info' : 'warning'} className="lg:col-span-2"
                    title={`Reorder point — Kasus ${r.reorderCase}`}>
                    {r.reorderCase === 1
                      ? `LD = ${f.num(r.LD)} ≤ q* sehingga pesan ketika persediaan mencapai ${f.num(r.R)} unit.`
                      : `LD = ${f.num(r.LD)} > q* = ${f.num(r.q)}. Saat pesanan baru dilakukan, ${r.ordersInTransit} pesanan masih dalam perjalanan; pesan ketika persediaan di gudang mencapai ${f.num(r.R)} unit (bukan ${f.num(r.LD)}).`}
                  </Callout>
                )}
                {r.evaluation && (
                  <Callout tone={r.evaluation.penaltyPct < 2 ? 'success' : 'warning'} className="lg:col-span-2" title={`Jika memesan q = ${f.num(r.evaluation.q)}`}>
                    Biaya simpan + pesan menjadi {f.money(r.evaluation.relevant)}, naik {f.money(r.evaluation.penalty)} ({f.num(r.evaluation.penaltyPct, 3)}%) dari minimum. Kurva biaya relatif datar di sekitar EOQ.
                  </Callout>
                )}
              </div>
            )}

            {tab === 'charts' && (
              <div className="grid gap-6">
                <Card title="Kurva biaya terhadap kuantitas pesanan" subtitle="Biaya total minimum terjadi saat kurva simpan dan pesan berpotongan">
                  <CurveChart data={r.curve} x="q" xLabel="Kuantitas pesanan q" optimum={{ x: r.q, y: r.relevant }}
                    refLines={r.evaluation ? [{ x: r.evaluation.q, label: 'q pembanding' }] : []}
                    series={[
                      { key: 'total', label: 'HC + OC', width: 2.5 },
                      { key: 'HC', label: 'Biaya simpan HC(q)' },
                      { key: 'OC', label: 'Biaya pesan OC(q)' },
                    ]} />
                </Card>
                <Card title="Pola persediaan I(t)" subtitle={`Tiga siklus · satuan waktu: ${per}`}>
                  <InventoryChart data={r.inventory} xLabel={`Waktu (${per})`}
                    refs={i.L > 0 && r.R > 0 ? [{ y: r.R, label: `R = ${f.num(r.R)}`, tone: 'warn' }] : []} />
                </Card>
              </div>
            )}

            {tab === 'steps' && <Card title="Langkah penyelesaian"><StepsPanel steps={stepsBasic(i, r, f.tex)} /></Card>}

            {tab === 'table' && (
              <Card title="Sensitivitas biaya terhadap q" subtitle="Seperti Tabel 1 pada materi — perubahan q di sekitar EOQ" bodyClass="p-0">
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead><tr><th>q</th><th className="num">q / q*</th><th className="num">HC(q)</th><th className="num">OC(q)</th><th className="num">HC + OC</th><th className="num">Di atas minimum</th></tr></thead>
                    <tbody>
                      {r.table.map((t) => {
                        const opt = Math.abs(t.q - r.q) < 1e-9;
                        return (
                          <tr key={t.q} className={opt ? 'bg-brand-50/60 font-semibold dark:bg-brand-950/40' : ''}>
                            <td>{f.num(t.q)}</td><td className="num">{f.num(t.q / r.q, 2)}</td>
                            <td className="num">{f.money(t.HC)}</td><td className="num">{f.money(t.OC)}</td>
                            <td className="num">{f.money(t.total)}</td><td className="num">{opt ? 'minimum' : `+${f.num(t.pctAbove, 2)}%`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tab === 'sensitivity' && <SensitivityPanel input={i} />}
          </>
        )}
      />
    </>
  );
}

export type { BasicInput };
