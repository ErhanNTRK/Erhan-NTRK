/**
 * GOLDEN TEST — 3-8 Katlı Bina. Sayılar Salih'in tarif ettiği kurallarla elle doğrulanmıştır.
 *
 * TAKS/KAKS referans örneği:
 *   1.000 m² parsel · TAKS 0,30 · KAKS 2,70 · Hmax 27,50 · ilave satılabilir %20
 *   2 bodrum (2.B ortak mahal, 1.B konut %10 kayıp) · zemin %15 kayıp
 *   8 normal kat · çatı arası piyesi emsale dahil, normal katın %30'u · ortak mahal %10
 *   Beklenen: havuz 3.240 → 1.B 270 · zemin 255 · kalan 2.715 ÷ 8,3 → normal 327,
 *   piyes 98; kat alanları 360 ve 108.
 */
import { describe, it, expect } from 'vitest';
import { analyze, computeApartment, floorsFromHmax } from './index';
import type { ProjectInput, ApartmentInput, Parcel, Zoning } from './types';

const parcel: Parcel = {
  il: 'İstanbul', ilce: 'Zeytinburnu', mahalle: 'Merkez', ada: '1954', parsel: '1',
  area: 1000, netArea: 1000,
};
const zoningTK: Zoning = {
  mode: 'taks-kaks', lejant: 'Konut Alanı', taks: 0.30, kaks: 2.70, hmax: 27.5,
  directFootprint: 0, directEmsalArea: 0, cekmeFront: 5, cekmeSide: 3, cekmeRear: 3, cekmeFrontEdge: null, planNotes: '',
};

const APT_TK: ApartmentInput = {
  basementCount: 2,
  basements: [
    { use: 'konut', area: null, lossRate: 0.10, saleable: null },  // 1. bodrum
    { use: 'ortak', area: null, lossRate: 0.10, saleable: null },  // 2. bodrum
    { use: 'konut', area: null, lossRate: 0.10, saleable: null },
    { use: 'konut', area: null, lossRate: 0.10, saleable: null },
  ],
  zeminArea: null, zeminLossRate: 0.15, zeminSaleable: null,
  normalCount: null,                    // Hmax 27,50 → 9 kat → zemin + 8 normal
  normalAreas: Array(8).fill(null),
  normalSaleables: Array(8).fill(null),
  normalCommonRate: 0.10,
  hasPiyes: true, piyesInEmsal: true, piyesRate: 0.30,
  piyesArea: null, piyesSaleable: null,
    asmaCount: 0, asmaInEmsal: true, asmaRate: 0.40,
    asmaAreas: [null, null, null, null],
    asmaSaleables: [null, null, null, null],
  hasExtraSaleable: true, extraMode: 'oran', extraRate: 0.20, extraArea: 0,
};

describe('Hmax → kat adedi eşlemesi', () => {
  it('Salih\'in tablosuna birebir uyar', () => {
    expect(floorsFromHmax(6.5)).toBe(2);
    expect(floorsFromHmax(9.5)).toBe(3);
    expect(floorsFromHmax(12.5)).toBe(4);
    expect(floorsFromHmax(15.5)).toBe(5);
    expect(floorsFromHmax(18.5)).toBe(6);
    expect(floorsFromHmax(21.5)).toBe(7);
    expect(floorsFromHmax(24.5)).toBe(8);
    expect(floorsFromHmax(27.5)).toBe(9);
  });
  it('ara değerlerde aşağı yuvarlar', () => {
    expect(floorsFromHmax(11)).toBe(3);
    expect(floorsFromHmax(24.49)).toBe(7);
  });
});

