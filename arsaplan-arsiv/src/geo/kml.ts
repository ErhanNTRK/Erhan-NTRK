/**
 * TKGM Parsel Sorgu KML desteği — tamamen çevrimdışı geometri.
 *
 * - parseKml: KML metninden künye (İl/İlçe/Mahalle/Ada/Parsel/Alan) ve
 *   poligon köşelerini çıkarır.
 * - WGS84 → yerel metre düzlemi: parsel merkezine oturtulmuş eşit-aralıklı
 *   projeksiyon. Parsel ölçeğinde (yüz metreler) santimetre altı hassasiyet
 *   sağlar; örnek dosyada tapu alanına sapma ‰2'dir (koordinat yuvarlaması).
 * - inwardOffset: poligonu her kenardan d metre içeri öteler (çekme mesafesi
 *   sonrası oturabilir alan). Kenar doğrularının ötelenip kesiştirilmesi
 *   yöntemi; dar/karmaşık parsellerde geçersiz sonuç (kendini kesme, negatif
 *   alan) tespit edilirse null döner ve arayüz bunu açıkça söyler.
 *
 * Bu modül HESAP MOTORUNA VERİ GÖNDERMEZ; çapraz kontrol ve kroki içindir.
 */

export interface KmlParcel {
  name: string;
  il: string;
  ilce: string;
  mahalle: string;
  ada: string;
  parsel: string;
  /** Tapu alanı (KML künyesindeki "Alan", m²) — yoksa 0 */
  deedArea: number;
  /** Yerel düzlem köşeleri (metre, saat yönünün tersine normalize) */
  points: { x: number; y: number }[];
  /** Poligondan hesaplanan alan (m²) */
  polygonArea: number;
}

