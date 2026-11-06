/**
 * 3-8 KATLI BİNA — UZMAN YORUM MOTORU (kural bazlı, deterministik)
 * Villa danışmanından (advisor.ts) bilinçli olarak ayrı tutulur:
 * apartman kurgusu kat tablosu ve havuz mantığı üzerinden konuşur.
 */
import type {
  Advice, ApartmentCapacity, ApartmentInput, FinancialResult, ShareResult,
  CostInput, ResidualInput, SalesInput,
} from './types';

const pct = (v: number, d = 0) => `%${(v * 100).toFixed(d).replace('.', ',')}`;
const m2 = (v: number) => `${Math.round(v).toLocaleString('tr-TR')} m²`;
const tl = (v: number) => `${Math.round(v).toLocaleString('tr-TR')} ₺`;

export function buildApartmentAdvice(
  apt: ApartmentInput, cap: ApartmentCapacity,
  cost: CostInput, sales: SalesInput, residual: ResidualInput,
  financial: FinancialResult, share: ShareResult, shareEnabled: boolean,
): Advice[] {
  const out: Advice[] = [];
  const add = (level: Advice['level'], title: string, body: string) => out.push({ level, title, body });

  cap.warnings.forEach((w) => add('uyari', 'Kapasite uyarısı', w));

  /* ── Alan üretiminin özeti ── */
  if (cap.totalArea > 0) {
    const katSayisi = cap.floors.length;
    const bodrumN = cap.floors.filter((f) => f.kind === 'bodrum').length;
    const piyesVar = cap.floors.some((f) => f.kind === 'piyes');
    const parcalar = [
      bodrumN > 0 ? `${bodrumN} bodrum` : '',
      'zemin', `${cap.normalFloorCount} normal kat`,
      piyesVar ? 'çatı arası piyesi' : '',
    ].filter(Boolean).join(' + ');
    add('bilgi', 'Bina kurgusu',
      `${parcalar} olmak üzere ${katSayisi} kat; toplam inşaat alanı ${m2(cap.totalArea)}, ` +
      `satılabilir alan ${m2(cap.saleableTotal)}. Maliyet toplam inşaat alanı, ` +
      'gelir kat tipine göre satılabilir alanlar üzerinden hesaplanmıştır.');
  }

  /* ── TAKS/KAKS'a özgü ── */
  if (cap.mode === 'taks-kaks') {
    if (cap.extraSaleableArea > 0 && cap.emsalArea > 0) {
      add('olumlu', 'Emsal dışı alan kazancı',
        `Satılabilir alan hakkına, emsale dahil olmayan ${m2(cap.extraSaleableArea)} ` +
        `(emsalin ${pct(cap.extraSaleableArea / cap.emsalArea)}'i) ilave edilmiştir. ` +
        'Bu alanlar emsali harcamadan hasılat ürettiği için arsa değerine doğrudan katkı verir. ' +
        'Plan notunun bu kalemleri gerçekten emsal dışı saydığını teyit ediniz.');
    }
    if (apt.hasPiyes && !apt.piyesInEmsal && cap.saleableByKind.piyes > 0) {
      add('olumlu', 'Çatı arası piyesi emsal dışı',
        `Piyes (${m2(cap.saleableByKind.piyes)} satılabilir) emsal hakkını tüketmeden toplamın üstüne eklenmiştir. ` +
        'Plan notunda "son kat ile irtibatlı çatı arası piyesi emsale dahil değildir" ifadesinin bulunduğunu doğrulayınız.');
    }
    if (cap.derivedFloorsFromHmax != null && apt.normalCount != null &&
        apt.normalCount !== cap.derivedFloorsFromHmax - 1) {
      add('bilgi', 'Kat adedi Hmax türetiminden farklı',
        `Hmax'a göre zemin dahil ${cap.derivedFloorsFromHmax} kat yapılabilir; ` +
        `kurguda zemin + ${cap.normalFloorCount} normal kat var. ` +
        'Bilinçli bir tercihse sorun yok; yükseklik hakkının tamamı kullanılmıyor olabilir.');
    }
    if (cap.poolRemainder > 0.5) {
      add('dikkat', 'Satılabilir alan hakkı tam kullanılmıyor',
        `Elle girilen değerler nedeniyle ${m2(cap.poolRemainder)} satılabilir alan hakkı katlara dağıtılmadı. ` +
        'Bilinçli değilse elle girilen satırları otomatik değere döndürmeyi değerlendiriniz.');
    }
  }

  /* ── Alan kompozisyonu (yalnızca uygulama içi — rapora yazılmaz) ── */
  const altUst = cap.areaByKind.bodrum + cap.areaByKind.piyes;
  if (cap.totalArea > 0 && altUst / cap.totalArea > 0.35) {
    add('uyari-uygulama', 'Alan kompozisyonuna dikkat',
      `Toplam inşaat alanının ${pct(altUst / cap.totalArea)}'i bodrum ve çatı arası piyesidir ` +
      `(${m2(altUst)} / ${m2(cap.totalArea)}). Bu katlar normal katlarla aynı m² değerinde satılmaz; ` +
      'birim satış fiyatlarını belirlerken bu kompozisyonu dikkate alınız.');
  }

  /* ── Ortak mahal payı ── */
  if (cap.totalArea > 0 && cap.saleableTotal > 0) {
    const ortak = cap.totalArea - cap.saleableTotal;
    if (ortak > 0) {
      add('bilgi', 'Ortak mahal payı',
        `Toplam inşaat alanının ${m2(ortak)} kadarı (${pct(ortak / cap.totalArea)}) satılamayan ` +
        'ortak mahal ve kayıp alanlardır. Maliyet bu alanları da kapsar; gelir yalnızca satılabilir alandan gelir.');
    }
  }

  /* ── Birim değer tutarlılığı ── */
  const s = sales.apt;
  if (cap.saleableByKind.bodrum > 0 && s.bodrum > 0 && s.normal > 0 && s.bodrum > s.normal) {
    add('dikkat', 'Bodrum birim değeri normal katın üzerinde',
      `Bodrum ${tl(s.bodrum)}/m², normal kat ${tl(s.normal)}/m² girilmiş. ` +
      'Bodrum konutları genellikle normal katların altında fiyatlanır; bilinçli bir tercih değilse kontrol ediniz.');
  }
  if (cap.saleableByKind.bodrum > 0 && s.bodrum === 0) {
    add('dikkat', 'Bodrum satılabilir alanı fiyatsız',
      `Bodrumda ${m2(cap.saleableByKind.bodrum)} satılabilir alan var ancak birim değeri girilmedi; ` +
      'bu alan hasılata katılmıyor.');
  }
  if (cap.saleableByKind.piyes > 0 && s.piyes === 0) {
    add('dikkat', 'Piyes satılabilir alanı fiyatsız',
      `Çatı arası piyesinde ${m2(cap.saleableByKind.piyes)} satılabilir alan var ancak birim değeri girilmedi.`);
  }

  /* ── Maliyet ── */
  if (cost.inflationRate === 0) {
    add('dikkat', 'Birim maliyet güncellenmemiş',
      `Bakanlık tebliğ değeri (${tl(cost.unitCost)}/m²) doğrudan kullanılıyor. Tebliğ rakamları resmî işlemler içindir; ` +
      'piyasa maliyetleri genellikle üzerindedir. Gerçekçi fizibilite için güncelleme oranı girilmesi önerilir.');
  }
  if (cap.saleableTotal > 0 && financial.revenue > 0) {
    const oran = financial.costPerSaleableM2 / (financial.revenue / cap.saleableTotal);
    if (oran > 0.6) {
      add('uyari', 'Maliyet / satış dengesi zayıf',
        `Satılabilir m² başına toplam maliyet ${tl(financial.costPerSaleableM2)}; satış fiyatının ${pct(oran)}'i. ` +
        'Bu oran %60\'ı aştığında arsaya anlamlı değer kalması güçleşir.');
    }
  }

  /* ── Artık değer ── */
  if (financial.residualLandValue <= 0) {
    add('uyari', 'Arsa değeri negatif',
      'Mevcut varsayımlarla proje arsa bedelini karşılamıyor. Satış fiyatları, yapı sınıfı, kâr oranı veya finansman ' +
      'varsayımlarından en az biri gözden geçirilmelidir. Bu sonuç arsanın değersiz olduğu değil, bu proje kurgusunun ' +
      'fizibl olmadığı anlamına gelir.');
  } else if (financial.landToRevenue < 0.15) {
    add('dikkat', 'Arsa payı düşük',
      `Arsa değeri hasılatın ${pct(financial.landToRevenue, 1)}'ine denk. Konut projelerinde tipik bant %20-35'tir.`);
  } else if (financial.landToRevenue > 0.40) {
    add('dikkat', 'Arsa payı yüksek',
      `Arsa değeri hasılatın ${pct(financial.landToRevenue, 1)}'ine denk. İyimser satış fiyatı varsayımı olabilir; ` +
      'emsal araştırmasıyla doğrulayınız.');
  } else {
    add('olumlu', 'Arsa payı makul bantta',
      `Arsa değeri hasılatın ${pct(financial.landToRevenue, 1)}'ine denk — sektörde kabul gören %20-35 bandında.`);
  }

  /* ── Finansman ── */
  if (residual.financeRateOfCost > 0.20) {
    add('dikkat', 'Finansman yükü ağır',
      `Finansman gideri toplam maliyetin ${pct(residual.financeRateOfCost)}'i olarak alındı (${tl(financial.financeCost)}). ` +
      'Ön satış bu kalemi doğrudan düşürür ve arsaya kalan değeri artırır.');
  } else if (residual.financeRateOfCost === 0) {
    add('bilgi', 'Finansman gideri hesaba katılmadı',
      'Finansman oranı %0 girildi. Kredi kullanılacaksa bu kalem modellenmelidir; aksi halde arsa değeri olduğundan yüksek çıkar.');
  }

  /* ── Kat karşılığı karşılaştırması ── */
  if (shareEnabled && financial.revenue > 0) {
    const t = `Kat karşılığı yöntemine göre arsa değeri ${tl(share.shareLandValue)}, gelir projeksiyonuna göre ${tl(financial.residualLandValue)}.`;
    if (share.verdict === 'yakin') {
      add('olumlu', 'İki yöntem birbirini doğruluyor',
        `${t} Aradaki fark %5'in altında; girilen kat karşılığı oranı proje ekonomisiyle uyumlu.`);
    } else if (share.verdict === 'kat-karsiligi-yuksek') {
      add('bilgi', 'Kat karşılığı değeri daha yüksek',
        `${t} Fark ${tl(Math.abs(share.difference))} (${pct(Math.abs(share.differenceRate))}). ` +
        `Gelir projeksiyonuyla aynı sonuca ulaşmak için arsa payının ${pct(share.balancedShare, 1)} olması gerekirdi. ` +
        'Bu, arsa sahibi açısından daha avantajlı bir sözleşme demektir.');
    } else {
      add('bilgi', 'Gelir projeksiyonuna göre değer daha yüksek',
        `${t} Fark ${tl(Math.abs(share.difference))} (${pct(Math.abs(share.differenceRate))}). ` +
        `Gelir projeksiyonuyla aynı sonuca ulaşmak için arsa payının ${pct(share.balancedShare, 1)} olması gerekirdi.`);
    }
  }

  return out;
}
