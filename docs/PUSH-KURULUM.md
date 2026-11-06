# Arka Plan Bildirimi (Push) Kurulumu

Uygulama kapalıyken de **ödeme, ajanda, doğum günü ve belge** hatırlatmalarının telefonuna
gelmesi için bir kez yapılacak kurulum. Cloudflare ücretsiz katmanı yeterlidir.

## Nasıl çalışır?
1. Uygulama, önümüzdeki 45 günün hatırlatıcı listesini **cihazda** (IndexedDB) tutar ve
   yalnızca *hangi günlerde hatırlatıcı olduğunu* Worker'a bildirir (tarih listesi).
2. Worker, her sabah **09:00 (Türkiye)** o gün hatırlatıcı olan cihazlara içeriksiz bir "dürtme" yollar.
3. Telefondaki service worker uyanır, bildirim metnini **cihazdaki** listeden okur ve gösterir.

Ödeme adı/tutarı gibi kişisel veriler Worker'a ve push servisine gitmez.

## Kurulum

### 1) Anahtar üret (bilgisayarında, Node gerekir)
```bash
node scripts/vapid-keys.mjs
```
Çıktıdaki `VAPID_PUBLIC` ve `VAPID_PRIVATE_JWK` değerlerini bir sonraki adımda kullanacaksın.
**PRIVATE değeri kimseyle paylaşma, repoya yazma.**

### 2) Cloudflare Worker
1. dash.cloudflare.com → **Workers & Pages → Create → Worker** → Deploy.
2. **Edit code** → `worker-ai-proxy.js` dosyasının tamamını yapıştır → Deploy.
3. **Storage & Databases → KV → Create** → ad: `ntrk-kv`.
4. Worker → **Settings → Bindings → Add → KV namespace**: değişken adı `NTRK_KV`, `ntrk-kv`'i seç.
5. Worker → **Settings → Variables and Secrets**:

| Ad | Tür | Değer |
|---|---|---|
| `ACCESS_CODE` | Secret | kendi belirlediğin uzun parola |
| `VAPID_PUBLIC` | Text | 1. adımdaki public değer |
| `VAPID_PRIVATE_JWK` | Secret | 1. adımdaki JSON |
| `VAPID_SUBJECT` | Text | `mailto:eposta@adresin.com` |
| `ANTHROPIC_KEY` | Secret | (yalnızca AI kullanacaksan) |
| `ALLOWED_ORIGIN` | Text | (isteğe bağlı) varsayılan `https://erhanntrk.github.io` |

6. Worker → **Settings → Triggers → Cron Triggers → Add**: `0 6 * * *` (UTC 06:00 = TR 09:00).
7. Worker adresini kopyala (`https://xxx.workers.dev`).

### 3) Uygulamada
1. **Ayarlar → AI Asistan**: Worker adresini ve erişim kodunu gir, kaydet.
2. **Ayarlar → Bildirimler → Arka Plan Bildirimini Aç** → izin ver.
3. **iPhone:** önce Safari'de siteyi **Ana Ekrana Ekle**, uygulamayı oradan aç (iOS 16.4+).

### 4) Test
Worker'a `POST https://xxx.workers.dev/push/test` (başlıkta `X-Access-Code`) göndererek
anında bir dürtme yollayabilirsin.

## Ödeme bildirimleri
Ödeme eklerken/düzenlerken **Bildirim** işaretli olmalı. *Ne zaman hatırlat?* alanından
1 / 3 / 7 gün önce seçebilirsin; ödeme günü her zaman ayrıca hatırlatılır. Ödenmemiş
tek seferlik bir ödeme vadesini geçerse her gün "gecikti" uyarısı gelir. "Ödendi"
işaretlenen dönem için bildirim gelmez.
