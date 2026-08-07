# NTRK v2 — CHANGELOG

Bu dosya, uygulamanın tüm geliştirme oturumları boyunca yapılan değişikliklerin
özetidir. Oturum bazlı ayrıntılı notlar için `OTURUM-*-DEGISIKLIKLER.md`
dosyalarına bakabilirsin.

---

## Oturum 10 — Canlı Veri Katmanı, Gerçek Yerel Bildirimler, Modülerleşme

### 1) Canlı Veri (BIST / Döviz / Altın / Kripto)
- Tüm API adresleri **tek yerde** toplandı: `MARKET_API` sabiti (index.html, "CANLI VERİ KAYNAKLARI" başlığı altında). Bir kaynak bozulursa ya da değiştirilmek istenirse sadece bu bloktaki adres güncellenir.
- Kullanılan ücretsiz, anahtarsız kaynaklar:
  - **Döviz**: Frankfurter API (USD/TRY, EUR/TRY)
  - **Altın**: GenelPara API (gram altın, TRY)
  - **Kripto**: CoinGecko Simple Price API (kullanıcının sahip olduğu coinler için, TRY/USD)
  - **BIST / ABD Hisse**: Yahoo Finance Chart API (sembol bazlı anlık fiyat)
- Yeni **`Market`** modülü: `Market.updateAll()` — Varlıklar sekmesindeki **"Fiyatları Güncelle"** butonuna basılınca çalışır. Hisse/Altın/Kripto tipindeki varlıkların `price` alanını otomatik doldurur; eşleşmeyenler sessizce atlanır, sonunda özet toast gösterilir ("X varlık güncellendi · Y eşleşmedi").
- **Arka planda otomatik istek YOK** — sadece buton tetikler, talimata birebir uyuldu.
- Varlıklar sekmesine bir **"Piyasa Verileri"** kartı eklendi: son çekilen USD/TRY, EUR/TRY, gram altın değerleri + son güncelleme zamanı.
- Sandbox test ortamının dış API'lere ağ erişimi kısıtlı olduğu için gerçek fiyat çekme uçtan uca doğrulanamadı (Google Fonts ile aynı kısıtlama); bunun yerine hata durumunun uygulamayı çökertmediği, kullanıcıya net bir mesaj gösterdiği ve diğer her şeyin sorunsuz çalışmaya devam ettiği doğrulandı.

