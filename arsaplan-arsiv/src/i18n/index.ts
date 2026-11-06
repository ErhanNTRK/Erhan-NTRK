/**
 * ArsaPlan i18n — TR (varsayılan) / EN.
 *
 * Yaklaşım: Türkçe metnin kendisi anahtardır. t() bir metni sözlükte arar;
 * bulamazsa parametrik KALIP kurallarını dener; o da tutmazsa metni AYNEN
 * döndürür. Böylece kullanıcı girdileri (mahalle adı, plan notu, yapı adı
 * elle değiştirildiyse) asla bozulmaz.
 *
 * Ekran çevirisi: React ağacı yeniden yazılmaz; render sonrası metin
 * düğümleri translateDom ile çevrilir (girdi değerlerine dokunulmaz).
 * Çıktı çevirisi: pdf/excel üreticileri metinleri basarken t()'den geçirir.
 *
 * Uzman değerlendirme GÖVDELERİ bilinçli olarak Türkçe kalır: iç belgedir,
 * rapor PDF'ine girmez; başlıklar çevrilir, EN modda karta not düşülür.
 */

export type Lang = 'tr' | 'en';

const LS_KEY = 'arsaplan-lang';
let lang: Lang = 'tr';
try {
  const saved = localStorage.getItem(LS_KEY);
  if (saved === 'en') lang = 'en';
} catch { /* SSR/test */ }

export const getLang = (): Lang => lang;
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem(LS_KEY, l); } catch { /* boş */ }
}

/** Sayı/tarih yerelleştirme kodu */
export const LOC = () => (lang === 'en' ? 'en-US' : 'tr-TR');

