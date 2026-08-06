/**
 * TİCARİ İŞLETME MOTORU
 *
 * Senaryo: mülk sahibinin projeyi kendisinin yapması. Bu nedenle müteahhit kârı
 * KESİLMEZ ve kat karşılığı karşılaştırması yapılmaz.
 *
 *   Yapı satırı  = alan × tebliğ birim maliyeti × (1 + enflasyon) × (1 − yıpranma)
 *                  (çıkan birim maliyet elle sabitlenebilir)
 *   İlave maliyetler (tercihe bağlı): çevre duvarı / peyzaj / altyapı
 *                  = parsel alanı × birim ₺ (0 = yok) + serbest kalemler (ad+tutar)
 *   ARSA DEĞERİ  = öngörülen toplam satış değeri − (yapı maliyetleri + ilave maliyetler)
 *
 * Salih'in referans örneği: Ahır · 1.000 m² · tebliğ 19.800 ₺/m² · enflasyon %0 ·
 * yıpranma %10 → birim 17.820 ₺/m² → satır maliyeti 17.820.000 ₺.
 */
import type { Parcel, IsletmeInput, IsletmeResult, IsletmeRow } from './types';
import { YAPI_SINIFLARI } from '../data/yapiSiniflari';

const R = Math.round;

export function computeIsletme(parcel: Parcel, inp: IsletmeInput): IsletmeResult {
  const warnings: string[] = [];
  const inf = Math.max(0, inp.inflationRate);

  const rows: IsletmeRow[] = inp.buildings.map((b) => {
    const sinif = YAPI_SINIFLARI.find((x) => x.code === b.buildingClass);
    const baseUnitCost = sinif ? sinif.unitCost : 0;
    const dep = Math.min(1, Math.max(0, b.depreciation));
    const auto = baseUnitCost * (1 + inf) * (1 - dep);
    const overridden = b.unitCostOverride != null;
    const effectiveUnitCost = R(Math.max(0, b.unitCostOverride ?? auto));
    const area = Math.max(0, b.area);
    return {
      type: b.type, buildingClass: b.buildingClass, area,
      baseUnitCost, depreciation: dep, effectiveUnitCost, overridden,
      cost: R(area * effectiveUnitCost),
    };
  });

  const buildingsCost = rows.reduce((a, r) => a + r.cost, 0);
  const totalBuildingArea = rows.reduce((a, r) => a + r.area, 0);

  const wallCost = R(Math.max(0, inp.wallUnitCost) * Math.max(0, inp.wallLength ?? 0));
  const landscapeCost = R(Math.max(0, inp.landscapeUnitCost) * parcel.area);
  const infraCost = R(Math.max(0, inp.infraUnitCost) * parcel.area);
  const otherCost = inp.otherCosts.reduce((a, c) => a + Math.max(0, R(c.amount)), 0);
  const extrasTotal = wallCost + landscapeCost + infraCost + otherCost;

  const totalCost = buildingsCost + extrasTotal;
  const salesTotal = Math.max(0, R(inp.salesTotal));
  const profitRate = Math.max(0, inp.profitRate ?? 0);
  const profit = R(salesTotal * profitRate);
  const landValue = salesTotal - totalCost - profit;
  const landUnitValue = parcel.area > 0 ? landValue / parcel.area : 0;

  if (rows.length === 0) warnings.push('Yapı satırı eklenmedi; maliyet hesaplanamıyor.');
  if (rows.some((r) => r.area <= 0)) warnings.push('Alanı girilmemiş yapı satırları var.');
  if (salesTotal <= 0) warnings.push('Öngörülen satış değeri girilmedi.');
  if (salesTotal > 0 && landValue <= 0) {
    warnings.push('Maliyetler öngörülen satış değerini aşıyor; arsa değeri negatif çıkıyor.');
  }

  return {
    rows, buildingsCost, totalBuildingArea,
    wallCost, landscapeCost, infraCost, otherCost, extrasTotal,
    totalCost, salesTotal, profit, profitRate, landValue, landUnitValue, warnings,
  };
}

/** Yapı türü kataloğu — kategori → türler + varsayılan tebliğ sınıfı.
 *  Sınıf her satırda elle değiştirilebilir; bu liste yalnızca başlangıç önerisidir. */
export const ISLETME_KATALOG: Array<{
  category: string;
  types: Array<{ label: string; buildingClass: string }>;
}> = [
  {
    category: 'Üretim',
    types: [
      { label: 'Fabrika', buildingClass: 'III-B' },
      { label: 'Atölye', buildingClass: 'II-C' },
      { label: 'OSB Tesisi', buildingClass: 'III-B' },
    ],
  },
  {
    category: 'Lojistik ve Depolama',
    types: [
      { label: 'Depo', buildingClass: 'II-C' },
      { label: 'Antrepo', buildingClass: 'III-A' },
      { label: 'Soğuk Hava Deposu', buildingClass: 'III-B' },
    ],
  },
  {
    category: 'Tarım ve Hayvancılık',
    types: [
      { label: 'Ahır', buildingClass: 'II-B' },
      { label: 'Besihane', buildingClass: 'II-B' },
      { label: 'Tavuk Çiftliği', buildingClass: 'II-B' },
      { label: 'Sera', buildingClass: 'I-B' },
    ],
  },
  {
    category: 'Perakende Ticaret',
    types: [
      { label: 'Dükkan', buildingClass: 'III-A' },
      { label: 'Mağaza', buildingClass: 'III-B' },
      { label: 'AVM', buildingClass: 'IV-B' },
      { label: 'Akaryakıt İstasyonu', buildingClass: 'III-B' },
    ],
  },
  {
    category: 'Ofis',
    types: [
      { label: 'Plaza', buildingClass: 'IV-B' },
      { label: 'İş Merkezi', buildingClass: 'IV-A' },
    ],
  },
  {
    category: 'Turizm',
    types: [
      { label: 'Otel', buildingClass: 'IV-B' },
      { label: 'Tatil Köyü', buildingClass: 'IV-A' },
    ],
  },
];
