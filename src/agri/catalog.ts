/**
 * TARIMSAL ÜRÜN KATALOĞU — yönlendirici öneriler (2025-26 denetimli).
 * Her değer yalnız ÖNERİDİR; kullanıcı tüm kutuları serbestçe ezer.
 * Kaynak etiketi arayüzde gösterilir; yıllık güncelleme bu dosyada yapılır.
 */
export interface CropRef {
  name: string;
  /** kg/dönüm (ekili) veya kg/ağaç (dikili) */
  yieldPerUnit: number;
  /** TL/kg (KDV'siz üretici fiyatı önerisi) */
  price: number;
  /** gider oranı % */
  expensePct: number;
  /** yatırımın geri dönüş süresi (yıl) — çok yıllık ürünlerde "amorti", tek yıllıklarda sezonluk üretim döngüsü */
  years: number;
  /** yalnız çok yıllık (bağ/ağaç) ürünlerde: bitkinin toplam üretken ömrü — "years" (amorti) ile KARIŞTIRILMAMALI */
  economicLifeYears?: number;
  source: string;
  note?: string;
  /** Bu ürünün yaygın yan ürünü varsa adı — Yan Ürün açılınca önerilen katalog eşleşmesi bulmak için */
  byproductHint?: string;
}

export interface ByproductRef {
  name: string;
  /** kg/dönüm — ANA ürünle aynı alan (units) üzerinden hesaplanır */
  yieldPerUnit: number;
  price: number;
  expensePct: number;
  source: string;
  note?: string;
}

/** Yan ürün kataloğu — online denetimli (2025-26). Ana üründen bağımsız, "Diğer" ile serbest de yazılabilir. */
export const BYPRODUCTS: ByproductRef[] = [
  { name: 'Saman (Buğday)', yieldPerUnit: 180, price: 7.2, expensePct: 15, source: 'Samsun Ticaret Borsası 2025', note: 'Dönüme ort. 4-8 balya × 20-25 kg' },
  { name: 'Saman (Arpa)', yieldPerUnit: 190, price: 7.5, expensePct: 15, source: 'sektör ort. 2025', note: 'Buğday samanından hafif proteinli' },
  { name: 'Mısır Sapı / Koçanı', yieldPerUnit: 250, price: 3, expensePct: 20, source: 'silaj değeri — bölgesel', note: 'Fiyatlandırma bölgeye göre büyük farklılık gösterir, temkinli kullanın' },
  { name: 'Ayçiçeği Küspesi (işlenmiş ürün)', yieldPerUnit: 60, price: 9, expensePct: 20, source: 'sektör ort. 2025', note: 'Tarlada oluşmaz — yağ fabrikasında işleme sonucu elde edilir; üreticinin işleme payı/geliri olarak kullanılmalı' },
  { name: 'Pamuk Çiğit Küspesi (işlenmiş ürün)', yieldPerUnit: 45, price: 14.5, expensePct: 20, source: 'Tariş 2025 (ton 14.500 TL)', note: 'Tarlada oluşmaz — çırçır/yağ fabrikasında işleme sonucu elde edilir' },
];

