import { useState } from 'react';
import { ChartLine, ListOrdered, Sigma, Table2 } from 'lucide-react';
import { continuousDefaults, solveContinuous, stepsContinuous, validateContinuous } from '@/lib/models/continuous';
import { continuousPresets } from '@/data/presets';
import { useFormatter } from '@/lib/format';
import { Callout, Card, KV, NumberField, Stat, Tabs } from '@/components/ui';
import { HoldingToggle, InputCard, InvalidState, ModelHeader, ModelLayout, PrintHeader, ResultActions, StepsPanel, useModel } from '@/components/model';
import { CurveChart, InventoryChart } from '@/components/charts';

type Tab = 'summary' | 'charts' | 'steps' | 'rate';

export default function ContinuousPage() {
  const m = useModel('continuous', continuousDefaults, validateContinuous, solveContinuous);
  const { input: i, patch, errors, result: r } = m;
  const f = useFormatter();
  const [tab, setTab] = useState<Tab>('summary');

  return (
    <>
      <PrintHeader title="Model EOQ Laju Kontinu" />
      <ModelHeader kind="continuous" presets={continuousPresets} onPreset={m.loadPreset} onReset={m.reset} source={m.source} />
      <ModelLayout
        inputs={
          <InputCard formula="q^*=\sqrt{\frac{2KDr}{h(r-D)}}=EOQ\sqrt{\frac{r}{r-D}}">
            <NumberField label="Permintaan tahunan" symbol="D" unit="unit/tahun" value={i.D} onChange={(v) => patch({ D: v })} error={errors.D} />
            <NumberField label="Laju produksi" symbol="r" unit="unit/tahun" value={i.r} onChange={(v) => patch({ r: v })} error={errors.r} hint="Kapasitas produksi; harus lebih besar dari D." />
            <NumberField label="Biaya setup per run" symbol="K" unit={f.currency} value={i.K} onChange={(v) => patch({ K: v })} error={errors.K} />
            <HoldingToggle mode={i.holdingMode} onChange={(holdingMode) => patch({ holdingMode })} />
            {i.holdingMode === 'absolute'
              ? <NumberField label="Biaya simpan per unit" symbol="h" unit={`${f.currency}/unit/tahun`} value={i.h} onChange={(v) => patch({ h: v })} error={errors.h} />
              : <NumberField label="Biaya simpan" symbol="i" unit="% nilai/tahun" value={i.holdingRate} onChange={(v) => patch({ holdingRate: v })} error={errors.holdingRate} />}
            <NumberField label="Nilai / biaya produksi per unit" symbol="p" unit={f.currency} value={i.p} onChange={(v) => patch({ p: v })} error={errors.p}
              hint="Untuk biaya produksi tahunan pD (tidak memengaruhi q*)." />
          </InputCard>
        }
        results={!r ? <InvalidState errors={errors} /> : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat accent label="Ukuran run q*" value={f.num(r.q)} sub={`EOQ seketika ${f.num(r.eoq)}`} />
              <Stat label="Run / tahun" value={f.num(r.runsPerYear)} sub={`siklus ${f.num(r.cycle * 365, 2)} hari`} />
              <Stat label="Persediaan maks" value={f.num(r.Imax)} sub={`rata-rata ${f.num(r.avgInv)}`} />
              <Stat label="Biaya simpan + setup" value={f.money(r.relevant)} sub={`utilisasi pabrik ${f.num(r.utilization * 100, 1)}%`} />
            </div>

            <ResultActions kind="continuous" input={i} source={m.source} setSource={m.setSource}
              defaultTitle={`Laju Kontinu · D=${f.num(i.D)} r=${f.num(i.r)}`}
              csv={() => [
                { title: 'Input', headers: ['Parameter', 'Nilai'], rows: [['D', i.D], ['r', i.r], ['K', i.K], ['h', r.h], ['p', i.p]] },
                { title: 'Hasil', headers: ['Metrik', 'Nilai'], rows: [['q*', r.q], ['EOQ', r.eoq], ['Faktor sqrt(r/(r-D))', r.factor], ['Run per tahun', r.runsPerYear], ['Imax', r.Imax], ['Waktu produksi per run (tahun)', r.productionTime], ['Panjang siklus (tahun)', r.cycle], ['Utilisasi D/r', r.utilization], ['Biaya simpan', r.holding], ['Biaya setup', r.setup], ['Biaya relevan', r.relevant], ['Biaya produksi pD', r.productionCost], ['Total', r.total]] },
              ]}
              summary={() => `EOQ laju kontinu: q* = ${f.num(r.q)} unit/run, ${f.num(r.runsPerYear)} run/tahun, Imax = ${f.num(r.Imax)}, biaya simpan + setup ${f.money(r.relevant)}.`}
            />

            <Tabs<Tab> value={tab} onChange={setTab} tabs={[
              { value: 'summary', label: 'Ringkasan', icon: <Sigma className="h-4 w-4" /> },
              { value: 'charts', label: 'Grafik', icon: <ChartLine className="h-4 w-4" /> },
              { value: 'steps', label: 'Langkah penyelesaian', short: 'Langkah', icon: <ListOrdered className="h-4 w-4" /> },
              { value: 'rate', label: 'Pengaruh laju r', short: 'Laju r', icon: <Table2 className="h-4 w-4" /> },
            ]} />

            {tab === 'summary' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Kebijakan produksi">
                  <KV rows={[
                    { label: 'Biaya simpan h', value: f.money(r.h) },
                    { label: "Biaya simpan efektif h' = h(r−D)/r", value: f.money(r.hEff, 4) },
                    { label: 'Ukuran run optimal q*', value: `${f.num(r.q)} unit`, strong: true },
                    { label: 'Banyak run per tahun', value: f.num(r.runsPerYear) },
                    { label: 'Lama produksi per run q/r', value: `${f.num(r.productionTime * 365, 2)} hari` },
                    { label: 'Lama tanpa produksi', value: `${f.num(r.idleTime * 365, 2)} hari` },
                    { label: 'Persediaan maksimum', value: `${f.num(r.Imax)} unit` },
                    { label: 'Utilisasi pabrik D/r', value: `${f.num(r.utilization * 100, 2)}%` },
                  ]} />
                </Card>
                <Card title="Rincian biaya tahunan">
                  <KV rows={[
                    { label: 'Biaya simpan', value: f.money(r.holding) },
                    { label: 'Biaya setup', value: f.money(r.setup) },
                    { label: 'Biaya relevan', value: f.money(r.relevant), strong: true },
                    { label: 'Biaya produksi pD', value: f.money(r.productionCost) },
                    { label: 'Total', value: f.money(r.total), strong: true },
                  ]} />
                  <Callout tone="insight" className="mt-4" title="Dibanding pengiriman seketika">
                    q* = EOQ × √(r/(r−D)) = {f.num(r.eoq)} × {f.num(r.factor, 4)}. Run lebih besar dari EOQ, tetapi biaya relevan turun dari {f.money(r.eoqCost)} menjadi {f.money(r.relevant)} karena persediaan maksimum hanya {f.num((r.Imax / r.q) * 100, 1)}% dari ukuran run.
                  </Callout>
                </Card>
              </div>
            )}

            {tab === 'charts' && (
              <div className="grid grid-cols-1 gap-6">
                <Card title="Pola persediaan I(t)" subtitle="Naik dengan laju r − D selama produksi, turun dengan laju D setelahnya">
                  <InventoryChart data={r.inventory} xLabel="Waktu (tahun)" refs={[{ y: r.Imax, label: `Imax = ${f.num(r.Imax)}` }]} />
                </Card>
                <Card title="Kurva biaya terhadap ukuran run">
                  <CurveChart data={r.curve} x="q" xLabel="Ukuran run q" optimum={{ x: r.q, y: r.relevant }}
                    series={[{ key: 'total', label: 'Total relevan', width: 2.5 }, { key: 'holding', label: 'Biaya simpan' }, { key: 'setup', label: 'Biaya setup' }]} />
                </Card>
              </div>
            )}

            {tab === 'steps' && <Card title="Langkah penyelesaian"><StepsPanel steps={stepsContinuous(i, r, f.tex)} /></Card>}

            {tab === 'rate' && (
              <Card title="Pengaruh laju produksi r" subtitle="Ketika r → ∞, q* mendekati EOQ biasa" bodyClass="p-0">
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead><tr><th>r / D</th><th className="num">r</th><th className="num">q*</th><th className="num">q* / EOQ</th><th className="num">Biaya relevan</th></tr></thead>
                    <tbody>
                      {r.sensitivity.map((s) => (
                        <tr key={s.r}><td>{f.num(s.r / i.D, 2)}×</td><td className="num">{f.num(s.r)}</td><td className="num">{f.num(s.q)}</td><td className="num">{f.num(s.q / r.eoq, 4)}</td><td className="num">{f.money(s.cost)}</td></tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-slate-900/60"><td>∞ (seketika)</td><td className="num">∞</td><td className="num">{f.num(r.eoq)}</td><td className="num">1</td><td className="num">{f.money(r.eoqCost)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      />
    </>
  );
}