/* ═══════════ SÖZLÜK ═══════════ */
const D: Record<string, string> = {
  /* — Tarım / Akaryakıt / Otel / Üst Hakkı — kart başlıkları (2026-08-03) — */
  'Akaryakıt Satışları': 'Fuel Sales', 'Ağaç Aralığından Adet Önerisi': 'Tree Count Suggestion from Spacing',
  'Değerlendirme Özeti': 'Valuation Summary', 'Dönemsel Tablo': 'Period Table',
  'Gelir Kırılımı': 'Income Breakdown', 'Gelirler Tablosu': 'Income Table', 'Kimlik': 'Identity',
  'Maliyet Yaklaşımı': 'Cost Approach', 'Maliyet Yaklaşımı (opsiyonel — ikinci değer)': 'Cost Approach (optional — secondary value)',
  'Maliyet Yaklaşımı — opsiyonel': 'Cost Approach — optional', 'Ne Tür Bir Arazi?': 'What Type of Land?',
  'Oda Gelirleri': 'Room Revenue', 'Oda Tipleri': 'Room Types', 'Otomatik Performans Göstergeleri': 'Automatic Performance Indicators',
  'Para Birimi': 'Currency', 'Projeksiyon Parametreleri': 'Projection Parameters', 'Rapor': 'Report',
  'Sabit Giderler': 'Fixed Expenses', 'Sonuç': 'Result', 'Sonuç — Değerleme': 'Result — Valuation',
  'Taşınmaz Kimliği': 'Property Identity', 'Tesis Bilgileri': 'Facility Information',
  'Ticari Alan Kira Gelirleri': 'Commercial Lease Income',
  'Yardımcı İşletme Gelirleri': 'Ancillary Operating Income',
  'Yıllık Projeksiyon Tablosu': 'Annual Projection Table', 'Ürün Satırları': 'Product Rows',
  'Üst Hakkı Süresi': 'Right of Superficies Term', 'İNA (İndirgenmiş Nakit Akımı) — opsiyonel': 'DCF (Discounted Cash Flow) — optional',
  'İlave Gelir Getiriciler': 'Additional Income Generators', 'İskonto ve Dönem Sonu': 'Discount Rate & Terminal',
  'İşletme Gideri': 'Operating Expense', 'İşletme Giderleri': 'Operating Expenses',
  'Toplam Değer Esaslı Üst Hakkı Tespiti': 'Right of Superficies from Total Value',
  'Arsa Değeri Esaslı Üst Hakkı Tespiti': 'Right of Superficies from Land Value Only',
  'Toplam Gelir Üzerinden Üst Hakkı Hesabı': 'Right of Superficies from Total Income',
  'Tarımsal Ürün Gelir Hesabı': 'Agricultural Product Income Calculation',
  'Akaryakıt Gelir Hesabı': 'Fuel Station Income Calculation', 'Otel Gelir Hesabı': 'Hotel Income Calculation',
  'Üst Hakkı Değerleme': 'Right of Superficies Valuation', 'Ekili Ürün': 'Field Crop', 'Dikili Ürün': 'Orchard Crop',
  'Karma': 'Mixed', 'PDF İndir': 'Download PDF', 'Excel İndir': 'Download Excel',
  'Sayfayı Sıfırla': 'Reset Page', 'Ana Sayfaya Dön': 'Back to Home',
  /* — Genel / düğmeler — */
  'Devam': 'Continue', 'Geri': 'Back', 'Sonucu Gör': 'View Result',
  'Yeni Analiz': 'New Analysis', 'Düzenle': 'Edit',
  '↺ Bu adımı sıfırla': '↺ Reset this step',
  '💾 Taslağı Kaydet': '💾 Save Draft', '📂 Taslak Yükle': '📂 Load Draft',
  '🎓 Örnek projeyle doldur': '🎓 Fill with sample project',
  'Sistemi ilk kez kullanıyorsanız dolu bir örnekle gezinin.': 'New to the system? Explore it with a pre-filled example.',
  'Raporu İndir': 'Download Report', 'Rapor PDF': 'Report PDF', 'Excel': 'Excel',
  'Özet JPEG': 'Summary JPEG', 'Uzman Notu PDF': 'Expert Note PDF',
  'Hazırlanıyor…': 'Preparing…',
  'Rapor PDF ve Özet JPEG, talep eden kişiyle paylaşılabilir; uzman değerlendirmesi içermez. Uzman Notu PDF yalnızca sistemi kullanan uzmana yöneliktir.':
    'The Report PDF and Summary JPEG can be shared with the requesting party; they contain no expert assessment. The Expert Note PDF is intended only for the appraiser using the system.',

  /* — Adım başlıkları — */
  'Değerleme Konusu': 'Subject of Valuation', 'Ne değerleniyor?': 'What is being valued?',
  'Proje Tipi ve Taşınmaz': 'Project Type & Property', 'Konut ürünü ve parsel bilgileri.': 'Residential product and parcel details.',
  'İmar ve Alan Üretimi': 'Zoning & Buildable Area', 'Yapılaşma hakları, emsal dışı alanlar, çatı ve bodrum.': 'Development rights, non-FAR areas, attic and basement.',
  'Maliyet ve Satış': 'Cost & Sales', 'Yapım maliyeti, peyzaj ve satış değeri.': 'Construction cost, landscaping and sales value.',
  'Değerleme': 'Valuation', 'Kâr, finansman ve kat karşılığı.': 'Profit, finance and land-share comparison.',
  'Taşınmaz': 'Property', 'Parsel bilgileri.': 'Parcel details.',
  'İmar ve Kat Kurgusu': 'Zoning & Floor Layout',
  'Yapılaşma hakları, bodrum, asma kat ve çatı arası piyesi.': 'Development rights, basements, mezzanine and attic loft.',
  'Yapım maliyeti ve kat tipine göre satış değerleri.': 'Construction cost and per-floor-type sales values.',
  'Ticari Yol ve Taşınmaz': 'Commercial Path & Property',
  'Ticari apartman / işletme seçimi ve parsel bilgileri.': 'Commercial building / facility selection and parcel details.',
  'Yapılar ve Maliyetler': 'Buildings & Costs',
  'Yapı satırları, güncelleme, yıpranma ve ilave maliyetler.': 'Building rows, indexation, depreciation and additional costs.',
  'Satış Değeri': 'Sales Value', 'Öngörülen toplam satış değeri.': 'Estimated total sales value.',
  'SONUÇ': 'RESULT',

  /* — Adım 1-2 — */
  'Ne Değerleniyor?': 'What Is Being Valued?',
  'Konut': 'Residential', 'Villa veya çok katlı bina': 'Villa or multi-storey building',
  'Ticari': 'Commercial', 'Ticari apartman veya ticari işletme': 'Commercial building or commercial facility',
  'Karma Kullanım': 'Mixed Use', 'Konut + ticaret lejantı · tek kurgu': 'Residential + commercial zoning · single layout',
  'Karma kullanımda proje tipi sorulmaz; doğrudan çok katlı bina kurgusuna geçilir. Zemin kat ticari kabul edilir, bodrumlarda kullanım (ortak / ticari / konut) seçilir ve asma kat eklenebilir.':
    'In mixed use, no project type is asked; the multi-storey layout is used directly. The ground floor is treated as commercial, basement use (common / commercial / residential) is selectable, and mezzanine floors can be added.',
  'Konut Proje Tipi': 'Residential Project Type',
  'Villa': 'Villa', 'Müstakil / ikiz / sıralı': 'Detached / semi-detached / terraced',
  'Çok Katlı Bina': 'Multi-Storey Building', 'Kat tablosu ile hesap': 'Calculated via floor table',
  'Site': 'Housing Complex', 'Parsel içinde çok bloklu': 'Multiple blocks on one parcel',
  'Site — yakında hizmette': 'Housing Complex — coming soon',
  'Ticari Yol': 'Commercial Path',
  'Ticari Apartman': 'Commercial Building', 'Kat tablosu ile hesap · karma kurguyla aynı': 'Floor-table based · identical to mixed-use layout',
  'Ticari İşletme': 'Commercial Facility', 'Yapı maliyetleri + satış değeri · sade hesap': 'Building costs + sales value · simplified calculation',
  'Ticari işletmede yapı satırları eklenir (fabrika, depo, ahır, otel…), maliyetler toplanır ve öngörülen satış değerinden düşülerek arsa değeri bulunur. Müteahhit kârı kesilmez.':
    'For a commercial facility, building rows are added (factory, warehouse, barn, hotel…), costs are totalled and deducted from the estimated sales value to obtain the land value. No developer profit is deducted.',
  'Taşınmaz Bilgileri': 'Property Details',
  'İl': 'Province', 'İlçe': 'District', 'Mahalle': 'Neighbourhood',
  'Ada': 'Block (Ada)', 'Parsel': 'Parcel', 'Parsel Alanı': 'Parcel Area',
  'Tapu alanı': 'Title deed area', 'Net Parsel Alanı': 'Net Parcel Area',
  'Terk sonrası imar hakkına esas alan · boşsa tapu alanı kullanılır': 'Area after road/green dedication · title area is used if left blank',

  /* — Adım 3 ortak — */
  'İmar Durumu': 'Zoning Status', 'Plan Lejantı': 'Zoning Designation',
  'Hesap Yöntemi': 'Calculation Method', 'TAKS / KAKS': 'Coverage / FAR (TAKS / KAKS)',
  'Doğrudan Alan': 'Direct Area', 'Alan Bilgisi Girilerek': 'By Entering Areas', 'TAKS': 'Coverage Ratio (TAKS)', 'KAKS': 'FAR (KAKS)',
  'Hmax': 'Hmax', 'Serbest': 'Unlimited',
  'Zorunlu: emsal değerini giriniz.': 'Required: enter the FAR value.',
  'Zorunlu: birim maliyet giriniz veya yapı sınıfı seçiniz.': 'Required: enter a unit cost or select a building class.',
  'Zorunlu: satış birim değeri giriniz.': 'Required: enter the unit sales value.',
  'Zorunlu: normal kat satış değerini giriniz.': 'Required: enter the typical-floor sales value.',
  'Zorunlu: yapı alanını giriniz.': 'Required: enter the building area.',
  'Zorunlu: öngörülen satış değerini giriniz.': 'Required: enter the estimated sales value.',
  'Plan Notları': 'Plan Notes', 'Emsale Dahil Alan': 'FAR-Included Area',
  'Taban Oturumu': 'Building Footprint',

  /* — Kat kurgusu — */
  'Bodrum Kat Sayısı': 'Number of Basement Floors',
  'Kullanım': 'Use', 'Konut (satılabilir)': 'Residential (saleable)',
  'Ticari (satılabilir)': 'Commercial (saleable)', 'Ortak mahal (otopark vb.)': 'Common area (parking etc.)',
  'Asma Kat var mı?': 'Mezzanine floor?', 'Var': 'Yes', 'Yok': 'No', 'Evet': 'Yes', 'Hayır': 'No',
  'Zeminin ticari uzantısı · genelde 1 adet olur': 'Commercial extension of the ground floor · usually 1',
  'Asma Kat Sayısı': 'Number of Mezzanines', 'Emsale dahil mi?': 'Included in FAR?',
  'Dahilse satılabilir alan hakkından düşülür; değilse üstüne eklenir.': 'If included, it is deducted from the saleable-area allowance; otherwise it is added on top.',
  'Çatı Arası Piyesi var mı?': 'Attic loft?',
  'Normal Kat Sayısı': 'Number of Typical Floors', 'Üst sınır yoktur': 'No upper limit',
  'Kat Tablosu': 'Floor Table', 'KAT BİLGİSİ': 'FLOOR', 'KAT ALANI': 'FLOOR AREA',
  'SATILABİLİR ALAN': 'SALEABLE AREA', 'TOPLAM': 'TOTAL', 'ortak mahal': 'common area', 'ortak alan': 'common area', 'ORTAK ALAN': 'COMMON AREA', 'Ortak Alan Payı': 'Common-Area Share',
  'Bahçe / Açık Alan': 'Garden / Open Area',
  'Taban Oturumu Limiti (parsel × TAKS)': 'Footprint Limit (parcel × coverage)',
  'İlave Satılabilir Alan (emsal dışı)': 'Additional Saleable Area (non-FAR)',

  /* — Maliyet & satış — */
  'Maliyet': 'Cost', 'Yapı Sınıfı': 'Building Class', 'Yapı Sınıfı (2026 Tebliği)': 'Building Class (2026 Communiqué)',
  'Birim Maliyet': 'Unit Cost', 'Elle değiştirebilirsiniz': 'Can be edited manually',
  'Güncel Birim Maliyet': 'Current Unit Cost', 'İnşaat Maliyeti': 'Construction Cost',
  'Peyzaj ve Bahçe Düzenlemesi': 'Landscaping & Garden Works',
  'Proje, Ruhsat, Harç, Müşavirlik': 'Design, Permits, Fees, Consultancy',
  'Finansman Gideri': 'Finance Cost', 'TOPLAM MALİYET': 'TOTAL COST',
  'Satış — Kat Tipine Göre Birim Değerler': 'Sales — Unit Values by Floor Type',
  'Satılabilir m² başına, KDV hariç. Normal katlar için tek ortalama değer girilir.': 'Per saleable m², VAT excluded. A single average value is entered for typical floors.',
  'Satış Birim Değeri': 'Unit Sales Value',
  'Bodrum Kat': 'Basement Floor', 'Bodrum Kat (ticari)': 'Basement Floor (commercial)',
  'Bodrum Kat (konut)': 'Basement Floor (residential)',
  'Zemin Kat': 'Ground Floor', 'Zemin Kat (ticari)': 'Ground Floor (commercial)',
  'Asma Kat': 'Mezzanine Floor', 'Asma Kat (ticari)': 'Mezzanine Floor (commercial)',
  'Normal Kat (ortalama)': 'Typical Floor (average)', 'Çatı Arası Piyesi': 'Attic Loft',
  'Müteahhit Kârı': 'Developer Profit', 'Finansman': 'Finance',

  /* — Sonuç ekranı — */
  'Arsa Değeri (Gelir Projeksiyonu)': 'Land Value (Income Projection)',
  'Arsa birim değeri:': 'Unit land value:', '(tapu alanı üzerinden)': '(based on title area)',
  'Kat Adedi': 'Floor Count', 'Toplam İnşaat Alanı': 'Total Construction Area',
  'Satılabilir Alan': 'Saleable Area', 'Villa Adedi': 'Number of Villas',
  'Toplam Maliyet': 'Total Cost', 'Öngörülen Satış Değeri': 'Estimated Sales Value',
  'Toplam Yapı Alanı': 'Total Building Area',
  'Fizibilite': 'Feasibility', 'FİZİBİLİTE': 'FEASIBILITY',
  'Yapılar': 'Buildings', 'YAPILAR': 'BUILDINGS', 'Yapı': 'Building', 'YAPI': 'BUILDING',
  'YAPI MALİYETLERİ': 'BUILDING COSTS', 'Yapı Maliyetleri': 'Building Costs',
  'İlave Maliyetler': 'Additional Costs', 'İLAVE MALİYETLER': 'ADDITIONAL COSTS',
  'İLAVE MALİYETLER TOPLAMI': 'TOTAL ADDITIONAL COSTS', 'İlave Maliyetler (tercihe bağlı)': 'Additional Costs (optional)',
  'Çevre Duvarı': 'Perimeter Wall', 'Peyzaj / Çevre Düzenleme': 'Landscaping', 'Altyapı': 'Infrastructure',
  'Peyzaj / Çevre Düz.': 'Landscaping', 'Diğer': 'Other',
  'ARSA DEĞERİ (GELİR PROJEKSİYONU)': 'LAND VALUE (INCOME PROJECTION)',
  'Arsa m² Birim Değeri': 'Unit Land Value per m²', 'ARSA m² BİRİM DEĞERİ': 'UNIT LAND VALUE / m²',
  'Arsa Değeri / Hasılat': 'Land Value / Revenue',
  'TOPLAM SATIŞ HASILATI': 'TOTAL SALES REVENUE', 'Yapı Satış Hasılatı': 'Building Sales Revenue',
  'Bahçe Satış Hasılatı': 'Garden Sales Revenue', 'Villa Satış Hasılatı': 'Villa Sales Revenue',
  'TOPLAM İNŞAAT ALANI': 'TOTAL CONSTRUCTION AREA',
  'Uyarılar': 'Warnings', 'Yöntem ve Kaynak': 'Method & Sources',
  'Uzman Değerlendirmesi': 'Expert Assessment',
  'ARSA DEĞERİ — YÖNTEM KARŞILAŞTIRMASI': 'LAND VALUE — METHOD COMPARISON',
  'Kat Karşılığı Yöntemine Göre Arsa Değeri': 'Land Value by Land-Share (Flat-for-Land) Method',
  'Gelir Projeksiyonuna Göre Arsa Değeri': 'Land Value by Income Projection',
  'İki Yöntem Arasındaki Fark': 'Difference Between the Two Methods',
  'Gelir Projeksiyonuna Denk Gelen Arsa Payı': 'Land Share Equivalent to Income Projection',
  'Değerlendirme': 'Assessment',
  'İki yöntem birbirine yakın': 'The two methods are close',
  'Kat karşılığı değeri daha yüksek': 'Land-share value is higher',
  'Gelir projeksiyonu değeri daha yüksek': 'Income-projection value is higher',
  'Döviz Karşılığı (opsiyonel)': 'Foreign-Currency Equivalent (optional)',
  'Kur girilirse raporlarda arsa değeri döviz cinsinden de yazılır. Kur, rapor tarihine sabitlenmiş beyandır; boş bırakılırsa hiçbir şey değişmez.':
    'If a rate is entered, the land value is also stated in that currency on the reports. The rate is a declaration fixed to the report date; leaving it blank changes nothing.',
  'Kur girilirse raporlarda arsa değeri döviz cinsinden de yazılır; boş bırakılırsa hiçbir şey değişmez.':
    'If a rate is entered, the land value is also stated in that currency on the reports; leaving it blank changes nothing.',
  '1 USD kaç ₺': '1 USD in ₺', '1 EUR kaç ₺': '1 EUR in ₺',

  /* — PDF / Excel çıktı — */
  'ARSA DEĞER ANALİZİ': 'LAND VALUE ANALYSIS',
  'Gelir Projeksiyonu Yöntemi · Proje Geliştirme Raporu': 'Income Projection Method · Project Development Report',
  'ANALİZDE KULLANILAN VARSAYIMLAR': 'ASSUMPTIONS USED IN THE ANALYSIS',
  'UZMAN DEĞERLENDİRMESİ': 'EXPERT ASSESSMENT',
  'UZMAN DEĞERLENDİRME NOTU': 'EXPERT ASSESSMENT NOTE',
  'PARSEL VE İMAR': 'PARCEL & ZONING', 'PARSEL': 'PARCEL',
  'ALAN ÜRETİMİ': 'AREA GENERATION', 'KAT TABLOSU': 'FLOOR TABLE',
  'PLAN NOTLARI': 'PLAN NOTES', 'DEĞERLEME': 'VALUATION',
  'Parsel Alanı (tapu)': 'Parcel Area (title)', 'Rapor Tarihi:': 'Report Date:',
  'Lejant girilmedi': 'No zoning designation entered',
  'Villa Projesi': 'Villa Project',
  'GİRDİLER': 'INPUTS', 'RAPOR': 'REPORT', 'UZMAN GÖRÜŞÜ': 'EXPERT OPINION',
  'GİRDİ ÖZETİ': 'INPUT SUMMARY', 'Proje Tipi': 'Project Type',
  'ALAN × BİRİM MALİYET': 'AREA × UNIT COST', 'ALAN × BİRİM': 'AREA × UNIT', 'MALİYET': 'COST',
  'Güncelleme Oranı (tüm satırlara ortak)': 'Indexation Rate (common to all rows)',
  'Güncelleme Oranı (tüm satırlar)': 'Indexation Rate (all rows)',
  'Güncelleme Oranı': 'Indexation Rate',
  'Tebliğ birim maliyetlerine uygulanır · tüm satırlara ortak': 'Applied to communiqué unit costs · common to all rows',
  'Yapı Ekle': 'Add Building', 'Yapı türü seçiniz…': 'Select building type…',
  'Katalogdan seçin; satır olarak eklenir. Aynı türden birden fazla eklenebilir.': 'Select from the catalogue; it is added as a row. Multiples of the same type are allowed.',
  'Satırı sil': 'Delete row', 'Alan': 'Area', 'Yıpranma': 'Depreciation', 'Mevcut yapıysa': 'For existing structures',
  'Elle sabitlendi': 'Fixed manually', 'Otomatik': 'Automatic',
  'Toplam yapı alanı': 'Total building area', 'Yapı maliyetleri': 'Building costs',
  'Maliyet Özeti': 'Cost Summary', 'İlave maliyetler': 'Additional costs', 'Yapı satırı': 'Building rows',
  'Serbest kalem ekle': 'Add free item', '+ Serbest kalem ekle': '+ Add free item', 'Son kalemi sil': 'Delete last item',
  'İlave maliyetler toplamı:': 'Total additional costs:',
  'Taşınmazın Toplam Satış Değeri': 'Total Sales Value of the Property',
  'Tek toplam tutar, KDV hariç': 'Single total amount, VAT excluded',
  'Bu senaryoda proje mülk sahibince yapılır; müteahhit kârı kesilmez ve kat karşılığı karşılaştırması uygulanmaz.':
    'In this scenario the project is built by the owner; no developer profit is deducted and no land-share comparison applies.',
  'Bu rapor ArsaPlan ile hazırlanmıştır': 'This report was prepared with ArsaPlan',
  'Geliştirici: Dora Gayrimenkul Değerleme A.Ş. · Erhan Öntürk': 'Developer: Dora Gayrimenkul Değerleme A.Ş. · Erhan Öntürk',
  'Yöntem: Gelir Projeksiyonu · Tutarlar KDV hariçtir': 'Method: Income Projection · Amounts exclude VAT',
  'Ticari İşletme · Müteahhit kârı kesilmez · Tutarlar KDV hariçtir': 'Commercial Facility · No developer profit deducted · Amounts exclude VAT',
  'Uzman Notu · Rapor ekine girmez': 'Expert Note · Not part of the report annex',
  'Müteahhit kârı kesilmemiştir (proje mülk sahibince yapılır)': 'No developer profit deducted (owner-built project)',
  'Emsale Dahil Alan (m²)': 'FAR-Included Area (m²)',
  'Zemin Üstü Katlara Kalan': 'Remaining for Above-Ground Floors',
  'Emsalden Kullanılan (çatı/bodrum)': 'Consumed from FAR (attic/basement)',
  'Emsal Dışı Satılabilir Alan': 'Non-FAR Saleable Area',
  'Villa Başına Toplam Alan': 'Total Area per Villa',
  'Satılabilir m² Başına Maliyet': 'Cost per Saleable m²',
  'Birim maliyet kaynağı': 'Unit cost source', 'yıpranma': 'depreciation',
  'PARSEL KROKİSİ': 'PARCEL SKETCH',
  'YAPI KESİTİ (TEMSİLİ)': 'BUILDING SECTION (SCHEMATIC)',
  'Temsili şematik kesittir; mimari proje yerine geçmez.': 'Schematic representation; not an architectural drawing.',
  'Çekme Mesafesi': 'Setback Distance', 'Çekme': 'Setback',
  'Çıkma — Ön': 'Projection — Front', 'Çıkma — Arka': 'Projection — Rear', 'Çıkma — Yan': 'Projection — Side',
  '0 = çıkma yok': '0 = no projection', 'Her iki yana uygulanır': 'Applied to both sides', 'ön': 'front', 'yan': 'side', 'arka': 'rear',
  'Ön Bahçe': 'Front Yard', 'Yan Bahçe': 'Side Yard', 'Arka Bahçe': 'Rear Yard',
  'Bahçe Mesafeleri (ön/yan/arka)': 'Yard Setbacks (front/side/rear)',
  'TAKS oturumu (temsili)': 'Coverage footprint (representative)',
  'Rapor Görselleri': 'Report Visuals',
  "PDF'te parsel krokisi ve yapı kesiti": 'Parcel sketch and building section in PDF',
  "PDF'te parsel krokisi": 'Parcel sketch in PDF',
  'ÖN': 'FRONT', 'Bu kenarı ön cephe yap': 'Make this edge the front façade',
  'Krokide ön cepheye tıklayın; kalan kenarlar otomatik sınıflanır.': 'Click the front façade on the sketch; remaining edges are classified automatically.',
  'Bu çekme mesafeleri bu parsel şekline uygulanamıyor (parsel tükeniyor veya geometri geçersiz).': 'These setbacks cannot be applied to this parcel shape (the parcel is consumed or the geometry is invalid).',
  'Parsel Krokisi — KML': 'Parcel Sketch — KML',
  'Karma Kullanım · Çekme Mesafesi Yöntemi': 'Mixed Use · Setback Method',
  'Çok Katlı Bina · Çekme Mesafesi Yöntemi': 'Multi-Storey Building · Setback Method',
  'Ticari Apartman · Çekme Mesafesi Yöntemi': 'Commercial Building · Setback Method', 'Parsel Krokisi': 'Parcel Sketch',
  'Parsel Krokisi — KML (opsiyonel)': 'Parcel Sketch — KML (optional)',
  'Parsel sınırı': 'Parcel boundary', 'Çekme sonrası oturum': 'Post-setback footprint',
  'Tapu alanına sapma': 'Deviation from title area',
  'Çekme Mesafesi (tüm kenarlar)': 'Setback Distance (all edges)',
  'Alan Karşılaştırması': 'Area Comparison',
  '📐 KML Dosyası Yükle': '📐 Load KML File', "✕ KML'yi kaldır": '✕ Remove KML',
  'Şimdilik tek tip; kenar bazlı (ön/yan/arka) ayrım sonraki turda.': 'Uniform for now; per-edge (front/side/rear) distinction comes in a later round.',
  'Bu çekme mesafesi bu parsel şekline uygulanamıyor (parsel tükeniyor veya geometri geçersiz).': 'This setback cannot be applied to this parcel shape (the parcel is consumed or the geometry is invalid).',
  "TKGM Parsel Sorgu'dan indirilen .kml dosyasını yükleyin: künye bilgileri doldurulur, parsel şekli çizilir ve tapu alanı poligonla karşılaştırılır. Dosya cihazınızda işlenir, hiçbir yere gönderilmez.":
    'Load the .kml file downloaded from the TKGM Parcel Query: identity fields are filled, the parcel shape is drawn and the title area is compared with the polygon. The file is processed on your device and sent nowhere.',
  'Gelir Projeksiyonu Yöntemi': 'Income Projection Method',
  'Yöntem: Gelir Projeksiyonu': 'Method: Income Projection',
  'Müteahhit kârı kesilmemiştir': 'No developer profit deducted',
  'Tutarlar KDV hariçtir': 'Amounts exclude VAT',
  'Karma Kullanım · TAKS/KAKS Yöntemi': 'Mixed Use · Coverage/FAR Method',
};

