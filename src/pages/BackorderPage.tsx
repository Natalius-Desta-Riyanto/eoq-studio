import { useState } from 'react';
import { ChartLine, ListOrdered, Sigma } from 'lucide-react';
import { backorderDefaults, solveBackorder, stepsBackorder, validateBackorder } from '@/lib/models/backorder';
import { backorderPresets } from '@/data/presets';
import { useFormatter } from '@/lib/format';
import { Callout, Card, KV, NumberField, Stat, Tabs } from '@/components/ui';
import { HoldingToggle, InputCard, InvalidState, ModelHeader, ModelLayout, PrintHeader, ResultActions, StepsPanel, useModel } from '@/components/model';
import { CurveChart, InventoryChart } from '@/components/charts';

type Tab = 'summary' | 'charts' | 'steps';

export default function BackorderPage() {
  const m = useModel('backorder', backorderDefaults, validateBackorder, solveBackorder);
  const { input: i, patch, errors, result: r } = m;
  const f = useFormatter();
  const [tab, setTab] = useState<Tab>('summary');

  return (
    <>
      <PrintHeader title="Model EOQ dengan Back Order" />
      <ModelHeader kind="backorder" presets={backorderPresets} onPreset={m.loadPreset} onReset={m.reset} source={m.source} />
      <ModelLayout
        inputs={
          <InputCard formula="q^*=\sqrt{\tfrac{2KD(h+s)}{hs}},\ M^*=\sqrt{\tfrac{2KDs}{h(h+s)}}">
            <NumberField label="Permintaan tahunan" symbol="D" unit="unit/tahun" value={i.D} onChange={(v) => patch({ D: v })} error={errors.D} />
            <NumberField label="Biaya pesan per pesanan" symbol="K" unit={f.currency} value={i.K} onChange={(v) => patch({ K: v })} error={errors.K} />
            <HoldingToggle mode={i.holdingMode} onChange={(holdingMode) => patch({ holdingMode })} />
            {i.holdingMode === 'absolute'
              ? <NumberField label="Biaya simpan per unit" symbol="h" unit={`${f.currency}/unit/tahun`} value={i.h} onChange={(v) => patch({ h: v })} error={errors.h} />
              : <>
                <NumberField label="Harga per unit" symbol="p" unit={f.currency} value={i.p} onChange={(v) => patch({ p: v })} error={errors.p} />
                <NumberField label="Biaya simpan" symbol="i" unit="% harga/tahun" value={i.holdingRate} onChange={(v) => patch({ holdingRate: v })} error={errors.holdingRate} />
              </>}
            <NumberField label="Biaya kekurangan (backorder)" symbol="s" unit={`${f.currency}/unit/tahun`} value={i.s} onChange={(v) => patch({ s: v })} error={errors.s}
              hint="Biaya satu unit yang tertunda selama satu tahun." />
          </InputCard>
        }
        results={!r ? <InvalidState errors={errors} /> : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat accent label="Pesanan optimal q*" value={f.num(r.q)} sub={`${f.num(r.ordersPerYear)} pesanan/tahun`} />
              <Stat label="Persediaan maks M*" value={f.num(r.M)} sub="setelah backorder dilunasi" />
              <Stat label="Kekurangan maks" value={f.num(r.shortage)} sub="q* − M*" />
              <Stat label="Total biaya" value={f.money(r.total)} sub={`hemat ${f.money(r.saving)} vs tanpa kekurangan`} />
            </div>

            <ResultActions kind="backorder" input={i} source={m.source} setSource={m.setSource}
              defaultTitle={`Back Order · D=${f.num(i.D)} s=${f.num(i.s)}`}
              csv={() => [
                { title: 'Input', headers: ['Parameter', 'Nilai'], rows: [['D', i.D], ['K', i.K], ['h', r.h], ['s', i.s]] },
                { title: 'Hasil', headers: ['Metrik', 'Nilai'], rows: [['q*', r.q], ['M*', r.M], ['Kekurangan maks', r.shortage], ['Biaya simpan', r.holding], ['Biaya kekurangan', r.shortageCost], ['Biaya pesan', r.ordering], ['Total', r.total], ['Siklus (tahun)', r.cycle], ['Fraksi waktu ada stok', r.fillRatio]] },
              ]}
              summary={() => `EOQ back order: q* = ${f.num(r.q)}, M* = ${f.num(r.M)}, kekurangan maks = ${f.num(r.shortage)}, total biaya ${f.money(r.total)}.`}
            />

            <Tabs<Tab> value={tab} onChange={setTab} tabs={[
              { value: 'summary', label: 'Ringkasan', icon: <Sigma className="h-4 w-4" /> },
              { value: 'charts', label: 'Grafik', icon: <ChartLine className="h-4 w-4" /> },
              { value: 'steps', label: 'Langkah penyelesaian', short: 'Langkah', icon: <ListOrdered className="h-4 w-4" /> },
            ]} />

            {tab === 'summary' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Kebijakan optimal">
                  <KV rows={[
                    { label: 'Biaya simpan h', value: f.money(r.h) },
                    { label: 'Ukuran pesanan q*', value: `${f.num(r.q)} unit`, strong: true },
                    { label: 'Persediaan maksimum M*', value: `${f.num(r.M)} unit`, strong: true },
                    { label: 'Kekurangan maksimum q* − M*', value: `${f.num(r.shortage)} unit` },
                    { label: 'Panjang siklus q*/D', value: `${f.num(r.cycle * 365, 2)} hari` },
                    { label: 'Fase ada stok M*/D', value: `${f.num(r.tStock * 365, 2)} hari` },
                    { label: 'Fase kekurangan (q*−M*)/D', value: `${f.num(r.tShort * 365, 2)} hari` },
                    { label: 'Fraksi waktu permintaan langsung terpenuhi', value: `${f.num(r.fillRatio * 100, 2)}%` },
                  ]} />
                </Card>
                <Card title="Rincian biaya tahunan">
                  <KV rows={[
                    { label: 'Biaya simpan M²h/(2q)', value: f.money(r.holding) },
                    { label: 'Biaya kekurangan (q−M)²s/(2q)', value: f.money(r.shortageCost) },
                    { label: 'Biaya pesan KD/q', value: f.money(r.ordering) },
                    { label: 'Total', value: f.money(r.total), strong: true },
                    { label: 'EOQ tanpa kekurangan (q, biaya)', value: `${f.num(r.eoq)} · ${f.money(r.eoqCost)}` },
                  ]} />
                  <Callout tone="insight" className="mt-4" title="Interpretasi manajerial">
                    Persediaan mencapai puncak sekitar {f.num(r.M, 0)} unit saat pesanan tiba, lalu habis dan tertunda hingga sekitar {f.num(r.shortage, 0)} unit sebelum pesanan berikutnya datang.
                    Semakin besar s, kekurangan optimal semakin kecil; jika s → ∞ model kembali ke EOQ klasik.
                  </Callout>
                </Card>
              </div>
            )}

            {tab === 'charts' && (
              <div className="grid grid-cols-1 gap-6">
                <Card title="Pola persediaan dengan back order" subtitle="Nilai negatif = permintaan yang tertunda (backlog)">
                  <InventoryChart data={r.inventory} xLabel="Waktu (tahun)" negative
                    refs={[{ y: r.M, label: `M* = ${f.num(r.M)}` }, { y: -r.shortage, label: `−(q*−M*) = −${f.num(r.shortage)}`, tone: 'warn' }]} />
                </Card>
                <Card title="Pengaruh biaya kekurangan s" subtitle="Kekurangan maksimum mengecil saat s membesar">
                  <CurveChart data={r.sCurve} x="s" xLabel="Biaya kekurangan s" money={false}
                    series={[{ key: 'q', label: 'q*' }, { key: 'M', label: 'M*' }, { key: 'shortage', label: 'Kekurangan maks' }]}
                    refLines={[{ x: i.s, label: 's saat ini' }]} />
                </Card>
              </div>
            )}

            {tab === 'steps' && <Card title="Langkah penyelesaian"><StepsPanel steps={stepsBackorder(i, r, f.tex)} /></Card>}
          </>
        )}
      />
    </>
  );
}
