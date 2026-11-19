// 15.3 Model diskon kuantitas (all-units discount)
import { linspace, requirePos, type FieldErrors, type Step, type TexFmt } from './common';

export interface PriceTier { min: number; price: number }

export interface DiscountInput {
  D: number;
  K: number;
  I: number;          // biaya simpan, % dari harga per tahun
  tiers: PriceTier[]; // tier pertama min = 0; min naik, harga turun
}

export interface TierAnalysis {
  index: number;      // 1-based (i)
  lower: number;      // b_{i-1}
  upper: number;      // b_i (Infinity untuk tier terakhir)
  price: number;
  hold: number;       // I·p_i
  eoq: number;
  status: 'admissible' | 'below' | 'above';
  /** q yang meminimumkan TC pada interval (logika spreadsheet Qd.xls). */
  qBest: number;
  tcBest: number;
}

export interface Candidate {
  tier: number;
  q: number;
  source: 'eoq' | 'break';
  ordering: number;
  purchase: number;
  holding: number;
  total: number;
}

export interface TraceItem { tier: number; eoq: number; admissible: boolean; candidate: number; note: string }

export interface DiscountResult {
  tiers: TierAnalysis[];
  trace: TraceItem[];
  candidates: Candidate[];
  best: Candidate;
  ordersPerYear: number;
  cycleYears: number;
  savingVsNoDiscount: number;    // dibanding tetap memakai harga tier-1 pada EOQ_1
  curve: Record<string, number | null>[];
  maxQ: number;
}

export const discountDefaults: DiscountInput = {
  D: 1000, K: 100, I: 20,
  tiers: [
    { min: 0, price: 50 },
    { min: 100, price: 49 },
    { min: 300, price: 48.5 },
  ],
};

export function validateDiscount(i: DiscountInput): FieldErrors {
  const e: FieldErrors = {};
  requirePos(e, 'D', i.D, 'Permintaan D');
  requirePos(e, 'K', i.K, 'Biaya pesan K');
  requirePos(e, 'I', i.I, 'Biaya simpan I');
  if (!i.tiers.length) e.tiers = 'Minimal satu tingkat harga.';
  i.tiers.forEach((t, idx) => {
    if (!(t.price > 0)) e[`tier-${idx}-price`] = 'Harga harus positif.';
    if (!(t.min >= 0) || !Number.isFinite(t.min)) e[`tier-${idx}-min`] = 'Batas tidak valid.';
    if (idx === 0 && t.min !== 0) e[`tier-${idx}-min`] = 'Tingkat pertama harus mulai dari 0.';
    if (idx > 0) {
      const prev = i.tiers[idx - 1];
      if (!(t.min > prev.min)) e[`tier-${idx}-min`] = 'Titik putus harus naik.';
      if (!(t.price < prev.price)) e[`tier-${idx}-price`] = 'Harga harus lebih murah dari tingkat sebelumnya.';
    }
  });
  if (Object.keys(e).some((k) => k.startsWith('tier'))) e.tiers = e.tiers ?? 'Periksa tabel tingkat harga.';
  return e;
}

const tcAt = (q: number, p: number, i: DiscountInput) => {
  const ordering = (i.K * i.D) / q;
  const purchase = i.D * p;
  const holding = (q / 2) * (i.I / 100) * p;
  return { ordering, purchase, holding, total: ordering + purchase + holding };
};

export function priceFor(q: number, tiers: PriceTier[]): { price: number; tier: number } {
  let idx = 0;
  for (let k = 0; k < tiers.length; k++) if (q >= tiers[k].min - 1e-9) idx = k;
  return { price: tiers[idx].price, tier: idx + 1 };
}

