# NTRK v2 — Oturum 3 Değişiklik Notu (Profesyonel Portföy Yönetim Sistemi)

## Değişen dosya
- `index.html` (tek dosya uygulama). Başka hiçbir dosyaya/modüle dokunulmadı — Sağlık, Ajanda, Aile, Belgeler modülleri, canlı API/bildirim sistemleri talimata uygun şekilde dokunulmadan bırakıldı.

## Yapılanlar

### 1. Hesap mantığı (Platform → Hesap)
Varlıklar artık düz bir kategori listesi değil, **Platform + Ürün Tipi** ikilisiyle tanımlanan hesaplar. Aynı platform (örn. İş Bankası) altında istenildiği kadar farklı ürün tipinde hesap açılabiliyor (Vadesiz TL, Vadeli TL, USD, Altın vb. hepsi aynı bankada ayrı kayıtlar olarak durabiliyor). Platform listesi (`s.platforms`) hâlâ kullanıcı tarafından genişletilebilir (+ Yeni Platform Ekle).

### 2. Finansal ürün tipleri (`PRODUCT_TYPES`)
14 ürün tipi tanımlandı: Vadesiz TL, Vadeli TL, USD, EUR, Gram Altın, Gümüş, Fon, BES, BIST Hisse, ABD Hisse, Kripto, Gayrimenkul, Araç, Diğer. Her tip, formda hangi alan grubunun açılacağını belirleyen bir **"şekil"**e (`PRODUCT_SHAPE`) bağlanıyor — kod tekrarını önlemek için 5 şekil tanımlandı: `simple`, `deposit`, `market`, `realestate`, `vehicle`. Varlık formu (`assetModal`) artık seçilen ürün tipine göre ilgili alan grubunu dinamik gösterip gizliyor (`Fin.onTypeChange()`).

### 3. Vadeli mevduat (deposit şekli) — tam otomatik hesaplama
Alanlar: Ana para, Faiz oranı (%), Başlangıç tarihi, Vade günü, Faiz ödeme tipi (Vade Sonu/Aylık/Günlük), Stopaj oranı (%).
`Fin.depositCalc()` otomatik hesaplıyor: Vade bitiş tarihi, Brüt faiz, **Net faiz getirisi**, **Vade sonu toplam tutar**, **Vade bitimine kalan gün**, ve güncel (kısmi tahakkuk eden) değer — bu değer net servet hesabında hesabın o anki gerçek değeri olarak kullanılıyor. Form içinde canlı önizleme var (rakamlar yazılırken anında güncelleniyor).

### 4. Hisseler / Altın / Gümüş / Kripto (market şekli — ortak mantık)
Tek bir hesaplama fonksiyonu (`Fin.assetPnl`, `Fin.assetValue`) dört ürün tipini de kapsıyor: Kod/Coin adı (etiket türe göre değişiyor: "Hisse Kodu", "Coin Adı"), Lot/Gram/Adet, Ortalama maliyet, Manuel güncel fiyat → **Kâr/Zarar** ve **Toplam Değer** otomatik. Form içinde canlı önizleme var. Canlı fiyat çekme yok (talimata uygun) — kullanıcı fiyatı elle günceller.

### 5. Gayrimenkul ve Araç
Gayrimenkul: Başlık, Adres, Ekspertiz değeri, Son değerleme tarihi, Not.
Araç: Başlık, Marka, Model, Plaka, Tahmini piyasa değeri, Not.
İkisi de net servete doğrudan ekspertiz/tahmini değerleriyle dahil oluyor.

