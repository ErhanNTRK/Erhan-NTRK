import { describe, it, expect } from 'vitest';
import { computeFuel, yearlyLitersOf, daysBetween } from './engine';
import type { FuelProductInput } from './engine';

const P = (o: Partial<FuelProductInput>): FuelProductInput => ({
  id: 'p', name: 'Motorin', mode: 'gunluk', dailyLiters: 0, yearlyLiters: 0,
  multiYearLiters: [], periodLiters: 0, periodDays: 0, unitPrice: 0, profitPct: 3, ...o,
});

describe('veri giriş modları', () => {
  it('günlük ×365 · yıllık aynen · çok-yıl ortalaması (2 yıl→2, 3 yıl→3)', () => {
    expect(yearlyLitersOf(P({ mode: 'gunluk', dailyLiters: 1445.01 }))).toBeCloseTo(527428.65, 1);
    expect(yearlyLitersOf(P({ mode: 'yillik', yearlyLiters: 650255 }))).toBe(650255);
    expect(yearlyLitersOf(P({ mode: 'cokyil', multiYearLiters: [600000, 700000] }))).toBe(650000);
    expect(yearlyLitersOf(P({ mode: 'cokyil', multiYearLiters: [600000, 700000, 800000] }))).toBeCloseTo(700000, 2);
  });
  it('kısmi dönem: 01.01.2026–29.07.2026 = 210 gün; aynı tempoyla 365 güne yayılır', () => {
    const days = daysBetween('2026-01-01', '2026-07-29');
    expect(days).toBe(210);
    expect(yearlyLitersOf(P({ mode: 'kismi', periodLiters: 420000, periodDays: days })))
      .toBeCloseTo((420000 / 210) * 365, 2);
  });
});

describe('computeFuel — banka formatı goldeni', () => {
  it('%3 benzin-motorin · %5 LPG · ilave gelirler ciro/net karışık · kap %10', () => {
    const r = computeFuel({
      products: [
        P({ id: 'm', name: 'Motorin', mode: 'yillik', yearlyLiters: 650255, unitPrice: 5.71, profitPct: 3 }),
        P({ id: 'b', name: 'Kurşunsuz 95', mode: 'yillik', yearlyLiters: 255312, unitPrice: 6.01, profitPct: 3 }),
        P({ id: 'l', name: 'LPG', mode: 'yillik', yearlyLiters: 750650, unitPrice: 3.16, profitPct: 5 }),
      ],
      extras: [
        { id: 'lok', name: 'Lokanta', mode: 'ciro', turnover: 225225, profitPct: 20, netAmount: 0 },
        { id: 'tek', name: 'Tekel', mode: 'ciro', turnover: 85085, profitPct: 4, netAmount: 0 },
        { id: 'oy', name: 'Oto Yıkama', mode: 'net', turnover: 0, profitPct: 0, netAmount: 50000 },
      ],
      otherIncomePctOfFuel: 0, dealerRent: { include: false, yearlyAmount: 0 },
      capRate: 0.10, rounding: 0,
      cost: { enabled: false, parcelArea: 0, landUnitValue: 0, buildings: [] },
    });
    expect(r.products[0].turnover).toBeCloseTo(3712956.05, 1);
    expect(r.products[0].net).toBeCloseTo(111388.68, 1);
    expect(r.products[2].net).toBeCloseTo(750650 * 3.16 * 0.05, 1);
    expect(r.extrasNet).toBeCloseTo(225225 * 0.20 + 85085 * 0.04 + 50000, 2);
    expect(r.incomeValue).toBeCloseTo(r.totalNet / 0.10, 1);
  });
  it('dağıtıcı kirası dahil edilirse düşülür; edilmezse dokunulmaz', () => {
    const mk = (include: boolean) => computeFuel({
      products: [P({ mode: 'gunluk', dailyLiters: 1000, unitPrice: 50, profitPct: 3 })],
      extras: [], otherIncomePctOfFuel: 0, dealerRent: { include, yearlyAmount: 200000 },
      capRate: 0.10, rounding: 0,
      cost: { enabled: false, parcelArea: 0, landUnitValue: 0, buildings: [] },
    });
    expect(mk(true).totalNet).toBeCloseTo(mk(false).totalNet - 200000, 2);
  });
  it('çift yöntem: yuvarlama + maliyet yaklaşımı (madeni yağ tesisi senaryosu)', () => {
    const r = computeFuel({
      products: [P({ mode: 'gunluk', dailyLiters: 3000, unitPrice: 50, profitPct: 3 })],
      extras: [], otherIncomePctOfFuel: 0, dealerRent: { include: false, yearlyAmount: 0 },
      capRate: 0.12, rounding: 50000,
      cost: { enabled: true, parcelArea: 5000, landUnitValue: 8000, buildings: [
        { id: 'k', name: 'Kanopi+Satış Binası', area: 600, unitCost: 15000 },
        { id: 'my', name: 'Madeni Yağ Tesisi', area: 2507, unitCost: 600 },
      ] },
    });
    expect(r.incomeValueRounded % 50000).toBe(0);
    expect(r.costLand).toBe(40000000);
    expect(r.costBuildings).toBeCloseTo(600 * 15000 + 2507 * 600, 2);
    expect(r.costValue).toBeCloseTo(r.costLand + r.costBuildings, 2);
  });
});

describe("'Diğer Gelirler' — yakıt cirosunun yüzdesi tek satır", () => {
  it('otherIncomePctOfFuel yakıt cirosuna uygulanır ve toplam net kâra eklenir', () => {
    const input = {
      products: [{ id: 'p1', name: 'Motorin', mode: 'yillik' as const, dailyLiters: 0, yearlyLiters: 1000000,
        multiYearLiters: [], periodLiters: 0, periodDays: 0, unitPrice: 40, profitPct: 3 }],
      extras: [], otherIncomePctOfFuel: 2, dealerRent: { include: false, yearlyAmount: 0 },
      capRate: 10, rounding: 0,
      cost: { enabled: false, parcelArea: 0, landUnitValue: 0, buildings: [] },
    };
    const r = computeFuel(input);
    // ciro = 1.000.000 × 40 = 40.000.000 · %2 = 800.000
    expect(r.otherIncomeFromPct).toBeCloseTo(800000, 1);
    expect(r.totalNet).toBeCloseTo(r.fuelNet + 800000, 1);
  });
  it('0 iken hiç etki etmez (varsayılan kapalı)', () => {
    const input = {
      products: [{ id: 'p1', name: 'Motorin', mode: 'yillik' as const, dailyLiters: 0, yearlyLiters: 1000000,
        multiYearLiters: [], periodLiters: 0, periodDays: 0, unitPrice: 40, profitPct: 3 }],
      extras: [], otherIncomePctOfFuel: 0, dealerRent: { include: false, yearlyAmount: 0 },
      capRate: 10, rounding: 0,
      cost: { enabled: false, parcelArea: 0, landUnitValue: 0, buildings: [] },
    };
    const r = computeFuel(input);
    expect(r.otherIncomeFromPct).toBe(0);
    expect(r.totalNet).toBe(r.fuelNet);
  });
});
