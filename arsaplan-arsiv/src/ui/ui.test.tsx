/** Arayüz duman testi: her adım ve sonuç ekranı hatasız render olmalı. */
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ProjectInput } from '../engine';
import { analyze } from '../engine';
import { Step1, Step2, Step3, Step4, Step5 } from './Steps';
import { Result } from './Result';

const input: ProjectInput = {
  assetType: 'konut', housingType: 'villa',
  ticariMode: 'apartman',
  isletme: { buildings: [], inflationRate: 0, wallUnitCost: 0, landscapeUnitCost: 0, infraUnitCost: 0, otherCosts: [], salesTotal: 0 },
  parcel: { il: 'İstanbul', ilce: 'Beykoz', mahalle: 'Çavuşbaşı', ada: '1245', parsel: '17', area: 1000, netArea: 1000 },
  zoning: { mode: 'taks-kaks', lejant: 'Az Yoğunluklu Konut Alanı', taks: 0.40, kaks: 0.80, hmax: 9.5,
            directFootprint: 0, directEmsalArea: 0, cekmeFront: 5, cekmeSide: 3, cekmeRear: 3, cekmeFrontEdge: null,
            planNotes: 'Çatı katı piyesleri son kat ile irtibatlı olmak kaydıyla emsale dahil değildir.' },
  emsal: { hasExtra: true, extraMode: 'oran', extraRate: 0.10, extraArea: 0,
           hasAttic: true, atticMode: 'oran', atticRate: 0.50, atticArea: 0, atticInEmsal: false,
           hasBasement: true, basementMode: 'oran', basementRate: 1.0, basementArea: 0, basementInEmsal: false },
  villa: { villaType: 'mustakil', unitCount: 6, floorsAboveGround: 2 },
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
  cost: { buildingClass: 'III-C', unitCost: 23400, inflationRate: 0.20, extrasRate: 0.12 },
  site: { landscapeArea: 0, landscapeUnitCost: 1500, gardenPricePerM2: 3000 },
  sales: { unitPrice: 105000, apt: { bodrum: 0, bodrumTicari: 0, zemin: 0, asma: 0, normal: 0, piyes: 0 } },
  residual: { profitRate: 0.25, financeRateOfCost: 0.10 },
  share: { enabled: true, ownerShare: 0.40 },
};
const noop = () => {};
const P = { input, upd: noop, setTop: noop };

describe('adım ekranları', () => {
  const steps = [Step1, Step2, Step3, Step4, Step5];
  steps.forEach((S, i) => {
    it(`Adım ${i + 1} render olur`, () => {
      expect(renderToString(<S {...P} />).length).toBeGreaterThan(50);
    });
  });

  it('doğrudan alan girişi modunda da render olur', () => {
    const d = { ...input, zoning: { ...input.zoning, mode: 'dogrudan' as const, directFootprint: 300, directEmsalArea: 900 } };
    expect(() => renderToString(<Step3 input={d} upd={noop} setTop={noop} />)).not.toThrow();
  });

  it('toplam inşaat alanı dökümü ekranda görünür', () => {
    const html = renderToString(<Step3 input={input} upd={noop} setTop={noop} />);
    expect(html).toContain('Toplam İnşaat Alanı');
    expect(html).toContain('Emsal Dışı Satılabilir Alan');
    expect(html).toContain('Bodrum Kat');
    expect(html).toContain('Çatı Katı');
  });
  it('villa adedi girilmediğinde de çökmez', () => {
    const x = { ...input, villa: { ...input.villa, unitCount: 0 } };
    expect(() => renderToString(<Step3 input={x} upd={noop} setTop={noop} />)).not.toThrow();
  });

  it('boş girdiyle çökmez', () => {
    const bos: ProjectInput = {
      ...input,
      parcel: { ...input.parcel, area: 0, netArea: 0 },
      zoning: { ...input.zoning, taks: null, kaks: null, hmax: null },
      emsal: { ...input.emsal, hasBasement: false, hasAttic: false, hasExtra: false },
      villa: { ...input.villa, unitCount: 0 },
      site: { landscapeArea: 0, landscapeUnitCost: 0, gardenPricePerM2: 0 },
      sales: { ...input.sales, unitPrice: 0 },
    };
    [Step1, Step2, Step3, Step4, Step5].forEach((S) => {
      expect(() => renderToString(<S input={bos} upd={noop} setTop={noop} />)).not.toThrow();
    });
  });
});