export const FIELD_CROPS: CropRef[] = [
  { name: 'Buğday', yieldPerUnit: 350, price: 16.5, expensePct: 35, years: 1, source: 'TMO 2026 resmi alım fiyatı (doğrulanmış)', note: 'Destek ödemeleriyle üreticinin eline ~19,5 TL/kg geçer. "years" burada sezonluk üretim döngüsüdür, yatırım amortisi değildir.', byproductHint: 'Saman (Buğday)' },
  { name: 'Arpa', yieldPerUnit: 350, price: 12.75, expensePct: 35, years: 1, source: 'TMO 2026 resmi alım fiyatı (doğrulanmış)', note: 'Destek ödemeleriyle üreticinin eline ~15,8 TL/kg geçer.', byproductHint: 'Saman (Arpa)' },
  { name: 'Mısır', yieldPerUnit: 1050, price: 10, expensePct: 40, years: 1, source: 'sektör ort. 2025-26 (sulu tarım 1300-1600 kg görülebilir)', byproductHint: 'Mısır Sapı / Koçanı' },
  { name: 'Ayçiçeği', yieldPerUnit: 250, price: 25, expensePct: 41, years: 1, source: 'sektör ort. 2025-26', byproductHint: 'Ayçiçeği Küspesi (işlenmiş ürün)' },
  { name: 'Pamuk', yieldPerUnit: 300, price: 37, expensePct: 50, years: 1, source: 'sektör ort. 2025-26', note: 'İşçilik payı yüksektir', byproductHint: 'Pamuk Çiğit Küspesi (işlenmiş ürün)' },
  { name: 'Sofralık Üzüm Bağı', yieldPerUnit: 2000, price: 50, expensePct: 45, years: 8, economicLifeYears: 30, source: 'genel referans 2025-26', note: '"years" yatırımın geri dönüş süresidir (6-10 yıl); ekonomik ömür ayrıca 30 yıl olarak işaretlenmiştir. Fiyat kaynağa göre değişir: 40-60 TL bandı önerilir, bazı bölgelerde 4-74 TL arası uç değerler de görülüyor.' },
  { name: 'Şaraplık Üzüm Bağı', yieldPerUnit: 1500, price: 32, expensePct: 45, years: 8, economicLifeYears: 30, source: 'genel referans 2025-26', note: '"years" yatırımın geri dönüş süresidir; ekonomik ömür 30 yıl. Güncel, tek bir doğrulanmış TL/kg alım fiyatı bulunamadı, bölgeye göre 25-40 TL bandı önerilir.' },
  { name: 'Kurutmalık Üzüm Bağı', yieldPerUnit: 1800, price: 45, expensePct: 45, years: 8, economicLifeYears: 30, source: 'genel referans 2025-26', note: 'DİKKAT: buradaki verim ve fiyat KURUTULMUŞ (kuru) ürün baz alınarak eşleştirilmiştir — yaş üzüm verimini doğrudan girip bu fiyatla çarpmayın (yaklaşık 4 kg yaş üzüm = 1 kg kuru). TMO destekli kuru üzüm fiyatı 12-14 TL/kg iken serbest piyasa 70-100 TL/kg; elle kontrol edin.' },
  { name: 'Sultaniye (Kurutmalık)', yieldPerUnit: 1300, price: 40, expensePct: 52, years: 8, economicLifeYears: 30, source: 'kullanıcı verisi, bölgesel', note: 'Ege bölgesi (Manisa/Alaşehir) — kuru üzüm baz alınarak girilmiştir' },
  { name: 'Papazkarası (Şaraplık)', yieldPerUnit: 850, price: 48, expensePct: 55, years: 8, economicLifeYears: 30, source: 'kullanıcı verisi, bölgesel', note: 'Trakya (Tekirdağ) çeşidi' },
  { name: 'Öküzgözü (Şaraplık)', yieldPerUnit: 800, price: 52, expensePct: 58, years: 8, economicLifeYears: 30, source: 'kullanıcı verisi, bölgesel', note: 'Elazığ çeşidi' },
  { name: 'Boğazkere (Şaraplık)', yieldPerUnit: 750, price: 55, expensePct: 60, years: 8, economicLifeYears: 30, source: 'kullanıcı verisi, bölgesel', note: 'Diyarbakır çeşidi, prestijli/yüksek maliyetli' },
  { name: 'Emir (Şaraplık)', yieldPerUnit: 900, price: 44, expensePct: 50, years: 8, economicLifeYears: 30, source: 'kullanıcı verisi, bölgesel', note: 'Nevşehir/Kapadokya çeşidi' },
  { name: 'Domates', yieldPerUnit: 4000, price: 7.5, expensePct: 50, years: 1, source: 'hal ort. 2025-26 (açık tarla; sera için verim daha yüksek olabilir)' },
  { name: 'Biber', yieldPerUnit: 2000, price: 11, expensePct: 57, years: 1, source: 'hal ort. 2025-26' },
  { name: 'Patates', yieldPerUnit: 2500, price: 10, expensePct: 55, years: 1, source: 'hal ort. 2025-26', note: 'Tohum maliyeti yüksektir' },
  { name: 'Soğan', yieldPerUnit: 3000, price: 8, expensePct: 50, years: 1, source: 'hal ort. 2025-26' },
  { name: 'Salatalık', yieldPerUnit: 2500, price: 5, expensePct: 45, years: 1, source: 'hal ort. 2025-26 (açık tarla; sera için verim daha yüksek olabilir)' },
];

export const TREE_CROPS: CropRef[] = [
  { name: 'Kiraz', yieldPerUnit: 38, price: 57, expensePct: 40, years: 5, economicLifeYears: 20, source: 'sektör 2025-26', note: 'Fiyat bölgeye göre 45-70 TL bandında şiddetle değişir' },
  { name: 'Kayısı', yieldPerUnit: 50, price: 37, expensePct: 40, years: 4, economicLifeYears: 20, source: 'sektör ort. 2025-26' },
  { name: 'Şeftali', yieldPerUnit: 55, price: 32, expensePct: 42, years: 4, economicLifeYears: 18, source: 'sektör ort. 2025-26', note: 'Tam verime ulaşmış bahçelerde 60 kg üzerine çıkabilir' },
  { name: 'Erik', yieldPerUnit: 50, price: 32, expensePct: 42, years: 4, economicLifeYears: 18, source: 'sektör ort. 2025-26' },
  { name: 'Elma', yieldPerUnit: 60, price: 23, expensePct: 47, years: 5, economicLifeYears: 20, source: 'sektör ort. 2025-26', note: 'Modern bodur bahçelerde daha yüksek verim mümkündür' },
  { name: 'Armut', yieldPerUnit: 60, price: 27, expensePct: 45, years: 5, economicLifeYears: 20, source: 'sektör ort. 2025-26' },
  { name: 'Nar', yieldPerUnit: 42, price: 28, expensePct: 40, years: 5, economicLifeYears: 20, source: 'sektör ort. 2025-26' },
  { name: 'İncir', yieldPerUnit: 35, price: 35, expensePct: 37, years: 5, economicLifeYears: 25, source: 'sektör ort. 2025-26' },
  { name: 'Ceviz', yieldPerUnit: 32, price: 120, expensePct: 37, years: 7, economicLifeYears: 50, source: 'sektör 2025-26 (yetişkin aşılı 30-40 kg)', note: 'Yaşa göre 3-100 kg bandı; ekonomik ömür 50 yılın üzerindedir' },
  { name: 'Badem', yieldPerUnit: 12, price: 120, expensePct: 35, years: 6, economicLifeYears: 25, source: 'sektör ort. 2025-26', note: 'İyi yetiştirilen bahçelerde 20 kg üzerine çıkabilir' },
  { name: 'Zeytin', yieldPerUnit: 32, price: 67, expensePct: 42, years: 6, economicLifeYears: 60, source: 'Marmarabirlik 2024-25 yağlık + sektör ort.', note: 'Verimli yetişkin ağaçlarda 50 kg üzeri görülebilir; sofralık çeşitlerde fiyat daha yüksek olabilir' },
];
