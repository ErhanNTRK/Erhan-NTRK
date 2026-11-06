# NTRK v2 — Oturum 4-5 Değişiklik Notu (Ajanda, Aile, Sağlık, Ana Sayfa)

## Değişen dosya
- `index.html` (tek dosya uygulama). Talimata uygun olarak Finans hesaplama sistemine, Belgeler modülüne, Yapay Zeka modülüne **dokunulmadı**. Hiçbir canlı API/internet veri çekme eklenmedi. Yeni üst düzey modül oluşturulmadı — sadece mevcut Ajanda/Aile/Sağlık/Ana Sayfa geliştirildi.

## Yapılanlar

### 1) Ajanda — tamamen geliştirildi
- **Kategori sistemi**: Toplantı, Doktor, Hastane, İş, Seyahat, Görev, Hatırlatma, Ödeme, Araç, Vergi, Diğer — her biri kendi ikon/rengiyle.
- Her etkinlikte artık: Başlık, Açıklama, Tarih, Saat, Konum, Not, Kategori, Bildirim Aç/Kapat + bildirim süresi, Tekrarlama var.
- **Düzenleme** eklendi (önceden sadece ekle/sil vardı) — `Cal.openEvent(id)` ile mevcut etkinlik tüm alanlarıyla açılıp güncellenebiliyor.
- Eski kayıtlardaki `type` alanı yeni kategori sistemine otomatik taşındı (veri kaybı yok).

### 2) Bildirim altyapısı (gerçek push YOK, sadece hesaplama)
- Paylaşılan `NOTIFY_LEADS`/`NOTIFY_LEAD_LABELS` sabitleri ve `isReminderToday()` fonksiyonu ile tek bir yerden yönetiliyor (kod tekrarından kaçınıldı).
- Süreler: Aynı gün, 1 gün önce, 3 gün önce, 7 gün önce — kullanıcı her kayıt için manuel seçiyor.
- Ajanda etkinlikleri, aile özel günleri ve ilaçlarda bildirim açma/kapama + süre seçimi var. Hatırlatma günü geldiğinde ilgili kayıt 🔔 rozetiyle listelerde vurgulanıyor.

