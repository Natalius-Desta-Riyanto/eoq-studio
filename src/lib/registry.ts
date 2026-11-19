import {
  Activity, Boxes, Calculator, Factory, PackageMinus, Tags, type LucideIcon,
} from 'lucide-react';
import type { ModelKind } from './models/common';
import type { Metric } from '@/store/history';
import { solveBasic, type BasicInput } from './models/basic';
import { solveDiscount, type DiscountInput } from './models/discount';
import { solveContinuous, type ContinuousInput } from './models/continuous';
import { solveBackorder, type BackorderInput } from './models/backorder';
import { solveValidity, type ValidityInput } from './models/validity';
import { solveMulti, type MultiInput } from './models/multi';

export interface ModelMeta {
  kind: ModelKind;
  path: string;
  section: string;
  name: string;
  short: string;
  description: string;
  icon: LucideIcon;
  metrics: (input: any) => Metric[];
}

export const MODELS: ModelMeta[] = [
  {
    kind: 'basic', path: '/model/eoq-dasar', section: '15.1–15.2', name: 'EOQ Dasar', short: 'EOQ',
    description: 'Kuantitas pesanan ekonomis, siklus, biaya, reorder point, dan sensitivitas.',
    icon: Calculator,
    metrics: (i: BasicInput) => {
      const r = solveBasic(i);
      const out: Metric[] = [
        { key: 'q', label: 'EOQ (q*)', value: r.q, kind: 'qty', unit: 'unit' },
        { key: 'orders', label: `Pesanan/${i.period}`, value: r.ordersPerPeriod, kind: 'num' },
        { key: 'relevant', label: 'Biaya simpan + pesan', value: r.relevant, kind: 'money' },
        { key: 'TC', label: 'Total biaya', value: r.TC, kind: 'money' },
        { key: 'R', label: 'Reorder point', value: r.R, kind: 'qty', unit: 'unit' },
      ];
      // Tampilkan metrik yang paling relevan dengan skenario di posisi ke-3 (terlihat di daftar riwayat)
      if (i.L > 0) out.splice(2, 0, out.splice(4, 1)[0]);
      if (r.evaluation) out.splice(2, 0, { key: 'evalCost', label: `Biaya di q = ${+r.evaluation.q.toFixed(2)}`, value: r.evaluation.relevant, kind: 'money' },
        { key: 'penalty', label: 'Kenaikan biaya', value: r.evaluation.penaltyPct, kind: 'pct' });
      return out;
    },
  },
  {
    kind: 'discount', path: '/model/diskon-kuantitas', section: '15.3', name: 'Diskon Kuantitas', short: 'Diskon',
    description: 'Harga bertingkat (all-units discount) dengan algoritma kandidat titik putus.',
    icon: Tags,
    metrics: (i: DiscountInput) => {
      const r = solveDiscount(i);
      return [
        { key: 'q', label: 'Pesanan optimal (q*)', value: r.best.q, kind: 'qty', unit: 'unit' },
        { key: 'price', label: 'Harga terpakai', value: i.tiers[r.best.tier - 1].price, kind: 'money' },
        { key: 'orders', label: 'Pesanan/tahun', value: r.ordersPerYear, kind: 'num' },
        { key: 'TC', label: 'Total biaya', value: r.best.total, kind: 'money' },
      ];
    },
  },
  {
    kind: 'continuous', path: '/model/laju-kontinu', section: '15.4', name: 'EOQ Laju Kontinu', short: 'Produksi',
    description: 'Ukuran production run optimal ketika barang diproduksi bertahap dengan laju r.',
    icon: Factory,
    metrics: (i: ContinuousInput) => {
      const r = solveContinuous(i);
      return [
        { key: 'q', label: 'Ukuran run (q*)', value: r.q, kind: 'qty', unit: 'unit' },
        { key: 'runs', label: 'Run/tahun', value: r.runsPerYear, kind: 'num' },
        { key: 'Imax', label: 'Persediaan maks', value: r.Imax, kind: 'qty', unit: 'unit' },
        { key: 'relevant', label: 'Biaya simpan + setup', value: r.relevant, kind: 'money' },
      ];
    },
  },
  {
    kind: 'backorder', path: '/model/back-order', section: '15.5', name: 'EOQ dengan Back Order', short: 'Back order',
    description: 'Kekurangan diizinkan: ukuran pesanan, persediaan maksimum, dan kekurangan maksimum.',
    icon: PackageMinus,
    metrics: (i: BackorderInput) => {
      const r = solveBackorder(i);
      return [
        { key: 'q', label: 'Pesanan optimal (q*)', value: r.q, kind: 'qty', unit: 'unit' },
        { key: 'M', label: 'Persediaan maks (M*)', value: r.M, kind: 'qty', unit: 'unit' },
        { key: 'short', label: 'Kekurangan maks', value: r.shortage, kind: 'qty', unit: 'unit' },
        { key: 'TC', label: 'Total biaya', value: r.total, kind: 'money' },
      ];
    },
  },
  {
    kind: 'validity', path: '/model/validitas', section: '15.6', name: 'Validitas EOQ', short: 'Validitas',
    description: 'Uji koefisien variabilitas Peterson & Silver untuk asumsi permintaan konstan.',
    icon: Activity,
    metrics: (i: ValidityInput) => {
      const r = solveValidity(i);
      return [
        { key: 'n', label: 'Periode', value: r.n, kind: 'num' },
        { key: 'mean', label: 'Rata-rata', value: r.mean, kind: 'num' },
        { key: 'FC', label: 'FC', value: r.FC, kind: 'num' },
        { key: 'decision', label: 'Keputusan', value: r.valid ? 'EOQ layak' : 'EOQ tidak layak', kind: 'text' },
      ];
    },
  },
  {
    kind: 'multi', path: '/model/multi-produk', section: '15.7', name: 'Multi-Produk', short: 'Multi',
    description: 'Koordinasi pesanan gabungan beberapa produk dari satu pemasok.',
    icon: Boxes,
    metrics: (i: MultiInput) => {
      const r = solveMulti(i);
      return [
        { key: 'n', label: 'Frekuensi acuan', value: r.plan.n, kind: 'num' },
        { key: 'm', label: 'Pengali', value: r.plan.m.join(' : '), kind: 'text' },
        { key: 'TC', label: 'Total biaya', value: r.plan.total, kind: 'money' },
        { key: 'saving', label: 'Hemat vs terpisah', value: r.saving, kind: 'money' },
      ];
    },
  },
];

export const modelByKind = (k: ModelKind) => MODELS.find((m) => m.kind === k)!;
