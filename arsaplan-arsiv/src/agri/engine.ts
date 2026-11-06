/**
 * TARIMSAL ÜRÜN GELİR MOTORU (saf).
 * Değer mantığı (Salih, dükkan analojisi): yıllık net gelir × amorti yılı = değer,
 * en yakın 5.000 TL'nin katına yuvarlanır. Nihai takdir uzmana aittir (bilerek sade).
 *
 * Karma parselde ekili satırlar m² alan bütçesini paylaşır; dikili satırlarda alan
 * OPSİYONELDİR (ağaç adedi doğrudan girilebilir) — girilirse kalan-alan göstergesine
 * ve yoğunluk kontrolüne dahil edilir.
 *
 * Yan ürün (opsiyonel, yalnız ekili satırlarda): aynı alanın/dönümün ürettiği ikinci
 * bir gelir kalemi (buğday+saman gibi) — ayrı alan paylaşmaz, aynı units ile hesaplanır.
 */
export type AgriKind = 'ekili' | 'dikili';

export interface Byproduct {
  name: string;
  yieldPerUnit: number;   // kg/dönüm — ana ürünle AYNI units (alan) üzerinden
  price: number;          // TL/kg
  expensePct: number;     // %
}

export interface CropRow {
  id: string;
  kind: AgriKind;
  name: string;
  /** ekili: ayrılan alan m² (zorunlu) · dikili: opsiyonel — girilirse kalan-alan/yoğunluk hesabına girer */
  areaM2: number;
  /** dikili: ağaç adedi (doğrudan girilebilir; dikim aralığı yalnız öneri aracıdır) */
  treeCount: number;
  /** kg/dönüm (ekili) veya kg/ağaç (dikili) */
  yieldPerUnit: number;
  price: number;        // TL/kg
  expensePct: number;   // %
  /** Opsiyonel yan ürün — yalnız ekili satırlarda anlamlıdır, tekil (bir satırda en çok bir tane) */
  byproduct?: Byproduct | null;
}

export interface AgriInput {
  parcelArea: number;        // m² (elle veya KML'den — KML dayatmaz, öner+değiştirilebilir)
  arablePct: number;         // ekilebilir alan oranı % — varsayılan 100
  rows: CropRow[];
  amortYears: number;        // bölge amorti yılı (dükkan mantığı), varsayılan 25
  /** Kimlik — opsiyonel, PDF/Excel'de yalnız doluysa gösterilir */
  mahalle?: string;
  ada?: string;
  parsel?: string;
  fromKml?: boolean;
}

export interface ByproductResult extends Byproduct {
  units: number;
  gross: number;
  expense: number;
  net: number;
}

export interface CropRowResult extends CropRow {
  units: number;             // dönüm veya ağaç
  gross: number;
  expense: number;
  net: number;                    // ana ürün net geliri (yan ürün HARİÇ)
  byproductResult?: ByproductResult | null;
  netWithByproduct: number;       // ana + yan ürün net toplamı (satır toplamı budur)
  /** dikili + areaM2>0: ağaç/m² yoğunluğu 1'i aşarsa true (engellemez, uyarır) */
  densityWarning: boolean;
}

export interface AgriResult {
  arableArea: number;
  ekiliAllocated: number;     // ekili satırların ayırdığı m²
  dikiliAllocated: number;    // alanı girilmiş dikili satırların kapladığı m²
  remainingArea: number;      // arableArea − ekiliAllocated − dikiliAllocated (≥0 kırpılır)
  areaOk: boolean;
  rows: CropRowResult[];
  totalGross: number;
  totalNet: number;           // yan ürünler dahil
  value: number;               // round5000(totalNet × amortYears)
  valueExact: number;          // yuvarlanmamış ham değer (bilgi amaçlı)
  warnings: string[];
}

const R = (v: number) => Math.round(v * 100) / 100;
const R5000 = (v: number) => Math.round(v / 5000) * 5000;

