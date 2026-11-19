// Verifikasi solver terhadap contoh-contoh pada materi (Winston Bab 15)
import { describe, expect, it } from 'vitest';
import { solveBasic, basicDefaults } from './basic';
import { solveDiscount, discountDefaults } from './discount';
import { solveContinuous, continuousDefaults } from './continuous';
import { solveBackorder, backorderDefaults } from './backorder';
import { solveValidity, parseDemands } from './validity';
import { solveMulti, multiDefaults } from './multi';

const close = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('15.2 EOQ dasar', () => {
  it('Contoh 1 Braneast Airlines', () => {
    const r = solveBasic(basicDefaults);
    close(r.q, 250);
    close(r.ordersPerPeriod, 2);
    close(r.cycle, 0.5);
    close(r.relevant, 20);
    close(r.HC, r.OC);
  });
  it('Tabel sensitivitas: q = 300 → 20,33', () => {
    const r = solveBasic({ ...basicDefaults, evalQ: 300 });
    close(r.evaluation!.relevant, 20.333);
    close(r.evaluation!.penaltyPct, 1.667);
  });
  it('Reorder point kasus 1 dan 2', () => {
    const r1 = solveBasic({ ...basicDefaults, L: 1, leadUnit: 'bulan' });
    expect(r1.reorderCase).toBe(1);
    close(r1.R, 41.667);
    const r2 = solveBasic({ ...basicDefaults, L: 15, leadUnit: 'bulan' });
    expect(r2.reorderCase).toBe(2);
    close(r2.LD, 625);
    close(r2.R, 125);
    expect(r2.ordersInTransit).toBe(2);
  });
  it('Contoh 2 kamera (biaya simpan persentase)', () => {
    const r = solveBasic({ ...basicDefaults, D: 10000, K: 5, holdingMode: 'percent', p: 100, holdingRate: 20 });
    close(r.q, 70.71);
    expect(r.rounding.map((x) => x.q)).toEqual([70, 71]);
  });
  it('Contoh 3 layanan bus (satuan jam)', () => {
    const r = solveBasic({ ...basicDefaults, period: 'jam', D: 100, K: 10, h: 5 });
    close(r.q, 20);
    close(r.ordersPerPeriod, 5);
    close(r.cycle * 60, 12);
  });
});

describe('15.3 Diskon kuantitas', () => {
  it('Contoh 4 disket', () => {
    const r = solveDiscount(discountDefaults);
    close(r.tiers[2].eoq, 143.59);
    close(r.tiers[1].eoq, 142.86);
    expect(r.tiers[1].status).toBe('admissible');
    expect(r.candidates.map((c) => c.tier)).toEqual([2, 3]);
    close(r.best.q, 300);
    close(r.best.total, 50288.33);
    const c2 = r.candidates.find((c) => c.tier === 2)!;
    close(c2.total, 50400, 0.02);
    close(r.ordersPerYear, 3.333);
  });
});

describe('15.4 Laju kontinu', () => {
  it('Contoh 5 Macho Auto', () => {
    const r = solveContinuous(continuousDefaults);
    close(r.h, 500);
    close(r.q, 115.47);
    close(r.runsPerYear, 86.60);
    close(r.relevant, 34641.02);
    close(r.eoq, 89.44);
    close(r.Imax, 69.28);
    close(r.utilization, 0.4);
  });
});

describe('15.5 Back order', () => {
  it('Contoh 6 Smalltown Optometry', () => {
    const r = solveBackorder(backorderDefaults);
    close(r.h, 4.5);
    close(r.q, 537.48);
    close(r.M, 413.45);
    close(r.shortage, 124.03);
    close(r.total, Math.sqrt(2 * 50 * 10000 * 4.5 * 15 / 19.5));
  });
});

describe('15.6 Validitas EOQ', () => {
  it('Contoh 4 kuartal', () => {
    const r = solveValidity({ demands: [80, 100, 130, 90], threshold: 0.2, periodLabel: 'Kuartal' });
    close(r.mean, 100);
    close(r.variance, 350);
    close(r.FC, 0.035, 1e-6);
    expect(r.valid).toBe(true);
  });
  it('Parsing input fleksibel', () => {
    expect(parseDemands('80, 100, 130, 90')).toEqual([80, 100, 130, 90]);
    expect(parseDemands('80;100\n130 90')).toEqual([80, 100, 130, 90]);
    expect(parseDemands('80,100,130,90')).toEqual([80, 100, 130, 90]);
    expect(parseDemands('1.250 12,5')).toEqual([1250, 12.5]);
  });
});

describe('15.7 Multi-produk', () => {
  it('Contoh 7 Ohm City Appliances', () => {
    const r = solveMulti(multiDefaults);
    expect(r.plan.m).toEqual([1, 1, 4]);
    close(r.plan.n, 10.4614);
    close(r.plan.truck, 41845.43);
    close(r.plan.total, 130766.97);
    close(r.rows[0].Q, 1147.08);
    close(r.rows[2].Q, 45.88);
    close(r.rows[0].eoqAlone, 489.898);
  });
  it('Mode manual sama dengan spreadsheet', () => {
    const r = solveMulti({ ...multiDefaults, mode: 'manual', manualN: 10.46135741, manualM: [1, 4] });
    close(r.plan.total, 130766.97);
  });
});

describe('Contoh soal PPT di riwayat', () => {
  it('12 entri dengan hasil sesuai jawaban PPT', async () => {
    const { buildSeedEntries } = await import('@/data/seed');
    const seeds = buildSeedEntries(0);
    expect(seeds).toHaveLength(12);
    const m = (id: string, key: string) => seeds.find((s) => s.id === id)!.metrics.find((x) => x.key === key)!.value as number;
    close(m('ppt-01-braneast', 'q'), 250);
    close(m('ppt-03-rop-kasus1', 'R'), 41.667);
    close(m('ppt-04-rop-kasus2', 'R'), 125);
    close(m('ppt-05-kamera', 'q'), 70.71);
    close(m('ppt-06-bus', 'q'), 20);
    close(m('ppt-07-disket', 'TC'), 50288.33);
    close(m('ppt-08-macho', 'relevant'), 34641.02);
    close(m('ppt-09-smalltown', 'M'), 413.45);
    close(m('ppt-10-kuartal', 'FC'), 0.035, 1e-6);
    close(m('ppt-11-ohm', 'TC'), 130766.97);
    close(m('ppt-12-ohm-trial', 'TC'), 130766.97);
  });
});
