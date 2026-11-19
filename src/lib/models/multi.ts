// 15.7 Pemesanan multi-produk dengan biaya pengiriman gabungan
import { requirePos, type FieldErrors, type Step, type TexFmt } from './common';

export interface Product {
  name: string;
  D: number;
  unitCost: number;
  holdingRate: number; // % per tahun
  orderCost: number;   // biaya tetap per produk per pesanan
}

export interface MultiInput {
  truckCost: number;
  products: Product[];   // produk ke-1 adalah produk acuan (selalu ikut setiap pengiriman)
  mode: 'optimize' | 'manual';
  maxMultiplier: number; // batas atas pengali saat optimasi
  manualN: number;       // frekuensi pesanan produk acuan (mode manual)
  manualM: number[];     // pengali produk ke-2.. (mode manual)
}

export interface ProductRow {
  name: string;
  m: number;
  ordersPerYear: number;
  Q: number;
  avgInv: number;
  holding: number;
  ordering: number;
  eoqAlone: number;     // EOQ individual (biaya produk saja), seperti baris "eoq" di spreadsheet
  ordersAlone: number;
}

export interface MultiPlan {
  n: number;
  m: number[];          // termasuk produk acuan (m = 1)
  truck: number;
  productOrdering: number;
  holding: number;
  total: number;
}

export interface MultiResult {
  plan: MultiPlan;
  rows: ProductRow[];
  alternatives: MultiPlan[];
  separate: { total: number; rows: { name: string; q: number; orders: number; cost: number }[] };
  saving: number;
  evaluated: number;
  curve: { n: number; ordering: number; holding: number; total: number }[];
}

export const multiDefaults: MultiInput = {
  truckCost: 4000,
  products: [
    { name: 'TV Model 1', D: 12000, unitCost: 500, holdingRate: 20, orderCost: 1000 },
    { name: 'TV Model 2', D: 1200, unitCost: 500, holdingRate: 20, orderCost: 1000 },
    { name: 'TV Model 3', D: 120, unitCost: 500, holdingRate: 20, orderCost: 1000 },
  ],
  mode: 'optimize',
  maxMultiplier: 12,
  manualN: 10,
  manualM: [1, 4],
};

export function validateMulti(i: MultiInput): FieldErrors {
  const e: FieldErrors = {};
  if (!(i.truckCost >= 0)) e.truckCost = 'Biaya pengiriman tidak boleh negatif.';
  if (i.products.length < 2) e.products = 'Masukkan minimal 2 produk.';
  i.products.forEach((p, k) => {
    requirePos(e, `p-${k}-D`, p.D, 'Permintaan');
    requirePos(e, `p-${k}-unitCost`, p.unitCost, 'Biaya unit');
    requirePos(e, `p-${k}-holdingRate`, p.holdingRate, 'Persentase simpan');
    if (!(p.orderCost >= 0)) e[`p-${k}-orderCost`] = 'Tidak boleh negatif.';
  });
  if (Object.keys(e).some((k) => k.startsWith('p-'))) e.products = e.products ?? 'Periksa tabel produk.';
  if (!(i.maxMultiplier >= 1 && i.maxMultiplier <= 60)) e.maxMultiplier = 'Batas pengali antara 1 dan 60.';
  if (i.mode === 'manual') {
    if (!(i.manualN > 0)) e.manualN = 'Frekuensi harus positif.';
    i.products.slice(1).forEach((_, k) => {
      const m = i.manualM[k];
      if (!(Number.isInteger(m) && m >= 1)) e[`m-${k}`] = 'Pengali harus bilangan bulat ≥ 1.';
    });
  }
  return e;
}

const hOf = (p: Product) => (p.holdingRate / 100) * p.unitCost;

/** TC(n) = n·A + B/n, dengan A = biaya pesan per pengiriman rata-rata, B = Σ h_j D_j m_j / 2. */
function coeffs(i: MultiInput, m: number[]) {
  let A = i.truckCost;
  let B = 0;
  i.products.forEach((p, k) => {
    A += p.orderCost / m[k];
    B += (hOf(p) * p.D * m[k]) / 2;
  });
  return { A, B };
}

export function evaluatePlan(i: MultiInput, n: number, m: number[]): MultiPlan {
  const truck = n * i.truckCost;
  let productOrdering = 0;
  let holding = 0;
  i.products.forEach((p, k) => {
    const orders = n / m[k];
    productOrdering += orders * p.orderCost;
    holding += hOf(p) * (p.D / orders) / 2;
  });
  return { n, m, truck, productOrdering, holding, total: truck + productOrdering + holding };
}

