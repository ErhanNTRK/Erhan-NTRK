/**
 * 3-8 KATLI BİNA KAPASİTE MOTORU
 *
 * İki hesap yöntemi:
 *
 * 1) DOĞRUDAN ALAN — kullanıcı katları seçer, kat alanı ve satılabilir alanı
 *    elle girer. 1. Normal Kat'a girilen değerler diğer normal katlara
 *    kopyalanır; her satır tek tek değiştirilebilir.
 *
 * 2) TAKS/KAKS —
 *    · Taban limiti  = net parsel × TAKS  (zemin bunu aşarsa uyarı)
 *    · Emsal         = net parsel × KAKS
 *    · GİZLİ HAVUZ   = emsal + ilave satılabilir alan (oran veya elle)
 *      Havuz kullanıcıya ara toplam olarak gösterilmez.
 *    · Bodrumlar: kat alanı otomatik taban oturumu; kullanım 'ortak' → 0,
 *      'konut' → alan × (1 − kayıp). Havuzdan düşülür.
 *    · Zemin: alan taban oturumu (aşarsa uyarı); satılabilir = alan × (1 − kayıp).
 *      Havuzdan düşülür.
 *    · Kalan havuz otomatik normal katlara + (emsale dahilse) piyese dağıtılır:
 *      pay = kalan ÷ (otomatik normal kat sayısı + piyes oranı)
 *    · Normal kat alanı = satılabilir × (1 + ortak mahal oranı)
 *    · Emsale dahil OLMAYAN piyes havuzdan pay almaz; normal kat satılabiliri
 *      üzerinden oranla hesaplanır ve toplamın ÜSTÜNE eklenir.
 *    · Hmax → zemin dahil kat adedi: (Hmax − 0,50) ÷ 3, aşağı yuvarlanır
 *      (6,50→2 · 9,50→3 · 12,50→4 · 15,50→5 · 18,50→6 · 21,50→7 · 24,50→8).
 *      Bodrum ve piyes bu sayıya dahil değildir; kullanıcı değiştirebilir.
 *
 * Ortak kurallar:
 *    · Türetilen tüm alanlar en yakın TAM SAYIYA yuvarlanır.
 *    · Elle girilen değerler SABİTTİR; yeniden dağıtım yalnız otomatik satırlara.
 *
 * engine klasörü saf TypeScript'tir: React bilmez, DOM'a dokunmaz.
 */
import { setbackFootprint, outwardOffset, classifyEdges, polygonArea } from '../geo/kml';
import type {
  Parcel, Zoning, ApartmentInput, ApartmentCapacity, AptFloor, AptFloorKind,
} from './types';

const R = Math.round;
const m2 = (v: number) => `${R(v).toLocaleString('tr-TR')} m²`;

/** Hmax → zemin dahil kat adedi. 6,50→2 … 24,50→8; ara değerler aşağı yuvarlanır. */
export function floorsFromHmax(hmax: number | null): number | null {
  if (hmax == null || hmax <= 0) return null;
  return Math.max(1, Math.floor((hmax - 0.5) / 3 + 1e-9));
}

const ord = (i: number) => `${i}.`;