export function solveDiscount(i: DiscountInput): DiscountResult {
  const rate = i.I / 100;
  const n = i.tiers.length;
  const tiers: TierAnalysis[] = i.tiers.map((t, idx) => {
    const lower = t.min;
    const upper = idx < n - 1 ? i.tiers[idx + 1].min : Infinity;
    const hold = rate * t.price;
    const eoq = Math.sqrt((2 * i.K * i.D) / hold);
    let status: TierAnalysis['status'] = 'admissible';
    let qBest = eoq;
    if (eoq < lower) { status = 'below'; qBest = lower; }
    else if (eoq >= upper) { status = 'above'; qBest = upper - 1; }
    const tcBest = tcAt(qBest, t.price, i).total;
    return { index: idx + 1, lower, upper, price: t.price, hold, eoq, status, qBest, tcBest };
  });

  // Algoritma buku: mulai dari harga termurah, turun sampai EOQ admissible
  const trace: TraceItem[] = [];
  const candidates: Candidate[] = [];
  for (let k = n - 1; k >= 0; k--) {
    const t = tiers[k];
    const adm = t.eoq >= t.lower && t.eoq < t.upper;
    if (adm) {
      trace.push({ tier: t.index, eoq: t.eoq, admissible: true, candidate: t.eoq, note: 'EOQ admissible — berhenti (Observasi 3).' });
      candidates.push({ tier: t.index, q: t.eoq, source: 'eoq', ...tcAt(t.eoq, t.price, i) });
      break;
    }
    trace.push({
      tier: t.index, eoq: t.eoq, admissible: false, candidate: t.lower,
      note: `EOQ < batas bawah ${t.lower}; kandidat = titik putus (Observasi 2).`,
    });
    candidates.push({ tier: t.index, q: t.lower, source: 'break', ...tcAt(t.lower, t.price, i) });
  }
  candidates.sort((a, b) => a.tier - b.tier);
  const best = candidates.reduce((a, b) => (b.total < a.total - 1e-9 ? b : a));

  const base = tcAt(tiers[0].eoq, tiers[0].price, i).total;
  const maxBreak = i.tiers[n - 1].min;
  const maxEoq = Math.max(...tiers.map((t) => t.eoq));
  const maxQ = Math.max(maxBreak * 1.6, maxEoq * 2.2, best.q * 1.6, 10);
  const minQ = Math.max(maxQ / 200, Math.min(...tiers.map((t) => t.eoq)) * 0.25);
  const qs = linspace(minQ, maxQ, 160).concat(i.tiers.slice(1).flatMap((t) => [t.min - 1e-6, t.min]));
  qs.sort((a, b) => a - b);
  const curve = qs.map((q) => {
    const row: Record<string, number | null> = { q };
    tiers.forEach((t) => {
      const v = tcAt(q, t.price, i).total;
      row[`_tc${t.index}`] = v;
      row[`act${t.index}`] = q >= t.lower && q < t.upper ? v : null;
    });
    return row;
  });

  return {
    tiers, trace, candidates, best,
    ordersPerYear: i.D / best.q,
    cycleYears: best.q / i.D,
    savingVsNoDiscount: base - best.total,
    curve, maxQ,
  };
}

export function stepsDiscount(i: DiscountInput, r: DiscountResult, f: TexFmt): Step[] {
  const s: Step[] = [];
  const plain = (n: number) => f(n).replace(/\{,\}/g, ',').replace(/\\,/g, ' ');
  s.push({
    title: 'Fungsi biaya per tingkat harga',
    text: 'Pada setiap interval harga, biaya simpan per unit adalah I·pᵢ sehingga ikut bergantung pada harga.',
    tex: `TC_i(q) = \\frac{KD}{q} + Dp_i + \\frac{q}{2} I p_i,\\qquad EOQ_i = \\sqrt{\\frac{2KD}{I p_i}}`,
  });
  r.trace.forEach((t, idx) => {
    const tier = r.tiers[t.tier - 1];
    const interval = tier.upper === Infinity ? `q \\ge ${f(tier.lower, 0)}` : `${f(tier.lower, 0)} \\le q < ${f(tier.upper, 0)}`;
    s.push({
      title: `Langkah ${idx + 1}: harga p${t.tier} = ${plain(tier.price)}`,
      text: t.admissible
        ? `EOQ berada di interval ⇒ admissible. Harga yang lebih mahal tidak perlu ditinjau.`
        : `EOQ di bawah batas interval ⇒ tidak admissible; TC naik untuk q > EOQ, sehingga minimum interval di titik putus.`,
      tex: `EOQ_${t.tier} = \\sqrt{\\frac{2(${f(i.K)})(${f(i.D)})}{${f(i.I / 100, 4)}(${f(tier.price)})}} = ${f(t.eoq)}\\quad(${interval})\\ \\Rightarrow\\ q_${t.tier}^* = ${f(t.candidate)}`,
    });
  });
  r.candidates.forEach((c) => {
    s.push({
      title: `Total biaya kandidat q = ${plain(c.q)}`,
      tex: `TC(${f(c.q)}) = ${f(c.ordering)} + ${f(c.purchase)} + ${f(c.holding)} = ${f(c.total)}`,
    });
  });
  s.push({
    title: 'Kesimpulan',
    text: 'Pilih kandidat dengan total biaya tahunan terkecil.',
    tex: `q^* = \\mathbf{${f(r.best.q)}},\\qquad TC^* = \\mathbf{${f(r.best.total)}},\\qquad \\frac{D}{q^*} = ${f(r.ordersPerYear)}\\ \\text{pesanan/tahun}`,
  });
  return s;
}
