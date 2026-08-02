/* ═══════════════════════════════════════════════════════════════════
   NTRK — Cloudflare Worker AI Proxy
   ───────────────────────────────────────────────────────────────────
   NEDEN GEREKLİ?
   Anthropic API anahtarını telefona/siteye koymak = anahtarı internete
   vermektir. Bu küçük ara sunucu anahtarı kendi tarafında tutar;
   uygulama yalnızca buraya istek atar.

   KURULUM (10 dakika, ücretsiz katman yeterli):
   1) dash.cloudflare.com > Workers & Pages > Create > Worker > Deploy
   2) "Edit code" > bu dosyanın tamamını yapıştır > Deploy
   3) Worker > Settings > Variables and Secrets:
        ANTHROPIC_KEY = (Anthropic konsolundan aldığın anahtar)  [Secret]
        ACCESS_CODE   = (kendi belirlediğin uzun bir parola)      [Secret]
   4) Worker adresini (https://xxx.workers.dev) kopyala
   5) NTRK > Ayarlar > AI Asistan: adresi ve erişim kodunu gir, kaydet.
   ═══════════════════════════════════════════════════════════════════ */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'Yalnızca POST' }, 405);

    // Erişim kodu kontrolü — adresi bulan biri krediyi harcayamasın
    if (env.ACCESS_CODE && request.headers.get('X-Access-Code') !== env.ACCESS_CODE) {
      return json({ error: 'Erişim kodu hatalı' }, 401);
    }
    if (!env.ANTHROPIC_KEY) return json({ error: 'Worker ayarlarında ANTHROPIC_KEY tanımlı değil' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }
    const prompt = String(body.prompt || '').slice(0, 12000);
    if (!prompt) return json({ error: 'Boş istek' }, 400);

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4-5',
          max_tokens: 900,
          system: 'Sen NTRK adlı kişisel yaşam asistanısın. Türkçe, kısa, samimi ve somut yaz. Tıbbi tanı koymaz, yatırım tavsiyesi vermezsin; genel bilgi ve pratik öneri sunarsın.',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const d = await r.json();
      if (!r.ok) return json({ error: (d.error && d.error.message) || 'API hatası' }, r.status);
      const text = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return json({ text: text || 'Yanıt boş döndü.' });
    } catch (e) {
      return json({ error: 'Bağlantı hatası: ' + e.message }, 502);
    }
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
