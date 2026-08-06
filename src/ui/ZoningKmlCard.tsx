/**
 * İmar adımının sağ sütunu: KML krokisi + duruma göre gösterimler.
 * - TAKS/KAKS modunda: TAKS girildiyse temsili oturum izdüşümü.
 * - Çekme modunda: ön cephe seçimi (kenara tıkla) + çekme sonrası oturum.
 * KML yoksa yönlendirme notu gösterir. Motorla konuşmaz; görüntü katmanıdır.
 */
import type { ProjectInput } from '../engine';
import { setbackFootprint } from '../geo/kml';
import { LOC } from '../i18n';
import { ParcelSketch } from './ParcelSketch';

export function ZoningKmlCard({ input, upd }: {
  input: ProjectInput;
  upd: <K extends 'zoning'>(k: K, patch: Partial<ProjectInput[K]>) => void;
}) {
  const p = input.parcel;
  const z = input.zoning;
  const base = p.netArea || p.area;

  return (
    <div className="card">
      <div className="card-title">Parsel Krokisi — KML</div>
      {!p.kml || p.kml.points.length < 3 ? (
        <div className="hint">
          Bu bölüm, Taşınmaz adımında KML dosyası yüklenirse etkinleşir: parsel şekli
          üzerinde TAKS oturumu temsili gösterilir; Çekme Mesafesi yönteminde ön cephe
          buradan seçilir.
        </div>
      ) : (
        <>
          {z.mode === 'cekme' && (
            <div className="hint" style={{ marginBottom: 8 }}>
              Krokide <b>ön cepheye tıklayın</b>: kalan kenarlar açıya göre otomatik
              ön (altın) / yan (lacivert) / arka (gri) sınıflanır. Yanlışsa başka
              kenara tıklayarak ön cepheyi değiştirin.
            </div>
          )}
          <ParcelSketch
            kml={p.kml}
            zoning={z}
            width={520}
            taksArea={z.mode === 'taks-kaks' && z.taks ? base * z.taks : undefined}
            onSelectFront={z.mode === 'cekme' ? (i) => upd('zoning', { cekmeFrontEdge: i }) : undefined}
          />
          {z.mode === 'cekme' && z.cekmeFrontEdge != null && (() => {
            const fp = setbackFootprint(p.kml!.points, z.cekmeFrontEdge,
              { front: z.cekmeFront, side: z.cekmeSide, rear: z.cekmeRear });
            if (!fp) return null;
            return (
              <div className="note-box" style={{ marginTop: 10 }}>
                Çekme sonrası bina oturumu: <b>{fp.area.toLocaleString(LOC(), { maximumFractionDigits: 0 })} m²</b> ·
                zemin ve bodrum kat alanları bu oturumdan türetilir.
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
