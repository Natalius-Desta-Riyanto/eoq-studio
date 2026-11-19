// 15.5 Model EOQ dengan back order (kekurangan diizinkan)
import {
  effectiveHolding, requirePos, type FieldErrors, type HoldingMode, type Step, type TexFmt,
} from './common';

export interface BackorderInput {
  D: number;
  K: number;
  holdingMode: HoldingMode;
  h: number;
  p: number;
  holdingRate: number;
  s: number; // biaya kekurangan per unit per tahun
}

export interface BackorderResult {
  h: number;
  q: number;
  M: number;
  shortage: number;      // q − M
  holding: number;       // M²h/(2q)
  shortageCost: number;  // (q−M)²s/(2q)
  ordering: number;      // KD/q
  total: number;
  cycle: number;         // q/D
  tStock: number;        // M/D
  tShort: number;        // (q−M)/D
  fillRatio: number;     // M/q = s/(h+s)
  ordersPerYear: number;
  eoq: number;           // EOQ tanpa backorder
  eoqCost: number;       // √(2KDh)
  saving: number;
  inventory: { t: number; I: number }[];
  sCurve: { s: number; q: number; M: number; shortage: number }[];
}

export const backorderDefaults: BackorderInput = {
  D: 10000, K: 50, holdingMode: 'percent', h: 4.5, p: 15, holdingRate: 30, s: 15,
};

export function validateBackorder(i: BackorderInput): FieldErrors {
  const e: FieldErrors = {};
  requirePos(e, 'D', i.D, 'Permintaan D');
  requirePos(e, 'K', i.K, 'Biaya pesan K');
  requirePos(e, 's', i.s, 'Biaya kekurangan s');
  if (i.holdingMode === 'absolute') requirePos(e, 'h', i.h, 'Biaya simpan h');
  else { requirePos(e, 'p', i.p, 'Harga p'); requirePos(e, 'holdingRate', i.holdingRate, 'Persentase biaya simpan'); }
  return e;
}

export function solveBackorder(i: BackorderInput): BackorderResult {
  const h = effectiveHolding(i.holdingMode, i.h, i.p, i.holdingRate);
  const { D, K, s } = i;
  const q = Math.sqrt((2 * K * D * (h + s)) / (h * s));
  const M = Math.sqrt((2 * K * D * s) / (h * (h + s)));
  const shortage = q - M;
  const holding = (M * M * h) / (2 * q);
  const shortageCost = (shortage * shortage * s) / (2 * q);
  const ordering = (K * D) / q;
  const total = holding + shortageCost + ordering;
  const eoq = Math.sqrt((2 * K * D) / h);
  const eoqCost = Math.sqrt(2 * K * D * h);
  const cycle = q / D;

  const inventory: { t: number; I: number }[] = [];
  for (let c = 0; c < 3; c++) {
    inventory.push({ t: c * cycle, I: M });
    inventory.push({ t: (c + 1) * cycle - 1e-9 * cycle, I: -shortage });
  }
  inventory.push({ t: 3 * cycle, I: M });

  const sMax = Math.max(10 * h, 2.5 * s);
  const sCurve = Array.from({ length: 60 }, (_, k) => (h * 0.3) + ((sMax - h * 0.3) * k) / 59).map((ss) => {
    const qq = Math.sqrt((2 * K * D * (h + ss)) / (h * ss));
    const MM = Math.sqrt((2 * K * D * ss) / (h * (h + ss)));
    return { s: ss, q: qq, M: MM, shortage: qq - MM };
  });

  return {
    h, q, M, shortage, holding, shortageCost, ordering, total, cycle,
    tStock: M / D, tShort: shortage / D, fillRatio: M / q, ordersPerYear: D / q,
    eoq, eoqCost, saving: eoqCost - total, inventory, sCurve,
  };
}

export function stepsBackorder(i: BackorderInput, r: BackorderResult, f: TexFmt): Step[] {
  const st: Step[] = [];
  if (i.holdingMode === 'percent') {
    st.push({ title: 'Biaya simpan per unit', tex: `h = ${f(i.holdingRate / 100, 4)} \\times ${f(i.p)} = ${f(r.h)}` });
  }
  st.push({
    title: 'Fungsi total biaya tahunan',
    text: 'Optimum diperoleh dari ∂TC/∂q = 0 dan ∂TC/∂M = 0.',
    tex: `TC(q,M) = \\frac{M^2 h}{2q} + \\frac{(q-M)^2 s}{2q} + \\frac{KD}{q}`,
  });
  st.push({
    title: 'Ukuran pesanan optimal',
    tex: `q^* = \\sqrt{\\frac{2KD(h+s)}{hs}} = \\sqrt{\\frac{2(${f(i.K)})(${f(i.D)})(${f(r.h)} + ${f(i.s)})}{(${f(r.h)})(${f(i.s)})}} = \\mathbf{${f(r.q)}}`,
  });
  st.push({
    title: 'Persediaan maksimum',
    tex: `M^* = \\sqrt{\\frac{2KDs}{h(h+s)}} = \\sqrt{\\frac{2(${f(i.K)})(${f(i.D)})(${f(i.s)})}{${f(r.h)}(${f(r.h)} + ${f(i.s)})}} = \\mathbf{${f(r.M)}}`,
  });
  st.push({
    title: 'Kekurangan maksimum',
    tex: `q^* - M^* = ${f(r.q)} - ${f(r.M)} = \\mathbf{${f(r.shortage)}}`,
  });
  st.push({
    title: 'Komponen biaya',
    tex: `\\underbrace{${f(r.holding)}}_{\\text{simpan}} + \\underbrace{${f(r.shortageCost)}}_{\\text{kekurangan}} + \\underbrace{${f(r.ordering)}}_{\\text{pesan}} = \\mathbf{${f(r.total)}}`,
  });
  st.push({
    title: 'Perbandingan dengan EOQ tanpa kekurangan',
    tex: `\\sqrt{2KDh} = ${f(r.eoqCost)}\\ \\Rightarrow\\ \\text{hemat } ${f(r.saving)}\\ \\text{per tahun}`,
  });
  return st;
}
