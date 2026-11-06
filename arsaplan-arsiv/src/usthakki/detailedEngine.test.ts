/** Toplam Gelir Üzerinden Üst Hakkı Hesabı — golden testler.
 *  2026-07-31 SON REVİZYON: Gelir modeli Excel ile birebir (Salih onayı) —
 *  her kalem 1. yıl tutarı olarak girilir, aynı oranla büyür, TOPLANIR. */
import { describe, it, expect } from 'vitest';
import { computeDetailedUstHakki, computeRoomIncome, computeCostApproach, type DetailedUstHakkiInput, type DetailedRoomRow } from './detailedEngine';

const rooms: DetailedRoomRow[] = [
  { id: 'r1', name: 'Standart', count: 30, price: 3750, occupancyPct: 55, days: 365 },
];

const base: DetailedUstHakkiInput = {
  hotelName: 'Örnek Otel', ada: '10', parsel: '3', parcelArea: 5000, fromKml: false,
  sureUnit: 'yil', kalanSureYil: 5, toplamSureYil: 49,
  currency: 'TL', fxRate: 1,
  rooms, roomGrowthPct: 5,
  foodIncomeBase: 250000, otherIncomeBase: 300000, meetingIncomeBase: 100000, shopIncomeBase: 50000,
  roomExpensePct: 30, foodExpensePct: 40, otherExpensePct: 25, generalMgmtPct: 8, energyPct: 7, repairPct: 2,
  landUnitValue: 4000, buildings: [{ id: 'b1', type: 'Standart Bloklar', area: 8000, unitCost: 20000 }],
  buildingDepreciationPct: 25, showCostApproachInPdf: true,
  operatorPremiumPct: 5, propertyTaxPct: 0.4, insurancePct: 0.2, renewalFundPct: 4,
  ecrimisilBase: 0, ecrimisilGrowthPct: 0,
  ustHakkiOdemeBase: 200000, ustHakkiOdemeGrowthPct: 2,
  bayilikBase: 0, bayilikGrowthPct: 0,
  discountRatePct: 11,
  donemSonuIndirgemePct: 0,
};

describe('computeRoomIncome — Adet × Fiyat × Doluluk × Gün', () => {
  it('golden: 30 oda × 3750 TL × %55 × 365 gün = 22.584.375 TL', () => {
    expect(computeRoomIncome(rooms)).toBeCloseTo(22584375, 0);
  });
});

describe('computeCostApproach — Excel formülleriyle birebir', () => {
  it('Emlak Vergisine Esas Değer = Arsa + Yapı×(1-Aşınma%)', () => {
    const c = computeCostApproach({ parcelArea: 5000, landUnitValue: 4000, buildings: [{ id: 'b1', type: 'x', area: 8000, unitCost: 20000 }], buildingDepreciationPct: 25 });
    expect(c.propertyTaxBase).toBe(140000000);
  });
});

describe('YENİ Gelir Modeli — Excel ile birebir: her kalem TUTAR olarak girilir, TOPLANIR', () => {
  it('Toplam Gelir = Oda + Yiyecek + Diğer + Toplantı + Dükkan (TOPLAMA, bölme değil)', () => {
    const r = computeDetailedUstHakki(base);
    const y1 = r.years[0];
    expect(y1.totalRevenue).toBeCloseTo(y1.roomIncome + y1.foodIncome + y1.otherIncome + y1.meetingIncome + y1.shopIncome, 0);
  });
  it('1. yıl gelir kalemleri girilen tutarların AYNISIDIR (henüz büyümemiş)', () => {
    const r = computeDetailedUstHakki(base);
    expect(r.years[0].foodIncome).toBe(250000);
    expect(r.years[0].otherIncome).toBe(300000);
    expect(r.years[0].meetingIncome).toBe(100000);
    expect(r.years[0].shopIncome).toBe(50000);
  });
  it('TÜM kalemler AYNI oranla (Oda Fiyat Artış Oranı) bileşik büyür', () => {
    const r = computeDetailedUstHakki(base);
    expect(r.years[1].roomIncome / r.years[0].roomIncome).toBeCloseTo(1.05, 3);
    expect(r.years[1].foodIncome / r.years[0].foodIncome).toBeCloseTo(1.05, 3);
    expect(r.years[1].meetingIncome / r.years[0].meetingIncome).toBeCloseTo(1.05, 3);
  });
  it('Oda Payı % artık BİLGİ AMAÇLI, sonradan hesaplanır (girdi değildir)', () => {
    const r = computeDetailedUstHakki(base);
    const y1 = r.years[0];
    expect(y1.roomIncomePct).toBeCloseTo((y1.roomIncome / y1.totalRevenue) * 100, 1);
  });
});

