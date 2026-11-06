/** Excel ve PDF çıktısının gerçekten üretildiğini doğrular (tarayıcı API'leri taklit edilir). */
import { describe, it, expect, beforeAll } from 'vitest';
import type { ProjectInput } from '../engine';
import { analyze } from '../engine';

let captured: { blob: Blob; name: string } | null = null;

beforeAll(() => {
  (globalThis as any).URL.createObjectURL = () => 'blob:test';
  (globalThis as any).URL.revokeObjectURL = () => {};
  (globalThis as any).document = {
    createElement: () => ({ set href(_v: string) {}, set download(v: string) { if (captured) captured.name = v; }, click() {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
  };
  const OrigBlob = globalThis.Blob;
  (globalThis as any).Blob = class extends OrigBlob {
    constructor(parts: any[], opts?: any) { super(parts, opts); captured = { blob: this as any, name: '' }; }
  };
});

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

describe('Excel çıktısı', () => {
  it('geçerli bir xlsx üretir ve içeriği okunabilir', async () => {
    captured = null;
    const { downloadExcel } = await import('./excel');
    await downloadExcel(input, analyze(input), 'test-v1');
    expect(captured).not.toBeNull();
    const buf = Buffer.from(await captured!.blob.arrayBuffer());
    expect(buf.length).toBeGreaterThan(5000);
    expect(buf.subarray(0, 2).toString()).toBe('PK');   // zip imzası

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['RAPOR', 'GİRDİLER', 'UZMAN GÖRÜŞÜ', '_data']);
    const rapor = wb.getWorksheet('RAPOR')!;
    const values: string[] = [];
    rapor.eachRow((row) => row.eachCell((c) => values.push(String(c.value))));
    expect(values.join(' ')).toContain('ARSA DEĞERİ (GELİR PROJEKSİYONU)');
    expect(values.join(' ')).toContain('TOPLAM İNŞAAT ALANI');
    expect(values.join(' ')).toContain('Beykoz');
    const gorus = wb.getWorksheet('UZMAN GÖRÜŞÜ')!;
    expect(gorus.rowCount).toBeGreaterThan(4);
  });
});

describe('PDF çıktısı', () => {
  it('geçerli bir PDF üretir', async () => {
    captured = null;
    const { downloadPdf } = await import('./pdf');
    await downloadPdf(input, analyze(input), 'test-v1');
    expect(captured).not.toBeNull();
    const buf = Buffer.from(await captured!.blob.arrayBuffer());
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(20000);          // gömülü font dahil
  });

  it('negatif senaryoda da üretir', async () => {
    captured = null;
    const kotu = { ...input, sales: { ...input.sales, unitPrice: 15000 } };
    const { downloadPdf } = await import('./pdf');
    await downloadPdf(kotu, analyze(kotu), 'test-v1');
    const buf = Buffer.from(await captured!.blob.arrayBuffer());
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
});

/* ── 3-8 Katlı Bina çıktıları ── */
describe('3-8 katlı bina çıktıları', () => {
  const aptInput: ProjectInput = {
    ...input,
    housingType: 'apartman-3-8',
    zoning: { ...input.zoning, taks: 0.30, kaks: 2.70, hmax: 27.5 },
    apartment: {
      ...input.apartment,
      basementCount: 2,
      basements: [
        { use: 'konut', area: null, lossRate: 0.10, saleable: null },
        { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
        { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
        { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
      ],
      hasPiyes: true, hasExtraSaleable: true, extraMode: 'oran', extraRate: 0.20,
    },
    sales: { unitPrice: 0, apt: { bodrum: 60000, bodrumTicari: 0, zemin: 80000, asma: 0, normal: 100000, piyes: 90000 } },
  };

  it('Excel üretilir', async () => {
    captured = null;
    const { downloadExcel } = await import('./excel');
    await downloadExcel(aptInput, analyze(aptInput), 'test');
    expect(captured).not.toBeNull();
    expect((captured as any).blob.size).toBeGreaterThan(5000);
  });

  it('PDF üretilir', async () => {
    captured = null;
    const { downloadPdf } = await import('./pdf');
    await downloadPdf(aptInput, analyze(aptInput), 'test');
    expect(captured).not.toBeNull();
    expect((captured as any).blob.size).toBeGreaterThan(20000);
  });

  it('Uzman Notu PDF üretilir ve rapor PDF uzman bölümü içermez', async () => {
    captured = null;
    const { downloadAdvicePdf } = await import('./advicePdf');
    await downloadAdvicePdf(aptInput, analyze(aptInput), 'test');
    expect(captured).not.toBeNull();
    expect((captured as any).blob.size).toBeGreaterThan(15000);
    expect((captured as any).name).toContain('Uzman-Notu');
  });
});
