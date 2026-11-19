// Tipe & utilitas bersama untuk seluruh model EOQ deterministik (Winston, Bab 15)

export type ModelKind = 'basic' | 'discount' | 'continuous' | 'backorder' | 'validity' | 'multi';

/** Satu langkah penyelesaian (ditampilkan dengan KaTeX). */
export interface Step {
  title: string;
  /** Penjelasan singkat (teks biasa). */
  text?: string;
  /** Persamaan LaTeX (display mode). */
  tex?: string;
}

/** Fungsi format angka yang dipakai di dalam langkah-langkah LaTeX. */
export type TexFmt = (n: number, digits?: number) => string;

export type FieldErrors = Record<string, string>;

export type Period = 'tahun' | 'bulan' | 'minggu' | 'hari' | 'jam';

/** Banyaknya satuan waktu dalam satu tahun (dipakai untuk konversi lead time). */
export const UNITS_PER_YEAR: Record<Period, number> = {
  tahun: 1,
  bulan: 12,
  minggu: 52,
  hari: 365,
  jam: 8760,
};

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'tahun', label: 'Tahun' },
  { value: 'bulan', label: 'Bulan' },
  { value: 'minggu', label: 'Minggu' },
  { value: 'hari', label: 'Hari' },
  { value: 'jam', label: 'Jam' },
];

/** Konversi durasi `value` dalam satuan `from` ke satuan `to`. */
export function convertDuration(value: number, from: Period, to: Period): number {
  return (value * UNITS_PER_YEAR[to]) / UNITS_PER_YEAR[from];
}

export type HoldingMode = 'absolute' | 'percent';

/** Biaya simpan efektif h: langsung, atau h = p · i (persentase harga). */
export function effectiveHolding(mode: HoldingMode, h: number, p: number, ratePct: number): number {
  return mode === 'absolute' ? h : (p * ratePct) / 100;
}

export const isPos = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;
export const isNonNeg = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

export function requirePos(errors: FieldErrors, key: string, value: unknown, label: string) {
  if (!isPos(value)) errors[key] = `${label} harus bilangan positif.`;
}
export function requireNonNeg(errors: FieldErrors, key: string, value: unknown, label: string) {
  if (!isNonNeg(value)) errors[key] = `${label} tidak boleh negatif.`;
}

/** Sampel titik kurva secara merata pada [a, b]. */
export function linspace(a: number, b: number, n: number): number[] {
  if (n < 2) return [a];
  const step = (b - a) / (n - 1);
  return Array.from({ length: n }, (_, i) => a + i * step);
}

/** Modulo untuk bilangan real dengan toleransi pembulatan floating point. */
export function realMod(a: number, b: number): number {
  const r = a - b * Math.floor(a / b + 1e-12);
  return Math.abs(r) < 1e-9 || Math.abs(r - b) < 1e-9 ? 0 : r;
}
