# NTRK v2 — Oturum 2 Değişiklik Notu (Finans Modülü Baştan Tasarım)

## Değişen dosya
- `index.html` (tek dosya uygulama). Başka hiçbir dosyaya/modüle dokunulmadı.

## Yapılanlar

### 1. Veri modeli genişletildi (`Store.defaults` + tek seferlik göç)
Yeni alanlar: `assets[]`, `payments[]`, `platforms[]`, `netWorthHistory[]`, `finV2` (göç bayrağı).
`Store.load()` içine eklenen göç mantığı, uygulama ilk kez açıldığında:
- Eski `goldAmount/goldPriceTry` → `assets` içine "Altın" kalemi olarak,
- Eski `stocks[]` → `assets` içine "BIST" kategorisiyle,
- Eski `subs[]` (abonelikler) → yeni `payments[]` sistemine (aylık tekrar, ödenmemiş)
otomatik taşınıyor. **Hiçbir veri kaybı yok**, eski kullanıcılar hiçbir şey yapmadan yeni sisteme geçiyor.

### 2. Yeni sabitler
`ASSET_CATS`, `DEBT_CATS`, `PAY_CATS`, `CURRENCIES`, `DEFAULT_PLATFORMS`, `REPEAT_LABELS` — talimatta istenen kategori/platform listeleriyle birebir.
`INC_CATS` güncellendi (Maaş, Kira, Şirket, Faiz, Temettü, Serbest Çalışma, Diğer).

### 3. Finans modülü baştan tasarlandı — artık 6 sekme
**Genel:** Net Servet büyük kartı (Toplam Varlık − Toplam Borç), altında **Bugünkü / Bu Ayki / Bu Yıllık değişim** çipleri (günlük anlık görüntü sistemiyle — `netWorthHistory`). Ardından "Yaklaşan Ödemeler" kartı, "Bu Ay" özeti, 6 aylık akış grafiği, harcama dağılımı, kategori bütçeleri (hepsi korunuyor).

**Varlıklar (yeni):** Kullanıcı sınırsız sayıda varlık ekleyebiliyor — Kategori (Nakit, Banka, Döviz, Altın, Gümüş, Kripto, BIST, ABD Hisseleri, Fonlar, BES, Gayrimenkul, Araçlar, Diğer), Ad, Platform (banka/borsa listesi + "Yeni Platform Ekle"), Adet, Tutar, Para Birimi, Not. Kategoriye göre gruplanıp alt toplamlarla listeleniyor. Eski ayrı "Altın" ve "Hisse" kartları bu genel sisteme taşındı.

**Borçlar:** Artık kategori seçimi var (Kredi Kartı, Konut Kredisi, Taşıt Kredisi, İhtiyaç Kredisi, Borç, Vergi, Diğer). Taksit takibi mantığı aynen korundu.

**Gelirler / Giderler:** Dokunulmadı, aynen çalışıyor — sadece gelir kategorisi listesi güncellendi.

**Ödemeler (yeni, eski "Abonelikler"in yerine):** Tam CRUD — Kategori (Elektrik, Su, Doğalgaz, İnternet, Telefon, Netflix, Spotify, Aidat, Kredi, Kredi Kartı, Vergiler, Sigortalar, Diğer), Tutar, Son Ödeme Tarihi, Tekrarlama (Tek seferlik/Haftalık/Aylık/Yıllık), Otomatik Ödeme, Bildirim. "Öde" butonuyla dönem bazlı ödendi işaretleme; ödenince bir sonraki dönem otomatik hesaplanıyor (test edildi: Ağustos ödendi → "Sonraki: 10 Eylül").

### 4. Ana Sayfa'ya minimum dokunuş
Talimatta açıkça istenen "Yaklaşan Ödemeler" kartı eklendi — mantığın tamamı Finans modülünde (`Fin.upcomingPaymentsHTML()`), Ana Sayfa sadece bunu çağırıyor. Başka hiçbir şey değiştirilmedi.

### 5. Takvim entegrasyonu
`collectEvents()` artık eski `subs` yerine `payments`'ı okuyor (tekrarlama mantığı, mevcut `isRecurringOnDate` fonksiyonu yeniden kullanılarak — kod tekrarı yok). Ödemeler otomatik olarak takvimde ve brifingde görünüyor.

### 6. Temizlik
Kullanılmayan eski kod kaldırıldı: `saveGold`, `saveStock`, `editStock`, `delStock`, `saveSub`, `delSub` fonksiyonları ve `goldModal`/`stockModal`/`subModal` HTML'leri — yerlerini `assetModal` ve `paymentModal` aldı. Arama (Search) özelliği yeni `assets`/`payments` veri modeline bağlandı.

### 7. Canlı veri
Talimata uygun olarak **canlı borsa/döviz/altın API'si eklenmedi** — sadece altyapı kuruldu. Kullanıcı tutarları elle güncelliyor (varlık düzenleme ekranından).

## Test sonucu
- Gömülü JS söz dizimi `node --check` ile defalarca doğrulandı — hata yok.
- Playwright ile uçtan uca akış test edildi: varlık ekleme (banka + altın), kategorili borç ekleme, ödeme ekleme, "Öde" toggle (dönem ilerlemesi doğru çalıştı), gelir/gider ekleme.
- DOM içerik doğrulaması: Net Servet, değişim çipleri (ilk kullanımda "—" gösteriyor — veri birikince gerçek değerlere dönüşecek, beklenen davranış), Ana Sayfa'daki "Yaklaşan Ödemeler" kartının doğru koşulda (14 gün içinde, ödenmemiş) göründüğü ve doğru koşulda (ödenmiş/uzak tarih) gizlendiği doğrulandı.
- 360px dar ekranda Finans bölümü taşma yapmadan tam genişlikte render oldu.
- Konsol hatası yok (sandbox'ın Google Fonts CDN'ine erişememesinden kaynaklanan tek 403 uyarısı hariç — gerçek tarayıcıda sorun olmaz).
- Gelir/Gider sekmeleri (bu oturumda içerik olarak değiştirilmeyen kısımlar) sorunsuz çalışıyor.

## Sonraki öneriler
1. Varlıklar sekmesinde çoklu para birimi girildiğinde toplam net servetin yanıltıcı olmaması için basit bir "manuel kur" alanı eklenebilir (yine API'siz).
2. Ödemeler için gerçek push/local bildirim (şu an sadece "Bildirim" bayrağı saklanıyor, henüz tetiklenmiyor).
3. Borçlar sekmesine de Varlıklar/Ödemeler'deki gibi düzenleme (edit) modalı eklenebilir — şu an sadece ekle/sil var.
4. Net servet geçmişi biriktikçe "Bugün/Bu Ay/Bu Yıl" değişim grafiği (mini sparkline) eklenebilir.
5. İleride canlı kur/altın/borsa API'si bağlanacaksa, `assets.currency` alanı zaten hazır — sadece dönüştürme katmanı eklenmesi yeterli olacak.

---
Ben "Devam et" diyene kadar yeni modüle geçilmedi, başka hiçbir modüle dokunulmadı.