/** Ağaç aralığından adet önerisi — yalnız yardımcı araçtır, sonucu dayatmaz. */
export function suggestTreeCount(areaM2: number, spacingA: number, spacingB: number, edgeFull = false): number {
  if (areaM2 <= 0 || spacingA <= 0 || spacingB <= 0) return 0;
  if (!edgeFull) return Math.floor(areaM2 / (spacingA * spacingB));
  const side = Math.sqrt(areaM2);
  const rows = Math.floor((side - 2 * spacingA) / spacingA) + 1;
  const cols = Math.floor((side - 2 * spacingB) / spacingB) + 1;
  return Math.max(0, rows) * Math.max(0, cols);
}

function computeByproduct(units: number, b: Byproduct | null | undefined): ByproductResult | null {
  if (!b || !b.name.trim()) return null;
  const gross = R(units * Math.max(0, b.yieldPerUnit) * Math.max(0, b.price));
  const expense = R(gross * Math.min(100, Math.max(0, b.expensePct)) / 100);
  return { ...b, units: R(units), gross, expense, net: R(gross - expense) };
}

export function computeAgri(input: AgriInput): AgriResult {
  const warnings: string[] = [];
  const arableArea = R(input.parcelArea * Math.min(100, Math.max(0, input.arablePct)) / 100);
  let ekiliAllocated = 0;
  let dikiliAllocated = 0;

  const rows: CropRowResult[] = input.rows.map((r) => {
    const units = r.kind === 'ekili' ? Math.max(0, r.areaM2) / 1000 : Math.max(0, r.treeCount);
    if (r.kind === 'ekili') {
      ekiliAllocated += Math.max(0, r.areaM2);
    } else if (r.areaM2 > 0) {
      dikiliAllocated += r.areaM2;
    }
    const gross = R(units * r.yieldPerUnit * r.price);
    const expense = R(gross * Math.min(100, Math.max(0, r.expensePct)) / 100);
    const net = R(gross - expense);
    const byproductResult = r.kind === 'ekili' ? computeByproduct(units, r.byproduct) : null;
    const densityWarning = r.kind === 'dikili' && r.areaM2 > 0 && r.treeCount / r.areaM2 > 1;
    return {
      ...r, units: R(units), gross, expense, net,
      byproductResult,
      netWithByproduct: R(net + (byproductResult?.net ?? 0)),
      densityWarning,
    };
  });

  ekiliAllocated = R(ekiliAllocated);
  dikiliAllocated = R(dikiliAllocated);
  const remainingArea = Math.max(0, R(arableArea - ekiliAllocated - dikiliAllocated));
  const areaOk = ekiliAllocated + dikiliAllocated <= arableArea + 0.01;
  if (!areaOk) {
    warnings.push(
      `Ürünlere ayrılan alan (${(ekiliAllocated + dikiliAllocated).toLocaleString('tr-TR')} m²) ` +
      `ekilebilir alanı (${arableArea.toLocaleString('tr-TR')} m²) aşıyor.`,
    );
  }
  for (const r of rows) {
    if (r.densityWarning) {
      warnings.push(`"${r.name || 'İsimsiz satır'}": ${r.areaM2.toLocaleString('tr-TR')} m²'ye ${r.treeCount.toLocaleString('tr-TR')} ağaç yoğun görünüyor (m² başına 1'den fazla ağaç).`);
    }
  }

  const totalGross = R(rows.reduce((s, x) => s + x.gross + (x.byproductResult?.gross ?? 0), 0));
  const totalNet = R(rows.reduce((s, x) => s + x.netWithByproduct, 0));
  const valueExact = R(totalNet * Math.max(0, input.amortYears));
  return {
    arableArea, ekiliAllocated, dikiliAllocated, remainingArea, areaOk, rows,
    totalGross, totalNet,
    value: R5000(valueExact), valueExact,
    warnings,
  };
}
