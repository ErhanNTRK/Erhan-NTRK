/* NTRK Service Worker — çevrimdışı çalışma, güncelleme şeridi ve arka plan bildirimi (push).
   Sürüm değişince eski önbellek silinir. Her güncellemede CACHE adını değiştir. */
const CACHE = 'ntrk-v2.3.0';
const ASSETS = ['./', './index.html', './styles.css', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  /* Tek bir dosya eksik olsa bile kurulum bozulmasın: dosyaları tek tek eklemeyi dene */
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Önce ağ, olmazsa önbellek: yeni sürüm hemen görünür, çevrimdışıyken de uygulama açılır */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // yazı tipleri / API: ağa bırak
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});

/* ── Arka plan bildirimi ──────────────────────────────────────────────
   Worker günde bir kez (09:00) içeriksiz bir "dürtme" gönderir. Bildirim metni
   uygulamanın cihaza yazdığı 'push-reminders' kaydından okunur (kişisel veri
   push servisinden geçmez). */
function openReminders() {
  return new Promise((resolve) => {
    const rq = indexedDB.open('ntrk-files', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('files');
    rq.onerror = () => resolve([]);
    rq.onsuccess = () => {
      try {
        const get = rq.result.transaction('files').objectStore('files').get('push-reminders');
        get.onsuccess = () => { try { resolve(JSON.parse(get.result || '[]')); } catch (e) { resolve([]); } };
        get.onerror = () => resolve([]);
      } catch (e) { resolve([]); }
    };
  });
}
function trToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()); }

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    const today = trToday();
    const items = (await openReminders()).filter((r) => r.date === today).slice(0, 6);
    if (!items.length) {
      await self.registration.showNotification('NTRK', { body: 'Bugün için hatırlatıcıların var — uygulamayı aç.', icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'ntrk-daily' });
      return;
    }
    for (const r of items) {
      await self.registration.showNotification(r.title, { body: r.body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: r.id });
    }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    for (const w of wins) { if ('focus' in w) return w.focus(); }
    return self.clients.openWindow('./');
  }));
});
