/**
 * Parsel Krokisi — KML poligonunu kurumsal dille çizer.
 * - Lacivert sınır + açık dolgu; çekme sonrası oturum altın kesikli içte.
 * - interactive modda kenarlar tıklanabilir: ön cephe seçilir, kalan kenarlar
 *   açıya göre otomatik ön/yan/arka sınıflanır (öneri; tekrar tıklamayla ön değişir).
 * - taksArea verilirse TAKS oturumu, parsel şeklinin merkezden ölçeklenmiş
 *   TEMSİLİ izdüşümü olarak gösterilir (konumu bağlayıcı değildir).
 */
import { inwardOffset, polygonArea, classifyEdges, setbackFootprint } from '../geo/kml';
import { LOC, t } from '../i18n';
import type { ParcelKml, Zoning } from '../engine';

const fmt = (v: number, d = 0) =>
  v.toLocaleString(LOC(), { maximumFractionDigits: d, minimumFractionDigits: d });

export function ParcelSketch({ kml, width = 420, zoning, onSelectFront, taksArea }: {
  kml: ParcelKml;
  width?: number;
  /** 'cekme' modu etkileşimi için */
  zoning?: Zoning;
  onSelectFront?: (edgeIdx: number) => void;
  /** Temsili TAKS oturumu (m²) — parsel şekli merkezden ölçeklenir */
  taksArea?: number;
}) {
  const pts = kml.points;
  if (pts.length < 3) return null;

  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX, spanY = maxY - minY;

  const PAD = 34;
  const height = Math.max(220, Math.round((width - 2 * PAD) * (spanY / spanX)) + 2 * PAD);
  const scale = Math.min((width - 2 * PAD) / spanX, (height - 2 * PAD) / spanY);
  const X = (x: number) => PAD + (x - minX) * scale + (width - 2 * PAD - spanX * scale) / 2;
  const Y = (y: number) => height - PAD - (y - minY) * scale - (height - 2 * PAD - spanY * scale) / 2;
  const path = (ps: { x: number; y: number }[]) =>
    ps.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ') + ' Z';

  const cekme = zoning?.mode === 'cekme';
  const frontIdx = cekme ? zoning!.cekmeFrontEdge : null;
  const classes = cekme && frontIdx != null ? classifyEdges(pts, frontIdx) : null;

  // İç poligon: çekme modunda kenar bazlı, değilse tek tip setback
  let inner: { x: number; y: number }[] | null = null;
  let innerLabel = '';
  if (cekme && frontIdx != null) {
    const fp = setbackFootprint(pts, frontIdx,
      { front: zoning!.cekmeFront, side: zoning!.cekmeSide, rear: zoning!.cekmeRear });
    if (fp) {
      inner = fp.polygon;
      innerLabel = `${t('Çekme sonrası oturum')} (${t('ön')} ${fmt(zoning!.cekmeFront, 1)} · ${t('yan')} ${fmt(zoning!.cekmeSide, 1)} · ${t('arka')} ${fmt(zoning!.cekmeRear, 1)} m) · ${fmt(fp.area, 1)} m²`;
    }
  } else if (!cekme && kml.setback > 0) {
    inner = inwardOffset(pts, kml.setback);
    if (inner) innerLabel = `${t('Çekme sonrası oturum')} (${fmt(kml.setback, 1)} m) · ${fmt(polygonArea(inner), 1)} m²`;
  }

  // Temsili TAKS oturumu: merkezden sqrt(oran) ölçek
  let taksPoly: { x: number; y: number }[] | null = null;
  if (taksArea && taksArea > 0 && taksArea < kml.polygonArea) {
    const k = Math.sqrt(taksArea / kml.polygonArea);
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    taksPoly = pts.map((p) => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }));
  }

  const bar = [50, 20, 10, 5].find((b) => b * scale <= (width - 2 * PAD) * 0.4) ?? 5;
  const CLR: Record<string, string> = { front: '#B28D42', side: '#0F2A47', rear: '#8A93A0' };

  return (
    <div className="sketch-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="sketch" role="img"
           aria-label={t('Parsel Krokisi')}>
        <path d={path(pts)} fill="rgba(15,42,71,0.06)" stroke={classes ? 'none' : '#0F2A47'}
              strokeWidth={2} strokeLinejoin="round" />
        {/* Temsili TAKS oturumu */}
        {taksPoly && (
          <path d={path(taksPoly)} fill="rgba(15,42,71,0.10)" stroke="#41618A"
                strokeWidth={1.2} strokeDasharray="2.5 2.5" strokeLinejoin="round" />
        )}
        {/* Çekme sonrası oturum */}
        {inner && (
          <path d={path(inner)} fill="rgba(178,141,66,0.28)" stroke="#B28D42"
                strokeWidth={1.6} strokeDasharray="5 3" strokeLinejoin="round" />
        )}
        {/* Kenarlar (etkileşimli / sınıf renkli) */}
        {pts.map((p, i) => {
          const q = pts[(i + 1) % pts.length];
          const cls = classes ? classes[i] : null;
          const stroke = cls ? CLR[cls] : '#0F2A47';
          return (
            <g key={i}>
              <line x1={X(p.x)} y1={Y(p.y)} x2={X(q.x)} y2={Y(q.y)}
                    stroke={stroke} strokeWidth={cls === 'front' ? 3.4 : 2.2} strokeLinecap="round" />
              {onSelectFront && (
                <line x1={X(p.x)} y1={Y(p.y)} x2={X(q.x)} y2={Y(q.y)} stroke="transparent"
                      strokeWidth={14} style={{ cursor: 'pointer' }}
                      onClick={() => onSelectFront(i)}>
                  <title>{t('Bu kenarı ön cephe yap')}</title>
                </line>
              )}
            </g>
          );
        })}
        {pts.map((p, i) => (
          <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={2.6} fill="#0F2A47" />
        ))}
        {/* Ön cephe etiketi */}
        {classes && frontIdx != null && (() => {
          const a = pts[frontIdx], b = pts[(frontIdx + 1) % pts.length];
          return (
            <text x={(X(a.x) + X(b.x)) / 2} y={(Y(a.y) + Y(b.y)) / 2 - 7}
                  textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#B28D42">
              {t('ÖN')}
            </text>
          );
        })()}
        {/* Kuzey oku */}
        <g transform={`translate(${width - 24}, 30)`}>
          <path d="M0,-12 L6,8 L0,4 L-6,8 Z" fill="#0F2A47" />
          <text y={22} textAnchor="middle" fontSize={10} fill="#0F2A47" fontWeight={700}>K</text>
        </g>
        {/* Ölçek çubuğu */}
        <g transform={`translate(${PAD}, ${height - 12})`}>
          <line x1={0} y1={0} x2={bar * scale} y2={0} stroke="#0F2A47" strokeWidth={2} />
          <line x1={0} y1={-4} x2={0} y2={4} stroke="#0F2A47" strokeWidth={2} />
          <line x1={bar * scale} y1={-4} x2={bar * scale} y2={4} stroke="#0F2A47" strokeWidth={2} />
          <text x={bar * scale / 2} y={-5} textAnchor="middle" fontSize={9.5} fill="#0F2A47">{bar} m</text>
        </g>
      </svg>
      <div className="sketch-legend">
        <span><i className="sw sw-parcel" /> {t('Parsel sınırı')} · {fmt(kml.polygonArea, 1)} m²</span>
        {taksPoly && <span><i className="sw sw-taks" /> {t('TAKS oturumu (temsili)')} · {fmt(taksArea!, 0)} m²</span>}
        {inner && <span><i className="sw sw-inner" /> {innerLabel}</span>}
        {cekme && frontIdx == null && (
          <span className="sketch-hint-strong">👆 {t('Krokide ön cepheye tıklayın; kalan kenarlar otomatik sınıflanır.')}</span>
        )}
        {cekme && frontIdx != null && !inner && (
          <span className="sketch-invalid">⚠ {t('Bu çekme mesafeleri bu parsel şekline uygulanamıyor (parsel tükeniyor veya geometri geçersiz).')}</span>
        )}
        {!cekme && kml.setback > 0 && !inner && (
          <span className="sketch-invalid">⚠ {t('Bu çekme mesafesi bu parsel şekline uygulanamıyor (parsel tükeniyor veya geometri geçersiz).')}</span>
        )}
      </div>
    </div>
  );
}