describe('TAKS/KAKS — Salih\'in referans örneği', () => {
  const c = computeApartment(parcel, zoningTK, APT_TK);

  it('imar hakkı ve gizli havuz', () => {
    expect(c.footprintArea).toBe(300);       // 1000 × 0,30
    expect(c.emsalArea).toBe(2700);          // 1000 × 2,70
    expect(c.extraSaleableArea).toBe(540);   // 2700 × %20
    expect(c.saleablePool).toBe(3240);
  });

  it('Hmax 27,50 → zemin + 8 normal kat türetir', () => {
    expect(c.derivedFloorsFromHmax).toBe(9);
    expect(c.normalFloorCount).toBe(8);
  });

  it('kat tablosu beklenen sırada ve değerlerde oluşur', () => {
    const rows = c.floors.map((f) => [f.label, f.area, f.saleable]);
    expect(rows[0]).toEqual(['2. Bodrum Kat', 300, 0]);      // ortak mahal
    expect(rows[1]).toEqual(['1. Bodrum Kat', 300, 270]);    // 300 × 0,90
    expect(rows[2]).toEqual(['Zemin Kat', 300, 255]);        // 300 × 0,85
    expect(rows[3]).toEqual(['1. Normal Kat', 360, 327]);    // 2715 ÷ 8,3 = 327,1 → 327 · ×1,10 = 359,7 → 360
    expect(rows[10]).toEqual(['8. Normal Kat', 360, 327]);
    expect(rows[11]).toEqual(['Çatı Arası Piyesi', 108, 98]); // 327 × 0,3 = 98,1 → 98 · ×1,10 = 107,8 → 108
    expect(c.floors).toHaveLength(12);
  });

  it('kat tipi toplamları', () => {
    expect(c.saleableByKind.bodrum).toBe(270);
    expect(c.saleableByKind.zemin).toBe(255);
    expect(c.saleableByKind.normal).toBe(8 * 327);
    expect(c.saleableByKind.piyes).toBe(98);
    expect(c.totalArea).toBe(300 + 300 + 300 + 8 * 360 + 108);   // 3888
    expect(c.saleableTotal).toBe(270 + 255 + 8 * 327 + 98);      // 3239 (yuvarlama)
  });

  it('bahçe alanı net parsel − taban oturumu', () => {
    expect(c.gardenArea).toBe(700);
  });

  it('zemin taban limitini aşarsa uyarı verir', () => {
    const w = computeApartment(parcel, zoningTK, { ...APT_TK, zeminArea: 350 });
    expect(w.warnings.some((x) => x.includes('taban oturumu limitini'))).toBe(true);
  });

  it('elle girilen normal kat satılabiliri sabit kalır, kalan otomatik satırlara dağıtılır', () => {
    const ovs = Array(8).fill(null) as (number | null)[];
    ovs[0] = 400;                                     // 1. normal kat elle
    const o = computeApartment(parcel, zoningTK, { ...APT_TK, normalSaleables: ovs });
    // Kalan havuz: 2715 − 400 = 2315 → 7 otomatik kat + 0,3 piyes = 7,3 birim → 317
    expect(o.floors[3].saleable).toBe(400);
    expect(o.floors[3].autoSaleable).toBe(false);
    expect(o.floors[4].saleable).toBe(317);
    expect(o.floors[11].saleable).toBe(Math.round(317 * 0.3)); // 95
  });

  it('emsale dahil OLMAYAN piyes havuzdan pay almaz, üstüne ekler', () => {
    const o = computeApartment(parcel, zoningTK, { ...APT_TK, piyesInEmsal: false });
    // Havuz 2715 tamamı 8 normal kata: 339,375 → 339 · piyes = 339 × 0,3 = 101,7 → 102
    expect(o.floors[3].saleable).toBe(339);
    const piyes = o.floors.find((f) => f.kind === 'piyes')!;
    expect(piyes.saleable).toBe(102);
    expect(o.saleableTotal).toBe(270 + 255 + 8 * 339 + 102);
  });
});

describe('Doğrudan Alan — Salih\'in örnek tablosu', () => {
  const zoningD: Zoning = { ...zoningTK, mode: 'dogrudan', taks: null, kaks: null, hmax: null };
  const APT_D: ApartmentInput = {
    ...APT_TK,
    basementCount: 1,
    basements: [
      { use: 'konut', area: 200, lossRate: 0, saleable: 0 },
      { use: 'konut', area: null, lossRate: 0, saleable: null },
      { use: 'konut', area: null, lossRate: 0, saleable: null },
      { use: 'konut', area: null, lossRate: 0, saleable: null },
    ],
    zeminArea: 200, zeminSaleable: 170,
    normalCount: 3,
    normalAreas: [240, null, null, null, null, null, null, null],   // 1. kat → diğerlerine kopyalanır
    normalSaleables: [220, null, null, null, null, null, null, null],
    hasPiyes: true, piyesArea: 100, piyesSaleable: 90,
      asmaCount: 0, asmaInEmsal: true, asmaRate: 0.40,
    asmaAreas: [null, null, null, null],
    asmaSaleables: [null, null, null, null],
  hasExtraSaleable: false,
  };
  const c = computeApartment(parcel, zoningD, APT_D);

  it('kat listesi beklenen değerlerle oluşur', () => {
    const rows = c.floors.map((f) => [f.label, f.area, f.saleable]);
    expect(rows).toEqual([
      ['1. Bodrum Kat', 200, 0],
      ['Zemin Kat', 200, 170],
      ['1. Normal Kat', 240, 220],
      ['2. Normal Kat', 240, 220],       // 1. kattan kopya
      ['3. Normal Kat', 240, 220],
      ['Çatı Arası Piyesi', 100, 90],
    ]);
  });

  it('kopyalanan satır elle değiştirilirse sabit kalır', () => {
    const areas = [...APT_D.normalAreas]; areas[2] = 260;
    const sals = [...APT_D.normalSaleables]; sals[2] = 235;
    const o = computeApartment(parcel, zoningD, { ...APT_D, normalAreas: areas, normalSaleables: sals });
    expect(o.floors[4].area).toBe(260);
    expect(o.floors[4].saleable).toBe(235);
    expect(o.floors[3].area).toBe(240);   // diğerleri hâlâ kopya
  });

  it('toplamlar ve bahçe', () => {
    expect(c.totalArea).toBe(200 + 200 + 3 * 240 + 100);       // 1220
    expect(c.saleableTotal).toBe(170 + 3 * 220 + 90);          // 920
    expect(c.gardenArea).toBe(800);                            // net parsel − zemin kat alanı
  });

  it('satılabilir alan kat alanını aşarsa uyarı verir', () => {
    const o = computeApartment(parcel, zoningD, { ...APT_D, zeminSaleable: 250 });
    expect(o.warnings.some((x) => x.includes('kat alanından'))).toBe(true);
  });
});