### 6. Dashboard (Finans > Genel sekmesi) genişletildi
Net Servet kartının altına yeni kartlar eklendi:
- **Platformlara Göre Dağılım** — her platformun toplam değeri, oran çubuğuyla
- **Kategoriye Göre Dağılım** — ürün tipinden türetilen kategoriye göre (Nakit & Banka, Döviz, Altın, Hisse (BIST/ABD), Kripto, Gayrimenkul, Araç, vb.)
- **Kâr / Zarar** — tüm piyasa enstrümanlarının (hisse/altın/gümüş/kripto) toplam kârı ve toplam zararı ayrı ayrı
- Toplam Net Servet / Toplam Varlık / Toplam Borç zaten Net Servet kartında gösteriliyordu, korundu
- Yaklaşan Ödemeler kartı (oturum 2'den) aynen korundu

### 7. Düzenleme / Silme / Kopyalama
Tüm Finans kayıtları (Varlıklar, Borçlar, Ödemeler, Gelirler, Giderler) artık **düzenlenebiliyor, silinebiliyor ve kopyalanabiliyor**. Tek bir genel `Fin.duplicate(anahtar, id)` fonksiyonu tüm kayıt türlerini kapsıyor (kod tekrarından kaçınıldı). Borçlar için daha önce eksik olan **düzenleme** özelliği bu oturumda eklendi.

### 8. Veri göçü (finV3) — veri kaybı yok
Eski (oturum 2) varlık kayıtları (`cat` + tekil `amount` alanlı) otomatik olarak yeni şemaya taşınıyor: eski kategori → en yakın yeni ürün tipine eşleniyor (`OLD_CAT_TO_TYPE`), hisse/altın gibi "market" tipi kayıtlar için ortalama maliyet ve güncel fiyat eski toplam tutardan geri hesaplanıyor (kâr/zarar başlangıçta 0 — dürüst bir varsayım, çünkü eski sistemde maliyet ayrı tutulmuyordu).

### 9. Dokunulmayanlar (talimata birebir uyuldu)
Canlı borsa/döviz/altın/API, bildirim tetikleme, Sağlık, Ajanda, Aile, Belgeler modüllerine **hiç dokunulmadı**.

## Test sonucu
- Gömülü JS söz dizimi `node --check` ile defalarca doğrulandı — hata yok.
- Playwright ile uçtan uca akışlar test edildi:
  - Vadesiz TL (basit tutar) ✓
  - Vadeli TL: 100.000 ₺ / %50 / 90 gün / %15 stopaj → Net faiz ₺10.479,45, Vade sonu toplam ₺110.479,45 (elle doğrulandı, doğru) ✓
  - BIST Hisse: 100 lot / maliyet ₺250 / güncel ₺300 → Toplam Değer ₺30.000, Kâr +₺5.000 (doğru) ✓
  - Gayrimenkul, Araç ekleme ✓
  - Kopyalama: bir varlığı kopyalayınca toplamlar ve kâr/zarar doğru şekilde ikiye katlandı ✓
  - Borç düzenleme (edit) ✓ (ilk test denemesinde yanlış buton seçici yüzünden başarısız görünmüştü; düzeltilmiş test scriptiyle doğru çalıştığı doğrulandı — uygulama kodunda hata yoktu)
  - Platform/Kategori dağılım kartları ve Kâr/Zarar kartı doğru rakamlarla render oluyor ✓
  - Gelirler, Giderler, Ödemeler sekmeleri (bu oturumda içerik olarak değişmeyen kısımlar) sorunsuz çalışıyor ✓
- 360px dar ekranda yatay taşma yok.
- Konsol hatası yok (sandbox'ın Google Fonts CDN'ine erişememesinden kaynaklanan tek 403 uyarısı hariç — gerçek tarayıcıda sorun olmaz).

## Sonraki öneriler
1. Vadeli mevduat için "Faiz Ödeme Tipi" (Aylık/Günlük) şu an sadece bilgi amaçlı saklanıyor — istenirse aylık/günlük faiz ödemelerinin ayrı gelir kayıtlarına otomatik düşmesi eklenebilir.
2. Hisse/Kripto için sembol bazlı toplu görünüm (aynı sembolden birden fazla alım varsa ortalama maliyeti otomatik harmanlama) eklenebilir.
3. Varlıklar listesine platform bazlı filtreleme/gruplama seçeneği (şu an sadece kategori bazlı gruplu) eklenebilir.
4. Kâr/Zarar kartına dönemsel (bu ay/bu yıl gerçekleşen vs. gerçekleşmemiş) ayrımı eklenebilir.
5. Döviz çevrimi hâlâ manuel — ileride kur API'si bağlanınca `assets.currency` alanı zaten kullanıma hazır.

---
Ben "Devam et" diyene kadar yeni geliştirmeye geçilmedi, başka hiçbir modüle dokunulmadı.