export function solveMulti(i: MultiInput): MultiResult {
  const others = i.products.length - 1;
  let plans: MultiPlan[] = [];
  let evaluated = 0;

  if (i.mode === 'manual') {
    const m = [1, ...i.products.slice(1).map((_, k) => i.manualM[k] ?? 1)];
    plans = [evaluatePlan(i, i.manualN, m)];
    evaluated = 1;
  } else {
    // Pencarian menyeluruh atas pengali bulat (lebih andal daripada Evolutionary Solver):
    // untuk setiap kombinasi m, n optimal tertutup n* = √(B/A) dan TC* = 2√(AB).
    const maxCombos = 400_000;
    let maxM = Math.max(1, Math.floor(i.maxMultiplier));
    while (others > 0 && Math.pow(maxM, others) > maxCombos) maxM--;
    const m = new Array(others).fill(1);
    const top: MultiPlan[] = [];
    const push = (plan: MultiPlan) => {
      top.push(plan);
      top.sort((a, b) => a.total - b.total);
      if (top.length > 8) top.pop();
    };
    for (;;) {
      const mm = [1, ...m];
      const { A, B } = coeffs(i, mm);
      const n = Math.sqrt(B / A);
      evaluated++;
      if (top.length < 8 || 2 * Math.sqrt(A * B) < top[top.length - 1].total) push(evaluatePlan(i, n, mm));
      let k = 0;
      while (k < others && m[k] === maxM) { m[k] = 1; k++; }
      if (k >= others) break;
      m[k]++;
    }
    plans = top;
  }

  const plan = plans[0];
  const rows: ProductRow[] = i.products.map((p, k) => {
    const orders = plan.n / plan.m[k];
    const Q = p.D / orders;
    const eoqAlone = Math.sqrt((2 * p.orderCost * p.D) / hOf(p));
    return {
      name: p.name, m: plan.m[k], ordersPerYear: orders, Q, avgInv: Q / 2,
      holding: (hOf(p) * Q) / 2, ordering: orders * p.orderCost,
      eoqAlone, ordersAlone: p.D / eoqAlone,
    };
  });

  // Skenario pembanding: setiap produk dipesan terpisah dengan truk sendiri
  const sepRows = i.products.map((p) => {
    const Kj = i.truckCost + p.orderCost;
    const q = Math.sqrt((2 * Kj * p.D) / hOf(p));
    return { name: p.name, q, orders: p.D / q, cost: Math.sqrt(2 * Kj * p.D * hOf(p)) };
  });
  const sepTotal = sepRows.reduce((a, b) => a + b.cost, 0);

  const curve = Array.from({ length: 80 }, (_, k) => {
    const n = plan.n * (0.3 + (2.7 * k) / 79);
    const e = evaluatePlan(i, n, plan.m);
    return { n, ordering: e.truck + e.productOrdering, holding: e.holding, total: e.total };
  });

  return {
    plan, rows, alternatives: plans, evaluated,
    separate: { total: sepTotal, rows: sepRows },
    saving: sepTotal - plan.total, curve,
  };
}

export function stepsMulti(i: MultiInput, r: MultiResult, f: TexFmt): Step[] {
  const { plan } = r;
  const { A, B } = coeffs(i, plan.m);
  const mList = plan.m.map((m, k) => `m_${k + 1}=${m}`).join(',\\ ');
  return [
    {
      title: 'EOQ awal tiap produk (Step 1)',
      text: 'EOQ individual menggunakan biaya pesan per produk saja, sebagai gambaran frekuensi alami.',
      tex: r.rows.map((row, k) => `EOQ_${k + 1} = ${f(row.eoqAlone)}`).join(',\\quad '),
    },
    {
      title: 'Model biaya gabungan',
      text: 'Produk acuan dipesan n kali per tahun; produk j ikut setiap m_j pengiriman sehingga dipesan n/m_j kali per tahun.',
      tex: `TC(n,\\mathbf m) = n\\Big(K_T + \\sum_j \\frac{K_j}{m_j}\\Big) + \\frac{1}{n}\\sum_j \\frac{h_j D_j m_j}{2}`,
    },
    {
      title: 'Pengali bulat terpilih',
      text: i.mode === 'optimize'
        ? `Dicari secara menyeluruh atas ${r.evaluated.toLocaleString('id-ID')} kombinasi pengali bulat.`
        : 'Nilai trial dimasukkan secara manual (seperti sel C15–C17 pada spreadsheet).',
      tex: `${mList}\\qquad A = ${f(A)},\\quad B = ${f(B)}`,
    },
    ...(i.mode === 'optimize' ? [{
      title: 'Frekuensi optimal produk acuan',
      tex: `n^* = \\sqrt{\\frac{B}{A}} = \\sqrt{\\frac{${f(B)}}{${f(A)}}} = \\mathbf{${f(plan.n, 4)}}\\ \\text{pesanan/tahun}`,
    }] : []),
    {
      title: 'Total biaya tahunan',
      tex: `\\underbrace{${f(plan.truck)}}_{\\text{truk}} + \\underbrace{${f(plan.productOrdering)}}_{\\text{pesan produk}} + \\underbrace{${f(plan.holding)}}_{\\text{simpan}} = \\mathbf{${f(plan.total)}}`,
    },
  ];
}
