/** Motor giriş noktası — tüm analizi tek çağrıda üretir. */
import type { ProjectInput, AnalysisResult, CapacityResult, FinancialResult, ShareResult } from './types';
import { computeCapacity } from './capacity';
import { computeApartment } from './apartment';
import { computeIsletme } from './isletme';
import { computeFinancial, computeShare } from './financial';
import { buildAdvice } from './advisor';
import { buildApartmentAdvice } from './apartmentAdvisor';

export * from './types';
export { computeCapacity } from './capacity';
export { computeApartment, floorsFromHmax } from './apartment';
export { computeIsletme, ISLETME_KATALOG } from './isletme';
export { computeFinancial, computeShare } from './financial';
export { buildAdvice } from './advisor';
export { buildApartmentAdvice } from './apartmentAdvisor';
import { setbackFootprint } from '../geo/kml';

/** Karma Kullanım ve Ticari Apartman aynı motorda 'karma' varyantıyla çalışır. */
export function isMixedUse(input: ProjectInput): boolean {
  return input.assetType === 'karma' ||
    (input.assetType === 'ticari' && input.ticariMode === 'apartman');
}

/** 'cekme' modunu efektif TAKS'a çevirir (villa yolu için; apartman motoru kendi içinde yapar). */
export function normalizeZoning(parcel: ProjectInput['parcel'], zoning: ProjectInput['zoning']): ProjectInput['zoning'] {
  if (zoning.mode !== 'cekme') return zoning;
  const base = parcel.netArea || parcel.area;
  const k = parcel.kml;
  let taksEff: number | null = null;
  if (k && k.points.length >= 3 && zoning.cekmeFrontEdge != null && base > 0) {
    const fp = setbackFootprint(k.points, zoning.cekmeFrontEdge,
      { front: zoning.cekmeFront, side: zoning.cekmeSide, rear: zoning.cekmeRear });
    if (fp) taksEff = fp.area / base;
  }
  return { ...zoning, mode: 'taks-kaks', taks: taksEff };
}

export function analyze(input: ProjectInput): AnalysisResult {
  if (input.assetType === 'ticari' && input.ticariMode === 'isletme') return analyzeIsletme(input);
  if (isMixedUse(input)) return analyzeApartment(input, 'karma');
  if (input.housingType === 'apartman-3-8') return analyzeApartment(input, 'konut');

  const zoning = normalizeZoning(input.parcel, input.zoning);
  const capacity = computeCapacity(input.parcel, zoning, input.emsal, input.villa);
  const financial = computeFinancial(input.parcel, capacity, input.cost, input.site, input.sales, input.residual);
  const share = computeShare(capacity, financial, input.share);
  const advice = buildAdvice(
    input.parcel, input.emsal, input.cost, input.site, input.residual,
    capacity, financial, share, input.share.enabled,
  );
  return { capacity, financial, share, advice };
}

