/**
 * ARSAPLAN — MOTOR TİPLERİ (v4 model)
 *
 * Model, alan üretimini tek yönde ve sade kurar:
 *   1) İmar hakkı: taban oturumu ve emsale dahil alan
 *   2) Emsal dışı satılabilir alan (emsalin yüzdesi veya elle)
 *   3) Çatı katı (taban oturumunun yüzdesi veya elle) — emsale dahil ya da dışı
 *   4) Bodrum kat (taban oturumu kadar) — emsale dahil ya da dışı
 *   5) Toplam inşaat alanı = emsal + emsal dışı kalemler
 *   6) Villa adedi opsiyoneldir; girilirse villa alanı = toplam ÷ adet
 *
 * engine klasörü saf TypeScript'tir: React bilmez, DOM'a dokunmaz, yan etkisi yoktur.
 */

export type AssetType = 'konut' | 'ticari' | 'karma';
export type HousingType = 'villa' | 'apartman-3-8' | 'site';

/** KML'den okunan parsel geometrisi — yalnız kroki ve çapraz kontrol içindir. */
export interface ParcelKml {
  name: string;
  points: { x: number; y: number }[];
  polygonArea: number;
  deedArea: number;
  /** Tek tip çekme mesafesi (m); 0 = hesaplanmaz */
  setback: number;
}

export interface Parcel {
  il: string; ilce: string; mahalle: string; ada: string; parsel: string;
  /** Tapu alanı (m²) */
  area: number;
  /** Terk/DOP sonrası net parsel alanı (m²) */
  netArea: number;
  /** Opsiyonel: TKGM KML poligonu */
  kml?: ParcelKml | null;
}

/** 'taks-kaks' → katsayılardan hesaplanır · 'dogrudan' → alanlar elle girilir */
export type ZoningMode = 'taks-kaks' | 'dogrudan' | 'cekme';

export interface Zoning {
  mode: ZoningMode;
  lejant: string;
  taks: number | null;
  kaks: number | null;
  hmax: number | null;
  /** 'dogrudan' modda taban oturumu (m²) */
  directFootprint: number;
  /** 'dogrudan' modda emsale dahil toplam inşaat alanı (m²) */
  directEmsalArea: number;
  /** 'cekme' modu: bahçe mesafeleri (m) ve KML ön cephe kenar indeksi */
  cekmeFront: number;
  cekmeSide: number;
  cekmeRear: number;
  cekmeFrontEdge: number | null;
  planNotes: string;
}

/** Oran ile mi elle mi hesaplansın */
export type CalcMode = 'oran' | 'manuel';

export interface EmsalOptions {
  /* ── Emsal dışı satılabilir alan — emsale dahil alanın yüzdesi ── */
  hasExtra: boolean;
  extraMode: CalcMode;
  /** Emsale dahil alanın oranı (0.10 = %10) */
  extraRate: number;
  /** Elle girilen emsal dışı satılabilir alan (m²) */
  extraArea: number;

  /* ── Çatı katı — taban oturumunun yüzdesi ── */
  hasAttic: boolean;
  atticMode: CalcMode;
  /** Taban oturumunun oranı (0.50 = %50) */
  atticRate: number;
  /** Elle girilen çatı katı alanı (m²) */
  atticArea: number;
  /** Emsale dahil mi? (dahilse emsalin içinden yer alır, toplamı artırmaz) */
  atticInEmsal: boolean;

  /* ── Bodrum kat — taban oturumunun yüzdesi (varsayılan %100) veya elle ── */
  hasBasement: boolean;
  basementMode: CalcMode;
  /** Taban oturumunun oranı (1.00 = taban oturumu kadar) */
  basementRate: number;
  /** Elle girilen bodrum alanı (m²) */
  basementArea: number;
  basementInEmsal: boolean;
}

