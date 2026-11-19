// Model EOQ Dasar (+ reorder point untuk lead time > 0)
import {
  convertDuration, effectiveHolding, linspace, realMod, requireNonNeg, requirePos,
  type FieldErrors, type HoldingMode, type Period, type Step, type TexFmt,
} from './common';

export interface BasicInput {
  period: Period;          // satuan waktu untuk D dan h (default: tahun)
  D: number;               // permintaan per periode
  K: number;               // biaya pesan per pesanan
  holdingMode: HoldingMode;
  h: number;               // biaya simpan per unit per periode (mode absolute)
  p: number;               // harga per unit (dipakai untuk biaya pembelian & mode percent)
  holdingRate: number;     // % dari harga per periode (mode percent)
  L: number;               // lead time
  leadUnit: Period;        // satuan lead time
  evalQ?: number | null;   // kuantitas pembanding (opsional)
}

export interface CostRow { q: number; HC: number; OC: number; total: number; pctAbove: number }

export interface BasicResult {
  h: number;
  q: number;
  ordersPerPeriod: number;
  cycle: number;           // T = q/D (satuan periode)
  HC: number;
  OC: number;
  relevant: number;        // HC + OC
  purchase: number;        // pD
  TC: number;              // OC + pD + HC
  Lp: number;              // lead time dalam satuan periode
  LD: number;              // permintaan selama lead time
  R: number;               // reorder point
  reorderCase: 1 | 2;
  ordersInTransit: number; // ⌊LD/q⌋
  rounding: { q: number; relevant: number; diffPct: number }[];
  table: CostRow[];
  curve: { q: number; HC: number; OC: number; total: number }[];
  inventory: { t: number; I: number }[];
  evaluation?: { q: number; relevant: number; penalty: number; penaltyPct: number };
}

export const basicDefaults: BasicInput = {
  period: 'tahun', D: 500, K: 5, holdingMode: 'absolute', h: 0.08, p: 0.4, holdingRate: 20,
  L: 0, leadUnit: 'bulan', evalQ: null,
};

export function validateBasic(i: BasicInput): FieldErrors {
  const e: FieldErrors = {};
  requirePos(e, 'D', i.D, 'Permintaan D');
  requirePos(e, 'K', i.K, 'Biaya pesan K');
  if (i.holdingMode === 'absolute') requirePos(e, 'h', i.h, 'Biaya simpan h');
  else {
    requirePos(e, 'p', i.p, 'Harga p');
    requirePos(e, 'holdingRate', i.holdingRate, 'Persentase biaya simpan');
  }
  requireNonNeg(e, 'p', i.p, 'Harga p');
  requireNonNeg(e, 'L', i.L, 'Lead time');
  if (i.evalQ != null && !(i.evalQ > 0)) e.evalQ = 'Kuantitas pembanding harus positif.';
  return e;
}

const relevantCost = (q: number, K: number, D: number, h: number) => (K * D) / q + (h * q) / 2;

export function solveBasic(i: BasicInput): BasicResult {
  const h = effectiveHolding(i.holdingMode, i.h, i.p, i.holdingRate);
  const { D, K } = i;
  const p = i.p || 0;
  const q = Math.sqrt((2 * K * D) / h);
  const HC = (h * q) / 2;
  const OC = (K * D) / q;
  const relevant = HC + OC;
  const purchase = p * D;

  const Lp = convertDuration(i.L || 0, i.leadUnit, i.period);
  const LD = Lp * D;
  const reorderCase: 1 | 2 = LD <= q + 1e-9 ? 1 : 2;
  const R = reorderCase === 1 ? LD : realMod(LD, q);
  const ordersInTransit = reorderCase === 1 ? 0 : Math.floor(LD / q + 1e-12);

  const roundCands = Array.from(new Set([Math.max(1, Math.floor(q)), Math.ceil(q)]));
  const rounding = roundCands.map((qq) => {
    const c = relevantCost(qq, K, D, h);
    return { q: qq, relevant: c, diffPct: ((c - relevant) / relevant) * 100 };
  });

  const multipliers = [0.2, 0.4, 0.6, 0.8, 0.88, 0.96, 1, 1.04, 1.12, 1.2, 1.4, 1.6];
  const table = multipliers.map((m) => {
    const qq = q * m;
    const t = relevantCost(qq, K, D, h);
    return { q: qq, HC: (h * qq) / 2, OC: (K * D) / qq, total: t, pctAbove: ((t - relevant) / relevant) * 100 };
  });

  const curve = linspace(q * 0.15, q * 2.2, 90).map((qq) => ({
    q: qq, HC: (h * qq) / 2, OC: (K * D) / qq, total: relevantCost(qq, K, D, h),
  }));

  // Pola gigi gergaji untuk 3 siklus
  const T = q / D;
  const inventory: { t: number; I: number }[] = [];
  for (let c = 0; c < 3; c++) {
    inventory.push({ t: c * T, I: q });
    inventory.push({ t: (c + 1) * T - 1e-9 * T, I: 0 });
  }
  inventory.push({ t: 3 * T, I: q });

  let evaluation: BasicResult['evaluation'];
  if (i.evalQ && i.evalQ > 0) {
    const c = relevantCost(i.evalQ, K, D, h);
    evaluation = { q: i.evalQ, relevant: c, penalty: c - relevant, penaltyPct: ((c - relevant) / relevant) * 100 };
  }

  return {
    h, q, ordersPerPeriod: D / q, cycle: T, HC, OC, relevant, purchase, TC: relevant + purchase,
    Lp, LD, R, reorderCase, ordersInTransit, rounding, table, curve, inventory, evaluation,
  };
}