/** "1.830,40" → 1830.4 */
function trNumber(s: string): number {
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function extData(text: string, key: string): string {
  // <Data name="KEY"> ... <value>VAL</value>
  const re = new RegExp(`<Data[^>]*name="${key}"[^>]*>[\\s\\S]*?<value>([\\s\\S]*?)</value>`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

/** İmzalı alan (shoelace); pozitif = saat yönünün tersi */
function signedArea(pts: { x: number; y: number }[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export const polygonArea = (pts: { x: number; y: number }[]) => Math.abs(signedArea(pts));

export function parseKml(text: string): KmlParcel | null {
  // DOM gerektirmeyen ayrıştırma: TKGM Parsel Sorgu KML'i düz ve tek poligonludur.
  const coordM = text.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
  if (!coordM) return null;

  const lonLat: [number, number][] = [];
  for (const tok of coordM[1].trim().split(/\s+/)) {
    const [lon, lat] = tok.split(',').map(Number);
    if (Number.isFinite(lon) && Number.isFinite(lat)) lonLat.push([lon, lat]);
  }
  // Kapalı halka: son nokta ilkin tekrarıysa at
  if (lonLat.length > 1) {
    const [f, l] = [lonLat[0], lonLat[lonLat.length - 1]];
    if (Math.abs(f[0] - l[0]) < 1e-9 && Math.abs(f[1] - l[1]) < 1e-9) lonLat.pop();
  }
  if (lonLat.length < 3) return null;

  // Yerel projeksiyon (merkez odaklı, metre)
  const lat0 = lonLat.reduce((s, p) => s + p[1], 0) / lonLat.length;
  const lon0 = lonLat.reduce((s, p) => s + p[0], 0) / lonLat.length;
  const r = (d: number) => (d * Math.PI) / 180;
  const mPerDegLat = 111132.92 - 559.82 * Math.cos(2 * r(lat0)) + 1.175 * Math.cos(4 * r(lat0));
  const mPerDegLon = 111412.84 * Math.cos(r(lat0)) - 93.5 * Math.cos(3 * r(lat0));
  let points = lonLat.map(([lon, lat]) => ({ x: (lon - lon0) * mPerDegLon, y: (lat - lat0) * mPerDegLat }));

  // CCW normalize (içeri ofset yönü tutarlı olsun)
  if (signedArea(points) < 0) points = points.slice().reverse();

  const nameM = text.match(/<name>([\s\S]*?)<\/name>/i);
  return {
    name: nameM ? nameM[1].trim() : '',
    il: extData(text, 'İl'),
    ilce: extData(text, 'İlçe'),
    mahalle: extData(text, 'Mahalle'),
    ada: extData(text, 'Ada'),
    parsel: extData(text, 'ParselNo'),
    deedArea: trNumber(extData(text, 'Alan')),
    points,
    polygonArea: polygonArea(points),
  };
}

/**
 * Poligonu her kenardan d metre içeri öteler. Geçersizse null:
 * kenar sayısı korunamıyor, alan büyüyor/negatifleşiyor veya çekme
 * parseli tüketiyorsa (d çok büyük).
 */
export function inwardOffset(pts: { x: number; y: number }[], d: number | number[]): { x: number; y: number }[] | null {
  const n = pts.length;
  if (n < 3) return null;
  const dist = (i: number) => (Array.isArray(d) ? d[i] ?? 0 : d);
  if (Array.isArray(d) ? d.every((v) => v <= 0) : d <= 0) return null;
  // CCW poligonda iç taraf, kenar yönünün SOLU'dur; sol normal = (-dy, dx)
  const lines: { p: { x: number; y: number }; dir: { x: number; y: number } }[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return null;
    const nx = -dy / len, ny = dx / len;               // iç normal
    const di = dist(i);
    lines.push({ p: { x: a.x + nx * di, y: a.y + ny * di }, dir: { x: dx / len, y: dy / len } });
  }
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const L1 = lines[(i - 1 + n) % n], L2 = lines[i];
    const cross = L1.dir.x * L2.dir.y - L1.dir.y * L2.dir.x;
    if (Math.abs(cross) < 1e-9) {
      // Paralel ardışık kenar — köşeyi normal boyunca taşı
      out.push(L2.p);
      continue;
    }
    const wx = L2.p.x - L1.p.x, wy = L2.p.y - L1.p.y;
    const s = (wx * L2.dir.y - wy * L2.dir.x) / cross;
    out.push({ x: L1.p.x + L1.dir.x * s, y: L1.p.y + L1.dir.y * s });
  }
  const a0 = polygonArea(pts), a1 = polygonArea(out);
  if (!Number.isFinite(a1) || a1 <= 0 || a1 >= a0) return null;
  // Kaba kendini-kesme koruması: ofset köşeleri orijinal poligonun çok dışına taşmasın
  const dmax = Array.isArray(d) ? Math.max(...d) : d;
  const dmin = Array.isArray(d) ? Math.min(...d.filter((v) => v > 0), dmax) : d;
  const minD = offsetMinDistanceToPolygon(out, pts);
  if (minD < Math.min(dmin, dmax) * 0.5) return null;
  return out;
}

/** Ofset köşelerinin orijinal kenarlara en yakın mesafesi (geçerlilik sınaması) */
function offsetMinDistanceToPolygon(inner: { x: number; y: number }[], outer: { x: number; y: number }[]): number {
  let min = Infinity;
  for (const p of inner) {
    for (let i = 0; i < outer.length; i++) {
      const a = outer[i], b = outer[(i + 1) % outer.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
      const qx = a.x + t * dx, qy = a.y + t * dy;
      min = Math.min(min, Math.hypot(p.x - qx, p.y - qy));
    }
  }
  return min;
}

export type EdgeClass = 'front' | 'side' | 'rear';

/**
 * Ön cephe kenarı seçildiğinde kalan kenarları dış normal açısına göre sınıflar:
 * ön normaliyle aynı yöne bakanlar (≥ +60°'den dar) ön, ters bakanlar arka,
 * aradakiler yan. Otomatik bir ÖNERİDİR; köşe pahları yola bakıyorsa ön sayılır.
 */
export function classifyEdges(pts: { x: number; y: number }[], frontIdx: number): EdgeClass[] {
  const n = pts.length;
  const normal = (i: number) => {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dy / len, y: -dx / len };            // CCW poligonda DIŞ normal
  };
  const nf = normal(((frontIdx % n) + n) % n);
  return pts.map((_, i) => {
    if (i === ((frontIdx % n) + n) % n) return 'front';
    const ne = normal(i);
    const dot = ne.x * nf.x + ne.y * nf.y;
    if (dot > 0.5) return 'front';
    if (dot < -0.5) return 'rear';
    return 'side';
  });
}

/** Kenar sınıflarına göre çekme sonrası oturum poligonu ve alanı. */
export function setbackFootprint(
  pts: { x: number; y: number }[],
  frontIdx: number,
  d: { front: number; side: number; rear: number },
): { polygon: { x: number; y: number }[]; area: number; classes: EdgeClass[] } | null {
  const classes = classifyEdges(pts, frontIdx);
  const dists = classes.map((c) => (c === 'front' ? d.front : c === 'rear' ? d.rear : d.side));
  const poly = inwardOffset(pts, dists);
  if (!poly) return null;
  return { polygon: poly, area: polygonArea(poly), classes };
}

/** Poligonu kenar-bazlı DIŞA öteler (çıkmalar). Geçersizse null. */
export function outwardOffset(pts: { x: number; y: number }[], d: number[]): { x: number; y: number }[] | null {
  const n = pts.length;
  if (n < 3 || d.every((v) => (v ?? 0) <= 0)) return null;
  const lines: { p: { x: number; y: number }; dir: { x: number; y: number } }[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return null;
    const nx = dy / len, ny = -dx / len;             // CCW poligonda DIŞ normal
    const di = Math.max(0, d[i] ?? 0);
    lines.push({ p: { x: a.x + nx * di, y: a.y + ny * di }, dir: { x: dx / len, y: dy / len } });
  }
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const L1 = lines[(i - 1 + n) % n], L2 = lines[i];
    const cross = L1.dir.x * L2.dir.y - L1.dir.y * L2.dir.x;
    if (Math.abs(cross) < 1e-9) { out.push(L2.p); continue; }
    const wx = L2.p.x - L1.p.x, wy = L2.p.y - L1.p.y;
    const s = (wx * L2.dir.y - wy * L2.dir.x) / cross;
    out.push({ x: L1.p.x + L1.dir.x * s, y: L1.p.y + L1.dir.y * s });
  }
  const a0 = polygonArea(pts), a1 = polygonArea(out);
  if (!Number.isFinite(a1) || a1 <= a0) return null;
  return out;
}