### 3) Aile — geliştirildi
- Üyelere **fotoğraf** (IndexedDB'de saklanıyor, mevcut fotoğraf altyapısı yeniden kullanıldı), **telefon, e-posta, adres** eklendi.
- Sınırsız kişi ekleme zaten mevcuttu, korundu.

### 4) Özel Günler
- Her üye için doğum günü dışında: Evlilik Yıldönümü, Tanışma Yıldönümü, Mezuniyet, Özel Gün eklenebiliyor (`member.specialDays[]`).
- Her özel gün kendi bildirim aç/kapat + süre ayarına sahip. Takvimde ve brifingde doğum günleriyle aynı mantıkla otomatik beliriyor.

### 5) Çocuk profili — genişletildi
- Yeni alanlar: Kan Grubu, Okul, Doktor.
- **Randevular** (yeni): başlık/tarih/saat/not ile randevu ekleme-silme.
- **Notlar** (yeni): çocuğa özel not defteri.
- Boy/Kilo ve Aşı Takvimi zaten vardı, korundu ve aynı karta entegre edildi.

### 6) Sağlık — genişletildi (11 sekme)
Yeni sekmeler: **Adım**, **Kan Şekeri**, **Notlar**. "Kilo" sekmesi **"Boy / Kilo"** oldu (boy artık zaman içinde takip ediliyor, BMI hesaplaması korunuyor). "Nabız" zaten Tansiyon sekmesinde mevcuttu.

### 7) Su
Değişmedi (zaten günlük hedef + içilen miktar + ilerleme çubuğu vardı) — talimat gereği mevcut, çalışan özellik korundu.

### 8) İlaç — genişletildi
Doz zaten vardı; **Saat, Başlangıç, Bitiş, Hatırlatma** eklendi. Karmaşık iç-içe tırnak sorununu önlemek için ayrı bir `medModal` oluşturuldu (`Health.openMed/saveMed`).

### 9) Sigara — maliyet takibi eklendi
Bırakma sayaç özelliği (mevcut, sigarasız gün sayacı) korundu; hâlâ içenler için **Günlük Adet, Paket Fiyatı → Aylık Maliyet, Yıllık Maliyet** otomatik hesaplanıyor + son 14 günlük günlük kaydı ile basit grafik altyapısı (`spark` bileşeni yeniden kullanıldı). Canlı fiyat/API yok, tamamen manuel.

### 10) Alkol
Günlük kayıt zaten vardı; **Haftalık Toplam** ve **Aylık Toplam** eklendi.

### 11) Ana Sayfa — kartlar artık gerçek veri gösteriyor
- Sağlık kartı: bekleyen ilaç varsa öncelikli uyarı ("💊 N ilaç bekliyor"), yoksa "adım · su %" özeti.
- Finans, Aile, Ajanda, Belgeler kartları zaten gerçek veriye bağlıydı (oturum 1-3), korundu.

### 12) Zaman Tüneli — "Bugün" kartı (yeni)
Ana sayfaya, günün tüm kayıtlarını (etkinlikler, randevular, doğum günleri, aşılar, taksitler, ödemeler, ilaç saatleri) **saat sırasına göre birleştirip** gösteren yeni bir kart eklendi (`Home.timelineHTML`). Bu, zaten var olan tek `collectEvents()` fonksiyonunun ilaç saatlerini de içerecek şekilde genişletilip saat bazlı sıralanmasıyla elde edildi — ayrı bir veri kopyası oluşturulmadı (kod tekrarından kaçınıldı).

### 13) Dokunulmayanlar (talimata birebir uyuldu)
Finans hesaplama sistemi, canlı API/döviz/altın/borsa, gerçek push bildirimi, Belgeler modülü içeriği, Yapay Zeka modülü içeriği — **hiçbiri değiştirilmedi**.

## Test sonucu
- Gömülü JS söz dizimi `node --check` ile defalarca doğrulandı; geliştirme sırasında 2 gerçek hata bulunup düzeltildi:
  1. İlaç quick-modal'ında iç içe tırnak çakışması → ayrı `medModal`'a taşınarak çözüldü.
  2. Boy/Kilo modalinde yerel `h` değişkenine onclick içinden (global kapsamdan) erişilmeye çalışılması → `S().profile.heightCm` ile düzeltildi.
- Playwright ile uçtan uca test edildi: Ajanda (ekle/kategori/bildirim/düzenle), Aile (üye+fotoğraf alanları, özel gün ekleme), Çocuk (kan grubu/okul/doktor/randevu/not), Sağlık (adım, boy/kilo, ilaç saat+bildirim, kan şekeri, sigara maliyeti, notlar), Ana Sayfa (zaman tüneli + gerçek kart verileri) — hepsi doğru çalışıyor.
- 360px dar ekranda Ana Sayfa/Ajanda/Sağlık/Finans/Aile bölümlerinde yatay taşma yok.
- Konsol hatası yok (sandbox'ın Google Fonts CDN'ine erişememesinden kaynaklanan tek 403 uyarısı hariç).
- Finans modülü (bu oturumda dokunulmaması gereken) regresyon testiyle doğrulandı — tüm sekmeler ve önceki oturumların özellikleri sorunsuz.

## Sonraki öneriler
1. Gerçek push bildirimleri (Web Push API + Service Worker) — altyapı (notify/notifyLead alanları) hazır, sadece tetikleme mekanizması eklenmeli.
2. Canlı döviz/altın/borsa fiyat API entegrasyonu (talimatla bu oturumda bilinçli olarak yapılmadı).
3. Zaman tüneline "şimdi" çizgisi / geçmiş-gelecek ayrımı gibi görsel iyileştirmeler.
4. Sigara maliyet grafiğinin (şu an son 14 gün spark) ay bazlı özet görünümü.
5. Aile özel günleri için "yaklaşan özel günler" ayrı bir dashboard kartı (şu an sadece doğum günü ana sayfada özetleniyor).

---
Ben "Devam et" diyene kadar yeni geliştirmeye geçilmedi.