/* ═══════════ PARAMETRİK KALIPLAR ═══════════ */
type Rule = [RegExp, string | ((m: RegExpMatchArray) => string)];
const RULES: Rule[] = [
  [/^(\d+)\. Bodrum Kat \(ticari\)$/, (m) => `Basement ${m[1]} (commercial)`],
  [/^(\d+)\. Bodrum Kat \(konut\)$/, (m) => `Basement ${m[1]} (residential)`],
  [/^(\d+)\. Bodrum Kat$/, (m) => `Basement ${m[1]}`],
  [/^(\d+)\. Bodrum — Kullanım$/, (m) => `Basement ${m[1]} — Use`],
  [/^(\d+)\. Normal Kat$/, (m) => `Floor ${m[1]}`],
  [/^(\d+)\. Asma Kat \(ticari\)(.*)$/, (m) => `Mezzanine ${m[1]} (commercial)${m[2].replace(' · emsal dışı', ' · non-FAR')}`],
  [/^Asma Kat \(ticari\)(.*)$/, (m) => `Mezzanine Floor (commercial)${m[1].replace(' · emsal dışı', ' · non-FAR')}`],
  [/^Satılabilir (.+)$/, (m) => `Saleable ${m[1]}`],
  [/^Müteahhit Kârı \((.+)\)$/, (m) => `Developer Profit (${m[1]})`],
  [/^MÜTEAHHİT KÂRI \((.+)\)$/, (m) => `DEVELOPER PROFIT (${m[1]})`],
  [/^Arsa Değeri \((USD|EUR)\) · Kur: (.+)$/, (m) => `Land Value (${m[1]}) · Rate: ${m[2]}`],
  [/^Kur: (.+)$/, (m) => `Rate: ${m[1]}`],
  [/^Arsa Sahibi Payı \((.+)\)$/, (m) => `Owner Share (${m[1]})`],
  [/^Müteahhit Payı \((.+)\)$/, (m) => `Contractor Share (${m[1]})`],
  [/^Çatı Katı \((.+)\)$/, (m) => `Attic Floor (${m[1] === 'emsale dahil' ? 'FAR-included' : 'non-FAR'})`],
  [/^Bodrum Kat \((.+)\)$/, (m) => `Basement Floor (${m[1] === 'emsale dahil' ? 'FAR-included' : m[1] === 'ticari' ? 'commercial' : m[1] === 'konut' ? 'residential' : 'non-FAR'})`],
  [/^Zemin Kat \(ticari\) Satış Birim Değeri$/, () => 'Ground Floor (commercial) Unit Sales Value'],
  [/^Zemin Kat Satış Birim Değeri$/, () => 'Ground Floor Unit Sales Value'],
  [/^Asma Kat Satış Birim Değeri$/, () => 'Mezzanine Unit Sales Value'],
  [/^Normal Kat Satış Birim Değeri$/, () => 'Typical Floor Unit Sales Value'],
  [/^Piyes Satış Birim Değeri$/, () => 'Attic Loft Unit Sales Value'],
  [/^Bodrum \(ticari\) Satış Birim Değeri$/, () => 'Basement (commercial) Unit Sales Value'],
  [/^Bodrum \(konut\) Satış Birim Değeri$/, () => 'Basement (residential) Unit Sales Value'],
  [/^Bodrum Satış Birim Değeri$/, () => 'Basement Unit Sales Value'],
  [/^(.+) · TAKS\/KAKS Yöntemi$/, (m) => `${tr(m[1])} · Coverage/FAR Method`],
  [/^(.+) · Doğrudan Alan Yöntemi$/, (m) => `${tr(m[1])} · Direct Area Method`],
  [/^(.+) · TAKS\/KAKS$/, (m) => `${tr(m[1])} · Coverage/FAR`],
  [/^(.+) · Doğrudan Alan$/, (m) => `${tr(m[1])} · Direct Area`],
  [/^Ada (.+) · Parsel (.+) · Tapu Alanı (.+)$/, (m) => `Block ${m[1]} · Parcel ${m[2]} · Title Area ${m[3]}`],
  [/^Rapor Tarihi: (.+)$/, (m) => `Report Date: ${m[1]}`],
  [/^Tarih: (.+)$/, (m) => `Date: ${m[1]}`],
  [/(.*)yıpranma %(\d+)(.*)/, (m) => `${tr(m[1].trim()).length ? m[1] : m[1]}depreciation ${m[2]}%${m[3]}`],
  [/^Yıl sonu güncellemesi \(enflasyon\)$/, () => 'Year-end indexation (inflation)'],
];

