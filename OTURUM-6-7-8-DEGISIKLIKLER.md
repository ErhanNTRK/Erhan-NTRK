# NTRK v2 — Oturum 6-7-8 Değişiklik Notu (Belgeler, Yapay Zeka, Akıllı Ana Sayfa)

## Değişen dosya
- `index.html` (tek dosya uygulama). Talimata uygun olarak: Finans hesaplama sistemi, Sağlık kayıtları, Ajanda, bildirim sistemi **değiştirilmedi**; hiçbir canlı API/internet veri çekme eklenmedi (Yapay Zeka gerçek yanıt üretmiyor); yeni framework eklenmedi.

## Yapılanlar

### 1-6) Belgeler Modülü — tamamen geliştirildi ve bağımsız bir modül oldu
- Daha önce Aile'nin bir sekmesiyken artık kendi başına **`sec-documents`** bölümü — Router'a kayıtlı, "Daha" panelinden erişilebiliyor.
- **Kategori sistemi**: Kimlik, Pasaport, Ehliyet, Tapu, Araç Ruhsatı, Sigorta, Sağlık, Vergi, Garanti Belgeleri, Faturalar, Diğer — üstte filtre çipleriyle.
- Her belgede: Başlık, Kategori, Açıklama, Belge Tarihi, Son Geçerlilik Tarihi, Etiketler, Not, Kime Ait (aile üyesi), **Fotoğraf veya PDF** dosyası (`accept="image/*,application/pdf"`, görüntüleyici hem resmi hem PDF'i gösteriyor + indirme linki).
- **Düzenleme, silme, kopyalama** hepsi var.
- **Arama kutusu** (başlık/etiket) + **kategoriye göre filtreleme** çipleri.
- Süresi 30 gün içinde dolan/dolmuş belgeler kırmızı/altın rozetle vurgulanıyor; **Ana Sayfa'da** hem Belgeler modül kartında hem Akıllı Özet kartında gösteriliyor.
- Genel arama artık başlık/kategori/etiket üzerinden belge buluyor.

### 7-10) Yapay Zeka Modülü — profesyonel sohbet arayüzü (gerçek API YOK)
- ChatGPT benzeri sohbet ekranı: kullanıcı/asistan balonları, "yazıyor…" animasyonu, boş durum ekranı.
- **Mesaj geçmişi**: her sohbet `s.aiChats[]` içinde saklanıyor.
- **Yeni Sohbet** ve **Geçmiş** (eski sohbetleri listeleme, geçiş yapma, silme) çalışıyor.
- **Hazır komutlar**: Finansımı analiz et / Bugünkü durumumu özetle / Yaklaşan ödemeleri göster / Yaklaşan randevuları göster / Belgelerimi kontrol et / Sağlık özetini göster — çipler halinde, tıklanınca otomatik gönderiliyor.
- Talimata birebir uyularak **gerçek bir yanıt üretilmiyor** — mesaj gönderildiğinde kısa bir gecikmeyle "bu ekran hazır altyapı, henüz bağlantı yok" bilgilendirmesi geliyor. Önceden var olan opsiyonel `AI.weekly()` (kullanıcının kendi Cloudflare Worker'ına bağlanan, Ayarlar'dan yapılandırılan) özelliği dokunulmadan korundu — bu oturumda yeni bir API eklenmedi.

### 11) Genel Arama
Zaten var olan tek arama kutusu genişletildi: artık Belgeler'i kategori/etiket üzerinden de buluyor; Varlıklar, Ödemeler, İlaçlar, Aile, Takvim aramaları korundu (İrem→Aile, ASELS→Varlıklar, Tapu/Pasaport→Belgeler, Araç→Belgeler/Varlık/Ajanda kategorisi, Elektrik→Ödemeler örnekleri hepsi çalışıyor).

### 12) Ana Sayfa — Akıllı Özet Kartı (yeni)
Tek kartta: Bugünkü Adım, Su Hedefi (%), Yaklaşan Ödeme, Yaklaşan Doğum Günü, Bugünkü Ajanda (kayıt sayısı), Son kullanma tarihi yaklaşan belge, Vadeli hesap bitişi — hepsi mevcut modüllerin verisinden anlık hesaplanıyor, veri kopyalanmıyor.

### 13) Yaşam Skoru (yeni kart, yeni modül DEĞİL)
Ana Sayfaya küçük, dairesel gösterge kartı eklendi. 100 puan üzerinden, 5 kategori × 20 puan: Finans (varlık var mı + borç/ödeme takibi), Sağlık (su hedefi oranı + ilaç alım oranı), Görevler (bugün/son 7 gün ajanda aktifliği), Aile (üye var mı + doğum tarihi doluluk oranı), Belgeler (belge var mı + süresi yakın/dolmuş belge yok mu). Basit, kural bazlı — talimata uygun.

### 14) Hedefler
Ana Sayfada "Hedeflerim" kartı: başlık + hedef değer + mevcut değer + birim (kg, TL, adım, litre...) ile hedef ekleniyor, ilerleme çubuğuyla gösteriliyor, dokunarak düzenlenip silinebiliyor. (83 kg, 1.000.000 TL yatırım, sigarayı bırakmak, 10.000 adım, 3 litre su, borç kapatma gibi örnekler serbestçe girilebiliyor.)

### 15) "Bugün" Zaman Tüneli
Önceki oturumda eklenmişti, bu oturumda korunup Akıllı Özet ve Yaşam Skoru kartlarıyla birlikte Ana Sayfa'da yeniden düzenlendi (sıra: Modül kartları → Yaşam Skoru → Akıllı Özet → Bugün → Yaklaşan Ödemeler → Hedeflerim → günün sözü).

### 16) Ayarlar — Bulut Yedekleme (sadece altyapı)
Yeni "Bulut Yedekleme" kartı: iCloud / Google Drive / OneDrive seçenekleri buton olarak sunuluyor, seçim `s.cloudBackup.provider` içinde saklanıyor. Talimata uygun olarak **gerçek bağlantı yok** — sadece tercih kaydediliyor ve "bağlantı yakında aktif olacak" bilgisi gösteriliyor. Mevcut JSON yedekleme (dışa/içe aktarma) dokunulmadan korundu.

### 17) Dokunulmayanlar
Finans hesaplama sistemi, Sağlık kayıtları, Ajanda, bildirim sistemi (NOTIFY_LEADS altyapısı) — **hiçbiri değiştirilmedi**. Yeni canlı API/internet veri çekme eklenmedi. Yeni framework eklenmedi.

## Test sonucu
- Gömülü JS söz dizimi `node --check` ile defalarca doğrulandı. Geliştirme sırasında bulunup düzeltilen 2 gerçek hata:
  1. AI modülü yeniden yazılırken eski `weekly()` gövdesi yanlışlıkla iki kez kaldı → tekrar eden blok silinerek düzeltildi.
  2. `goalModal` eklenirken bir `str_replace` işlemi `aiModal`'ın açılış etiketini yanlışlıkla sildi → geri eklenerek düzeltildi.
  3. Yapay Zeka hazır komut çiplerinde `JSON.stringify()` kullanımı HTML `onclick` özniteliğinin çift tırnaklarıyla çakıştı (attribute erken kapanıyordu) → tek tırnak kaçışlı (`\\'`) string birleştirmeye çevrilerek düzeltildi.
- Playwright ile uçtan uca test edildi: Belgeler (ekle/kategori/geçerlilik rozeti/etiket arama/filtre/düzenle/kopyala), Yapay Zeka (boş durum, hazır komut, manuel mesaj, yeni sohbet, geçmiş listesi), Ana Sayfa (Yaşam Skoru, Akıllı Özet, Hedefler ekleme+ilerleme), Ayarlar (bulut seçim geri bildirimi) — hepsi doğru çalışıyor.
- **Regresyon testi**: Finans (6 sekme + varlık ürün tipleri 14/14 sağlam), Sağlık (11 sekme sağlam), Ajanda (2 sekme sağlam) — dokunulmaması istenen modüller bozulmadı.
- 360px dar ekranda Ana Sayfa/Ajanda/Finans/Sağlık/Belgeler/Yapay Zeka bölümlerinde yatay taşma yok.
- Konsol hatası yok (sandbox'ın Google Fonts CDN'ine erişememesinden kaynaklanan tek 403 uyarısı hariç).

## Sonraki öneriler
1. Yapay Zeka'ya gerçek bir API (örn. Anthropic/OpenAI uyumlu bir uç nokta) bağlanması — hazır komutlar ve sohbet geçmişi altyapısı zaten kullanılabilir durumda.
2. Bulut yedekleme sağlayıcılarının (iCloud/Drive/OneDrive) gerçek OAuth bağlantısı ve otomatik senkronizasyon.
3. Belgeler için OCR/otomatik son kullanma tarihi tanıma (fotoğraftan tarih okuma).
4. Yaşam Skoru'na zaman içindeki değişim grafiği (net servet geçmişi gibi günlük anlık görüntü sistemi eklenebilir).
5. Hedeflerin doğrudan ilgili modüllerle bağlanması (örn. "10.000 adım" hedefi otomatik olarak günlük adım verisinden güncellensin, "Sigarayı bırakmak" otomatik olarak `smokeQuit` alanına bağlansın).
6. Genel aramaya son aramalar/öneriler (autocomplete) eklenmesi.

---
Ben "Devam et" diyene kadar yeni geliştirmeye geçilmedi.