/* ═══════════ 3-8 KATLI BİNA (apartman) ═══════════
 * İki yöntem: 'dogrudan' → kat alanları elle girilir.
 *             'taks-kaks' → TAKS taban limitini, KAKS + ilave satılabilir alan
 *                           GİZLİ satılabilir havuzu belirler; bodrum ve zemin
 *                           havuzdan düşülür, kalan normal katlara (+ emsale
 *                           dahil piyese) dağıtılır.
 * Kural: elle girilen (override) değerler SABİT kalır; yeniden dağıtım yalnız
 * otomatik satırlara uygulanır. Türetilen tüm alanlar tam sayıya yuvarlanır. */

export type AptFloorKind = 'bodrum' | 'zemin' | 'asma' | 'normal' | 'piyes';

/** Karma / Ticari Apartman'da bodrum ticari de olabilir. */
export type BasementUse = 'konut' | 'ticari' | 'ortak';

export interface AptBasementInput {
  /** 'ortak' → satılabilir alan 0 (otopark, sığınak vb.). 'ticari' hesapta
   *  konut ile aynıdır; fark birim satış değerindedir. */
  use: BasementUse;
  /** Kat alanı. null → otomatik (TAKS/KAKS'ta taban oturumu). */
  area: number | null;
  /** Emsale dahil mi? Dahilse satılabiliri havuzdan düşer; değilse üstüne eklenir. */
  inEmsal?: boolean;
  /** Ortak alan payı → satılabilir = alan × (1 − oran) */
  lossRate: number;
  /** Satılabilir alan. null → otomatik; elle girilirse sabittir. */
  saleable: number | null;
}

export interface ApartmentInput {
  /** 0-8 */
  basementCount: number;
  /** 8 slot; ilk basementCount tanesi kullanılır */
  basements: AptBasementInput[];
  /** null → otomatik (taban oturumu). Elle girilip TAKS limitini aşarsa uyarı. */
  zeminArea: number | null;
  /** TAKS/KAKS: zemin kat kaybı (bina girişi vb.) */
  zeminLossRate: number;
  zeminSaleable: number | null;
  /** Normal kat adedi. null → TAKS/KAKS'ta Hmax'tan türetilir; doğrudan modda 3. */
  normalCount: number | null;
  /** 8 slot; doğrudan modda [0] ana giriştir, null satırlar ondan kopyalanır.
   *  TAKS/KAKS'ta null → havuzdan otomatik, sayı → sabit override. */
  normalAreas: (number | null)[];
  normalSaleables: (number | null)[];
  /** TAKS/KAKS: ortak mahal payı — kat alanı = satılabilir × (1 + oran) */
  normalCommonRate: number;
  hasPiyes: boolean;
  /** TAKS/KAKS: emsale dahilse havuzdan pay alır; değilse toplamın üstüne eklenir. */
  piyesInEmsal: boolean;
  /** Piyes satılabilir alanı = normal kat satılabilirinin bu oranı */
  piyesRate: number;
  piyesArea: number | null;
  piyesSaleable: number | null;
  /* ── Asma kat (yalnızca Karma / Ticari Apartman) ──
   *  Varsayılan alan = zemin kat alanı × asmaRate; satılabilir = alan (kayıpsız).
   *  Emsale dahilse havuzdan SABİT tutar olarak düşülür (orana katılmaz);
   *  değilse toplamın üstüne eklenir. */
  asmaCount: number;
  asmaInEmsal: boolean;
  /** Zemin kat alanının oranı (0.40 varsayılan) */
  asmaRate: number;
  asmaAreas: (number | null)[];
  asmaSaleables: (number | null)[];

  /* ── Çekme Mesafesi yöntemi (opsiyonel alanlar) ──
   *  Çıkmalar cepheye göre dışa öteleme mesafesidir (m); normal kat alanını büyütür.
   *  Kayıp oranları satılabilir = alan × (1 − oran) formülüyle uygulanır. */
  cikmaOn?: number;
  cikmaArka?: number;
  cikmaYan?: number;
  /** Normal kat kayıp oranı (varsayılan 0.07) */
  cekmeNormalLossRate?: number;
  /** Çatı katı kayıp oranı (varsayılan 0.07) */
  cekmePiyesLossRate?: number;

