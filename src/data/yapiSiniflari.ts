/**
 * 2026 YILI YAPI YAKLAŞIK BİRİM MALİYETLERİ
 *
 * Kaynak: Çevre, Şehircilik ve İklim Değişikliği Bakanlığı
 *         "Mimarlık ve Mühendislik Hizmet Bedellerinin Hesabında Kullanılacak
 *          2026 Yılı Yapı Yaklaşık Birim Maliyetleri Hakkında Tebliğ"
 *         Resmî Gazete: 3 Şubat 2026 · Sayı 33157 · Yürürlük: 1/1/2026
 *
 * Tutarlar KDV HARİÇTİR; %15 genel gider ve %10 yüklenici kârı dahildir.
 * Arsa bedeli, altyapı ve çevre düzenleme giderleri DAHİL DEĞİLDİR.
 *
 * ── YENİ YIL GÜNCELLEMESİ ──
 * Her yıl Şubat ayında yeni tebliğ yayımlanır. Güncellemek için aşağıdaki
 * `unitCost` değerlerini değiştirmek yeterlidir; başka hiçbir dosyaya
 * dokunmanız gerekmez.
 */

export interface BuildingClass {
  code: string;
  label: string;
  unitCost: number;
  /** Tebliğdeki örnek yapı türlerinden bazıları */
  examples: string;
}

export const TEBLIG_KAYNAK = 'RG 3.2.2026 · Sayı 33157 · 2026 Yılı Yapı Yaklaşık Birim Maliyetleri';

export const YAPI_SINIFLARI: BuildingClass[] = [
  { code: 'I-A', label: 'I. Sınıf (A)', unitCost: 2600, examples: 'Basit kümes ve depolar, çardaklar' },
  { code: 'I-B', label: 'I. Sınıf (B)', unitCost: 3900, examples: 'Küçükbaş hayvan ağılları, kalıcı yardımcı yapılar' },
  { code: 'I-C', label: 'I. Sınıf (C)', unitCost: 4200, examples: 'Büyükbaş hayvan ahırları' },
  { code: 'I-D', label: 'I. Sınıf (D)', unitCost: 4800, examples: 'Basit sanayi ve tarım yapıları' },
  { code: 'II-A', label: 'II. Sınıf (A)', unitCost: 8100, examples: 'Basit atölye ve depolama yapıları' },
  { code: 'II-B', label: 'II. Sınıf (B)', unitCost: 12500, examples: 'Halı sahalar, basit spor yapıları' },
  { code: 'II-C', label: 'II. Sınıf (C)', unitCost: 15100, examples: 'Mezbahalar, sanayi tesisleri' },
  { code: 'III-A', label: 'III. Sınıf (A)', unitCost: 19800, examples: 'Garajlar, kreşler, köy konakları, aquaparklar' },
  { code: 'III-B', label: 'III. Sınıf (B)', unitCost: 21050, examples: 'Apart oteller, ilkokul/ortaokul yapıları (üç kata kadar)' },
  {
    code: 'III-C', label: 'III. Sınıf (C)', unitCost: 23400,
    examples: 'Konutlar (bağımsız bölüm brüt alanı 200-500 m²), iş amaçlı yapılar (yapı yüksekliği 21,50 m’ye kadar), kaplıcalar',
  },
  { code: 'IV-A', label: 'IV. Sınıf (A)', unitCost: 26450, examples: 'Fakülteler, yüksekokullar, 1-2 yıldızlı oteller, iş yapıları (21,50–30,50 m)' },
  { code: 'IV-B', label: 'IV. Sınıf (B)', unitCost: 33900, examples: 'Düğün salonları, büyük postaneler, iş yapıları (30,50–51,50 m)' },
  { code: 'IV-C', label: 'IV. Sınıf (C)', unitCost: 40500, examples: 'Adalet sarayları, 3 yıldızlı oteller' },
  { code: 'V-A', label: 'V. Sınıf (A)', unitCost: 42350, examples: 'Karma kullanımlı yapılar (AVM içeren kompleksler)' },
  { code: 'V-B', label: 'V. Sınıf (B)', unitCost: 43850, examples: 'Hastaneler (200-400 yatak), 4 yıldızlı oteller' },
  { code: 'V-C', label: 'V. Sınıf (C)', unitCost: 48750, examples: 'Müze yapıları' },
  { code: 'V-D', label: 'V. Sınıf (D)', unitCost: 53500, examples: '5 yıldızlı oteller' },
  { code: 'V-E', label: 'V. Sınıf (E)', unitCost: 103500, examples: 'İleri teknoloji tesisleri, enerji santralleri' },
];

/** Villa / müstakil konut için tebliğdeki tipik karşılık */
export const VILLA_DEFAULT_CLASS = 'III-C';

export const ILLER = [
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin',
  'Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa',
  'Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan','Erzurum',
  'Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta','İstanbul','İzmir',
  'Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kırıkkale','Kırklareli','Kırşehir',
  'Kilis','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir',
  'Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Şanlıurfa','Şırnak',
  'Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak',
];

/** Plan lejantları — imar durumu belgelerinde en sık karşılaşılan fonksiyonlar */
export const LEJANTLAR = [
  'Konut Alanı',
  'Az Yoğunluklu Konut Alanı',
  'Orta Yoğunluklu Konut Alanı',
  'Yüksek Yoğunluklu Konut Alanı',
  'Gelişme Konut Alanı',
  'Ticaret Alanı',
  'Merkezi İş Alanı (MİA)',
  'Ticaret + Konut Alanı (TİCK)',
  'Konut + Ticaret Alanı',
  'Günübirlik Tesis Alanı',
  'Turizm Tesis Alanı',
  'Sanayi ve Depolama Alanı',
  'Akaryakıt ve Servis İstasyonu Alanı',
  'Diğer (elle yazınız)',
];
