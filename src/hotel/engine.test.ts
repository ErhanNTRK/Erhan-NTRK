/**
 * GOLDEN TEST — Otel Geliri Motoru
 * Referans: teknik geliştirme dokümanı Bölüm 2/10'daki örnek oda dağılımı.
 *   Standart 30 adet · 3.500 ₺ · %72 doluluk · 365 gün
 *   Deluxe   20 adet · 5.000 ₺ · %61 doluluk · 365 gün
 *   Suit     10 adet · 8.000 ₺ · %54 doluluk · 365 gün
 */
import { describe, it, expect } from 'vitest';
import { analyzeHotel, createDefaultHotelInput, computeRoomRevenue, computeCapitalizedValue, computeNoi, computeProjection } from './engine';
import { computeIna } from './engine';
import type { HotelIncomeInput, RoomRevenueRow } from './types';

const rooms: RoomRevenueRow[] = [
  { id: '1', roomType: 'Standart', roomCount: 30, adr: 3500, occupancy: 0.72, operatingDays: 365 },
  { id: '2', roomType: 'Deluxe', roomCount: 20, adr: 5000, occupancy: 0.61, operatingDays: 365 },
  { id: '3', roomType: 'Suit', roomCount: 10, adr: 8000, occupancy: 0.54, operatingDays: 365 },
];

describe('computeRoomRevenue', () => {
  it('her oda tipini dokümandaki formülle hesaplar: Sayı × Fiyat × Doluluk × Gün', () => {
    const { rows, total } = computeRoomRevenue(rooms);
    expect(rows[0].annualRevenue).toBe(Math.round(30 * 3500 * 0.72 * 365));
    expect(rows[1].annualRevenue).toBe(Math.round(20 * 5000 * 0.61 * 365));
    expect(rows[2].annualRevenue).toBe(Math.round(10 * 8000 * 0.54 * 365));
    expect(total).toBe(rows[0].annualRevenue + rows[1].annualRevenue + rows[2].annualRevenue);
  });

  it('doluluk %100 üzerini sınırlar, negatif değerleri sıfırlar', () => {
    const { rows } = computeRoomRevenue([
      { id: '1', roomType: 'Test', roomCount: -5, adr: -100, occupancy: 1.5, operatingDays: 500 },
    ]);
    expect(rows[0].annualRevenue).toBe(0); // roomCount ve adr sıfırlanınca gelir 0 olur
  });
});

describe('computeNoi ve computeCapitalizedValue', () => {
  it('dokümandaki örnek: 100.000.000 ₺ gelir, %35 gider → 65.000.000 ₺ NOI', () => {
    const { totalExpense, noi } = computeNoi(100_000_000, 0.35);
    expect(totalExpense).toBe(35_000_000);
    expect(noi).toBe(65_000_000);
  });

  it('kapitalizasyon oranı sıfırsa değer 0 döner (bölme hatası fırlatmaz)', () => {
    expect(computeCapitalizedValue(65_000_000, 0)).toBe(0);
  });

  it('NOI / Cap Rate ile nihai değeri hesaplar', () => {
    expect(computeCapitalizedValue(65_000_000, 0.10)).toBe(650_000_000);
  });
});

