/* ═══════════════════════════════════════════════════════════════════
   NTRK — Cloudflare Worker (AI proxy + arka plan bildirimi / Web Push)
   ───────────────────────────────────────────────────────────────────
   Kurulum adımları: docs/PUSH-KURULUM.md

   Değişkenler (Settings > Variables and Secrets):
     ANTHROPIC_KEY      [Secret]  Anthropic API anahtarı (AI için)
     ACCESS_CODE        [Secret]  Kendi belirlediğin uzun parola
     VAPID_PUBLIC       [Text]    scripts/vapid-keys.mjs çıktısı (public)
     VAPID_PRIVATE_JWK  [Secret]  scripts/vapid-keys.mjs çıktısı (private, JSON)
     VAPID_SUBJECT      [Text]    mailto:senin@epostan
     ALLOWED_ORIGIN     [Text]    (isteğe bağlı) varsayılan https://erhanntrk.github.io
   Bağlamalar:
     NTRK_KV            KV Namespace (yalnızca push abonelikleri)
   Cron Trigger: 0 6 * * *   (UTC 06:00 = Türkiye 09:00)
   ═══════════════════════════════════════════════════════════════════ */

const DEFAULT_ORIGIN = 'https://erhanntrk.github.io';
const mem = new Map(); /* KV yoksa isolate içi hız sınırı */

function allowedOrigin(env) { return env.ALLOWED_ORIGIN || DEFAULT_ORIGIN; }
function cors(env) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(env),
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code'
  };
}
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { ...headers, 'Content-Type': 'application/json' } });
}
function b64u(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uText(str) { return b64u(new TextEncoder().encode(str)); }
function trToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()); }

/* Hız sınırı bellekte tutulur (KV'ye yazmaz): KV'nin ücretsiz günlük yazma kotası
   saldırıyla tüketilip push durdurulamasın. Daha sert koruma için Cloudflare panelinden
   Security > WAF > Rate limiting kuralı eklenebilir. */
function hit(bucket, ip, limit) {
  const key = bucket + ':' + ip + ':' + Math.floor(Date.now() / 60000);
  const n = (mem.get(key) || 0) + 1; mem.set(key, n);
  if (mem.size > 2000) mem.clear();
  return n > limit;
}
const ipOf = (request) => request.headers.get('CF-Connecting-IP') || 'x';