  /** TAKS/KAKS: emsale dahil olmayan ama satılabilir ilave alan (Tip İmar Yön.) */
  hasExtraSaleable: boolean;
  extraMode: CalcMode;
  /** Emsale dahil alanın oranı */
  extraRate: number;
  /** Elle girilen ilave satılabilir alan (m²) */
  extraArea: number;
}

export interface AptFloor {
  kind: AptFloorKind;
  /** bodrum: 1..4 (1. Bodrum), normal: 1..8; zemin/piyes: 0 */
  index: number;
  label: string;
  area: number;
  saleable: number;
  /** Değer otomatik mi türetildi (true) yoksa elle mi girildi (false) */
  autoArea: boolean;
  autoSaleable: boolean;
}

export interface ApartmentCapacity {
  mode: ZoningMode;
  footprintArea: number;
  emsalArea: number;
  /** İlave (emsal dışı) satılabilir alan */
  extraSaleableArea: number;
  /** Gizli satılabilir alan havuzu (emsal + ilave) — kullanıcıya gösterilmez */
  saleablePool: number;
  /** Havuzdan dağıtım sonrası kalan (0 beklenir; negatifse uyarı üretilir) */
  poolRemainder: number;
  floors: AptFloor[];
  /** Σ kat alanı — maliyet bu alan üzerinden hesaplanır */
  totalArea: number;
  /** Σ satılabilir alan — gelir kat tipine göre birim değerlerle hesaplanır */
  saleableTotal: number;
  saleableByKind: Record<AptFloorKind, number>;
  areaByKind: Record<AptFloorKind, number>;
  /** Bodrum satılabilirinin kullanım kırılımı (karma fiyatlama için) */
  bodrumSaleableByUse: { konut: number; ticari: number };
  normalFloorCount: number;
  /** Hmax'tan türetilen zemin dahil kat adedi (yalnızca TAKS/KAKS) */
  derivedFloorsFromHmax: number | null;
  gardenArea: number;
  warnings: string[];
}

export interface AptSalesInput {
  /** Kat tipine göre satılabilir m² birim satış değerleri (₺/m², KDV hariç).
   *  Konut Çok Katlı Bina yalnızca bodrum/zemin/normal/piyes kullanır;
   *  Karma ve Ticari Apartman altısını da kullanır. */
  bodrum: number;          // konut bodrum
  bodrumTicari: number;    // ticari bodrum
  zemin: number;
  asma: number;
  normal: number;
  piyes: number;
}

/* ═══════════ TİCARİ İŞLETME ═══════════
 * Ekle-mantığıyla yapı satırları; arsa değeri = öngörülen toplam satış değeri −
 * (yapı maliyetleri + ilave maliyetler). Müteahhit kârı KESİLMEZ (senaryo:
 * mülk sahibinin projeyi kendisinin yapması). */

export type TicariMode = 'apartman' | 'isletme';

export interface IsletmeBuilding {
  /** Yapı türü etiketi (ör. 'Ahır') — raporda görünür */
  type: string;
  /** Tebliğ yapı sınıfı kodu (ör. 'III-A') — birim maliyeti belirler */
  buildingClass: string;
  area: number;
  /** Yıpranma payı (0.10 = %10) — satır bazlı, opsiyonel */
  depreciation: number;
  /** null → tebliğ × (1 + enflasyon) × (1 − yıpranma); sayı → elle sabit */
  unitCostOverride: number | null;
}

export interface IsletmeOtherCost { name: string; amount: number; }