function computeCekme(
  parcel: Parcel, zoning: Zoning, apt: ApartmentInput,
  variant: 'konut' | 'karma', warnings: string[],
): ApartmentCapacity {
  const k = parcel.kml;
  let footprintArea = 0;
  let fpPoly: { x: number; y: number }[] | null = null;
  if (k && k.points.length >= 3 && zoning.cekmeFrontEdge != null) {
    const fp = setbackFootprint(k.points, zoning.cekmeFrontEdge,
      { front: zoning.cekmeFront, side: zoning.cekmeSide, rear: zoning.cekmeRear });
    if (fp) { footprintArea = fp.area; fpPoly = fp.polygon; }
    else warnings.push('Çekme mesafeleri bu parsel şekline uygulanamadı; oturum hesaplanamıyor.');
  } else {
    warnings.push('Çekme yöntemi için KML poligonu ve ön cephe seçimi gereklidir.');
  }

  /* Çıkmalar → normal kat alanı (oturum poligonunun cephelere göre dışa ötelenmesi) */
  const cOn = Math.max(0, apt.cikmaOn ?? 0);
  const cArka = Math.max(0, apt.cikmaArka ?? 0);
  const cYan = Math.max(0, apt.cikmaYan ?? 0);
  let normalBaseArea = footprintArea;
  if (fpPoly && k && zoning.cekmeFrontEdge != null && (cOn > 0 || cArka > 0 || cYan > 0)) {
    const classes = classifyEdges(k.points, zoning.cekmeFrontEdge);
    // Oturum poligonu kenar sırası orijinal poligonla aynıdır (hat kesişimi korur)
    const dists = classes.map((c) => (c === 'front' ? cOn : c === 'rear' ? cArka : cYan));
    const grown = outwardOffset(fpPoly, dists);
    if (grown) normalBaseArea = polygonArea(grown);
    else warnings.push('Çıkma mesafeleri geometriye uygulanamadı; normal kat alanı oturuma eşit alındı.');
  }

  const lossNormal = Math.max(0, apt.cekmeNormalLossRate ?? 0.07);
  const lossPiyes = Math.max(0, apt.cekmePiyesLossRate ?? 0.07);

  /* Kat sayısı: Hmax'tan (zemin dahil) → normal = kat − 1; elle aşılırsa uyarı */
  const hmaxFloors = floorsFromHmax(zoning.hmax);
  const suggestedNormals = hmaxFloors != null ? Math.max(0, hmaxFloors - 1) : 3;
  const normalCount = Math.max(0, Math.min(40, apt.normalCount ?? suggestedNormals));
  if (hmaxFloors != null && normalCount > suggestedNormals) {
    warnings.push(`Hmax ${zoning.hmax!.toLocaleString('tr-TR')} m için önerilen üst kat sayısı ${suggestedNormals}; girilen ${normalCount} kat Hmax ile uyumsuz olabilir.`);
  }

  const basementCount = Math.max(0, Math.min(8, apt.basementCount));
  const floors: AptFloor[] = [];

  /* Bodrumlar */
  for (let i = basementCount; i >= 1; i--) {
    const b = apt.basements[i - 1] ?? { use: 'konut', area: null, lossRate: 0.07, saleable: null };
    const area = R(Math.max(0, b.area ?? footprintArea));
    const saleable = b.use === 'ortak' ? 0
      : R(Math.max(0, b.saleable ?? area * (1 - Math.max(0, b.lossRate ?? 0.10))));
    floors.push({
      kind: 'bodrum', index: i,
      label: `${ord(i)} Bodrum Kat` + (variant === 'karma' && b.use !== 'ortak' ? ` (${b.use})` : ''),
      area, saleable, autoArea: b.area == null, autoSaleable: b.use === 'ortak' || b.saleable == null,
    });
  }

  /* Zemin */
  const zArea = R(Math.max(0, apt.zeminArea ?? footprintArea));
  const zSaleable = R(Math.max(0, apt.zeminSaleable ?? zArea * (1 - Math.max(0, apt.zeminLossRate))));
  floors.push({
    kind: 'zemin', index: 0,
    label: variant === 'karma' ? 'Zemin Kat (ticari)' : 'Zemin Kat',
    area: zArea, saleable: zSaleable,
    autoArea: apt.zeminArea == null, autoSaleable: apt.zeminSaleable == null,
  });

  /* Asma kat(lar) — yalnızca karma varyantında; alan/satılabilir öneridir, ikisi de
   * elle değiştirilebilir (ortak alan girişi dahil). */
  const asmaN = variant === 'karma' ? Math.max(0, Math.round(apt.asmaCount)) : 0;
  for (let i = 1; i <= asmaN; i++) {
    const aOv = apt.asmaAreas[i - 1];
    const area = R(Math.max(0, aOv ?? zArea * Math.max(0, apt.asmaRate)));
    const sOv = apt.asmaSaleables[i - 1];
    const saleable = R(Math.max(0, sOv ?? area));
    floors.push({
      kind: 'asma', index: i, label: asmaN > 1 ? `${ord(i)} Asma Kat (ticari)` : 'Asma Kat (ticari)',
      area, saleable, autoArea: aOv == null, autoSaleable: sOv == null,
    });
  }

  /* Normal katlar — çıkmalı alanla başlar */
  for (let j = 1; j <= normalCount; j++) {
    const area = R(Math.max(0, apt.normalAreas[j - 1] ?? normalBaseArea));
    const saleable = R(Math.max(0, apt.normalSaleables[j - 1] ?? area * (1 - lossNormal)));
    floors.push({
      kind: 'normal', index: j, label: `${ord(j)} Normal Kat`,
      area, saleable,
      autoArea: apt.normalAreas[j - 1] == null, autoSaleable: apt.normalSaleables[j - 1] == null,
    });
  }

  /* Çatı katı */
  if (apt.hasPiyes) {
    const pArea = R(Math.max(0, apt.piyesArea ?? normalBaseArea * Math.max(0, apt.piyesRate)));
    const pSaleable = R(Math.max(0, apt.piyesSaleable ?? pArea * (1 - lossPiyes)));
    floors.push({
      kind: 'piyes', index: 0, label: 'Çatı Arası Piyesi',
      area: pArea, saleable: pSaleable,
      autoArea: apt.piyesArea == null, autoSaleable: apt.piyesSaleable == null,
    });
  }

  const totalArea = R(floors.reduce((s, f) => s + f.area, 0));
  const saleableTotal = R(floors.reduce((s, f) => s + f.saleable, 0));
  const byKind = (fn: (f: AptFloor) => number) => {
    const o: Record<AptFloorKind, number> = { bodrum: 0, zemin: 0, asma: 0, normal: 0, piyes: 0 };
    for (const f of floors) o[f.kind] = R(o[f.kind] + fn(f));
    return o;
  };

  const bodrumSaleableByUse = { konut: 0, ticari: 0 };
  for (let i = 1; i <= basementCount; i++) {
    const b = apt.basements[i - 1];
    const fl = floors.find((f) => f.kind === 'bodrum' && f.index === i);
    if (b && fl && b.use !== 'ortak') bodrumSaleableByUse[b.use] = R(bodrumSaleableByUse[b.use] + fl.saleable);
  }

  return {
    mode: 'cekme', footprintArea: R(footprintArea), emsalArea: 0,
    extraSaleableArea: 0, saleablePool: 0, poolRemainder: 0,
    floors, totalArea, saleableTotal,
    saleableByKind: byKind((f) => f.saleable), areaByKind: byKind((f) => f.area),
    bodrumSaleableByUse, normalFloorCount: normalCount,
    derivedFloorsFromHmax: hmaxFloors,
    gardenArea: Math.max(0, parcel.netArea - footprintArea),
    warnings,
  };
}