describe('analyze() — apartman hattı uçtan uca', () => {
  const input: ProjectInput = {
    assetType: 'konut',
    housingType: 'apartman-3-8',
    ticariMode: 'apartman',
    isletme: { buildings: [], inflationRate: 0, wallUnitCost: 0, landscapeUnitCost: 0, infraUnitCost: 0, otherCosts: [], salesTotal: 0 },
    parcel,
    zoning: zoningTK,
    emsal: {
      hasExtra: false, extraMode: 'oran', extraRate: 0.10, extraArea: 0,
      hasAttic: false, atticMode: 'oran', atticRate: 0.50, atticArea: 0, atticInEmsal: false,
      hasBasement: false, basementMode: 'oran', basementRate: 1.0, basementArea: 0, basementInEmsal: false,
    },
    villa: { villaType: 'mustakil', unitCount: 0, floorsAboveGround: 2 },
    apartment: APT_TK,
    cost: { buildingClass: 'IV-A', unitCost: 30000, inflationRate: 0, extrasRate: 0 },
    site: { landscapeArea: 0, landscapeUnitCost: 0, gardenPricePerM2: 0 },
    sales: { unitPrice: 0, apt: { bodrum: 60000, bodrumTicari: 0, zemin: 80000, asma: 0, normal: 100000, piyes: 90000 } },
    residual: { profitRate: 0.25, financeRateOfCost: 0 },
    share: { enabled: true, ownerShare: 0.45 },
  };
  const r = analyze(input);

  it('apartman kapasitesi sonuçta taşınır', () => {
    expect(r.apartment).toBeDefined();
    expect(r.apartment!.floors).toHaveLength(12);
    expect(r.capacity.totalArea).toBe(3888);
    expect(r.capacity.saleableArea).toBe(3239);
  });

  it('gelir kat tipi bazında hesaplanır', () => {
    const beklenen = 270 * 60000 + 255 * 80000 + 8 * 327 * 100000 + 98 * 90000;
    expect(r.financial.buildingRevenue).toBe(beklenen);
    expect(r.financial.revenue).toBe(beklenen);
  });

  it('maliyet toplam kat alanı üzerinden yürür (villa mantığı)', () => {
    expect(r.financial.constructionCost).toBe(3888 * 30000);
  });

  it('artık değer formülü korunur: Hasılat − Maliyet − Kâr = Arsa Değeri', () => {
    const f = r.financial;
    expect(f.residualLandValue).toBeCloseTo(f.revenue - f.totalCost - f.developerProfit, 6);
  });

  it('danışman dayanım mesajı üretmez (Zip 9)', () => {
    expect(r.advice.some((a) => a.title.toLowerCase().includes('dayanım'))).toBe(false);
  });

  it('kompozisyon notu yalnızca uygulama düzeyindedir', () => {
    const komp = r.advice.filter((a) => a.title.includes('kompozisyon'));
    komp.forEach((a) => expect(a.level).toBe('uyari-uygulama'));
  });
});

describe('Bodrum Kat "lossRate" eksikse normal katlar NaN olmamalı (regresyon)', () => {
  it('use=konut, alan/kayıp oranı elle girilmemişse normal katlar sayısal kalır', () => {
    const parcel: Parcel = { il: '', ilce: '', mahalle: '', ada: '', parsel: '', area: 1257, netArea: 1257 };
    const zoning: Zoning = {
      mode: 'taks-kaks', lejant: '', taks: 0.25, kaks: 1, hmax: 12.5,
      cekmeFront: 0, cekmeSide: 0, cekmeRear: 0, cekmeFrontEdge: null, planNotes: '',
      directFootprint: 0, directEmsalArea: 0,
    } as Zoning;
    const apt: ApartmentInput = {
      basementCount: 1,
      basements: [{ use: 'konut', area: null, saleable: null } as any],
      zeminArea: null, zeminLossRate: 0.099, zeminSaleable: null,
      normalCount: 3,
      normalAreas: [null, null, null, null, null, null, null, null],
      normalSaleables: [null, null, null, null, null, null, null, null],
      normalCommonRate: 0.10,
      hasPiyes: false, piyesInEmsal: true, piyesRate: 0.45, piyesArea: null, piyesSaleable: null,
      asmaCount: 0, asmaInEmsal: true, asmaRate: 0.40,
      asmaAreas: [null, null, null, null], asmaSaleables: [null, null, null, null],
      hasExtraSaleable: false, extraMode: 'oran', extraRate: 0, extraArea: 0,
    } as ApartmentInput;
    const r = computeApartment(parcel, zoning, apt, 'konut');
    const normalFloors = r.floors.filter((f) => f.kind === 'normal');
    expect(normalFloors).toHaveLength(3);
    for (const f of normalFloors) {
      expect(Number.isNaN(f.area)).toBe(false);
      expect(f.area).toBeGreaterThan(0);
    }
  });
});