### 2) Gerçek Yerel Bildirim Sistemi
- Yeni **`Notify`** modülü — **Ajanda, İlaç, Ödemeler, Doğum Günleri (üye + çocuk + özel günler), Belgeler** hepsi tek ortak fonksiyondan (`Notify.fire()`) geçiyor.
- Tarayıcının yerel `Notification` API'si kullanılıyor (gerçek bir push sunucusu olmadığından, iş bu platformda ancak "uygulama açıkken" çalışabilir — bu dürüstçe not edilmiştir). İzin verilmese bile **uygulama içi bildirim (toast) her zaman gösterilir**, böylece hatırlatma hiçbir zaman sessizce kaybolmaz.
- Ayarlar'a **"Bildirimler"** kartı eklendi: izin durumu gösteriliyor, "Bildirimleri Etkinleştir/Kapat" butonu var.
- Tarama mantığı: uygulama açılışında bir kez + açıkken **5 dakikada bir** yerel olarak çalışır (ağ isteği içermez, sadece cihazdaki veriyi kontrol eder). Aynı hatırlatma günde bir kez gösterilir (tekrar önleme, `notifiedIds`).
- Var olan `notify`/`notifyLead` alanları (oturum 4-5'te eklenmişti) bu gerçek bildirim sistemine bağlandı.

### 3) Kod Yapısı — Modülerleşme
- CSS, tek `index.html` içinden ayrılıp **`styles.css`** dosyasına taşındı (240 satır). `index.html` artık sadece iskelet + mantık içeriyor, `<link rel="stylesheet">` ile stil dosyasını çağırıyor.
- `sw.js` (service worker) güncellendi: `styles.css` önbellek listesine eklendi, cache sürümü artırıldı — çevrimdışı çalışma bozulmadı.
- `YUKLEME-TALIMATI.txt` güncellendi: `styles.css` artık zorunlu bir dosya olarak listelendi.
- JS mantığı bilinçli olarak **tek dosyada bırakıldı**: modüller arası çalışma zamanı bağımlılıkları (ileri referanslar) ve script yükleme sırası riskleri nedeniyle, JS'i çoklu dosyaya bölmek "çalışan sistemi bozma" riskini gereksiz yere artırırdı. Kod zaten net başlıklarla (`═══ Finans ═══`, `═══ Sağlık ═══` vb.) modüler olarak organize edilmiş durumda.

### Test Sonucu
- Gömülü JS söz dizimi `node --check` ile doğrulandı.
- Playwright ile: CSS'in doğru yüklendiği (stillerin uygulandığı), Piyasa Verileri kartının render olduğu, "Fiyatları Güncelle" butonunun hata durumunda uygulamayı çökertmeden net bir toast gösterdiği, bildirim izni akışının çalıştığı, `Notify.checkAll()`'ın doğru koşulda tetiklenip aynı gün tekrar tetiklenmediği (dedup) doğrulandı.
- 360px dar ekranda tüm bölümlerde (Ana Sayfa, Ajanda, Finans, Sağlık, Belgeler, İstatistikler, Çöp Kutusu, Yapay Zeka, Ayarlar, Aile) taşma yok.
- Finans (6 sekme, 14 varlık tipi) regresyon testinden sağlam çıktı — mevcut sistem bozulmadı.
- Konsol hataları: yalnızca sandbox ortamının dış API'lere (Google Fonts, Frankfurter, GenelPara, CoinGecko, Yahoo Finance) erişememesinden kaynaklanan beklenen ağ hataları; bunlar gerçek tarayıcı/barındırma ortamında oluşmaz.

---

## Oturum 9 — Akıllı Ana Sayfa, İstatistikler, Çöp Kutusu, UX Cilası

### Ana Sayfa
- **Net Servet kartı** artık kendi başına: büyük rakam + Bugün/Bu Ay/Bu Yıl değişim çipleri.
- **Finans Öne Çıkanlar** kartı (yeni): Son 5 işlem (gelir/gider), En Çok Kazandıran ve En Çok Kaybettiren varlık (kâr/zarara göre).
- Yaşam Skoru, Akıllı Özet, Bugün (zaman tüneli), Yaklaşan Ödemeler, Hedeflerim kartları korunup yeniden sıralandı.

### Genel Arama
- **Hedefler** artık aranabiliyor. Finans, Sağlık, Ajanda, Aile, Belgeler, Ödemeler, Gelir, Gider, Borç, Notlar zaten aranabiliyordu — hepsi korundu.

### Belgeler
- **Favoriler** (⭐ işaretleme + filtre çipi).
- **Resim önizleme** (küçük thumbnail, liste satırında otomatik yükleniyor); PDF'ler ikonla gösteriliyor.
- **Son Kullanılanlar** bölümü (en son görüntülenen 5 belge, listenin en üstünde).
- Etiketler zaten vardı, korundu.

### İstatistikler (yeni ekran)
`sec-stats` — "Daha" panelinden erişilebilir. Net Servet eğilimi, Gelir/Gider (6 ay), Varlık dağılımı, Borç özeti, Adım (14 gün), Su (bugün), Sigara (14 gün), Alkol (14 gün), Kilo grafikleri — hepsi mevcut modül verilerinden, kod tekrarı olmadan (`Stats.sparkCard` ortak fonksiyonu) üretiliyor.

### Hedef Sistemi
- **Kategoriler** eklendi: Finans, Sağlık, Kilo, Su, Adım, Borç, Yatırım, Sigara, Alkol, Diğer.
- **Otomatik doldurma**: Kilo/Su/Adım/Sigara/Borç/Yatırım/Finans/Alkol kategorileri seçildiğinde "Güncel değeri uygulamadan çek" butonu görünüyor, ilgili modülün gerçek verisini otomatik dolduruyor.

### Çöp Kutusu (yeni)
`sec-trash` — Varlıklar, Borçlar, Ödemeler, Belgeler, Ajanda kayıtları, Notlar silindiğinde artık kalıcı silinmiyor; 30 gün çöp kutusunda bekliyor, **Geri Yükle** ile eski haline dönüyor, süre dolunca (veya elle boşaltılınca) kalıcı siliniyor. Belge dosyaları (IDB) da bu süreçte doğru yönetiliyor.

### Yedekleme
Bulut yedekleme seçeneklerine **Dropbox** eklendi (iCloud/Google Drive/OneDrive yanına, 2×2 düzen). Hâlâ sadece tercih — gerçek bağlantı yok.

### Yapay Zeka
Sohbet arayüzü (mesaj geçmişi, sabit komutlar, yeni sohbet, sohbet geçmişi) zaten oturum 6-7-8'de kurulmuştu; bu oturumda değişmedi — talimata uygun olarak gerçek API bağlanmadı.

### Genel UX Cilası
- Dosya yükleme içeren kayıtlarda (belge, aile üyesi fotoğrafı) artık **buton içi yükleniyor animasyonu** (spinner) var.
- Boş ekran tasarımları, silme onayları (native confirm) ve başarılı kayıt bildirimleri (toast) uygulama genelinde zaten tutarlıydı; bu oturumda yeni eklenen tüm ekranlara da aynı düzen uygulandı.

### Dokunulmayanlar
Finans hesaplama mantığı, Sağlık kayıtları, Ajanda mantığı — değiştirilmedi. Yeni framework/canlı API/gerçek AI entegrasyonu eklenmedi.

---

## Oturum 6-7-8 — Belgeler Modülü, Yapay Zeka Sohbet Arayüzü, Akıllı Ana Sayfa
- Belgeler, Aile'den ayrılıp bağımsız modül oldu: kategori sistemi, geçerlilik tarihi takibi, etiketler, PDF/fotoğraf desteği, düzenle/sil/kopyala.
- Yapay Zeka: ChatGPT tarzı sohbet arayüzü — mesaj geçmişi, sabit komutlar, yeni/geçmiş sohbet (gerçek API yok).
- Genel arama Belgeler'i de kapsayacak şekilde genişletildi.
- Ana Sayfa'ya Akıllı Özet Kartı, Yaşam Skoru (100 puan), Hedeflerim kartı eklendi.
- Ayarlar'a Bulut Yedekleme seçenekleri (iCloud/Drive/OneDrive) eklendi.

*(Ayrıntılar: `OTURUM-6-7-8-DEGISIKLIKLER.md`)*

## Oturum 4-5 — Ajanda, Aile, Sağlık, Ana Sayfa Zaman Tüneli
- Ajanda: kategori sistemi, zengin alanlar (açıklama/konum/not/bildirim/tekrarlama), düzenleme.
- Bildirim altyapısı (gerçek push yok): Aynı gün/1/3/7 gün önce seçenekleri.
- Aile: üyelere fotoğraf/telefon/e-posta/adres, özel günler (yıldönümü, mezuniyet vb.).
- Çocuk: kan grubu, okul, doktor, randevular, notlar.
- Sağlık: Adım, Kan Şekeri, Notlar sekmeleri; Boy/Kilo birleşimi; İlaca saat/başlangıç/bitiş/hatırlatma; Sigara maliyet takibi; Alkol haftalık/aylık toplam.
- Ana Sayfa'ya "Bugün" zaman tüneli kartı (tüm modüllerin kayıtları saat sırasıyla).

*(Ayrıntılar: `OTURUM-4-5-DEGISIKLIKLER.md`)*

## Oturum 3 — Profesyonel Portföy Yönetim Sistemi
- Varlıklar artık Platform + Ürün Tipi bazlı hesap sistemi (14 ürün tipi: Vadesiz/Vadeli TL, USD, EUR, Altın, Gümüş, Fon, BES, BIST/ABD Hisse, Kripto, Gayrimenkul, Araç, Diğer).
- Vadeli mevduat otomatik hesaplama (net faiz, vade sonu toplam, kalan gün).
- Hisse/Altın/Gümüş/Kripto için otomatik kâr/zarar hesaplama.
- Dashboard: Platform/Kategori dağılımı, Kâr/Zarar kartları.
- Tüm Finans kayıtları düzenlenebilir, silinebilir, kopyalanabilir.

*(Ayrıntılar: `OTURUM-3-DEGISIKLIKLER.md`)*

## Oturum 2 — Finans Modülü Baştan Tasarım
- Net Servet merkezli Genel sekmesi (bugün/bu ay/bu yıl değişim).
- Varlıklar (genel varlık defteri), Borçlar (kategorili), Ödemeler (tekrarlayan, bildirimli) sekmeleri.
- Ana Sayfa'ya Yaklaşan Ödemeler kartı.

*(Ayrıntılar: `OTURUM-2-DEGISIKLIKLER.md`)*

## Oturum 1 — Temel Yeniden Tasarım
- Şifre ekranı kaldırıldı, uygulama doğrudan açılıyor.
- Mor tema kaldırılıp lacivert/petrol mavisi/turkuaz "Premium" tema varsayılan yapıldı; tema değiştirme altyapısı korundu.
- Ana sayfa 6 büyük modül kartıyla (Sağlık, Finans, Aile, Ajanda, Belgeler, Yapay Zeka) yeniden tasarlandı.

*(Ayrıntılar: `OTURUM-1-DEGISIKLIKLER.md`)*

---

## Bir Sonraki Sürüm İçin Geliştirme Önerileri

1. **Yapay Zeka'ya gerçek API bağlanması** — sohbet arayüzü, mesaj geçmişi ve sabit komut altyapısı tamamen hazır; sadece bir dil modeli uç noktasına bağlanması yeterli.
2. **Gerçek Web Push desteği** (arka planda, uygulama kapalıyken de çalışan bildirimler) — şu anki yerel bildirim sistemi yalnızca uygulama açıkken çalışıyor; tam arka plan desteği için bir push sunucusu (VAPID anahtarları vb.) gerekir.
3. **Döviz varlıkları için otomatik kur çevrimi** — şu an USD/EUR varlık tipleri "basit tutar" olarak (TL karşılığı elle girilerek) tutuluyor; canlı kur artık çekilebildiğine göre, döviz cinsinden miktar girilip TL karşılığının otomatik hesaplanması bir sonraki adım olabilir.
4. **BIST/ABD hisse fiyat kaynağının doğrulanması** — Yahoo Finance uç noktası bazı ağlarda/tarayıcılarda CORS kısıtlamasına takılabilir; gerçek kullanımda sorun çıkarsa `MARKET_API.stock` adresi tek satırdan değiştirilebilir.
5. **Bulut yedekleme sağlayıcılarının gerçek bağlantısı** (iCloud/Drive/OneDrive/Dropbox OAuth + otomatik senkronizasyon).
6. **Çöp Kutusu kapsamının genişletilmesi** — şu an Varlık/Borç/Ödeme/Belge/Ajanda/Not için aktif; Aile üyeleri, çocuk profilleri, fotoğraflar gibi diğer kayıt türlerine de uygulanabilir.
7. **İstatistikler ekranına tarih aralığı seçimi** ve dışa aktarma (PDF/CSV) desteği.
8. **Hedeflerin otomatik güncellenmesi** — şu an manuel "çek" butonuyla dolduruluyor; günlük otomatik senkronizasyon eklenebilir.
9. **Belgelerde OCR / otomatik son kullanma tarihi tanıma** (fotoğraftan tarih okuma).
10. **JS'in de modüllere ayrılması** — bu oturumda CSS ayrıldı; ileride bir build adımı (örn. basit bir bundler) eklenirse JS de güvenli şekilde dosyalara bölünebilir; şu an tek dosyada kalmasının nedeni script yükleme sırası risklerini sıfırda tutmaktı.
11. **Çoklu cihaz senkronizasyonu** — bulut bağlantısı gerçek hale gelince, verinin cihazlar arası tutarlılığı için bir çakışma çözümleme (conflict resolution) stratejisi tasarlanmalı.

