/**
 * MALİYET YAKLAŞIMI — Yöntem 1 (Toplam Değerden) ve Yöntem 2 (Sadece Arsa
 * Değeri Üzerinden) tarafından paylaşılır. Yöntem 3'ün (Toplam Gelir
 * Üzerinden) kendi maliyet yaklaşımından (detailedEngine.ts) farkı: her
 * yapı satırında AMORTİSMAN (%) vardır — Yapı Değeri = Alan × Birim
 * Maliyet × Amortisman%.
 */
import { BUILDING_TYPES } from './detailedEngine';
export { BUILDING_TYPES };

export interface BuildingValueRow {
  id: string;
  type: string;
  area: number;
  unitCost: number;
  depreciationPct: number;   // Amortisman % — yalnız yüzde, başka biçim yok
}

export interface SimpleCostInput {
  parcelArea: number;
  landUnitValue: number;
  buildings: BuildingValueRow[];
}

export interface SimpleCostResult {
  landValue: number;
  buildingValues: number;    // Σ (Alan × Birim Maliyet × Amortisman%)
  totalValue: number;        // landValue + buildingValues
}

const R = (v: number) => Math.round(v * 100) / 100;

export function computeSimpleCost(input: SimpleCostInput): SimpleCostResult {
  const landValue = R(Math.max(0, input.parcelArea) * Math.max(0, input.landUnitValue));
  const buildingValues = R(input.buildings.reduce((s, b) =>
    s + Math.max(0, b.area) * Math.max(0, b.unitCost) * Math.min(100, Math.max(0, b.depreciationPct)) / 100, 0));
  return { landValue, buildingValues, totalValue: R(landValue + buildingValues) };
}

/** Yöntem 1 — Toplam Değer Esaslı Üst Hakkı Tespiti.
 *  Daimi Müstakil Hak Değeri = Toplam Değer × 2/3 (sistem hesaplar, elle değiştirilemez).
 *  Üst Hakkı Değeri = Daimi Müstakil Hak Değeri × (Kalan Süre / Toplam Süre). */
export interface WholeValueResult {
  cost: SimpleCostResult;
  permanentValue: number;    // Daimi Müstakil Hak Değeri
  ustHakkiValue: number;     // nihai Üst Hakkı Değeri
  warnings: string[];
}

export function computeWholeValueMethod(cost: SimpleCostInput, kalanSure: number, toplamSure: number): WholeValueResult {
  const warnings: string[] = [];
  if (cost.parcelArea <= 0) warnings.push('Parsel Alanı girilmedi; bu alan zorunludur.');
  if (toplamSure <= 0) warnings.push('Toplam Süre 0 veya negatif; oran hesaplanamıyor.');
  const c = computeSimpleCost(cost);
  const permanentValue = R(c.totalValue * (2 / 3));
  const ratio = toplamSure > 0 ? Math.max(0, kalanSure) / toplamSure : 0;
  const ustHakkiValue = R(permanentValue * ratio);
  return { cost: c, permanentValue, ustHakkiValue, warnings };
}

/** Yöntem 2 — Arsa Değeri Esaslı Üst Hakkı Tespiti.
 *  Arsa Daimi Müstakil Hak = Arsa Değeri × 2/3; Üst Hakkı Arsa Değeri =
 *  bunun × (Kalan/Toplam); Nihai = Üst Hakkı Arsa Değeri + Bina Değeri (tam). */
export interface LandOnlyResult {
  cost: SimpleCostResult;
  ustHakkiArsaDegeri: number;
  buildingValueAdded: number;   // Bina Değeri (tam, oranlanmadan eklenir)
  nihaiUstHakkiDegeri: number;
  warnings: string[];
}

export function computeLandOnlyMethod(cost: SimpleCostInput, kalanSure: number, toplamSure: number): LandOnlyResult {
  const warnings: string[] = [];
  if (cost.parcelArea <= 0) warnings.push('Parsel Alanı girilmedi; bu alan zorunludur.');
  if (toplamSure <= 0) warnings.push('Toplam Süre 0 veya negatif; oran hesaplanamıyor.');
  const c = computeSimpleCost(cost);
  const landPermanent = R(c.landValue * (2 / 3));
  const ratio = toplamSure > 0 ? Math.max(0, kalanSure) / toplamSure : 0;
  const ustHakkiArsaDegeri = R(landPermanent * ratio);
  const nihaiUstHakkiDegeri = R(ustHakkiArsaDegeri + c.buildingValues);
  return { cost: c, ustHakkiArsaDegeri, buildingValueAdded: c.buildingValues, nihaiUstHakkiDegeri, warnings };
}
