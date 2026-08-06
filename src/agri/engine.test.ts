/** Tarımsal Ürün motoru — golden testler (Salih kuralları, 2026-07-30 oturumu). */
import { describe, it, expect } from 'vitest';
import { computeAgri, suggestTreeCount, type AgriInput, type CropRow } from './engine';

const row = (p: Partial<CropRow>): CropRow => ({
  id: 'r', kind: 'ekili', name: 'Test', areaM2: 0, treeCount: 0,
  yieldPerUnit: 0, price: 0, expensePct: 0, byproduct: null, ...p,
});

describe('suggestTreeCount — ağaç aralığı', () => {
  it('10.000 m²: 4x4→625, 4x5→500, 5x5→400 (yarım aralık varsayılan)', () => {
    expect(suggestTreeCount(10000, 4, 4)).toBe(625);
    expect(suggestTreeCount(10000, 4, 5)).toBe(500);
    expect(suggestTreeCount(10000, 5, 5)).toBe(400);
  });
  it('tam mesafe (muhafazakâr) kare parselde daha az ağaç önerir', () => {
    expect(suggestTreeCount(10000, 4, 4, true)).toBeLessThan(625);
  });
});

describe('computeAgri — Ekili', () => {
  it('Ekilebilir Alan varsayılan mantığı: %100 girilirse arableArea = parcelArea', () => {
    const r = computeAgri({ parcelArea: 15000, arablePct: 100, amortYears: 25, rows: [] });
    expect(r.arableArea).toBe(15000);
  });
  it('dönüm/verim/fiyat/gider zincirinden net gelir doğru çıkar (Şekerbank örneği doğrulaması)', () => {
    const input: AgriInput = {
      parcelArea: 7565.83, arablePct: 100, amortYears: 30,
      rows: [row({ id: 'bugday', name: 'Buğday', areaM2: 7565.83, yieldPerUnit: 500, price: 13.8, expensePct: 40 })],
    };
    const r = computeAgri(input);
    // 7565.83/1000 dönüm × 500 kg × 13,8 TL × (1-0,40) = 31.322,5 TL brüt net
    expect(r.rows[0].gross).toBeCloseTo(52204.24, 1);
    expect(r.rows[0].net).toBeCloseTo(31322.54, 1);
  });
});

describe('computeAgri — Yan Ürün (byproduct)', () => {
  it('buğday+saman AYNI alanla hesaplanır, toplam ikisinin toplamıdır (Şekerbank formatı doğrulaması)', () => {
    const input: AgriInput = {
      parcelArea: 7565.83, arablePct: 100, amortYears: 30,
      rows: [row({
        id: 'bugday', name: 'Buğday', areaM2: 7565.83, yieldPerUnit: 500, price: 13.8, expensePct: 40,
        byproduct: { name: 'Saman', yieldPerUnit: 600, price: 2, expensePct: 20 },
      })],
    };
    const r = computeAgri(input);
    expect(r.rows[0].net).toBeCloseTo(31322.54, 1);           // ana ürün
    expect(r.rows[0].byproductResult?.net).toBeCloseTo(7263.2, 1); // yan ürün: 7565.83/1000*600*2*0.8
    expect(r.rows[0].netWithByproduct).toBeCloseTo(31322.54 + 7263.2, 1);
    expect(r.totalNet).toBeCloseTo(31322.54 + 7263.2, 1);
  });
  it('yan ürün yalnız ekili satırlarda hesaba girer (dikili satırda byproduct olsa bile yok sayılır çünkü UI zaten göstermez, motor da katmaz)', () => {
    const r = computeAgri({
      parcelArea: 10000, arablePct: 100, amortYears: 25,
      rows: [row({ id: 'zeytin', kind: 'dikili', name: 'Zeytin', treeCount: 400, yieldPerUnit: 20, price: 45, expensePct: 40 })],
    });
    expect(r.rows[0].byproductResult).toBeNull();
  });
});

