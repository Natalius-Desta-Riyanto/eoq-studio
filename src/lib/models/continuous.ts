// Model EOQ laju kontinu (production lot size / EPQ)
import {
  effectiveHolding, linspace, requirePos, requireNonNeg,
  type FieldErrors, type HoldingMode, type Step, type TexFmt,
} from './common';

export interface ContinuousInput {
  D: number;
  r: number;
  K: number;
  holdingMode: HoldingMode;
  h: number;
  p: number;          // nilai/biaya produksi per unit
  holdingRate: number;
}

export interface ContinuousResult {
  h: number;
  hEff: number;           // h(r−D)/r
  eoq: number;            // EOQ pengiriman seketika
  factor: number;         // √(r/(r−D))
  q: number;
  runsPerYear: number;
  cycle: number;          // q/D
  productionTime: number; // q/r
  idleTime: number;       // q/D − q/r
  Imax: number;
  avgInv: number;
  utilization: number;    // D/r
  holding: number;
  setup: number;
  relevant: number;
  productionCost: number; // pD
  total: number;
  eoqCost: number;        // biaya relevan model seketika (√2KDh) untuk perbandingan
  inventory: { t: number; I: number }[];
  curve: { q: number; holding: number; setup: number; total: number }[];
  sensitivity: { r: number; q: number; cost: number }[];
}

export const continuousDefaults: ContinuousInput = {
  D: 10000, r: 25000, K: 200, holdingMode: 'percent', h: 500, p: 2000, holdingRate: 25,
};

export function validateContinuous(i: ContinuousInput): FieldErrors {
  const e: FieldErrors = {};
  requirePos(e, 'D', i.D, 'Permintaan D');
  requirePos(e, 'r', i.r, 'Laju produksi r');
  requirePos(e, 'K', i.K, 'Biaya setup K');
  if (i.holdingMode === 'absolute') requirePos(e, 'h', i.h, 'Biaya simpan h');
  else { requirePos(e, 'p', i.p, 'Nilai per unit'); requirePos(e, 'holdingRate', i.holdingRate, 'Persentase biaya simpan'); }
  requireNonNeg(e, 'p', i.p, 'Nilai per unit');
  if (!e.r && !e.D && !(i.r > i.D)) e.r = 'Laju produksi r harus lebih besar dari D (jika r = D, produksi berjalan terus-menerus).';
  return e;
}

export function solveContinuous(i: ContinuousInput): ContinuousResult {
  const h = effectiveHolding(i.holdingMode, i.h, i.p, i.holdingRate);
  const { D, r, K } = i;
  const hEff = (h * (r - D)) / r;
  const eoq = Math.sqrt((2 * K * D) / h);
  const factor = Math.sqrt(r / (r - D));
  const q = eoq * factor;
  const Imax = (q * (r - D)) / r;
  const holding = (h * q * (r - D)) / (2 * r);
  const setup = (K * D) / q;
  const productionCost = (i.p || 0) * D;
  const cycle = q / D;
  const productionTime = q / r;

  const inventory: { t: number; I: number }[] = [];
  for (let c = 0; c < 3; c++) {
    inventory.push({ t: c * cycle, I: 0 });
    inventory.push({ t: c * cycle + productionTime, I: Imax });
  }
  inventory.push({ t: 3 * cycle, I: 0 });

  const cost = (qq: number) => ({ holding: (hEff * qq) / 2, setup: (K * D) / qq });
  const curve = linspace(q * 0.15, q * 2.2, 90).map((qq) => {
    const c = cost(qq);
    return { q: qq, ...c, total: c.holding + c.setup };
  });

  const sensitivity = [1.05, 1.1, 1.25, 1.5, 2, 3, 5, 10, 25, 100].map((m) => {
    const rr = D * m;
    const qq = eoq * Math.sqrt(rr / (rr - D));
    return { r: rr, q: qq, cost: Math.sqrt(2 * K * D * h * (rr - D) / rr) };
  });

  return {
    h, hEff, eoq, factor, q,
    runsPerYear: D / q, cycle, productionTime, idleTime: cycle - productionTime,
    Imax, avgInv: Imax / 2, utilization: D / r,
    holding, setup, relevant: holding + setup, productionCost, total: holding + setup + productionCost,
    eoqCost: Math.sqrt(2 * K * D * h),
    inventory, curve, sensitivity,
  };
}

export function stepsContinuous(i: ContinuousInput, r: ContinuousResult, f: TexFmt): Step[] {
  const s: Step[] = [];
  if (i.holdingMode === 'percent') {
    s.push({ title: 'Biaya simpan per unit', tex: `h = ${f(i.holdingRate / 100, 4)} \\times ${f(i.p)} = ${f(r.h)}` });
  }
  s.push({
    title: 'Biaya simpan efektif',
    text: 'Karena produksi dan permintaan berlangsung bersamaan, persediaan naik dengan laju r − D.',
    tex: `h' = \\frac{h(r-D)}{r} = \\frac{${f(r.h)}(${f(i.r)} - ${f(i.D)})}{${f(i.r)}} = ${f(r.hEff, 4)}`,
  });
  s.push({
    title: 'Ukuran run optimal',
    tex: `q^* = \\sqrt{\\frac{2KDr}{h(r-D)}} = \\sqrt{\\frac{2(${f(i.K)})(${f(i.D)})(${f(i.r)})}{${f(r.h)}(${f(i.r - i.D)})}} = \\mathbf{${f(r.q)}}`,
  });
  s.push({
    title: 'Hubungan dengan EOQ biasa',
    tex: `q^* = EOQ\\sqrt{\\frac{r}{r-D}} = ${f(r.eoq)} \\times ${f(r.factor, 4)} = ${f(r.q)}`,
  });
  s.push({
    title: 'Banyak run dan persediaan maksimum',
    tex: `\\frac{D}{q^*} = ${f(r.runsPerYear)}\\ \\text{run/tahun},\\qquad I_{\\max} = \\frac{q^*(r-D)}{r} = ${f(r.Imax)}`,
  });
  s.push({
    title: 'Biaya tahunan (di luar biaya produksi)',
    tex: `\\frac{hq^*(r-D)}{2r} + \\frac{KD}{q^*} = ${f(r.holding)} + ${f(r.setup)} = \\mathbf{${f(r.relevant)}}`,
  });
  return s;
}