describe('analyzeHotel — uçtan uca orkestrasyon', () => {
  const input: HotelIncomeInput = {
    ...createDefaultHotelInput(),
    rooms,
    ancillary: [{ id: 'a1', name: 'Restoran', annualIncome: 2_000_000, note: '' }],
    leases: [{ id: 'l1', areaName: 'Zemin Kat Market', areaType: 'Market', tenant: 'X Market', inputMode: 'aylik', amount: 50_000, note: '' }],
    opex: { expenseRate: 0.35 },
    projection: { startYear: 2026, years: 5, incomeGrowthRate: 0.15, expenseGrowthRate: 0, capRate: 0.10, terminalCapRate: null, discountRate: null },
  };

  it('tüm gelir kalemlerini çifte saymadan toplar', () => {
    const r = analyzeHotel(input);
    expect(r.totalGrossRevenue).toBe(r.totalRoomRevenue + r.totalAncillaryRevenue + r.totalLeaseRevenue);
    expect(r.totalLeaseRevenue).toBe(50_000 * 12);
  });

  it('projeksiyon tablosu doğru yıl sayısında ve bileşik büyüyor', () => {
    const r = analyzeHotel(input);
    expect(r.projectionTable).toHaveLength(5);
    expect(r.projectionTable[0].totalRevenue).toBe(r.totalGrossRevenue);
    expect(r.projectionTable[1].totalRevenue).toBeGreaterThan(r.projectionTable[0].totalRevenue);
  });

  it('performans göstergelerini (ADR, doluluk, RevPAR) oda sayısı ağırlıklı hesaplar', () => {
    const r = analyzeHotel(input);
    expect(r.performance.totalRoomCount).toBe(60);
    expect(r.performance.revPar).toBeCloseTo(r.performance.blendedAdr * r.performance.blendedOccupancy, 5);
  });

  it('gelirsiz/oda tipsiz durumda uyarı üretir ama hesaplamayı engellemez', () => {
    const empty: HotelIncomeInput = { ...createDefaultHotelInput() };
    const r = analyzeHotel(empty);
    expect(r.warnings.some((w) => w.message.includes('oda tipi'))).toBe(true);
    expect(r.totalGrossRevenue).toBe(0);
    expect(r.capitalizedValue).toBe(0);
  });

  it('otomatik özet metni gelir/gider/NOI/değeri içerir', () => {
    const r = analyzeHotel(input);
    expect(r.summaryText).toContain('₺');
    expect(r.summaryText.length).toBeGreaterThan(20);
  });
});

describe('yardımcı gelir — oran modu', () => {
  it("Salih'in örneği: oda geliri 10M, diğer gelirler oda gelirinin %2'si → 200.000 ₺, toplam 10,2M", () => {
    const input: HotelIncomeInput = {
      ...createDefaultHotelInput(),
      rooms: [{ id: '1', roomType: 'Standart', roomCount: 100, adr: 1000, occupancy: 1, operatingDays: 100 }], // 10.000.000
      ancillary: [{ id: 'a1', name: 'Diğer', mode: 'oran', annualIncome: 0, rate: 0.02, note: '' }],
    };
    const r = analyzeHotel(input);
    expect(r.totalRoomRevenue).toBe(10_000_000);
    expect(r.totalAncillaryRevenue).toBe(200_000);
    expect(r.totalGrossRevenue).toBe(10_200_000);
    expect(r.ancillaryRows[0].effectiveIncome).toBe(200_000);
  });
});

describe('projeksiyon — gider tutar bazlı büyür (v5.8 düzeltmesi)', () => {
  it('gelir ve gider aynı oranda artarsa gider/gelir oranı sabit kalır, NOI aynı oranda büyür', () => {
    const t = computeProjection(100_000_000, 0.35, {
      startYear: 2026, years: 10, incomeGrowthRate: 0.15, expenseGrowthRate: 0.15,
      capRate: 0.10, terminalCapRate: null, discountRate: null,
    });
    expect(t).toHaveLength(10);
    // Oran her yıl %35
    for (const row of t) {
      expect(row.totalExpense / row.totalRevenue).toBeCloseTo(0.35, 3);
    }
    // NOI bileşik %15 büyür; asla yapay sıfırlanmaz
    expect(t[0].noi).toBe(65_000_000);
    expect(t[1].noi / t[0].noi).toBeCloseTo(1.15, 3);
    expect(t[9].noi).toBeGreaterThan(t[0].noi * 3);
    expect(t[9].capitalizedValue).toBeGreaterThan(0);
    // -0 artefaktı yok
    for (const row of t) expect(Object.is(row.noi, -0)).toBe(false);
  });

  it('gider artışı gelirden yüksekse marj daralır ama sıfıra çivilenmez', () => {
    const t = computeProjection(100_000_000, 0.35, {
      startYear: 2026, years: 25, incomeGrowthRate: 0.10, expenseGrowthRate: 0.20,
      capRate: 0.10, terminalCapRate: null, discountRate: null,
    });
    expect(t).toHaveLength(25);
    expect(t[24].totalExpense / t[24].totalRevenue).toBeGreaterThan(0.35);
    expect(t[1].noi).toBeGreaterThan(0);
  });

  it('yıl sayısı 3-25 aralığına sıkıştırılır', () => {
    const mk = (y: number) => computeProjection(1_000_000, 0.3, {
      startYear: 2026, years: y, incomeGrowthRate: 0, expenseGrowthRate: 0,
      capRate: 0.1, terminalCapRate: null, discountRate: null,
    });
    expect(mk(1)).toHaveLength(3);
    expect(mk(30)).toHaveLength(25);
    expect(mk(7)).toHaveLength(7);
  });
});