describe('Gider tabanları — Excel formülleriyle birebir', () => {
  it('Diğer Gider = (Diğer Gelir + Toplantı Geliri) × oran — Excel: =+(AQ21+AQ22)*AN31', () => {
    const r = computeDetailedUstHakki(base);
    const y1 = r.years[0];
    expect(y1.otherExpense).toBeCloseTo((y1.otherIncome + y1.meetingIncome) * 0.25, 0);
  });
  it('Bina Sigortası/Yenileme Fonu = yalnız Yapı Değeri (arsa hariç)', () => {
    const r = computeDetailedUstHakki(base);
    expect(r.years[0].insurance).toBeCloseTo(r.cost.buildingsCost * 0.002, 0);
    expect(r.years[0].renewalFund).toBeCloseTo(r.cost.buildingsCost * 0.04, 0);
  });
  it('Basit Tamirat = Yapı Değeri × oran (Toplam Gelir DEĞİL)', () => {
    const r = computeDetailedUstHakki(base);
    expect(r.years[0].repairExpense).toBeCloseTo(r.cost.buildingsCost * 0.02, 0);
  });
  it('Emlak Vergisi = Emlak Vergisine Esas Değer × oran', () => {
    const r = computeDetailedUstHakki(base);
    expect(r.years[0].propertyTax).toBeCloseTo(r.cost.propertyTaxBase * 0.004, 0);
  });
});

describe('Tek iskonto oranı — 1. dönem indirgenmez, 2.+ NetKâr/(1+i)^(t-1)', () => {
  it('discountRatePct doğrudan kullanılır', () => {
    const r = computeDetailedUstHakki(base);
    expect(r.discountRate).toBeCloseTo(0.11, 4);
  });
  it('1. dönem İNDİRGENMEZ, 2. dönemden itibaren uygulanır', () => {
    const r = computeDetailedUstHakki(base);
    expect(r.years[0].presentValue).toBe(r.years[0].netOperatingProfit);
    expect(r.years[1].presentValue).toBeCloseTo(r.years[1].netOperatingProfit / 1.11, 0);
  });
});

describe('Taşınmaz Değeri — Dönem Sonu İndirgeme + 5.000 TL yuvarlama', () => {
  it('indirgeme %0 iken sonuç = PV toplamı (yuvarlanmış)', () => {
    const r = computeDetailedUstHakki(base);
    expect(r.propertyValueLocal).toBeCloseTo(r.sumPresentValue, 0);
    expect(r.propertyValueRounded % 5000).toBe(0);
  });
  it('indirgeme %10 iken sonuç %10 azalır', () => {
    const withHaircut = computeDetailedUstHakki({ ...base, donemSonuIndirgemePct: 10 });
    const without = computeDetailedUstHakki(base);
    expect(withHaircut.propertyValueLocal).toBeCloseTo(without.sumPresentValue * 0.9, 0);
  });
});

describe('Döviz — TL karşılığı kur ile hesaplanır', () => {
  it('currency=EUR iken propertyValueTl kur ile çarpılır', () => {
    const eurInput: DetailedUstHakkiInput = { ...base, currency: 'EUR', fxRate: 50 };
    const r = computeDetailedUstHakki(eurInput);
    expect(r.propertyValueTl).toBeCloseTo(r.propertyValueRounded * 50, -3);
  });
});

describe('Dönem sayısı — kalan süre kadar (sabit değil)', () => {
  it.each([3, 10, 22, 31])('kalan süre %i ise %i dönem üretir', (n) => {
    const r = computeDetailedUstHakki({ ...base, kalanSureYil: n });
    expect(r.years).toHaveLength(n);
  });
});

describe('Zorunlu veri uyarıları', () => {
  it('oda geliri girilmezse uyarır', () => {
    const r = computeDetailedUstHakki({ ...base, rooms: [] });
    expect(r.warnings.some((w) => w.includes('Oda Gelirleri'))).toBe(true);
  });
});

describe('EXCEL GERÇEK GİRDİLERİYLE UÇTAN UCA DOĞRULAMA (2026-07-31 karşılaştırması)', () => {
  it('Denizbank örneğiyle 1. ve 2. yıl toplam gelir/net kâr sayıları örtüşür', () => {
    const kur = 45.96;
    const r = computeDetailedUstHakki({
      hotelName: '', ada: '', parsel: '', parcelArea: 111461.77, fromKml: false,
      sureUnit: 'yil', kalanSureYil: 42, toplamSureYil: 49,
      currency: 'USD', fxRate: kur,
      rooms: [{ id: 'r1', name: 'Standart', count: 338, price: 170, occupancyPct: 70, days: 180 }],
      roomGrowthPct: 2,
      foodIncomeBase: 250000, otherIncomeBase: 300000, meetingIncomeBase: 0, shopIncomeBase: 0,
      roomExpensePct: 30, foodExpensePct: 40, otherExpensePct: 25, generalMgmtPct: 10, energyPct: 7, repairPct: 2,
      landUnitValue: 9500 / kur, buildings: [{ id: 'b1', type: 'Diğer', area: 26569, unitCost: 40500 / kur }],
      buildingDepreciationPct: 25, showCostApproachInPdf: true,
      operatorPremiumPct: 12, propertyTaxPct: 0.4, insurancePct: 0.3, renewalFundPct: 4,
      ecrimisilBase: 0, ecrimisilGrowthPct: 0, ustHakkiOdemeBase: 0, ustHakkiOdemeGrowthPct: 0,
      bayilikBase: 0, bayilikGrowthPct: 0,
      discountRatePct: 9, donemSonuIndirgemePct: 0,
    });
    // Excel: Yıl1 Toplam Gelir ≈ 7.789.960 $, Yıl2 ≈ 7.945.760 $ (.000$ ölçekli kaynaktan ×1000)
    expect(r.years[0].totalRevenue).toBeCloseTo(7789960, -3);
    expect(r.years[1].totalRevenue).toBeCloseTo(7945760, -3);
  });
});