/** Yapı türü kataloğu (işletme) */
Object.assign(D, {
  'Üretim': 'Production', 'Lojistik ve Depolama': 'Logistics & Storage',
  'Tarım ve Hayvancılık': 'Agriculture & Livestock', 'Perakende Ticaret': 'Retail',
  'Ofis': 'Office', 'Turizm': 'Tourism',
  'Fabrika': 'Factory', 'Atölye': 'Workshop', 'OSB Tesisi': 'Industrial-Zone Facility',
  'Depo': 'Warehouse', 'Antrepo': 'Bonded Warehouse', 'Soğuk Hava Deposu': 'Cold Storage',
  'Ahır': 'Barn', 'Besihane': 'Feedlot', 'Tavuk Çiftliği': 'Poultry Farm', 'Sera': 'Greenhouse',
  'Dükkan': 'Shop', 'Mağaza': 'Store', 'AVM': 'Shopping Mall', 'Akaryakıt İstasyonu': 'Fuel Station',
  'Plaza': 'Office Tower', 'İş Merkezi': 'Business Centre', 'Otel': 'Hotel', 'Tatil Köyü': 'Holiday Resort',
});

/* ═══════════ ÇEVİRİ ═══════════ */
function tr(s: string): string {
  const hit = D[s];
  if (hit) return hit;
  for (const [re, rep] of RULES) {
    const m = s.match(re);
    if (m) return typeof rep === 'string' ? rep : rep(m);
  }
  return s;
}

