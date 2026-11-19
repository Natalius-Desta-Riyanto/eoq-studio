// Contoh soal dari materi Bab 15 (Winston) — dapat dimuat langsung di setiap model.
import type { BasicInput } from '@/lib/models/basic';
import type { DiscountInput } from '@/lib/models/discount';
import type { ContinuousInput } from '@/lib/models/continuous';
import type { BackorderInput } from '@/lib/models/backorder';
import type { ValidityInput } from '@/lib/models/validity';
import type { MultiInput } from '@/lib/models/multi';
import { basicDefaults } from '@/lib/models/basic';
import { discountDefaults } from '@/lib/models/discount';
import { continuousDefaults } from '@/lib/models/continuous';
import { backorderDefaults } from '@/lib/models/backorder';
import { validityDefaults } from '@/lib/models/validity';
import { multiDefaults } from '@/lib/models/multi';

export interface Preset<T> { id: string; name: string; source: string; description: string; input: T }

export const basicPresets: Preset<BasicInput>[] = [
  { id: 'braneast', name: 'Contoh 1 · Braneast Airlines', source: 'Subbab 15.2', description: 'D = 500 lampu/tahun, K = $5, h = $0,08, p = $0,40.', input: { ...basicDefaults } },
  { id: 'braneast-l1', name: 'Reorder point · L = 1 bulan', source: 'Subbab 15.2', description: 'Kasus 1: LD = 41,67 ≤ EOQ.', input: { ...basicDefaults, L: 1, leadUnit: 'bulan' } },
  { id: 'braneast-l15', name: 'Reorder point · L = 15 bulan', source: 'Subbab 15.2', description: 'Kasus 2: LD = 625 > EOQ ⇒ R = 625 mod 250.', input: { ...basicDefaults, L: 15, leadUnit: 'bulan' } },
  { id: 'camera', name: 'Contoh 2 · Ordering Cameras', source: 'Subbab 15.2', description: 'D = 10.000, K = $5, p = $100, biaya simpan 20% harga.', input: { ...basicDefaults, D: 10000, K: 5, p: 100, holdingMode: 'percent', holdingRate: 20 } },
  { id: 'bus', name: 'Contoh 3 · Layanan Bus', source: 'Subbab 15.2', description: 'D = 100 mahasiswa/jam, K = $10 per bus, h = $5/jam.', input: { ...basicDefaults, period: 'jam', D: 100, K: 10, h: 5, p: 0 } },
];

export const discountPresets: Preset<DiscountInput>[] = [
  { id: 'disket', name: 'Contoh 4 · Membeli Disket', source: 'Subbab 15.3', description: 'D = 1.000 kotak, K = $100, I = 20%, harga $50 / $49 / $48,50.', input: structuredClone(discountDefaults) },
];

export const continuousPresets: Preset<ContinuousInput>[] = [
  { id: 'macho', name: 'Contoh 5 · Macho Auto', source: 'Subbab 15.4', description: 'D = 10.000 sasis, r = 25.000, K = $200, h = 25% × $2.000.', input: { ...continuousDefaults } },
];

export const backorderPresets: Preset<BackorderInput>[] = [
  { id: 'smalltown', name: 'Contoh 6 · Smalltown Optometry', source: 'Subbab 15.5', description: 'D = 10.000 frame, K = $50, h = 30% × $15, s = $15.', input: { ...backorderDefaults } },
];

export const validityPresets: Preset<ValidityInput>[] = [
  { id: 'quarters', name: 'Contoh evaluasi · 4 kuartal', source: 'Subbab 15.6', description: 'Permintaan 80, 100, 130, 90 ⇒ FC = 0,035.', input: { ...validityDefaults } },
  { id: 'lumpy', name: 'Ilustrasi permintaan musiman', source: 'Ilustrasi', description: '12 bulan dengan puncak musiman (FC > 0,20).', input: { demands: [20, 25, 40, 80, 160, 210, 190, 120, 60, 30, 20, 15], threshold: 0.2, periodLabel: 'Bulan' } },
];

export const multiPresets: Preset<MultiInput>[] = [
  { id: 'ohm', name: 'Contoh 7 · Ohm City Appliances', source: 'Subbab 15.7', description: '3 jenis TV, biaya truk $4.000, biaya produk $1.000.', input: structuredClone(multiDefaults) },
  { id: 'ohm-manual', name: 'Contoh 7 · trial spreadsheet', source: 'Subbab 15.7', description: 'Nilai trial n = 10,46; pengali 1 dan 4 (mode manual).', input: { ...structuredClone(multiDefaults), mode: 'manual', manualN: 10.46135741, manualM: [1, 4] } },
];

import type { ModelKind } from '@/lib/models/common';
export const PRESETS_BY_KIND: Record<ModelKind, Preset<unknown>[]> = {
  basic: basicPresets as Preset<unknown>[],
  discount: discountPresets as Preset<unknown>[],
  continuous: continuousPresets as Preset<unknown>[],
  backorder: backorderPresets as Preset<unknown>[],
  validity: validityPresets as Preset<unknown>[],
  multi: multiPresets as Preset<unknown>[],
};
