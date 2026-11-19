import { useMemo, useState } from 'react';
import { solveBasic, type BasicInput } from '@/lib/models/basic';
import { effectiveHolding } from '@/lib/models/common';
import { useFormatter } from '@/lib/format';
import { Card, Callout, Segmented } from './ui';
import { CurveChart } from './charts';

type Param = 'D' | 'K' | 'h';
const LABEL: Record<Param, string> = { D: 'Permintaan D', K: 'Biaya pesan K', h: 'Biaya simpan h' };

/** Analisis sensitivitas satu parameter (±50%) untuk model EOQ dasar. */
export function SensitivityPanel({ input }: { input: BasicInput }) {
  const f = useFormatter();
  const [param, setParam] = useState<Param>('D');
  const h0 = effectiveHolding(input.holdingMode, input.h, input.p, input.holdingRate);
  const base = solveBasic(input);

  const rows = useMemo(() => {
    const changes = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
    return changes.map((c) => {
      const k = 1 + c / 100;
      const next: BasicInput = { ...input, holdingMode: 'absolute', h: h0, L: 0 };
      if (param === 'D') next.D = input.D * k;
      if (param === 'K') next.K = input.K * k;
      if (param === 'h') next.h = h0 * k;
      const r = solveBasic(next);
      return { change: c, q: r.q, cost: r.relevant, dq: (r.q / base.q - 1) * 100, dc: (r.relevant / base.relevant - 1) * 100 };
    });
  }, [input, param, h0, base.q, base.relevant]);

  return (
    <div className="space-y-6">
      <Card title="Analisis sensitivitas parameter" subtitle="Ubah satu parameter dari −50% sampai +50%, parameter lain tetap"
        actions={<Segmented<Param> size="sm" value={param} onChange={setParam} options={[{ value: 'D', label: 'D' }, { value: 'K', label: 'K' }, { value: 'h', label: 'h' }]} />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">EOQ q* terhadap perubahan {LABEL[param]}</p>
            <CurveChart data={rows} x="change" xLabel="Perubahan parameter (%)" money={false} height={240}
              series={[{ key: 'q', label: 'q*' }]} optimum={{ x: 0, y: base.q, label: 'awal' }} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Biaya simpan + pesan terhadap perubahan {LABEL[param]}</p>
            <CurveChart data={rows} x="change" xLabel="Perubahan parameter (%)" height={240}
              series={[{ key: 'cost', label: 'HC + OC', color: 'var(--series-2)' }]} optimum={{ x: 0, y: base.relevant, label: 'awal' }} />
          </div>
        </div>
      </Card>
      <Card bodyClass="p-0" title="Tabel sensitivitas">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Perubahan {param}</th><th className="num">Nilai {param}</th><th className="num">q*</th><th className="num">Δq*</th><th className="num">HC + OC</th><th className="num">Δ biaya</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const v = param === 'D' ? input.D : param === 'K' ? input.K : h0;
                return (
                  <tr key={r.change} className={r.change === 0 ? 'bg-brand-50/60 font-semibold dark:bg-brand-950/40' : ''}>
                    <td>{r.change > 0 ? '+' : ''}{r.change}%</td>
                    <td className="num">{f.num(v * (1 + r.change / 100), 4)}</td>
                    <td className="num">{f.num(r.q)}</td>
                    <td className="num">{r.dq >= 0 ? '+' : ''}{f.num(r.dq, 2)}%</td>
                    <td className="num">{f.money(r.cost)}</td>
                    <td className="num">{r.dc >= 0 ? '+' : ''}{f.num(r.dc, 2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Callout tone="insight" title="Sifat EOQ">
        EOQ sebanding dengan akar kuadrat D dan K, serta berbanding terbalik dengan akar kuadrat h. Permintaan empat kali lipat hanya membuat EOQ dua kali lipat.
        Harga p tidak memengaruhi EOQ selama harga per unit konstan.
      </Callout>
    </div>
  );
}