describe('sonuç ekranı', () => {
  it('tüm bölümleri ve uzman yorumlarını basar', () => {
    const html = renderToString(<Result input={input} result={analyze(input)} version="test" />);
    expect(html).toContain('Arsa Değeri (Gelir Projeksiyonu)');
    expect(html).toContain('Yöntem Karşılaştırması');
    expect(html).toContain('Uzman Değerlendirmesi');
    expect(html).toContain('TOPLAM İNŞAAT ALANI');
    expect(html).toContain('Çatı Katı');
    expect(html).toContain('Bahçe');
    expect(html).toContain('Rapor PDF');
    expect(html).toContain('Uzman Notu PDF');
    expect(html).toContain('Özet JPEG');
    expect(html).toContain('Excel');
    expect(html).toContain('Dora Gayrimenkul Değerleme');
    expect(html).toContain('Erhan Öntürk');   // Geliştirici satırında yer alır
  });
  it('kat karşılığı kapalıyken o bölüm basılmaz', () => {
    const k = { ...input, share: { enabled: false, ownerShare: 0.45 } };
    const html = renderToString(<Result input={k} result={analyze(k)} version="t" />);
    expect(html).not.toContain('Yöntem Karşılaştırması');
  });
  it('negatif artık değerde çökmez', () => {
    const kotu = { ...input, sales: { ...input.sales, unitPrice: 15000 } };
    expect(() => renderToString(<Result input={kotu} result={analyze(kotu)} version="t" />)).not.toThrow();
  });
  it('sıfır kapasitede çökmez', () => {
    const sifir = { ...input, zoning: { ...input.zoning, taks: null, kaks: null } };
    expect(() => renderToString(<Result input={sifir} result={analyze(sifir)} version="t" />)).not.toThrow();
  });
});

/* ── 3-8 Katlı Bina duman testleri ── */
const aptInput: ProjectInput = {
  ...input,
  housingType: 'apartman-3-8',
  zoning: { ...input.zoning, taks: 0.30, kaks: 2.70, hmax: 27.5 },
  apartment: {
    basementCount: 2,
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
    hasPiyes: true, piyesInEmsal: true, piyesRate: 0.30,
    piyesArea: null, piyesSaleable: null,
      asmaCount: 0, asmaInEmsal: true, asmaRate: 0.40,
    asmaAreas: [null, null, null, null],
    asmaSaleables: [null, null, null, null],
  hasExtraSaleable: true, extraMode: 'oran', extraRate: 0.20, extraArea: 0,
  },
  sales: { unitPrice: 0, apt: { bodrum: 60000, bodrumTicari: 0, zemin: 80000, asma: 0, normal: 100000, piyes: 90000 } },
};

describe('3-8 katlı bina ekranları', () => {
  it('Adım 3 (TAKS/KAKS) kat tablosuyla render olur', () => {
    const html = renderToString(<Step3 input={aptInput} upd={noop} setTop={noop} />);
    expect(html).toContain('Kat Tablosu');
    expect(html).toContain('Zemin Kat');
    expect(html).toContain('Çatı Arası Piyesi');
  });
  it('Adım 3 (Doğrudan Alan) render olur', () => {
    const d = { ...aptInput, zoning: { ...aptInput.zoning, mode: 'dogrudan' as const } };
    expect(() => renderToString(<Step3 input={d} upd={noop} setTop={noop} />)).not.toThrow();
  });
  it('Adım 4 kat tipi bazlı satış kartıyla render olur', () => {
    const html = renderToString(<Step4 input={aptInput} upd={noop} setTop={noop} />);
    expect(html).toContain('Kat Tipine Göre Birim Değerler');
  });
  it('Sonuç ekranı kat tablosunu gösterir, dayanım satırı içermez', () => {
    const r = analyze(aptInput);
    const html = renderToString(<Result input={aptInput} result={r} version="test" />);
    expect(html).toContain('Kapasite ve Kat Tablosu');
    expect(html).toContain('8. Normal Kat');
    expect(html).not.toContain('Dayanım');
  });
});
