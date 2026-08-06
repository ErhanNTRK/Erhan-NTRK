# NTRK v2 — CHANGELOG

Bu dosya, uygulamanın tüm geliştirme oturumları boyunca yapılan değişikliklerin
özetidir. Oturum bazlı ayrıntılı notlar için `OTURUM-*-DEGISIKLIKLER.md`
dosyalarına bakabilirsin.

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
2. **Gerçek push bildirimleri** (Web Push API + Service Worker) — `notify`/`notifyLead` alanları tüm ilgili kayıtlarda (ajanda, özel günler, ilaç, ödemeler) zaten mevcut.
3. **Canlı döviz/altın/borsa fiyat entegrasyonu** — varlık kayıtlarında `currency`/`price` alanları hazır; sadece bir fiyat kaynağına bağlanıp `price` alanının otomatik güncellenmesi yeterli.
4. **Bulut yedekleme sağlayıcılarının gerçek bağlantısı** (iCloud/Drive/OneDrive/Dropbox OAuth + otomatik senkronizasyon).
5. **Çöp Kutusu kapsamının genişletilmesi** — şu an Varlık/Borç/Ödeme/Belge/Ajanda/Not için aktif; Aile üyeleri, çocuk profilleri, fotoğraflar gibi diğer kayıt türlerine de uygulanabilir.
6. **İstatistikler ekranına tarih aralığı seçimi** (şu an sabit son 6 ay / 14 gün / 30 kayıt) ve dışa aktarma (PDF/CSV) desteği.
7. **Hedeflerin otomatik güncellenmesi** — şu an manuel "çek" butonuyla dolduruluyor; günlük otomatik senkronizasyon (örn. her gün adım hedefinin güncel adım sayısıyla otomatik güncellenmesi) eklenebilir.
8. **Belgelerde OCR / otomatik son kullanma tarihi tanıma** (fotoğraftan tarih okuma).
9. **Aile özel günleri için ayrı bir "Yaklaşan Özel Günler" dashboard kartı** (şu an sadece en yakın doğum günü öne çıkıyor).
10. **Çoklu cihaz senkronizasyonu** — bulut bağlantısı gerçek hale gelince, verinin cihazlar arası tutarlılığı için bir çakışma çözümleme (conflict resolution) stratejisi tasarlanmalı.
