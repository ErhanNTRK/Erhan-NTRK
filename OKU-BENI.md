# ArsaPlan v8.1.0 — İsim Değişikliği + Veri Kalıcılığı + Adım Birleştirme

Doğrulama: tsc 0 hata, test 194/194, build başarılı.

## Tamamlanan 4 madde

1. **Üst Hakkı isim değişikliği** — "Toplam Değerden Üst Hakkı Hesabı" →
   **"Toplam Değer Esaslı Üst Hakkı Tespiti"**; "Sadece Arsa Değeri
   Üzerinden Üst Hakkı Hesabı" → **"Arsa Değeri Esaslı Üst Hakkı
   Tespiti"**. Uygulama içi, PDF ve Excel'in hepsinde güncellendi.

2. **Veri kalıcılığı — artık her açılışta boş başlıyor.** Arsa ve
   Otel modülleri artık sayfa her açıldığında **temiz/sıfır** başlıyor.
   Kayıtlı bir taslak varsa, üstte **"↺ Eski verileri geri getir"**
   düğmesi çıkıyor — istersen tıklayıp devam edersin, istemezsen hiç
   dokunmadan yeni bir hesaplamaya başlarsın.

3. **TAKS/KAKS tutarsızlık uyarısı — zaten var olduğu doğrulandı.**
   Bir önceki NaN düzeltmesiyle bu uyarı artık doğru rakamlarla
   çalışıyor. Elle kilitlenmiş kat alanları TAKS/KAKS değişince
   otomatik silinmiyor (bilinçli tasarım — "↺" ile istenirse
   sıfırlanabiliyor), ama tutarsızlık varsa ekranda net bir uyarı
   çıkıyor.

4. **Adım birleştirme — hem Otel hem Arsa'da.**
   - **Otel:** 2 adıma indi (Genel Bilgiler+Gelirler tek adımda,
     Gider·Projeksiyon·İNA ayrı).
   - **Arsa** (Konut/Karma/Ticari Apartman/Ticari İşletme — dört
     varyantın hepsinde): "Değerleme Konusu" ayrı adımı kalktı,
     taşınmaz bilgileriyle birleşti — 5 adımlık akışlar 4'e, 4 adımlık
     Ticari İşletme akışı 3'e indi.

## Bu turda YAPILMAYAN — dürüst not

**Madde 5 (hibrit masaüstü-tablo/mobil-kart görünümü, 7 modülde ~10
ekran) bu turda ele alınmadı** — kapsamı en büyük iş olduğu için,
zaman/token bütçesini yukarıdaki 4 maddeyi sağlam tamamlamaya
ayırdım. Bu, ayrı bir turda ele alınmayı bekliyor.

## Yapılacaklar listesine eklenen (dokunulmadı, onayın olmadan
başlamayacağım)

- **"Site" — parsel içinde çok bloklu proje desteği** (Konut Proje
  Tipi'nde "yakında hizmette" olarak duran seçenek). Büyük bir mimari
  genişleme, ayrı bir tur/proje olarak ele alınacak.

## Yükleme
`src`/`public`/`package.json` → GitHub Upload files → üzerine yaz →
Commit → Actions yeşile dönene kadar bekle → Ctrl+F5.