/* Sabit zamanlı karşılaştırma */
function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function vapidJwt(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const header = b64uText(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64uText(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@example.com' }));
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(header + '.' + payload));
  return header + '.' + payload + '.' + b64u(sig);
}

/* Yüksüz (payload'sız) Web Push: tarayıcıdaki service worker uyanır ve içeriği cihazdaki
   yerel veriden okur — böylece şifreli yük gerekmez, kişisel veri push servisinden geçmez. */
async function sendPush(sub, env) {
  const jwt = await vapidJwt(sub.endpoint, env);
  return fetch(sub.endpoint, { method: 'POST', headers: { 'Authorization': 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC, 'TTL': '43200', 'Urgency': 'normal', 'Content-Length': '0' } });
}

async function runDailyPush(env) {
  if (!env.NTRK_KV || !env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC) return;
  const today = trToday();
  const list = await env.NTRK_KV.list({ prefix: 'sub:' });
  for (const k of list.keys) {
    const rec = JSON.parse((await env.NTRK_KV.get(k.name)) || 'null');
    if (!rec || !rec.subscription) continue;
    if (!(rec.dates || []).includes(today) || rec.lastPing === today) continue;
    try {
      const r = await sendPush(rec.subscription, env);
      if (r.status === 404 || r.status === 410) { await env.NTRK_KV.delete(k.name); continue; }
      if (r.ok) { rec.lastPing = today; await env.NTRK_KV.put(k.name, JSON.stringify(rec)); }
    } catch (e) { /* bir sonraki çalıştırmada tekrar denenir */ }
  }
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(runDailyPush(env)); },

  async fetch(request, env) {
    const H = cors(env);
    if (request.method === 'OPTIONS') return new Response(null, { headers: H });

    const origin = request.headers.get('Origin');
    if (origin && origin !== allowedOrigin(env)) return json({ error: 'İzinsiz kaynak' }, 403, H);
    if (hit('all', ipOf(request), 60)) return json({ error: 'Çok fazla istek, biraz bekle' }, 429, H);

    let body = {};
    if (request.method === 'POST') { try { body = await request.json(); } catch { return json({ error: 'Geçersiz istek' }, 400, H); } }

    /* Erişim kodu: başlıkta (X-Access-Code) ya da gövdede (code) kabul edilir. Yanlış denemeler ayrıca sınırlanır. */
    if (env.ACCESS_CODE && !safeEqual(request.headers.get('X-Access-Code') || body.code, env.ACCESS_CODE)) {
      if (hit('fail', ipOf(request), 10)) return json({ error: 'Çok fazla hatalı deneme' }, 429, H);
      return json({ error: 'Erişim kodu hatalı' }, 401, H);
    }

    const path = new URL(request.url).pathname.replace(/\/+$/, '');

    /* Hisse fiyatı: Yahoo tarayıcıdan CORS ile çağrılamaz, Worker aracılık eder */
    if (path === '/market/stock' && request.method === 'GET') {
      const sym = (new URL(request.url).searchParams.get('symbol') || '').toUpperCase();
      if (!/^[A-Z0-9.\-^=]{1,15}$/.test(sym)) return json({ error: 'Geçersiz sembol' }, 400, H);
      try {
        const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NTRK)' } });
        if (!r.ok) return json({ error: 'Fiyat kaynağı hata verdi (' + r.status + ')' }, 502, H);
        const d = await r.json();
        const price = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta ? d.chart.result[0].meta.regularMarketPrice : null;
        if (!price) return json({ error: 'Sembol bulunamadı' }, 404, H);
        return json({ symbol: sym, price }, 200, H);
      } catch (e) { return json({ error: 'Bağlantı hatası' }, 502, H); }
    }

    if (path === '/push/key' && request.method === 'GET') {
      if (!env.VAPID_PUBLIC) return json({ error: 'VAPID_PUBLIC tanımlı değil' }, 500, H);
      return json({ publicKey: env.VAPID_PUBLIC }, 200, H);
    }

    if (path === '/push/sync' && request.method === 'POST') {
      if (!env.NTRK_KV) return json({ error: 'NTRK_KV bağlı değil' }, 500, H);
      const sub = body.subscription;
      if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://')) return json({ error: 'Abonelik geçersiz' }, 400, H);
      const dates = (Array.isArray(body.dates) ? body.dates : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 60);
      const id = 'sub:' + b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint))).slice(0, 24);
      const prev = JSON.parse((await env.NTRK_KV.get(id)) || 'null');
      await env.NTRK_KV.put(id, JSON.stringify({ subscription: sub, dates, lastPing: prev ? prev.lastPing : null }));
      return json({ ok: true, days: dates.length }, 200, H);
    }

    if (path === '/push/test' && request.method === 'POST') {
      if (!env.NTRK_KV) return json({ error: 'NTRK_KV bağlı değil' }, 500, H);
      const list = await env.NTRK_KV.list({ prefix: 'sub:' });
      let sent = 0;
      for (const k of list.keys) { const rec = JSON.parse((await env.NTRK_KV.get(k.name)) || 'null'); if (rec) { const r = await sendPush(rec.subscription, env); if (r.ok) sent++; } }
      return json({ sent }, 200, H);
    }

    /* Varsayılan: AI */
    if (request.method !== 'POST') return json({ error: 'Yalnızca POST' }, 405, H);
    if (!env.ANTHROPIC_KEY) return json({ error: 'Worker ayarlarında ANTHROPIC_KEY tanımlı değil' }, 500, H);
    const prompt = String(body.prompt || '').slice(0, 12000);
    if (!prompt) return json({ error: 'Boş istek' }, 400, H);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 900,
          system: 'Sen NTRK adlı kişisel yaşam asistanısın. Türkçe, kısa, samimi ve somut yaz. Tıbbi tanı koymaz, yatırım tavsiyesi vermezsin; genel bilgi ve pratik öneri sunarsın.',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const d = await r.json();
      if (!r.ok) return json({ error: (d.error && d.error.message) || 'API hatası' }, r.status, H);
      const text = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return json({ text: text || 'Yanıt boş döndü.' }, 200, H);
    } catch (e) {
      return json({ error: 'Bağlantı hatası: ' + e.message }, 502, H);
    }
  }
};
