/**
 * AKARYAKIT İSTASYONU GELİR MOTORU (saf) — banka formatları + 2025-26 saha denetimi.
 *
 * Kurallar (Salih): 3 ürün (Kurşunsuz 95 · Motorin · LPG), fiyatlar KDV HARİÇ.
 * Dört veri girişi: günlük litre (×365) · yıllık litre · çok-yıl ortalaması ·
 * kısmi dönem (tarih aralığı → aynı tempoyla 365 güne yayılır).
 * Kâr önerileri: benzin+motorin %3 · LPG %5 (elle serbest).
 * İlave gelirler satır satır: ciro×oran YA DA doğrudan net tutar.
 * Dağıtıcı kirası opsiyonel dahil edilir. Net kâr ÷ kap oranı = gelir değeri.
 * Maliyet yaklaşımı (opsiyonel): arsa alan×birim + yapı satırları → ikinci değer.
 */
export type FuelEntryMode = 'gunluk' | 'yillik' | 'cokyil' | 'kismi';

export interface FuelProductInput {
  id: string;
  name: string;                 // Kurşunsuz 95 / Motorin / LPG
  mode: FuelEntryMode;
  dailyLiters: number;          // gunluk
  yearlyLiters: number;         // yillik
  multiYearLiters: number[];    // cokyil: girilen yıl kadar ortalama
  multiYearLabels?: string[];   // cokyil: her değerin ait olduğu takvim yılı (ör. "2023") — PDF'te ayrı satır göstermek için
  periodLiters: number;         // kismi: dönem toplam litre
  periodDays: number;           // kismi: dönem gün sayısı
  unitPrice: number;            // TL/Lt, KDV HARİÇ
  profitPct: number;            // net kâr %
}

export interface ExtraIncomeRow {
  id: string;
  name: string;                 // Oto Yıkama, Restoran, Market, Tekel, Kira…
  mode: 'ciro' | 'net';
  turnover: number;             // ciro modu: yıllık ciro
  profitPct: number;            // ciro modu: net kâr %
  netAmount: number;            // net modu: doğrudan yıllık net
}

export interface FuelCostInput {
  enabled: boolean;
  parcelArea: number;           // m² (elle veya KML)
  landUnitValue: number;        // TL/m²
  buildings: { id: string; name: string; area: number; unitCost: number }[];
}

export interface FuelInput {
  products: FuelProductInput[];
  extras: ExtraIncomeRow[];
  /** Tek satır alternatif: bazı dosyalarda ayrıntı yok, yalnız "Diğer Gelirler" toplamı
   *  yakıt cirosunun yüzdesi olarak verilir. 0 = kullanılmıyor; ayrıntılı extras ile birlikte de kullanılabilir. */
  otherIncomePctOfFuel: number;
  dealerRent: { include: boolean; yearlyAmount: number };
  capRate: number;              // 0.10 = %10
  rounding: number;             // sonuç yuvarlama adımı (ör. 50000); 0 = yok
  cost: FuelCostInput;
}

export interface FuelProductResult extends FuelProductInput {
  yearlyLitersUsed: number;
  turnover: number;
  net: number;
}

export interface FuelResult {
  products: FuelProductResult[];
  fuelTurnover: number;
  fuelNet: number;
  extrasNet: number;
  otherIncomeFromPct: number;
  dealerRentApplied: number;
  totalNet: number;
  incomeValue: number;          // totalNet / capRate
  incomeValueRounded: number;
  costLand: number;
  costBuildings: number;
  costValue: number | null;     // maliyet yaklaşımı (enabled değilse null)
  warnings: string[];
}

const R = (v: number) => Math.round(v * 100) / 100;

/** Yıllık litre: girilen moddan 365 güne normalize eder. */
export function yearlyLitersOf(p: FuelProductInput): number {
  switch (p.mode) {
    case 'gunluk': return Math.max(0, p.dailyLiters) * 365;
    case 'yillik': return Math.max(0, p.yearlyLiters);
    case 'cokyil': {
      const ys = p.multiYearLiters.filter((v) => v > 0);
      return ys.length ? ys.reduce((s, v) => s + v, 0) / ys.length : 0;
    }
    case 'kismi':
      return p.periodDays > 0 ? (Math.max(0, p.periodLiters) / p.periodDays) * 365 : 0;
  }
}

/** İki tarih arası gün sayısı (her iki uç dahil değil — takvim farkı). */
export function daysBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

export function computeFuel(input: FuelInput): FuelResult {
  const warnings: string[] = [];
  const products: FuelProductResult[] = input.products.map((p) => {
    const yl = R(yearlyLitersOf(p));
    const turnover = R(yl * Math.max(0, p.unitPrice));
    const net = R(turnover * Math.max(0, p.profitPct) / 100);
    return { ...p, yearlyLitersUsed: yl, turnover, net };
  });

  const fuelTurnover = R(products.reduce((s, x) => s + x.turnover, 0));
  const fuelNet = R(products.reduce((s, x) => s + x.net, 0));

  const extrasNet = R(input.extras.reduce((s, e) =>
    s + (e.mode === 'net' ? Math.max(0, e.netAmount)
      : Math.max(0, e.turnover) * Math.max(0, e.profitPct) / 100), 0));

  const otherIncomeFromPct = R(fuelTurnover * Math.max(0, input.otherIncomePctOfFuel) / 100);

  const dealerRentApplied = input.dealerRent.include ? Math.max(0, input.dealerRent.yearlyAmount) : 0;
  const totalNet = R(fuelNet + extrasNet + otherIncomeFromPct - dealerRentApplied);
  if (totalNet < 0) warnings.push('Dağıtıcı kirası düşüldükten sonra net kâr negatif.');

  const incomeValue = input.capRate > 0 ? R(totalNet / input.capRate) : 0;
  const step = Math.max(0, input.rounding);
  const incomeValueRounded = step > 0 ? Math.round(incomeValue / step) * step : incomeValue;

  let costLand = 0, costBuildings = 0, costValue: number | null = null;
  if (input.cost.enabled) {
    costLand = R(Math.max(0, input.cost.parcelArea) * Math.max(0, input.cost.landUnitValue));
    costBuildings = R(input.cost.buildings.reduce((s, b) => s + Math.max(0, b.area) * Math.max(0, b.unitCost), 0));
    if (costLand > 0 || costBuildings > 0) costValue = R(costLand + costBuildings);
  }

  return {
    products, fuelTurnover, fuelNet, extrasNet, otherIncomeFromPct, dealerRentApplied, totalNet,
    incomeValue, incomeValueRounded, costLand, costBuildings, costValue, warnings,
  };
}