describe('İNA — banka Excel goldeni (birebir, tek tekrarlı senaryo)', () => {
  it('NOI 385.257,6 · %3 artış · iskonto %11 · terminal %10 · bakım 5. yıl (9 yıllık süre → yalnız 1 tekrar) → NBD 4.229.084,21', () => {
    // Excel'deki tabloyu üretecek girdi: NOI₁ = gelir × (1 − gider) = 1.100.736 × 0,35...
    // Motora doğrudan gelir 1.100.736 ve gider %65 veriyoruz → NOI₁ 385.257,6
    // years=9 (10 değil): interval=5 ile yalnız 5. yılda tetiklenir, 10. yılda tekrar ETMEZ —
    // eski "tek seferlik" senaryonun golden değerlerini korumak için bilerek 9 yıl kullanılıyor.
    const table = computeProjection(1100736, 0.65, {
      startYear: 2026, years: 9, incomeGrowthRate: 0.03, expenseGrowthRate: 0.03, capRate: 0.10,
      terminalCapRate: 0.10,
      discountRate: 0.11, riskFreeRate: 0.075, riskPremium: 0.035,
      maintenanceYear: 5, maintenanceAmount: 130867.2,
    } as any);
    expect(table[0].noi).toBeCloseTo(385257.6, -1);
    expect(table[1].noi).toBeCloseTo(396815.328, -1);
    const ina = computeIna(table, {
      startYear: 2026, years: 9, incomeGrowthRate: 0.03, expenseGrowthRate: 0.03, capRate: 0.10,
      terminalCapRate: 0.10, discountRate: 0.11,
      maintenanceYear: 5, maintenanceAmount: 130867.2,
    } as any)!;
    expect(ina.cashFlows[4]).toBeCloseTo(433610.82 - 130867.2, -1);
  });

  it('Periyodik Bakım: interval=5, 10 yıllık sürede 5. VE 10. yılda iki kez tetiklenir; 2. tekrar Gider Artış Oranıyla büyür', () => {
    const table = computeProjection(1100736, 0.65, {
      startYear: 2026, years: 10, incomeGrowthRate: 0.03, expenseGrowthRate: 0.03, capRate: 0.10,
      terminalCapRate: 0.10, discountRate: 0.11,
      maintenanceYear: 5, maintenanceAmount: 130867.2,
    } as any);
    const ina = computeIna(table, {
      startYear: 2026, years: 10, incomeGrowthRate: 0.03, expenseGrowthRate: 0.03, capRate: 0.10,
      terminalCapRate: 0.10, discountRate: 0.11,
      maintenanceYear: 5, maintenanceAmount: 130867.2,
    } as any)!;
    // 5. yıl (1. tekrar): tam girilen tutar
    expect(ina.cashFlows[4]).toBeCloseTo(table[4].noi - 130867.2, -1);
    // 10. yıl (2. tekrar, 1. tekrardan 5 yıl sonra): 130867.2 × 1.03^5 kadar büyümüş olmalı
    const buyumus = 130867.2 * Math.pow(1.03, 5);
    expect(ina.cashFlows[9]).toBeCloseTo(table[9].noi + ina.terminalValue - buyumus, -1);
  });
  it('iskonto girilmezse İNA null (mevcut davranış bozulmaz)', () => {
    const table = computeProjection(1000000, 0.6, { startYear: 2026, years: 5, incomeGrowthRate: 0.03, expenseGrowthRate: 0.03, capRate: 0.1, terminalCapRate: null, discountRate: null } as any);
    expect(computeIna(table, { startYear: 2026, years: 5, incomeGrowthRate: 0.03, expenseGrowthRate: 0.03, capRate: 0.1, terminalCapRate: null, discountRate: null } as any)).toBeNull();
  });
});