/** 3-8 katlı bina hattı: kat tablosu kapasitesi + kat tipi bazlı gelir. */
function analyzeApartment(input: ProjectInput, variant: 'konut' | 'karma'): AnalysisResult {
  const apartment = computeApartment(input.parcel, input.zoning, input.apartment, variant);

  /* Finansal motorun beklediği kapasite görünümü — villa alanları nötr */
  const capacity: CapacityResult = {
    footprintArea: apartment.footprintArea,
    emsalArea: apartment.emsalArea,
    extraArea: apartment.extraSaleableArea,
    atticArea: apartment.areaByKind.piyes,
    basementArea: apartment.areaByKind.bodrum,
    emsalConsumedByExtras: 0,
    aboveGroundArea: apartment.areaByKind.zemin + apartment.areaByKind.normal,
    totalArea: apartment.totalArea,
    saleableArea: apartment.saleableTotal,
    gardenArea: apartment.gardenArea,
    extraFloorsShare: apartment.totalArea > 0
      ? (apartment.areaByKind.bodrum + apartment.areaByKind.piyes) / apartment.totalArea : 0,
    unitCount: 0, areaPerUnit: 0,
    floorsAboveGround: 1 + apartment.normalFloorCount,
    areaPerFloor: 0, floorFits: true, minFloorsNeeded: 0,
    warnings: apartment.warnings,
  };

  const p = input.sales.apt;
  /* Konut: tüm bodrumlar tek bodrum değerinden. Karma: kullanım kırılımıyla. */
  const bodrumRevenue = variant === 'karma'
    ? apartment.bodrumSaleableByUse.konut * p.bodrum +
      apartment.bodrumSaleableByUse.ticari * p.bodrumTicari
    : apartment.saleableByKind.bodrum * p.bodrum;
  const buildingRevenue =
    bodrumRevenue +
    apartment.saleableByKind.zemin * p.zemin +
    apartment.saleableByKind.asma * p.asma +
    apartment.saleableByKind.normal * p.normal +
    apartment.saleableByKind.piyes * p.piyes;

  const financial = computeFinancial(
    input.parcel, capacity, input.cost, input.site, input.sales, input.residual, buildingRevenue,
  );
  const share = computeShare(capacity, financial, input.share);
  const advice = buildApartmentAdvice(
    input.apartment, apartment, input.cost, input.sales, input.residual,
    financial, share, input.share.enabled,
  );
  return { capacity, financial, share, advice, apartment };
}

/** Ticari İşletme hattı: kat karşılığı yok, müteahhit kârı yok, uzman yorumu yok. */
function analyzeIsletme(input: ProjectInput): AnalysisResult {
  const isletme = computeIsletme(input.parcel, input.isletme);

  const capacity: CapacityResult = {
    footprintArea: 0, emsalArea: 0, extraArea: 0, atticArea: 0, basementArea: 0,
    emsalConsumedByExtras: 0, aboveGroundArea: 0,
    totalArea: isletme.totalBuildingArea, saleableArea: isletme.totalBuildingArea,
    gardenArea: 0, extraFloorsShare: 0,
    unitCount: 0, areaPerUnit: 0, floorsAboveGround: 1,
    areaPerFloor: 0, floorFits: true, minFloorsNeeded: 0,
    warnings: isletme.warnings,
  };
  const financial: FinancialResult = {
    effectiveUnitCost: isletme.totalBuildingArea > 0
      ? isletme.buildingsCost / isletme.totalBuildingArea : 0,
    constructionCost: isletme.buildingsCost,
    landscapeCost: isletme.landscapeCost,
    extrasCost: isletme.wallCost + isletme.infraCost + isletme.otherCost,
    financeCost: 0,
    totalCost: isletme.totalCost,
    buildingRevenue: isletme.salesTotal,
    gardenRevenue: 0,
    revenue: isletme.salesTotal,
    developerProfit: 0,
    residualLandValue: isletme.landValue,
    discountedLandValue: isletme.landValue,
    landUnitValue: isletme.landUnitValue,
    landToRevenue: isletme.salesTotal > 0 ? isletme.landValue / isletme.salesTotal : 0,
    roi: 0,
    breakEvenFactor: isletme.salesTotal > 0 ? isletme.totalCost / isletme.salesTotal : 0,
    safetyMargin: isletme.salesTotal > 0 ? 1 - isletme.totalCost / isletme.salesTotal : 0,
    costPerSaleableM2: isletme.totalBuildingArea > 0
      ? isletme.totalCost / isletme.totalBuildingArea : 0,
  };
  const share: ShareResult = {
    ownerShare: 0, contractorShare: 0, ownerUnits: 0, contractorUnits: 0,
    ownerArea: 0, contractorArea: 0, shareLandValue: 0, contractorValue: 0,
    contractorNet: 0, balancedShare: 0, difference: 0, differenceRate: 0, verdict: 'yakin',
  };
  return { capacity, financial, share, advice: [], isletme };
}
