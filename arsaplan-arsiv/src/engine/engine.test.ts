/**
 * GOLDEN TEST — v4 modeli. Sayılar Salih'in tarif ettiği kurallarla elle doğrulanmıştır.
 * Referans: 1.000 m² parsel · TAKS 0,40 · KAKS 0,80
 */
import { describe, it, expect } from 'vitest';
import { analyze, computeCapacity } from './index';
import type { ProjectInput } from './types';

const base: ProjectInput = {
  assetType: 'konut',
  housingType: 'villa',
  ticariMode: 'apartman',
  isletme: { buildings: [], inflationRate: 0, wallUnitCost: 0, landscapeUnitCost: 0, infraUnitCost: 0, otherCosts: [], salesTotal: 0 },
  parcel: { il: 'İstanbul', ilce: 'Beykoz', mahalle: 'Merkez', ada: '101', parsel: '5', area: 1000, netArea: 1000 },
  zoning: { mode: 'taks-kaks', lejant: 'Konut Alanı', taks: 0.40, kaks: 0.80, hmax: 9.5,
            directFootprint: 0, directEmsalArea: 0, cekmeFront: 5, cekmeSide: 3, cekmeRear: 3, cekmeFrontEdge: null, planNotes: '' },
  emsal: { hasExtra: false, extraMode: 'oran', extraRate: 0.10, extraArea: 0,
           hasAttic: false, atticMode: 'oran', atticRate: 0.50, atticArea: 0, atticInEmsal: false,
           hasBasement: false, basementMode: 'oran', basementRate: 1.0, basementArea: 0, basementInEmsal: false },
  villa: { villaType: 'mustakil', unitCount: 0, floorsAboveGround: 2 },
  apartment: {
    basementCount: 0,
    basements: [
      { use: 'konut', area: null, lossRate: 0.10, saleable: null },
      { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
      { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
      { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
    ],
    zeminArea: null, zeminLossRate: 0.15, zeminSaleable: null,
    normalCount: null,
    normalAreas: [null, null, null, null, null, null, null, null],
    normalSaleables: [null, null, null, null, null, null, null, null],
    normalCommonRate: 0.10,
    hasPiyes: false, piyesInEmsal: true, piyesRate: 0.30,
    piyesArea: null, piyesSaleable: null,
      asmaCount: 0, asmaInEmsal: true, asmaRate: 0.40,
    asmaAreas: [null, null, null, null],
    asmaSaleables: [null, null, null, null],
  hasExtraSaleable: false, extraMode: 'oran', extraRate: 0.10, extraArea: 0,
  },
  cost: { buildingClass: 'III-C', unitCost: 23400, inflationRate: 0, extrasRate: 0 },
  site: { landscapeArea: 0, landscapeUnitCost: 0, gardenPricePerM2: 0 },
  sales: { unitPrice: 100000, apt: { bodrum: 0, bodrumTicari: 0, zemin: 0, asma: 0, normal: 0, piyes: 0 } },
  residual: { profitRate: 0.25, financeRateOfCost: 0 },
  share: { enabled: true, ownerShare: 0.45 },
};
const cap = (o: Partial<ProjectInput['emsal']> = {}, v: Partial<ProjectInput['villa']> = {}) =>
  computeCapacity(base.parcel, base.zoning, { ...base.emsal, ...o }, { ...base.villa, ...v });

describe('senaryo 1 — sade (TAKS/KAKS)', () => {
  const c = cap();
  it('taban oturumu ve emsale dahil alanı üretir', () => {
    expect(c.footprintArea).toBe(400);      // 1000 × 0,40
    expect(c.emsalArea).toBe(800);          // 1000 × 0,80
  });
  it('toplam inşaat alanı emsale eşittir', () => {
    expect(c.totalArea).toBe(800);
    expect(c.aboveGroundArea).toBe(800);
  });
  it('bahçe alanı net parselden taban oturumu düşülerek bulunur', () => {
    expect(c.gardenArea).toBe(600);         // 1000 − 400
  });
});

describe('senaryo 2 — emsal dışı satılabilir %10', () => {
  const c = cap({ hasExtra: true, extraMode: 'oran', extraRate: 0.10 });
  it('emsalin yüzdesi olarak hesaplar', () => {
    expect(c.extraArea).toBe(80);           // 800 × %10
  });
  it('toplam inşaat alanını artırır', () => {
    expect(c.totalArea).toBe(880);
  });
  it('elle giriş de aynı şekilde çalışır', () => {
    const m = cap({ hasExtra: true, extraMode: 'manuel', extraArea: 120 });
    expect(m.extraArea).toBe(120);
    expect(m.totalArea).toBe(920);
  });
});

describe('senaryo 3 — bodrum var, emsal DIŞI', () => {
  const c = cap({ hasExtra: true, extraRate: 0.10, hasBasement: true, basementInEmsal: false });
  it('bodrum alanı taban oturumu kadardır', () => {
    expect(c.basementArea).toBe(400);
  });
  it('toplam inşaat alanı 1.280 m² olur', () => {
    expect(c.totalArea).toBe(1280);         // 800 + 80 + 400
    expect(c.aboveGroundArea).toBe(800);    // emsalin tamamı zemin üstünde
    expect(c.emsalConsumedByExtras).toBe(0);
  });
});

describe('senaryo 4 — bodrum var, emsale DAHİL', () => {
  const c = cap({ hasExtra: true, extraRate: 0.10, hasBasement: true, basementInEmsal: true });
  it('toplam inşaat alanı 880 m² olur — bodrum toplamı artırmaz', () => {
    expect(c.totalArea).toBe(880);          // 800 + 80
    expect(c.emsalConsumedByExtras).toBe(400);
    expect(c.aboveGroundArea).toBe(400);    // 800 − 400
  });
});

describe('çatı katı', () => {
  it('taban oturumunun yüzdesi olarak hesaplanır', () => {
    const c = cap({ hasAttic: true, atticMode: 'oran', atticRate: 0.50 });
    expect(c.atticArea).toBe(200);          // 400 × %50
    expect(c.totalArea).toBe(1000);         // emsal dışı → 800 + 200
  });
  it('elle giriş desteklenir', () => {
    const c = cap({ hasAttic: true, atticMode: 'manuel', atticArea: 150 });
    expect(c.atticArea).toBe(150);
    expect(c.totalArea).toBe(950);
  });
  it('emsale dahilse emsalin içinden alan alır', () => {
    const c = cap({ hasAttic: true, atticRate: 0.50, atticInEmsal: true });
    expect(c.totalArea).toBe(800);
    expect(c.aboveGroundArea).toBe(600);    // 800 − 200
  });
  it('çatı + bodrum birlikte emsale dahilse ikisi de düşülür', () => {
    const c = cap({ hasAttic: true, atticRate: 0.50, atticInEmsal: true, hasBasement: true, basementInEmsal: true });
    expect(c.emsalConsumedByExtras).toBe(600);
    expect(c.aboveGroundArea).toBe(200);
    expect(c.totalArea).toBe(800);
  });
  it('emsale dahil alanlar emsali aşarsa uyarır', () => {
    const c = cap({ hasAttic: true, atticMode: 'manuel', atticArea: 600, atticInEmsal: true, hasBasement: true, basementInEmsal: true });
    expect(c.aboveGroundArea).toBe(0);
    expect(c.warnings.join(' ')).toContain('aşıyor');
  });
});

describe('villa dağılımı (opsiyonel)', () => {
  it('adet girilmezse dağılım hesaplanmaz ama alanlar üretilir', () => {
    const c = cap({ hasExtra: true, extraRate: 0.10 });
    expect(c.unitCount).toBe(0);
    expect(c.areaPerUnit).toBe(0);
    expect(c.totalArea).toBe(880);
  });
  it('880 m² · 10 villa → villa başına 88 m²', () => {
    const c = cap({ hasExtra: true, extraRate: 0.10 }, { unitCount: 10 });
    expect(c.unitCount).toBe(10);
    expect(c.areaPerUnit).toBe(88);
  });
  it('kat adedi yetersizse uyarır', () => {
    const c = cap({}, { floorsAboveGround: 1 });   // 800 m² zemin üstü, taban 400
    expect(c.floorFits).toBe(false);
    expect(c.minFloorsNeeded).toBe(2);
    expect(c.warnings.join(' ')).toContain('en az 2 kat');
  });
  it('kat adedi yeterliyse uyarı yok', () => {
    const c = cap({}, { floorsAboveGround: 2 });
    expect(c.floorFits).toBe(true);
    expect(c.areaPerFloor).toBe(400);
  });
});

describe('bodrum alanı düzenlenebilir', () => {
  it('varsayılan tabanın %100üdür', () => {
    const c = cap({ hasBasement: true });
    expect(c.basementArea).toBe(400);
  });
  it('oran değiştirilebilir', () => {
    const c = cap({ hasBasement: true, basementRate: 0.70 });
    expect(c.basementArea).toBeCloseTo(280, 6);
    expect(c.totalArea).toBeCloseTo(1080, 6);   // 800 + 280
  });
  it('elle girilebilir', () => {
    const c = cap({ hasBasement: true, basementMode: 'manuel', basementArea: 450 });
    expect(c.basementArea).toBe(450);
  });
  it('bodrum ve çatı payını hesaplar', () => {
    const c = cap({ hasAttic: true, atticRate: 0.50, hasBasement: true });
    // toplam 800 + 200 + 400 = 1400 · ekler 600
    expect(c.extraFloorsShare).toBeCloseTo(600 / 1400, 6);
  });
});

describe('iki yöntemin arsa değeri karşılaştırması', () => {
  it('kat karşılığı ve gelir yöntemi değerlerini ayrı ayrı üretir', () => {
    const r = analyze({ ...base, share: { enabled: true, ownerShare: 0.45 } });
    expect(r.share.shareLandValue).toBeCloseTo(r.financial.revenue * 0.45, 4);
    expect(r.share.difference).toBeCloseTo(r.share.shareLandValue - r.financial.residualLandValue, 4);
  });
  it('fark %5 bandındaysa yakın kabul eder', () => {
    const r = analyze(base);
    const denk = r.share.balancedShare;
    const r2 = analyze({ ...base, share: { enabled: true, ownerShare: denk } });
    expect(r2.share.verdict).toBe('yakin');
  });
  it('yorumlar yargılayıcı değil bilgilendirici', () => {
    const r = analyze({ ...base, share: { enabled: true, ownerShare: 0.60 } });
    const k = r.advice.find((a) => a.title.includes('Kat karşılığı'));
    expect(k?.level).toBe('bilgi');
  });
});

describe('doğrudan alan girişi', () => {
  const c = computeCapacity(base.parcel,
    { ...base.zoning, mode: 'dogrudan', taks: null, kaks: null, directFootprint: 300, directEmsalArea: 900 },
    { ...base.emsal, hasBasement: true, basementMode: 'oran', basementRate: 1.0, basementArea: 0, basementInEmsal: false }, base.villa);
  it('girilen alanları doğrudan kullanır', () => {
    expect(c.footprintArea).toBe(300);
    expect(c.emsalArea).toBe(900);
    expect(c.basementArea).toBe(300);       // tabanın %100'ü
    expect(c.totalArea).toBe(1200);
    expect(c.gardenArea).toBe(700);
  });
});

describe('finansal sonuç', () => {
  const r = analyze({ ...base, emsal: { ...base.emsal, hasExtra: true, extraRate: 0.10 } });
  it('maliyet ve hasılat toplam inşaat alanı üzerinden kurulur', () => {
    expect(r.capacity.totalArea).toBe(880);
    expect(r.financial.constructionCost).toBe(880 * 23400);
    expect(r.financial.revenue).toBe(880 * 100000);         // 88.000.000
    expect(r.financial.developerProfit).toBe(22000000);     // %25
  });
  it('artık arsa değerini üretir', () => {
    expect(r.financial.residualLandValue).toBe(88000000 - 880 * 23400 - 22000000);
    expect(r.financial.landUnitValue).toBeCloseTo(r.financial.residualLandValue / 1000, 6);
  });
  it('başabaş çarpanında artık değer sıfırlanır', () => {
    const s = r.financial.breakEvenFactor;
    const rlv = r.financial.revenue * s - r.financial.totalCost - r.financial.revenue * s * 0.25;
    expect(Math.abs(rlv)).toBeLessThan(0.01);
  });
  it('bahçe ayrıca fiyatlanınca hasılata eklenir', () => {
    const r2 = analyze({ ...base, site: { ...base.site, gardenPricePerM2: 5000 } });
    expect(r2.financial.gardenRevenue).toBe(600 * 5000);
  });
});

describe('uzman yorumları', () => {
  it('alan üretimini açıklar', () => {
    const r = analyze({ ...base, emsal: { ...base.emsal, hasExtra: true, extraRate: 0.10, hasBasement: true } });
    expect(r.advice.some((a) => a.title.includes('Toplam inşaat alanı nasıl oluştu'))).toBe(true);
  });
  it('bodrum emsale dahilken kapasite kaybını bildirir', () => {
    const r = analyze({ ...base, emsal: { ...base.emsal, hasBasement: true, basementInEmsal: true } });
    expect(r.advice.some((a) => a.title.includes('Bodrum emsale dahil'))).toBe(true);
  });
  it('kat adedi yetersizse uyarır', () => {
    const r = analyze({ ...base, villa: { ...base.villa, floorsAboveGround: 1 } });
    expect(r.advice.some((a) => a.level === 'uyari')).toBe(true);
  });
});

describe('kat karşılığı indirgeme (v6)', () => {
  it('süre 0 → indirgemeli değer klasik değerle birebir', () => {
    const r = analyze(structuredClone(base));
    expect(r.financial.discountedLandValue).toBeCloseTo(r.financial.residualLandValue, 6);
  });
  it('30 ay · %30: hasılat sondan, maliyet ortadan çekilir (el hesabı goldeni)', () => {
    const inp = structuredClone(base);
    inp.residual.projectMonths = 30;
    inp.residual.timeDiscountRate = 0.30;
    const r = analyze(inp);
    const f = r.financial;
    const yEnd = 2.5;
    const expected = (f.revenue - f.developerProfit) * Math.pow(1.30, -yEnd)
                   - f.totalCost * Math.pow(1.30, -yEnd / 2);
    expect(f.discountedLandValue).toBeCloseTo(expected, 2);
    expect(f.discountedLandValue).toBeLessThan(f.residualLandValue);
  });
});