/** Metni geçerli dile çevirir; TR modda veya karşılık yoksa aynen döner. */
export function t(s: string): string {
  if (lang !== 'en') return s;
  return tr(s);
}

/* ═══════════ EKRAN ÇEVİRİCİ (DOM) ═══════════ */
let observer: MutationObserver | null = null;

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.nodeValue ?? '';
    const trimmed = raw.trim();
    if (!trimmed) return;
    const out = tr(trimmed);
    if (out !== trimmed) node.nodeValue = raw.replace(trimmed, out);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const ph = el.getAttribute('placeholder');
    if (ph) { const o = tr(ph); if (o !== ph) el.setAttribute('placeholder', o); }
    return;   // değerlere asla dokunma
  }
  const title = el.getAttribute?.('title');
  if (title) { const o = tr(title); if (o !== title) el.setAttribute('title', o); }
  node.childNodes.forEach(translateNode);
}

/** EN moddayken belge gövdesini çevirir ve değişiklikleri izler. */
export function startDomTranslation(root: HTMLElement) {
  stopDomTranslation();
  if (lang !== 'en') return;
  translateNode(root);
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData' && m.target) translateNode(m.target);
      m.addedNodes.forEach(translateNode);
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
}

export function stopDomTranslation() {
  observer?.disconnect();
  observer = null;
}
