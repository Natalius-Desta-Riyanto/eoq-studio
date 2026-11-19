// Validitas asumsi EOQ — koefisien variabilitas Silver, Pyke & Peterson (1998)
import { type FieldErrors, type Step, type TexFmt } from './common';

export interface ValidityInput {
  demands: number[];
  threshold: number;   // default 0,20
  periodLabel: string; // mis. "Kuartal", "Bulan"
}

export interface ValidityResult {
  n: number;
  sum: number;
  mean: number;
  sumSq: number;
  variance: number; // (1/n)Σd² − d̄²
  sd: number;
  cv: number;       // sd/mean (koefisien variasi biasa, informasi tambahan)
  FC: number;       // var/d̄²
  valid: boolean;
  rows: { period: number; d: number; d2: number; dev: number }[];
}

export const validityDefaults: ValidityInput = {
  demands: [80, 100, 130, 90], threshold: 0.2, periodLabel: 'Kuartal',
};

/**
 * Parsing daftar permintaan yang fleksibel: dipisah spasi, baris baru, titik koma, atau koma.
 * Mendukung desimal koma ("12,5") dan pemisah ribuan titik ("1.250").
 */
export function parseDemands(text: string): number[] {
  const tokens = text
    .split(/[\s;]+/)
    .flatMap((t) => ((t.match(/,/g) ?? []).length > 1 || /,$/.test(t) ? t.split(',') : [t]))
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.map((t) => {
    let x = t;
    if (x.includes(',') && x.includes('.')) x = x.replace(/\./g, '').replace(',', '.');
    else if (x.includes(',')) x = x.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(x)) x = x.replace(/\./g, '');
    return Number(x);
  });
}

export function validateValidity(i: ValidityInput): FieldErrors {
  const e: FieldErrors = {};
  if (i.demands.length < 2) e.demands = 'Masukkan minimal 2 periode data permintaan.';
  else if (i.demands.some((d) => !Number.isFinite(d) || d < 0)) e.demands = 'Semua data permintaan harus angka ≥ 0.';
  else if (i.demands.every((d) => d === 0)) e.demands = 'Rata-rata permintaan tidak boleh nol.';
  if (!(i.threshold > 0)) e.threshold = 'Ambang batas harus positif.';
  return e;
}

export function solveValidity(i: ValidityInput): ValidityResult {
  const n = i.demands.length;
  const sum = i.demands.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sumSq = i.demands.reduce((a, b) => a + b * b, 0);
  const variance = Math.max(0, sumSq / n - mean * mean);
  const sd = Math.sqrt(variance);
  const FC = variance / (mean * mean);
  return {
    n, sum, mean, sumSq, variance, sd, cv: sd / mean, FC, valid: FC < i.threshold,
    rows: i.demands.map((d, k) => ({ period: k + 1, d, d2: d * d, dev: d - mean })),
  };
}

export function stepsValidity(i: ValidityInput, r: ValidityResult, f: TexFmt): Step[] {
  return [
    {
      title: 'Rata-rata permintaan per periode',
      tex: `\\bar d = \\frac{1}{n}\\sum_{i=1}^{n} d_i = \\frac{${f(r.sum)}}{${r.n}} = ${f(r.mean)}`,
    },
    {
      title: 'Estimasi varians permintaan',
      tex: `\\widehat{\\operatorname{var}}\\,D = \\frac{1}{n}\\sum d_i^2 - \\bar d^{\\,2} = \\frac{${f(r.sumSq)}}{${r.n}} - ${f(r.mean)}^2 = ${f(r.variance)}`,
    },
    {
      title: 'Koefisien variabilitas',
      tex: `FC = \\frac{\\widehat{\\operatorname{var}}\\,D}{\\bar d^{\\,2}} = \\frac{${f(r.variance)}}{${f(r.mean * r.mean)}} = \\mathbf{${f(r.FC, 4)}}`,
    },
    {
      title: 'Keputusan',
      text: r.valid
        ? 'Variabilitas rendah: asumsi permintaan konstan wajar, model EOQ layak digunakan.'
        : 'Variabilitas tinggi: model EOQ kurang memadai; gunakan pemrograman dinamis atau heuristik Silver–Meal.',
      tex: `FC = ${f(r.FC, 4)}\\ ${r.valid ? '<' : '\\ge'}\\ ${f(i.threshold, 2)}`,
    },
  ];
}
