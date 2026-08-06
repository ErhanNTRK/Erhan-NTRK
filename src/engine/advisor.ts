/**
 * UZMAN YORUM MOTORU (kural bazlı) — sunucusuz, çevrimdışı, deterministik.
 */
import type {
  Advice, CapacityResult, FinancialResult, ShareResult,
  Parcel, EmsalOptions, CostInput, SiteWorks, ResidualInput,
} from './types';

const pct = (v: number, d = 0) => `%${(v * 100).toFixed(d).replace('.', ',')}`;
const m2 = (v: number) => `${Math.round(v).toLocaleString('tr-TR')} m²`;
const tl = (v: number) => `${Math.round(v).toLocaleString('tr-TR')} ₺`;

export function buildAdvice(
  parcel: Parcel, emsal: EmsalOptions,
  cost: CostInput, site: SiteWorks, residual: ResidualInput,
  capacity: CapacityResult, financial: FinancialResult, share: ShareResult,
  shareEnabled: boolean,
): Advice[] {
  const out: Advice[] = [];
  const add = (level: Advice['level'], title: string, body: string) => out.push({ level, title, body });

  capacity.warnings.forEach((w) => add('uyari', 'Kapasite uyarısı', w));

  /* ── Alan üretiminin özeti ── */
  if (capacity.totalArea > 0) {
    const parcalar: string[] = [`${m2(capacity.emsalArea)} emsale dahil`];
    if (capacity.extraArea > 0) parcalar.push(`${m2(capacity.extraArea)} emsal dışı satılabilir`);
    if (emsal.hasAttic && !emsal.atticInEmsal) parcalar.push(`${m2(capacity.atticArea)} çatı katı`);
    if (emsal.hasBasement && !emsal.basementInEmsal) parcalar.push(`${m2(capacity.basementArea)} bodrum`);
    add('bilgi', 'Toplam inşaat alanı nasıl oluştu',
      `${parcalar.join(' + ')} = ${m2(capacity.totalArea)}. ` +
      (capacity.emsalConsumedByExtras > 0
        ? `Emsale dahil edilen ${m2(capacity.emsalConsumedByExtras)} (çatı/bodrum) toplamı artırmaz; emsalin içinden yer alır ve zemin üstü katlara ${m2(capacity.aboveGroundArea)} kalır.`
        : 'Emsale dahil alanın tamamı zemin üstü katlara ayrılmıştır.'));
  }

  /* ── Emsal dışı kalemlerin değeri ── */
  const emsalDisi = capacity.totalArea - capacity.emsalArea;
  if (emsalDisi > 0 && capacity.emsalArea > 0) {
    add('olumlu', 'Emsal dışı alan kazancı',
      `Toplam inşaat alanının ${m2(emsalDisi)} kadarı (${pct(emsalDisi / capacity.emsalArea)} ek) emsal hakkını tüketmiyor. ` +
      'Bu alanlar emsali harcamadan hasılat ürettiği için arsa değerine doğrudan katkı verir. ' +
      'Plan notunun bu kalemleri gerçekten emsal dışı saydığını teyit ediniz; denetimde en sık tartışılan konu budur.');
  }
  if (emsal.hasBasement && emsal.basementInEmsal) {
    add('dikkat', 'Bodrum emsale dahil — kapasite kaybı',
      `Bodrum (${m2(capacity.basementArea)}) emsalin içinden yer aldığı için zemin üstü katlara ${m2(capacity.aboveGroundArea)} kalıyor. ` +
      'Plan notunuz izin veriyorsa (tamamen toprak altında kalan, iskân edilmeyen bodrumlar için çoğu planda mümkündür) ' +
      `bodrumu emsal dışına almak toplam inşaat alanını ${m2(capacity.basementArea)} artırır.`);
  }
  if (emsal.hasAttic && emsal.atticInEmsal) {
    add('dikkat', 'Çatı katı emsale dahil',
      `Çatı katı (${m2(capacity.atticArea)}) emsalden düşülüyor. Plan notunda "son kat ile irtibatlı, bağımsız bölüm oluşturmayan çatı arası piyesi" ` +
      'ifadesi varsa çoğu belediyede emsal dışı kabul edilir; bu ayrım doğrudan aynı miktarda ek satılabilir alan demektir.');
  }

  /* ── Yerleşim kontrolü ── */
  if (capacity.footprintArea > 0 && capacity.aboveGroundArea > 0) {
    if (!capacity.floorFits) {
      add('uyari', 'Kat adedi yetersiz',
        `Zemin üstü ${m2(capacity.aboveGroundArea)} alanın ${capacity.floorsAboveGround} kata bölünmesi kat başına ${m2(capacity.areaPerFloor)} gerektiriyor; ` +
        `taban oturumu ${m2(capacity.footprintArea)}. En az ${capacity.minFloorsNeeded} kat gerekir.`);
    } else if (capacity.areaPerFloor < capacity.footprintArea * 0.6 && capacity.floorsAboveGround > 1) {
      add('bilgi', 'Taban oturumu tam kullanılmıyor',
        `Kat başına ${m2(capacity.areaPerFloor)} alan düşüyor; taban oturumu hakkı ${m2(capacity.footprintArea)}. ` +
        'Kat adedini azaltıp daha geniş tabanlı bir yerleşim de mümkündür — villa ürününde genellikle az katlı ve geniş tabanlı çözüm tercih edilir.');
    }
  }

  /* ── Villa dağılımı ── */
  if (capacity.unitCount > 0) {
    const arsaPayi = parcel.area / capacity.unitCount;
    add('bilgi', 'Villa dağılımı',
      `${capacity.unitCount} villa öngörüldüğünde villa başına ${m2(capacity.areaPerUnit)} toplam inşaat alanı ve ${m2(arsaPayi)} arsa payı düşüyor.`);
    if (arsaPayi < 250) {
      add('dikkat', 'Villa başına arsa payı düşük',
        `Villa başına ${m2(arsaPayi)} arsa düşüyor. Müstakil villa alıcısının beklentisi genellikle 300 m² üzeridir; ` +
        'bu yoğunlukta ürün "bahçe dubleksi" algısı yaratır ve hedeflenen m² fiyatına ulaşmak zorlaşır.');
    }
  } else {
    add('bilgi', 'Villa adedi girilmedi',
      'Analiz toplam alanlar üzerinden yapıldı. Villa adedi girerseniz villa başına alan ve arsa payı da hesaplanır.');
  }

  /* ── Alan kompozisyonu (yalnızca uygulama içi — rapora yazılmaz) ── */
  if (capacity.extraFloorsShare > 0.35) {
    add('uyari-uygulama', 'Alan kompozisyonuna dikkat',
      `Toplam inşaat alanının ${pct(capacity.extraFloorsShare)}'i bodrum ve çatı katıdır ` +
      `(${m2(capacity.basementArea + capacity.atticArea)} / ${m2(capacity.totalArea)}). ` +
      'Bu katlar zemin üstü normal katlarla aynı m² değerinde satılmaz; birim satış fiyatını belirlerken bu kompozisyonu dikkate alınız.');
  }

  /* ── Bahçe ── */
  if (capacity.gardenArea > 0) {
    add(financial.gardenRevenue > 0 ? 'olumlu' : 'bilgi', 'Bahçe ve peyzaj',
      `Bahçe alanı net parselden taban oturumu düşülerek ${m2(capacity.gardenArea)} bulundu; peyzaj maliyeti ${tl(financial.landscapeCost)}. ` +
      (financial.gardenRevenue > 0
        ? `Bahçe ayrıca fiyatlandığı için hasılata ${tl(financial.gardenRevenue)} katkı veriyor.`
        : 'Bahçe ayrıca fiyatlanmadı; değeri m² satış fiyatının içinde kabul edildi.'));
  }

  /* ── Maliyet ── */
  if (cost.inflationRate === 0) {
    add('dikkat', 'Birim maliyet güncellenmemiş',
      `Bakanlık tebliğ değeri (${tl(cost.unitCost)}/m²) doğrudan kullanılıyor. Tebliğ rakamları resmî işlemler içindir; ` +
      'piyasa maliyetleri genellikle üzerindedir. Gerçekçi fizibilite için güncelleme oranı girilmesi önerilir.');
  }
  if (capacity.saleableArea > 0 && financial.revenue > 0) {
    const oran = financial.costPerSaleableM2 / (financial.revenue / capacity.saleableArea);
    if (oran > 0.6) {
      add('uyari', 'Maliyet / satış dengesi zayıf',
        `m² başına toplam maliyet ${tl(financial.costPerSaleableM2)}; satış fiyatının ${pct(oran)}'i. ` +
        'Bu oran %60\'ı aştığında arsaya anlamlı değer kalması güçleşir.');
    }
  }

  /* ── Artık değer ── */
  if (financial.residualLandValue <= 0) {
    add('uyari', 'Arsa değeri negatif',
      'Mevcut varsayımlarla proje arsa bedelini karşılamıyor. Satış fiyatı, yapı sınıfı, kâr oranı veya finansman varsayımlarından ' +
      'en az biri gözden geçirilmelidir. Bu sonuç arsanın değersiz olduğu değil, bu proje kurgusunun fizibl olmadığı anlamına gelir.');
  } else {
    if (financial.landToRevenue < 0.15) {
      add('dikkat', 'Arsa payı düşük',
        `Arsa değeri hasılatın ${pct(financial.landToRevenue, 1)}'ine denk. Konut projelerinde tipik bant %20-35'tir.`);
    } else if (financial.landToRevenue > 0.40) {
      add('dikkat', 'Arsa payı yüksek',
        `Arsa değeri hasılatın ${pct(financial.landToRevenue, 1)}'ine denk. İyimser satış fiyatı varsayımı olabilir; emsal araştırmasıyla doğrulayınız.`);
    } else {
      add('olumlu', 'Arsa payı makul bantta',
        `Arsa değeri hasılatın ${pct(financial.landToRevenue, 1)}'ine denk — sektörde kabul gören %20-35 bandında.`);
    }
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

  /* ── Kat karşılığı: iki yöntemin karşılaştırması (yargılayıcı değil, bilgilendirici) ── */
  if (shareEnabled && financial.revenue > 0) {
    const t = `Kat karşılığı yöntemine göre arsa değeri ${tl(share.shareLandValue)}, gelir projeksiyonuna göre ${tl(financial.residualLandValue)}.`;
    if (share.verdict === 'yakin') {
      add('olumlu', 'İki yöntem birbirini doğruluyor',
        `${t} Aradaki fark %5'in altında; girilen kat karşılığı oranı proje ekonomisiyle uyumlu.`);
    } else if (share.verdict === 'kat-karsiligi-yuksek') {
      add('bilgi', 'Kat karşılığı değeri daha yüksek',
        `${t} Fark ${tl(Math.abs(share.difference))} (${pct(Math.abs(share.differenceRate))}). ` +
        `Gelir projeksiyonuyla aynı sonuca ulaşmak için arsa payının ${pct(share.balancedShare, 1)} olması gerekirdi. ` +
        'Bu, arsa sahibi açısından daha avantajlı bir sözleşme demektir; müteahhidin kâr beklentisini karşılayıp karşılamadığı kontrol edilmelidir.');
    } else {
      add('bilgi', 'Gelir projeksiyonuna göre değer daha yüksek',
        `${t} Fark ${tl(Math.abs(share.difference))} (${pct(Math.abs(share.differenceRate))}). ` +
        `Gelir projeksiyonuyla aynı sonuca ulaşmak için arsa payının ${pct(share.balancedShare, 1)} olması gerekirdi.`);
    }
  }

  if (site.landscapeUnitCost === 0 && capacity.gardenArea > 200) {
    add('dikkat', 'Peyzaj maliyeti sıfır girilmiş',
      `${m2(capacity.gardenArea)} açık alan var ancak peyzaj birim maliyeti girilmemiş. Villa projelerinde çevre düzenlemesi ` +
      'satılabilirliği doğrudan etkiler ve göz ardı edilirse maliyet olduğundan düşük çıkar.');
  }

  return out;
}
