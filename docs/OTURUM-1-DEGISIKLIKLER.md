# NTRK v2 — Oturum 1 Değişiklik Notu

## Değişen dosya
- `index.html` (tek dosya uygulama — tüm HTML/CSS/JS burada)
- (icons/, manifest.json, sw.js, worker-ai-proxy.js değişmedi, aynen kopyalandı)

## Yapılanlar

### 1. Giriş ekranı kaldırıldı
- `#loginScreen`, `.login-*` CSS sınıfları ve `Auth` (login/setup/hash) mantığı tamamen silindi.
- Uygulama artık `window load` → `Boot.enter()` ile doğrudan açılıyor.
- Ayarlar > "Şifre" kartı kaldırıldı, yerine kısa "Gizlilik" bilgi kartı eklendi.
- Kullanılmayan `sha256()` fonksiyonu ve `ntrk_pass` / `ntrk_pass_hash` localStorage anahtarları temizlendi.

### 2. Tema — mor tonları kaldırıldı
- Kök `--accent` rengi mor (#818cf8) → turkuaz (#2dd4bf) yapıldı.
- `--violet` (Aile modülü rengi) mor (#c084fc) → petrol mavisi (#3b82f6) yapıldı.
- Finans pasta grafiği renk paletindeki mor tonlar değiştirildi.
- **Yeni varsayılan tema: `theme-premium`** (lacivert arka plan + turkuaz vurgu + beyaz/açık gri metin).
- Var olan tema altyapısı (dark/navy/slate/light) korundu; Ayarlar > Tema bölümünde artık
  **Lacivert (Premium) / Antrasit / Gece Mavisi / Açık** seçenekleri var. Kullanıcı istediği an değiştirebiliyor.

### 3. Ana sayfa yeniden tasarlandı
- Eski "Günün Brifingi" listesi + istatistik kutuları + hızlı erişim paneli kaldırıldı.
- Yerine **6 büyük modül kartı** geldi: ❤️ Sağlık, 💰 Finans, 👨‍👩‍👧‍👦 Aile, 📅 Ajanda, 📂 Belgeler, 🤖 Yapay Zeka.
- Her kart canlı, kısa bir alt bilgi gösteriyor (örn. su yüzdesi, net servet, yaklaşan doğum günü, bugünkü etkinlik sayısı).
- "Belgeler" kartı mevcut Aile > Belgeler sekmesine yönlendiriyor (ayrı bir belge sistemi kurulmadı, mevcut altyapı kullanıldı).
- "Yapay Zeka" için yeni bir stub bölüm (`sec-ai`) ve Router kaydı eklendi. İçerik bilinçli olarak geliştirilmedi
  (talimat gereği bu oturumda sadece altyapı) — sadece "Çok Yakında" kartı + mevcut AI proxy ayarına kısayol var.
- Günün alıntısı (quote) kartı, premium bir dokunuş olarak korundu.

### 4. Dokunulmayan modüller
Finans, Sağlık, Ajanda, Aile, Belgeler, Notlar içerikleri **hiç değiştirilmedi** — sadece ana sayfadan
yönlendirme noktaları güncellendi. Test edildi, hepsi sorunsuz çalışıyor.

## Test sonucu
- Gömülü JS söz dizimi `node --check` ile doğrulandı — hata yok.
- Playwright ile 390px, 360px ve 430px genişliklerde ekran görüntüleri alındı — responsive bozulma yok.
- Tema geçişleri (Premium ↔ Açık ↔ Antrasit) test edildi — sorunsuz.
- Finans ve Aile bölümleri (dokunulmayan modüller) test edildi — eskisi gibi tam çalışıyor.
- Konsol hatası yok (yalnızca sandbox ortamının Google Fonts CDN'ine erişememesinden kaynaklanan
  403 uyarısı var; gerçek tarayıcıda bu sorun oluşmaz).

## Sonraki oturumda yapılacaklar (talimat gereği bu oturumda dokunulmadı)
1. Finans, Sağlık, Ajanda, Belgeler, Aile modüllerinin içerik/UX geliştirmeleri.
2. "Yapay Zeka" modülünün gerçek içeriğinin tasarlanması (şu an sadece stub).
3. Kod tabanının modüler dosya yapısına (örn. ayrı JS/CSS dosyaları veya bileşenlere) taşınması —
   şu an hâlâ tek `index.html` dosyası; bu, "her modül bağımsız geliştirilebilsin" hedefi için ileride ele alınmalı.
4. "Belgeler" için Aile'den bağımsız, kendi başına bir modül olup olmayacağına karar verilmesi.

---
Ben "Devam et" diyene kadar yeni geliştirme yapılmadı.