export function stepsBasic(i: BasicInput, r: BasicResult, f: TexFmt): Step[] {
  const s: Step[] = [];
  if (i.holdingMode === 'percent') {
    s.push({
      title: 'Biaya simpan dari persentase harga',
      text: 'Biaya simpan dinyatakan sebagai proporsi nilai persediaan, sehingga h = p · i.',
      tex: `h = p\\,i = ${f(i.p)} \\times ${f(i.holdingRate / 100, 4)} = ${f(r.h, 4)}`,
    });
  }
  s.push({
    title: 'Kuantitas pesanan ekonomis (EOQ)',
    text: 'Turunan TC(q) disamakan dengan nol: −KD/q² + h/2 = 0.',
    tex: `q^* = \\sqrt{\\frac{2KD}{h}} = \\sqrt{\\frac{2(${f(i.K)})(${f(i.D)})}{${f(r.h, 4)}}} = \\mathbf{${f(r.q)}}`,
  });
  s.push({
    title: 'Banyak pesanan dan panjang siklus',
    tex: `\\frac{D}{q^*} = \\frac{${f(i.D)}}{${f(r.q)}} = ${f(r.ordersPerPeriod)}\\ \\text{pesanan/${i.period}},\\qquad T = \\frac{q^*}{D} = ${f(r.cycle, 4)}\\ \\text{${i.period}}`,
  });
  s.push({
    title: 'Biaya simpan dan biaya pesan',
    text: 'Pada q*, biaya simpan sama dengan biaya pesan.',
    tex: `HC = \\frac{h q^*}{2} = ${f(r.HC)},\\qquad OC = \\frac{KD}{q^*} = ${f(r.OC)}`,
  });
  s.push({
    title: 'Total biaya',
    tex: `TC(q^*) = \\frac{KD}{q^*} + pD + \\frac{hq^*}{2} = ${f(r.OC)} + ${f(r.purchase)} + ${f(r.HC)} = \\mathbf{${f(r.TC)}}`,
  });
  if (i.L > 0) {
    s.push({
      title: 'Permintaan selama lead time',
      tex: `L = ${f(r.Lp, 4)}\\ \\text{${i.period}},\\qquad LD = ${f(r.Lp, 4)} \\times ${f(i.D)} = ${f(r.LD)}`,
    });
    s.push(
      r.reorderCase === 1
        ? {
          title: 'Reorder point — Kasus 1 (LD ≤ q*)',
          tex: `R = LD = \\mathbf{${f(r.LD)}}`,
        }
        : {
          title: 'Reorder point — Kasus 2 (LD > q*)',
          text: `Ada ${r.ordersInTransit} pesanan yang masih dalam perjalanan saat pesanan baru dilakukan.`,
          tex: `R = LD - q^*\\left\\lfloor \\frac{LD}{q^*} \\right\\rfloor = ${f(r.LD)} - ${f(r.q)}(${r.ordersInTransit}) = \\mathbf{${f(r.R)}}`,
        },
    );
  }
  return s;
}
