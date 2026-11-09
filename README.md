# NTRK — Kişisel Asistan

Telefona kurulabilen (PWA), sunucusuz, kişisel yaşam asistanı. Veriler yalnızca cihazında saklanır.

**Canlı:** https://erhanntrk.github.io/Erhan-NTRK/

## Özellikler
Ajanda · Finans (varlıklar, borçlar, ödemeler, gelir/gider, vadeli mevduat, kâr/zarar) · Sağlık ·
Aile · Belgeler · Hedefler · Notlar · Bildirimler (uygulama açıkken ve isteğe bağlı arka plan push) ·
Canlı piyasa verisi · Yedekleme (isteğe bağlı parola ile şifreli) · PIN kilidi · AI asistan (isteğe bağlı).

## Dosyalar
| Dosya | Görevi |
|---|---|
| `index.html`, `styles.css` | Uygulamanın tamamı |
| `sw.js` | Service worker: çevrimdışı çalışma, push, güncelleme şeridi |
| `manifest.json`, `icons/` | PWA kimliği |
| `worker-ai-proxy.js` | Cloudflare Worker: AI proxy, Web Push, hisse fiyatı |
| `scripts/vapid-keys.mjs` | Push anahtarı üretir |
| `tests/` | Otomatik testler (`npm test`) |
| `docs/` | Kurulum ve değişiklik notları |
| `arsaplan-arsiv/` | ArsaPlan projesinin eski kopyası (bu uygulamayla ilgisiz) |

## Kurulum ve yayın
GitHub Pages, `main` dalının kökünü yayınlar. Değişikliği bir dalda yap, pull request aç, `Test` kontrolü
yeşil olunca birleştir.

Arka plan bildirimi ve hisse fiyatı için bir kez Cloudflare Worker kurulumu gerekir: [docs/PUSH-KURULUM.md](docs/PUSH-KURULUM.md)

## Geliştirme
```bash
npm test                    # testler (Node 20+, bağımlılık yok)
python -m http.server 8765  # yerelde çalıştır: http://localhost:8765
```

### Sürüm yükseltirken (3 yer, testler tutarlılığı kontrol eder)
1. `index.html` içinde `APP_VERSION`
2. `sw.js` içinde `CACHE` (ör. `ntrk-v2.3.0`)
3. `package.json` içinde `version`

## Güvenlik notları
- API anahtarları uygulamaya konmaz; AI ve push için Worker kullanılır.
- PIN kilidi ekranı kilitler, veriyi şifrelemez. Şifreli yedek için Yedek Al sırasında parola gir.
- `Content-Security-Policy` satır içi betiklere izin verir (uygulama `onclick` kullanıyor); bu, XSS'e karşı sınırlı korumadır. Kullanıcı verisi her zaman `esc()` ile kaçışlanmalıdır.