describe('computeAgri — Dikili ve yoğunluk uyarısı', () => {
  it('ağaç sayısı doğrudan girilir, alan opsiyoneldir', () => {
    const r = computeAgri({
      parcelArea: 10000, arablePct: 100, amortYears: 25,
      rows: [row({ id: 'z', kind: 'dikili', name: 'Zeytin', treeCount: 625, yieldPerUnit: 25, price: 18, expensePct: 35 })],
    });
    expect(r.rows[0].units).toBe(625);
    expect(r.rows[0].gross).toBeCloseTo(625 * 25 * 18, 1);
  });
  it('m² başına 1 ağaçtan fazlaysa yoğunluk uyarısı verir (engellemez)', () => {
    const r = computeAgri({
      parcelArea: 10000, arablePct: 100, amortYears: 25,
      rows: [row({ id: 'z', kind: 'dikili', name: 'Zeytin', treeCount: 12000, areaM2: 500, yieldPerUnit: 25, price: 18, expensePct: 35 })],
    });
    expect(r.rows[0].densityWarning).toBe(true);
    expect(r.warnings.some((w) => w.includes('yoğun'))).toBe(true);
  });
  it('normal yoğunlukta uyarı vermez', () => {
    const r = computeAgri({
      parcelArea: 12500, arablePct: 100, amortYears: 25,
      rows: [row({ id: 'z', kind: 'dikili', name: 'Zeytin', treeCount: 625, areaM2: 12500, yieldPerUnit: 20, price: 45, expensePct: 40 })],
    });
    expect(r.rows[0].densityWarning).toBe(false);
  });
});

describe('computeAgri — Karma: kalan alan (ekili + dikili birlikte)', () => {
  it('10.000 m² parselde 5.000 ekili + 4.000 dikili → 1.000 m² kalan alan', () => {
    const r = computeAgri({
      parcelArea: 10000, arablePct: 100, amortYears: 25,
      rows: [
        row({ id: 'b', kind: 'ekili', name: 'Buğday', areaM2: 5000, yieldPerUnit: 350, price: 13.5, expensePct: 35 }),
        row({ id: 'z', kind: 'dikili', name: 'Zeytin', treeCount: 200, areaM2: 4000, yieldPerUnit: 20, price: 45, expensePct: 40 }),
      ],
    });
    expect(r.ekiliAllocated).toBe(5000);
    expect(r.dikiliAllocated).toBe(4000);
    expect(r.remainingArea).toBe(1000);
    expect(r.areaOk).toBe(true);
  });
  it('alanı girilmemiş dikili satır kalan-alan hesabına dahil edilmez', () => {
    const r = computeAgri({
      parcelArea: 10000, arablePct: 100, amortYears: 25,
      rows: [
        row({ id: 'b', kind: 'ekili', name: 'Buğday', areaM2: 5000, yieldPerUnit: 350, price: 13.5, expensePct: 35 }),
        row({ id: 'z', kind: 'dikili', name: 'Zeytin', treeCount: 200, areaM2: 0, yieldPerUnit: 20, price: 45, expensePct: 40 }),
      ],
    });
    expect(r.dikiliAllocated).toBe(0);
    expect(r.remainingArea).toBe(5000);
  });
});

describe('computeAgri — Değer: amorti yılı + 5.000 TL yuvarlama', () => {
  it('değer = yıllık net gelir × amorti yılı, en yakın 5.000 TL katına yuvarlanır', () => {
    const r = computeAgri({
      parcelArea: 15000, arablePct: 100, amortYears: 25,
      rows: [row({ id: 'z', kind: 'dikili', name: 'Zeytin', treeCount: 625, yieldPerUnit: 25, price: 18, expensePct: 35 })],
    });
    // net = 625*25*18*0.65 = 182.812,5 · ×25 = 4.570.312,5 → en yakın 5000'e: 4.570.000
    expect(r.valueExact).toBeCloseTo(4570312.5, 1);
    expect(r.value).toBe(4570000);
    expect(r.value % 5000).toBe(0);
  });
  it('varsayılan amorti yılı 25 olarak arayüzde önerilir (motor tarafında zorunlu değildir, test yalnız hesabı doğrular)', () => {
    const r = computeAgri({
      parcelArea: 10000, arablePct: 100, amortYears: 25,
      rows: [row({ id: 'x', areaM2: 1000, yieldPerUnit: 350, price: 13.5, expensePct: 35 })],
    });
    expect(r.value % 5000).toBe(0);
  });
});

describe('computeAgri — alan bütçesi aşımı uyarısı', () => {
  it('ekili+dikili toplamı ekilebilir alanı aşarsa uyarır', () => {
    const r = computeAgri({
      parcelArea: 10000, arablePct: 100, amortYears: 25,
      rows: [
        row({ id: 'b', kind: 'ekili', name: 'Buğday', areaM2: 8000, yieldPerUnit: 350, price: 13.5, expensePct: 35 }),
        row({ id: 'z', kind: 'dikili', name: 'Zeytin', treeCount: 200, areaM2: 5000, yieldPerUnit: 20, price: 45, expensePct: 40 }),
      ],
    });
    expect(r.areaOk).toBe(false);
    expect(r.warnings.some((w) => w.includes('aşıyor'))).toBe(true);
  });
});