export interface IsletmeInput {
  buildings: IsletmeBuilding[];
  /** Tüm yapı satırlarına ortak güncelleme (enflasyon) oranı */
  inflationRate: number;
  /* İlave Maliyetler — tercihe bağlı (0 = yok) */
  /** Çevre duvarı uzunluğu (m) — maliyet = uzunluk × birim ₺/m */
  wallLength?: number;
  wallUnitCost: number;
  landscapeUnitCost: number;
  infraUnitCost: number;
  /** Serbest kalemler (ad + tutar) */
  otherCosts: IsletmeOtherCost[];
  /** Müteahhit kâr oranı (hasılat üzerinden) — varsayılan 0; amaç arsa + yapı */
  profitRate?: number;
  /** Öngörülen toplam satış değeri (₺, KDV hariç) */
  salesTotal: number;
}

export interface IsletmeRow {
  type: string;
  buildingClass: string;
  area: number;
  baseUnitCost: number;
  depreciation: number;
  effectiveUnitCost: number;
  overridden: boolean;
  cost: number;
}

export interface IsletmeResult {
  rows: IsletmeRow[];
  buildingsCost: number;
  totalBuildingArea: number;
  wallCost: number;
  landscapeCost: number;
  infraCost: number;
  otherCost: number;
  extrasTotal: number;
  totalCost: number;
  salesTotal: number;
  /** Müteahhit kârı (hasılat × oran); varsayılan 0 */
  profit: number;
  profitRate: number;
  /** Arsa değeri = satış − toplam maliyet (müteahhit kârı kesilmez) */
  landValue: number;
  landUnitValue: number;
  warnings: string[];
}

export interface VillaConfig {
  villaType: 'mustakil' | 'ikiz' | 'sirali';
  /** Villa adedi — OPSİYONEL. 0 ise villa dağılımı hesaplanmaz. */
  unitCount: number;
  /** Zemin üstü kat adedi (bodrum ve çatı katı hariç) — yerleşim kontrolü için */
  floorsAboveGround: number;
}

export interface CostInput {
  buildingClass: string;
  unitCost: number;
  inflationRate: number;
  /** Proje, ruhsat, harç, müşavirlik — inşaat maliyeti üzerinden oran */
  extrasRate: number;
}

export interface SiteWorks {
  /** Peyzaj/bahçe alanı (m²). 0 → net parsel − taban oturumu otomatik. */
  landscapeArea: number;
  landscapeUnitCost: number;
  /** Bahçe m² satış değeri (₺/m²). 0 → bahçe ayrıca fiyatlanmaz. */
  gardenPricePerM2: number;
}

export interface SalesInput {
  /** Villa: toplam inşaat alanı m² başına satış fiyatı (₺/m²) */
  unitPrice: number;
  /** 3-8 katlı bina: kat tipine göre birim değerler */
  apt: AptSalesInput;
}

export interface ResidualInput {
  /** Proje süresi (ay) — 0 = indirgeme yok (varsayılan davranış birebir korunur) */
  projectMonths?: number;
  /** Yıllık indirgeme oranı (0.30 = %30) */
  timeDiscountRate?: number;
  profitRate: number;
  /** Finansman gideri — toplam maliyetin yüzdesi. 0 → hesaba katılmaz. */
  financeRateOfCost: number;
}

export interface ShareInput {
  enabled: boolean;
  ownerShare: number;
}

/** Döviz karşılığı gösterimi — kur elle girilir (rapor tarihine sabit beyan). */
export interface FxInput {
  usd: number | null;
  eur: number | null;
}

export interface ProjectInput {
  assetType: AssetType;
  housingType: HousingType;
  /** Ticari seçilince izlenecek yol */
  ticariMode: TicariMode;
  parcel: Parcel;
  zoning: Zoning;
  emsal: EmsalOptions;
  villa: VillaConfig;
  apartment: ApartmentInput;
  isletme: IsletmeInput;
  cost: CostInput;
  site: SiteWorks;
  sales: SalesInput;
  residual: ResidualInput;
  share: ShareInput;
  /** Opsiyonel: girilirse çıktılarında arsa değeri döviz cinsinden de yazılır. */
  fx?: FxInput;
  /** Rapor PDF'inde kroki ve yapı kesiti çizilsin mi (varsayılan: evet) */
  reportVisuals?: boolean;
}

