// Seluruh contoh soal pada PPT Bab 15 sebagai entri riwayat siap pakai.
// Dimuat otomatis saat aplikasi pertama kali dibuka dan bisa dimuat ulang dari halaman Riwayat.
import type { ModelKind } from '@/lib/models/common';
import { modelByKind } from '@/lib/registry';
import { useHistory, type HistoryEntry } from '@/store/history';
import { basicDefaults } from '@/lib/models/basic';
import { discountDefaults } from '@/lib/models/discount';
import { continuousDefaults } from '@/lib/models/continuous';
import { backorderDefaults } from '@/lib/models/backorder';
import { validityDefaults } from '@/lib/models/validity';
import { multiDefaults } from '@/lib/models/multi';

interface SeedDef { id: string; kind: ModelKind; title: string; note: string; input: unknown }

const SEEDS: SeedDef[] = [
  {
    id: 'ppt-01-braneast', kind: 'basic', title: 'Contoh 1 · Braneast Airlines',
    note: 'Slide 13–14. D = 500 lampu/tahun, K = $5, h = $0,08, p = $0,40. Jawaban PPT: q* = 250 lampu, 2 pesanan/tahun, T = 0,5 tahun (6 bulan).',
    input: { ...basicDefaults },
  },
  {
    id: 'ppt-02-sensitivitas', kind: 'basic', title: 'Contoh 1 · Sensitivitas q = 300',
    note: 'Slide 15. Memesan q = 300 (20% di atas EOQ) menghasilkan biaya simpan + pesan 20,33, hanya sekitar 1,67% di atas minimum 20.',
    input: { ...basicDefaults, evalQ: 300 },
  },
  {
    id: 'ppt-03-rop-kasus1', kind: 'basic', title: 'Reorder point Kasus 1 · L = 1 bulan',
    note: 'Slide 19. LD = (1/12)(500) = 41,67 ≤ EOQ, sehingga pesan saat persediaan mencapai 41,67 lampu.',
    input: { ...basicDefaults, L: 1, leadUnit: 'bulan' },
  },
  {
    id: 'ppt-04-rop-kasus2', kind: 'basic', title: 'Reorder point Kasus 2 · L = 15 bulan',
    note: 'Slide 19. LD = (15/12)(500) = 625 > 250, sehingga R = 625 mod 250 = 125 lampu.',
    input: { ...basicDefaults, L: 15, leadUnit: 'bulan' },
  },
  {
    id: 'ppt-05-kamera', kind: 'basic', title: 'Contoh 2 · Ordering Cameras',
    note: 'Slide 16. D = 10.000 kamera, K = $5, p = $100, biaya simpan 20% harga. Jawaban PPT: q* = √5.000 ≈ 70,71; bandingkan q = 70 dan 71.',
    input: { ...basicDefaults, D: 10000, K: 5, p: 100, holdingMode: 'percent', holdingRate: 20 },
  },
  {
    id: 'ppt-06-bus', kind: 'basic', title: 'Contoh 3 · Layanan Bus',
    note: 'Slide 20–21. Satuan waktu jam: D = 100 mahasiswa/jam, K = $10 per bus, h = $5/mahasiswa/jam. Jawaban PPT: q* = 20, 5 bus/jam, jarak 0,2 jam = 12 menit.',
    input: { ...basicDefaults, period: 'jam', D: 100, K: 10, h: 5, p: 0 },
  },
  {
    id: 'ppt-07-disket', kind: 'discount', title: 'Contoh 4 · Membeli Disket',
    note: 'Slide 31–37. D = 1.000 kotak, K = $100, I = 20%, harga $50 / $49 / $48,50 dengan titik putus 100 dan 300. Jawaban PPT: q* = 300 kotak, ≈ 3,33 pesanan/tahun, TC = $50.288,33.',
    input: structuredClone(discountDefaults),
  },
  {
    id: 'ppt-08-macho', kind: 'continuous', title: 'Contoh 5 · Macho Auto Company',
    note: 'Slide 45–48. D = 10.000 sasis, r = 25.000, K = $200, h = 25% × $2.000 = $500. Jawaban PPT: q* ≈ 115,47; 86,60 run/tahun; biaya ≈ $34.641,02.',
    input: { ...continuousDefaults },
  },
  {
    id: 'ppt-09-smalltown', kind: 'backorder', title: 'Contoh 6 · Smalltown Optometry Clinic',
    note: 'Slide 57–58. D = 10.000 frame, K = $50, h = 30% × $15 = $4,50, s = $15. Jawaban PPT: q* ≈ 537,48; M* ≈ 413,45; kekurangan maks ≈ 124,03.',
    input: { ...backorderDefaults },
  },
  {
    id: 'ppt-10-kuartal', kind: 'validity', title: 'Contoh evaluasi FC · 4 kuartal',
    note: 'Slide 61. Permintaan 80, 100, 130, 90. Jawaban PPT: d̄ = 100, Est. var D = 350, FC = 0,035 < 0,20 sehingga EOQ layak.',
    input: { ...validityDefaults },
  },
  {
    id: 'ppt-11-ohm', kind: 'multi', title: 'Contoh 7 · Ohm City Appliances (optimasi)',
    note: 'Slide 63–66. 3 TV, permintaan 12.000 / 1.200 / 120, biaya unit $500, simpan 20%, biaya pesan produk $1.000, biaya truk $4.000. Jawaban PPT (Evolutionary Solver): n ≈ 10,46, pengali 1 dan 4, TC = $130.766,97. Catatan: pengali 1:2:5 memberi TC yang sama.',
    input: structuredClone(multiDefaults),
  },
  {
    id: 'ppt-12-ohm-trial', kind: 'multi', title: 'Contoh 7 · Spreadsheet Figure 14 (trial)',
    note: 'Slide 63. Mereplikasi sel C15–C17: n = 10,46135741, P1 per P2 = 1, P1 per P3 = 4. Biaya truk $41.845,43 dan total $130.766,97.',
    input: { ...structuredClone(multiDefaults), mode: 'manual', manualN: 10.46135741, manualM: [1, 4] },
  },
];

export const SEED_IDS = SEEDS.map((s) => s.id);

export function buildSeedEntries(now = Date.now()): HistoryEntry[] {
  return SEEDS.map((s, k) => {
    const t = now - k * 60_000; // Contoh 1 paling atas saat diurutkan "Terbaru"
    return {
      id: s.id, kind: s.kind, title: s.title, note: s.note, starred: false,
      createdAt: t, updatedAt: t, input: s.input, metrics: modelByKind(s.kind).metrics(s.input),
    };
  });
}

const FLAG = 'eoq-studio-seeded';

/** Tambahkan contoh soal PPT yang belum ada di riwayat. Mengembalikan jumlah yang ditambahkan. */
export function seedExamples(): number {
  const n = useHistory.getState().importMany(buildSeedEntries());
  try { localStorage.setItem(FLAG, 'v1'); } catch { /* storage tidak tersedia */ }
  return n;
}

/** Dipanggil sekali saat aplikasi dibuka: muat contoh soal hanya pada kunjungan pertama. */
export function seedOnFirstRun() {
  try {
    if (localStorage.getItem(FLAG) === 'v1') return;
  } catch { return; }
  seedExamples();
}