export function computeApartment(
  parcel: Parcel, zoning: Zoning, apt: ApartmentInput,
  /** 'karma' → zemin ticari etiketi, bodrum kullanım etiketleri, asma kat aktif */
  variant: 'konut' | 'karma' = 'konut',
): ApartmentCapacity {
  const warnings: string[] = [];

  /* ═══════════ ÇEKME MESAFESİ — havuzsuz, oturum tabanlı kurgu ═══════════
     Belediye imar durumu mantığı: bitişik nizam + Hmax + ön/yan/arka bahçe.
     Emsal (KAKS) havuzu YOKTUR. Oturum çekmeden hesaplanır; zemin ve bodrumlar
     oturumla başlar, normal katlar çıkmalı alanla başlar, kat sayısı Hmax'tan
     türetilir. Her hücre elle değiştirilebilir; satılabilir = alan × (1 − oran). */
  if (zoning.mode === 'cekme') {
    return computeCekme(parcel, zoning, apt, variant, warnings);
  }

  const direct = zoning.mode === 'dogrudan';

  /* ── İmar hakkı ── */
  const footprintArea = direct
    ? 0
    : (zoning.taks != null ? parcel.netArea * zoning.taks : 0);
  const emsalArea = direct
    ? 0
    : (zoning.kaks != null ? parcel.netArea * zoning.kaks : 0);

  if (!direct && emsalArea <= 0) warnings.push('KAKS girilmediği için satılabilir alan havuzu hesaplanamıyor.');
  if (!direct && footprintArea <= 0) warnings.push('TAKS girilmediği için taban oturumu hesaplanamıyor.');

  /* ── İlave (emsal dışı) satılabilir alan → gizli havuz ── */
  const extraSaleableArea = direct || !apt.hasExtraSaleable ? 0
    : apt.extraMode === 'oran'
      ? R(emsalArea * Math.max(0, apt.extraRate))
      : R(Math.max(0, apt.extraArea));
  const saleablePool = direct ? 0 : R(emsalArea) + extraSaleableArea;

  /* ── Kat adedi ── */
  const derivedFloorsFromHmax = direct ? null : floorsFromHmax(zoning.hmax);
  /* Kat sayısında üst sınır yoktur; alt sınır 1'dir. */
  const normalFloorCount = Math.max(1,
    apt.normalCount != null
      ? Math.round(apt.normalCount)
      : direct ? 3 : Math.max(1, (derivedFloorsFromHmax ?? 4) - 1));

  const basementCount = Math.min(8, Math.max(0, Math.round(apt.basementCount)));

  const floors: AptFloor[] = [];

  /* ═══════════ DOĞRUDAN ALAN ═══════════ */
  if (direct) {
    for (let i = basementCount; i >= 1; i--) {
      const b = apt.basements[i - 1] ?? { use: 'konut', area: null, lossRate: 0, saleable: null };
      const area = R(Math.max(0, b.area ?? 0));
      const saleable = b.use === 'ortak' ? 0 : R(Math.max(0, b.saleable ?? 0));
      floors.push({
        kind: 'bodrum', index: i,
        label: `${ord(i)} Bodrum Kat` + (variant === 'karma' && b.use !== 'ortak' ? ` (${b.use})` : ''),
        area, saleable, autoArea: b.area == null, autoSaleable: b.use === 'ortak' || b.saleable == null,
      });
    }
    const zArea = R(Math.max(0, apt.zeminArea ?? 0));
    floors.push({
      kind: 'zemin', index: 0, label: variant === 'karma' ? 'Zemin Kat (ticari)' : 'Zemin Kat',
      area: zArea, saleable: R(Math.max(0, apt.zeminSaleable ?? 0)),
      autoArea: apt.zeminArea == null, autoSaleable: apt.zeminSaleable == null,
    });
    /* Asma kat(lar) — yalnızca karma varyantında; alan/satılabilir öneridir, elle değiştirilebilir. */
    const asmaN = variant === 'karma' ? Math.max(0, Math.round(apt.asmaCount)) : 0;
    for (let i = 1; i <= asmaN; i++) {
      const aOv = apt.asmaAreas[i - 1];
      const area = R(Math.max(0, aOv ?? zArea * Math.max(0, apt.asmaRate)));
      const sOv = apt.asmaSaleables[i - 1];
      const saleable = R(Math.max(0, sOv ?? area));
      floors.push({
        kind: 'asma', index: i, label: asmaN > 1 ? `${ord(i)} Asma Kat (ticari)` : 'Asma Kat (ticari)',
        area, saleable, autoArea: aOv == null, autoSaleable: sOv == null,
      });
    }
    /* Normal katlar — 1. kata girilen değer null satırlara kopyalanır */
    const masterA = apt.normalAreas[0];
    const masterS = apt.normalSaleables[0];
    for (let j = 1; j <= normalFloorCount; j++) {
      const a = apt.normalAreas[j - 1] ?? masterA ?? 0;
      const s = apt.normalSaleables[j - 1] ?? masterS ?? 0;
      floors.push({
        kind: 'normal', index: j, label: `${ord(j)} Normal Kat`,
        area: R(Math.max(0, a)), saleable: R(Math.max(0, s)),
        autoArea: apt.normalAreas[j - 1] == null && j > 1,
        autoSaleable: apt.normalSaleables[j - 1] == null && j > 1,
      });
    }
    if (apt.hasPiyes) {
      floors.push({
        kind: 'piyes', index: 0, label: 'Çatı Arası Piyesi',
        area: R(Math.max(0, apt.piyesArea ?? 0)), saleable: R(Math.max(0, apt.piyesSaleable ?? 0)),
        autoArea: apt.piyesArea == null, autoSaleable: apt.piyesSaleable == null,
      });
    }
  } else {
    /* ═══════════ TAKS / KAKS — gizli havuz dağıtımı ═══════════ */
    let pool = saleablePool;

    /* Bodrumlar (derin kattan yukarı listelenir) */
    for (let i = basementCount; i >= 1; i--) {
      const b = apt.basements[i - 1] ?? { use: 'konut', area: null, lossRate: 0.10, saleable: null };
      const area = R(Math.max(0, b.area ?? footprintArea));
      const saleable = b.use === 'ortak'
        ? 0
        : R(Math.max(0, b.saleable ?? area * (1 - Math.max(0, b.lossRate ?? 0.10))));
      if (b.inEmsal !== false) pool -= saleable;   // emsale dahil değilse havuzdan düşmez
      floors.push({
        kind: 'bodrum', index: i,
        label: `${ord(i)} Bodrum Kat` + (variant === 'karma' && b.use !== 'ortak' ? ` (${b.use})` : ''),
        area, saleable, autoArea: b.area == null, autoSaleable: b.use === 'ortak' || b.saleable == null,
      });
    }

    /* Zemin — kat alanı taban oturumu; aşarsa uyarı */
    const zArea = R(Math.max(0, apt.zeminArea ?? footprintArea));
    if (footprintArea > 0 && zArea > R(footprintArea) + 0.5) {
      warnings.push(
        `Zemin kat alanı (${m2(zArea)}) taban oturumu limitini (${m2(footprintArea)} = parsel × TAKS) aşıyor.`,
      );
    }
    const zSaleable = R(Math.max(0, apt.zeminSaleable ?? zArea * (1 - Math.max(0, apt.zeminLossRate))));
    pool -= zSaleable;
    floors.push({
      kind: 'zemin', index: 0, label: variant === 'karma' ? 'Zemin Kat (ticari)' : 'Zemin Kat',
      area: zArea, saleable: zSaleable,
      autoArea: apt.zeminArea == null, autoSaleable: apt.zeminSaleable == null,
    });

    /* Asma kat(lar) — karma: alan = zemin × oran (elle değişir), satılabilir = alan.
       Emsale dahilse havuzdan SABİT tutar düşülür; orana katılmaz. */
    const asmaN = variant === 'karma' ? Math.max(0, Math.round(apt.asmaCount)) : 0;
    for (let i = 1; i <= asmaN; i++) {
      const aOv = apt.asmaAreas[i - 1];
      const area = R(Math.max(0, aOv ?? zArea * Math.max(0, apt.asmaRate)));
      const sOv = apt.asmaSaleables[i - 1];
      const saleable = R(Math.max(0, sOv ?? area));
      if (apt.asmaInEmsal) pool -= saleable;
      floors.push({
        kind: 'asma', index: i,
        label: (asmaN > 1 ? `${ord(i)} Asma Kat` : 'Asma Kat') + ' (ticari)' + (apt.asmaInEmsal ? '' : ' · emsal dışı'),
        area, saleable, autoArea: aOv == null, autoSaleable: sOv == null,
      });
    }

    /* Elle girilen normal kat satılabilirleri havuzdan önce düşülür — sabittirler */
    let autoCount = 0;
    for (let j = 1; j <= normalFloorCount; j++) {
      const ov = apt.normalSaleables[j - 1];
      if (ov != null) pool -= R(Math.max(0, ov));
      else autoCount++;
    }

    /* Piyes: emsale dahilse havuzdan pay alır (oran birimiyle) */
    const piyesActive = apt.hasPiyes;
    const piyesOverride = apt.piyesSaleable;
    let piyesUnits = 0;
    if (piyesActive && apt.piyesInEmsal) {
      if (piyesOverride != null) pool -= R(Math.max(0, piyesOverride));
      else piyesUnits = Math.max(0, apt.piyesRate);
    }

    const unitTotal = autoCount + piyesUnits;
    if (pool < -0.5) {
      warnings.push(
        `Elle girilen ve bodrum/zemin satılabilir alanları, satılabilir alan hakkını ${m2(-pool)} aşıyor. ` +
        'Normal katlara dağıtılacak alan kalmadı; girişleri gözden geçiriniz.',
      );
    }
    const perNormal = unitTotal > 0 ? Math.max(0, pool) / unitTotal : 0;
    const perNormalR = R(perNormal);

    /* Piyes hesabı için baz normal kat satılabiliri:
       otomatik pay varsa o; yoksa elle girilen normal katların ortalaması */
    let normalBase = perNormalR;
    if (autoCount === 0) {
      const ovs = apt.normalSaleables.slice(0, normalFloorCount).filter((v): v is number => v != null);
      normalBase = ovs.length ? R(ovs.reduce((a, b) => a + b, 0) / ovs.length) : 0;
    }

    const cr = Math.max(0, apt.normalCommonRate);
    for (let j = 1; j <= normalFloorCount; j++) {
      const ovS = apt.normalSaleables[j - 1];
      const saleable = ovS != null ? R(Math.max(0, ovS)) : perNormalR;
      const ovA = apt.normalAreas[j - 1];
      const area = ovA != null ? R(Math.max(0, ovA)) : R(saleable * (1 + cr));
      floors.push({
        kind: 'normal', index: j, label: `${ord(j)} Normal Kat`,
        area, saleable, autoArea: ovA == null, autoSaleable: ovS == null,
      });
    }

    if (piyesActive) {
      const saleable = piyesOverride != null
        ? R(Math.max(0, piyesOverride))
        : R(normalBase * Math.max(0, apt.piyesRate));
      const area = apt.piyesArea != null
        ? R(Math.max(0, apt.piyesArea))
        : R(saleable * (1 + cr));
      floors.push({
        kind: 'piyes', index: 0, label: `Çatı Arası Piyesi${apt.piyesInEmsal ? '' : ' (emsal dışı)'}`,
        area, saleable, autoArea: apt.piyesArea == null, autoSaleable: piyesOverride == null,
      });
    }
  }

  /* ── Toplamlar ── */
  const sumBy = (pick: (f: AptFloor) => number): Record<AptFloorKind, number> => {
    const acc: Record<AptFloorKind, number> = { bodrum: 0, zemin: 0, asma: 0, normal: 0, piyes: 0 };
    for (const f of floors) acc[f.kind] += pick(f);
    return acc;
  };
  const areaByKind = sumBy((f) => f.area);
  const saleableByKind = sumBy((f) => f.saleable);
  const totalArea = floors.reduce((a, f) => a + f.area, 0);
  const saleableTotal = floors.reduce((a, f) => a + f.saleable, 0);

  for (const f of floors) {
    if (f.saleable > f.area && f.area > 0) {
      warnings.push(`${f.label}: satılabilir alan (${m2(f.saleable)}) kat alanından (${m2(f.area)}) büyük olamaz.`);
    }
  }
  if (totalArea <= 0) warnings.push('Kat alanları girilmedi; maliyet hesaplanamıyor.');

  /* Bodrum satılabilirinin kullanım kırılımı (karma fiyatlama) */
  const bodrumSaleableByUse = { konut: 0, ticari: 0 };
  for (const fl of floors) {
    if (fl.kind !== 'bodrum') continue;
    const use = apt.basements[fl.index - 1]?.use ?? 'konut';
    if (use === 'ticari') bodrumSaleableByUse.ticari += fl.saleable;
    else if (use === 'konut') bodrumSaleableByUse.konut += fl.saleable;
  }

  /* Havuz artığı: emsale dahil olmayan piyes ve asma havuzu tüketmez */
  const consumed = saleableByKind.bodrum + saleableByKind.zemin + saleableByKind.normal +
    (apt.hasPiyes && apt.piyesInEmsal ? saleableByKind.piyes : 0) +
    (apt.asmaInEmsal ? saleableByKind.asma : 0);
  const poolRemainder = direct ? 0 : saleablePool - consumed;

  const groundFloor = floors.find((f) => f.kind === 'zemin');
  const effFootprint = direct ? (groundFloor?.area ?? 0) : footprintArea;
  const gardenArea = Math.max(0, parcel.netArea - effFootprint);

  return {
    mode: zoning.mode,
    footprintArea: direct ? (groundFloor?.area ?? 0) : footprintArea,
    emsalArea, extraSaleableArea, saleablePool, poolRemainder,
    floors, totalArea, saleableTotal, saleableByKind, areaByKind, bodrumSaleableByUse,
    normalFloorCount, derivedFloorsFromHmax, gardenArea, warnings,
  };
}