export interface CapacityResult {
  /** Taban oturumu (m²) */
  footprintArea: number;
  /** Emsale dahil alan (m²) */
  emsalArea: number;
  /** Emsal dışı satılabilir alan (m²) */
  extraArea: number;
  /** Çatı katı alanı (m²) */
  atticArea: number;
  /** Bodrum kat alanı (m²) */
  basementArea: number;
  /** Emsalin içinden çatı ve bodruma giden kısım (m²) */
  emsalConsumedByExtras: number;
  /** Emsalin zemin üstü normal katlara kalan kısmı (m²) */
  aboveGroundArea: number;
  /** TOPLAM İNŞAAT ALANI (m²) */
  totalArea: number;
  /** Satılabilir alan — satış bu alan üzerinden yapılır */
  saleableArea: number;
  /** Bahçe / açık alan (m²) */
  gardenArea: number;
  /** Bodrum + çatı katının toplam inşaat alanı içindeki payı (0-1) */
  extraFloorsShare: number;

  /* Villa dağılımı — adet girilmişse */
  unitCount: number;
  areaPerUnit: number;
  floorsAboveGround: number;
  /** Zemin üstü alanın kat başına düşen kısmı */
  areaPerFloor: number;
  /** Kat başına alan taban oturumuna sığıyor mu? */
  floorFits: boolean;
  /** Yerleşim için gereken en az kat adedi */
  minFloorsNeeded: number;

  warnings: string[];
}

export interface FinancialResult {
  effectiveUnitCost: number;
  constructionCost: number;
  landscapeCost: number;
  extrasCost: number;
  financeCost: number;
  totalCost: number;
  buildingRevenue: number;
  gardenRevenue: number;
  revenue: number;
  developerProfit: number;
  residualLandValue: number;
  /** İndirgemeli arsa değeri: hasılat proje sonundan, maliyet orta noktadan bugüne çekilir.
   *  projectMonths 0 iken residualLandValue ile birebir aynıdır. */
  discountedLandValue: number;
  landUnitValue: number;
  landToRevenue: number;
  roi: number;
  breakEvenFactor: number;
  safetyMargin: number;
  costPerSaleableM2: number;
}

export interface ShareResult {
  ownerShare: number;
  contractorShare: number;
  ownerUnits: number;
  contractorUnits: number;
  ownerArea: number;
  contractorArea: number;
  /** Kat karşılığı yöntemine göre arsa değeri (arsa sahibi payının karşılığı) */
  shareLandValue: number;
  /** Müteahhide kalan hasılat */
  contractorValue: number;
  contractorNet: number;
  /** Gelir projeksiyonuna göre arsa değerine denk gelen pay */
  balancedShare: number;
  /** İki yöntem arasındaki fark (kat karşılığı − gelir projeksiyonu) */
  difference: number;
  /** Farkın gelir projeksiyonuna oranı */
  differenceRate: number;
  verdict: 'kat-karsiligi-yuksek' | 'gelir-yontemi-yuksek' | 'yakin';
}

/** 'uyari-uygulama' → yalnızca uygulama ekranında gösterilir, PDF/Excel'e yazılmaz. */
export type AdviceLevel = 'olumlu' | 'bilgi' | 'dikkat' | 'uyari' | 'uyari-uygulama';
export interface Advice { level: AdviceLevel; title: string; body: string; }

export interface AnalysisResult {
  capacity: CapacityResult;
  financial: FinancialResult;
  share: ShareResult;
  advice: Advice[];
  /** Konut Çok Katlı Bina, Karma ve Ticari Apartman'da dolu */
  apartment?: ApartmentCapacity;
  /** Yalnızca Ticari İşletme'de dolu */
  isletme?: IsletmeResult;
}
