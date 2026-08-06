import type { ProjectInput, AssetType, HousingType } from '../engine';
import { computeCapacity, normalizeZoning, computeApartment, floorsFromHmax } from '../engine';
import { YAPI_SINIFLARI, TEBLIG_KAYNAK, ILLER, LEJANTLAR } from '../data/yapiSiniflari';
import { Field, Txt, Num, Pct, Sel, Choice, Seg, fmtM2, fmtTLm2 } from './fields';
import { Step3Apartment, ApartmentSalesCard } from './StepsApartment';
import { Step3Isletme, Step4Isletme } from './StepsIsletme';
import { LOC } from '../i18n';
import { parseKml, inwardOffset, polygonArea } from '../geo/kml';
import { ParcelSketch } from './ParcelSketch';
import { ZoningKmlCard } from './ZoningKmlCard';

export type Upd = <K extends keyof ProjectInput>(key: K, patch: Partial<ProjectInput[K]>) => void;
export type SetTop = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => void;
interface P { input: ProjectInput; upd: Upd; setTop: SetTop; }

/* ═══════════ ADIM 1 — TAŞINMAZ ═══════════ */
const ASSETS: Array<{ v: AssetType; label: string; desc: string }> = [
  { v: 'konut', label: 'Konut', desc: 'Villa veya çok katlı bina' },
  { v: 'ticari', label: 'Ticari', desc: 'Ticari apartman veya ticari işletme' },
  { v: 'karma', label: 'Karma Kullanım', desc: 'Konut + ticaret lejantı · tek kurgu' },
];

export function Step1({ input, setTop, onSample }: P & { onSample?: () => void }) {
  return (
    <div className="card card-wide">
      <div className="card-title">Ne Değerleniyor?</div>
      <div className="choice-grid">
        {ASSETS.map((a) => (
          <Choice key={a.v} on={input.assetType === a.v}
                  name={a.label} desc={a.desc}
                  onClick={() => {
                    setTop('assetType', a.v);
                    /* Karma tek kurgudur: çok katlı bina omurgası otomatik seçilir. */
                    if (a.v === 'karma') setTop('housingType', 'apartman-3-8');
                  }} />
        ))}
      </div>
      {input.assetType === 'karma' && (
        <div className="note-box" style={{ marginTop: 12 }}>
          Karma kullanımda proje tipi sorulmaz; doğrudan çok katlı bina kurgusuna geçilir.
          Zemin kat ticari kabul edilir, bodrumlarda kullanım (ortak / ticari / konut) seçilir
          ve asma kat eklenebilir.
        </div>
      )}
      {onSample && (
        <div style={{ marginTop: 14 }}>
          <button type="button" className="link-btn" onClick={onSample}>
            🎓 Örnek projeyle doldur
          </button>
          <span className="hint" style={{ marginLeft: 8 }}>
            Sistemi ilk kez kullanıyorsanız dolu bir örnekle gezinin.
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════ ADIM 2 — PROJE TİPİ VE TAŞINMAZ ═══════════ */
const HOUSING: Array<{ v: HousingType; label: string; desc: string; ready: boolean }> = [
  { v: 'villa', label: 'Villa', desc: 'Müstakil / ikiz / sıralı', ready: true },
  { v: 'apartman-3-8', label: 'Çok Katlı Bina', desc: 'Kat tablosu ile hesap', ready: true },
  { v: 'site', label: 'Site', desc: 'Parsel içinde çok bloklu', ready: false },
];

export function Step2({ input, upd, setTop }: P) {
  const p = input.parcel;
  return (
    <div className="cols step-cols">
      {input.assetType === 'konut' && (
      <div className="card card-wide">
        <div className="card-title">Konut Proje Tipi</div>
        <div className="choice-grid two">
          {HOUSING.map((h) => (
            <Choice key={h.v} on={input.housingType === h.v}
                    name={h.ready ? h.label : `${h.label} — yakında hizmette`} desc={h.desc}
                    onClick={() => h.ready && setTop('housingType', h.v)} />
          ))}
        </div>
      </div>
      )}
      {input.assetType === 'ticari' && (
      <div className="card card-wide">
        <div className="card-title">Ticari Yol</div>
        <div className="choice-grid two">
          <Choice on={input.ticariMode === 'apartman'} name="Ticari Apartman"
                  desc="Kat tablosu ile hesap · karma kurguyla aynı"
                  onClick={() => { setTop('ticariMode', 'apartman'); setTop('housingType', 'apartman-3-8'); }} />
          <Choice on={input.ticariMode === 'isletme'} name="Ticari İşletme"
                  desc="Yapı maliyetleri + satış değeri · sade hesap"
                  onClick={() => setTop('ticariMode', 'isletme')} />
        </div>
        {input.ticariMode === 'isletme' && (
          <div className="note-box" style={{ marginTop: 10 }}>
            Ticari işletmede yapı satırları eklenir (fabrika, depo, ahır, otel…), maliyetler
            toplanır ve öngörülen satış değerinden düşülerek arsa değeri bulunur.
            Müteahhit kârı kesilmez.
          </div>
        )}
      </div>
      )}

      <div className="card card-wide">
        <div className="card-title">Parsel Krokisi — KML (opsiyonel)</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          TKGM Parsel Sorgu'dan indirilen .kml dosyasını yükleyin: taşınmaz bilgileri
          otomatik doldurulur ve parsel şekli çizilir. Dosya cihazınızda işlenir,
          hiçbir yere gönderilmez.
        </div>
        <label className="link-btn" style={{ display: 'inline-block' }}>
          📐 KML Dosyası Yükle
          <input type="file" accept=".kml,application/vnd.google-earth.kml+xml" style={{ display: 'none' }}
                 onChange={(e) => {
                   const f = e.target.files?.[0];
                   e.target.value = '';
                   if (!f) return;
                   const rd = new FileReader();
                   rd.onload = () => {
                     const k = parseKml(String(rd.result));
                     if (!k) { window.alert('KML okunamadı: dosyada parsel poligonu bulunamadı.'); return; }
                     upd('parcel', {
                       kml: { name: k.name, points: k.points, polygonArea: k.polygonArea, deedArea: k.deedArea, setback: 0 },
                       il: k.il || p.il, ilce: k.ilce || p.ilce, mahalle: k.mahalle || p.mahalle,
                       ada: k.ada || p.ada, parsel: k.parsel || p.parsel,
                       ...(k.deedArea > 0 ? { area: k.deedArea, netArea: k.deedArea } : {}),
                     });
                     upd('zoning', { cekmeFrontEdge: null });
                   };
                   rd.readAsText(f);
                 }} />
        </label>
        {p.kml && p.kml.points.length >= 3 && (
          <>
            <div className="static-value" style={{ marginTop: 10 }}>
              {(() => {
                const dev = p.area > 0 ? Math.abs(p.kml!.polygonArea - p.area) / p.area * 100 : 0;
                return p.area > 0
                  ? `Poligon ${p.kml!.polygonArea.toLocaleString(LOC(), { maximumFractionDigits: 1 })} m² · tapu ${p.area.toLocaleString(LOC(), { maximumFractionDigits: 1 })} m² · sapma %${dev.toFixed(2).replace('.', ',')}`
                  : `Poligon ${p.kml!.polygonArea.toLocaleString(LOC(), { maximumFractionDigits: 1 })} m²`;
              })()}
            </div>
            <ParcelSketch kml={p.kml} width={360} />
            <div style={{ marginTop: 8 }}>
              <button type="button" className="link-btn" onClick={() => { upd('parcel', { kml: null }); upd('zoning', { cekmeFrontEdge: null }); }}>
                ✕ KML'yi kaldır
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card col-full">
        <div className="card-title">Taşınmaz Bilgileri</div>
        <Field label="İl">
          <Sel value={p.il} onChange={(v) => upd('parcel', { il: v })}
               options={ILLER.map((i) => ({ value: i, label: i }))} />
        </Field>
        <div className="grid-2">
          <Field label="İlçe"><Txt value={p.ilce} onChange={(v) => upd('parcel', { ilce: v })} /></Field>
          <Field label="Mahalle"><Txt value={p.mahalle} onChange={(v) => upd('parcel', { mahalle: v })} /></Field>
        </div>
        <div className="grid-2">
          <Field label="Ada"><Txt value={p.ada} onChange={(v) => upd('parcel', { ada: v })} /></Field>
          <Field label="Parsel"><Txt value={p.parsel} onChange={(v) => upd('parcel', { parsel: v })} /></Field>
        </div>
        <div className="grid-2">
          <Field label="Parsel Alanı (tapu)"><Num value={p.area} onChange={(v) => upd('parcel', { area: v })} suffix="m²" /></Field>
          <Field label="Net Parsel Alanı" hint="Terk / DOP sonrası">
            <Num value={p.netArea} onChange={(v) => upd('parcel', { netArea: v })} suffix="m²" />
          </Field>
        </div>
        {p.area > 0 && p.netArea > 0 && (
          <div className="note-box">
            Terk oranı <b>%{(((p.area - p.netArea) / p.area) * 100).toFixed(1).replace('.', ',')}</b> ·
            İmar hakları net parsel, arsa birim değeri tapu alanı üzerinden hesaplanır.
          </div>
        )}
      </div>


    </div>
  );
}

/* ═══════════ ADIM 3 — İMAR VE ALAN ÜRETİMİ ═══════════ */
const isKarma = (i: ProjectInput) => i.assetType === 'karma' ||
  (i.assetType === 'ticari' && i.ticariMode === 'apartman');

export function Step3(props: P) {
  const { input } = props;
  if (input.assetType === 'ticari' && input.ticariMode === 'isletme') return <Step3Isletme {...props} />;
  if (isKarma(input)) return <Step3Apartment {...props} karma />;
  if (input.housingType === 'apartman-3-8') return <Step3Apartment {...props} />;
  return <Step3Villa {...props} />;
}

function Step3Villa({ input, upd }: P) {
  const z = input.zoning;
  const e = input.emsal;
  const v = input.villa;
  const zN = normalizeZoning(input.parcel, z);
  const c = computeCapacity(input.parcel, zN, e, v);
  const taksKaks = z.mode === 'taks-kaks';
  const lejantOther = z.lejant === ' ' || (z.lejant !== '' && !LEJANTLAR.includes(z.lejant));

  return (
    <div className="cols step-cols">
      <div className="card card-wide">
        <div className="card-title">1 · İmar Durumu</div>
        <Field label="Plan Lejantı">
          <Sel value={lejantOther ? 'Diğer (elle yazınız)' : z.lejant}
               onChange={(val) => upd('zoning', { lejant: val === 'Diğer (elle yazınız)' ? ' ' : val })}
               options={[{ value: '', label: 'Seçiniz…' }, ...LEJANTLAR.map((l) => ({ value: l, label: l }))]} />
        </Field>
        {lejantOther && (
          <Field label="Lejant (elle)">
            <Txt value={z.lejant.trim()} onChange={(val) => upd('zoning', { lejant: val || ' ' })} />
          </Field>
        )}
        <Field label="Hesap Yöntemi">
          <Seg value={z.mode} onChange={(m) => upd('zoning', { mode: m })}
               options={[{ value: 'taks-kaks', label: 'TAKS / KAKS' }, { value: 'dogrudan', label: 'Alan Bilgisi Girilerek' }]} />
        </Field>

        {taksKaks ? (
          <div className="grid-3">
            <Field label="TAKS">
              <Num value={z.taks ?? 0} onChange={(val) => upd('zoning', { taks: val || null })} step="0.01"
                   placeholder={!z.taks && z.kaks && z.hmax ? (() => {
                     const floors = floorsFromHmax(z.hmax);
                     return floors ? String(Math.round((z.kaks / floors) * 100) / 100) : undefined;
                   })() : undefined} />
            </Field>
            <Field label="KAKS" error={z.kaks == null ? 'Zorunlu: emsal değerini giriniz.' : null}><Num value={z.kaks ?? 0} onChange={(val) => upd('zoning', { kaks: val || null })} step="0.01" /></Field>
            {!z.taks && z.kaks != null && (
              <div className="hint" style={{ gridColumn: '1 / -1' }}>
                TAKS girilmedi — gerçek taban oturumunuz farklıysa TAKS'ı elle girin. Kat alanlarınızı zaten biliyorsanız
                (mimari projeden), <b>Doğrudan Alan Girişi</b> modunu kullanmanız daha güvenilir sonuç verir.
              </div>
            )}
            {(() => {
              const k = input.parcel.kml;
              if (!k || k.setback <= 0 || z.mode !== 'taks-kaks' || !z.taks) return null;
              const inner = inwardOffset(k.points, k.setback);
              if (!inner) return null;
              const base = (input.parcel.netArea || input.parcel.area);
              const taksFoot = base * z.taks;
              const setFoot = polygonArea(inner);
              if (setFoot >= taksFoot) return (
                <div className="note-box" style={{ marginTop: 10 }}>
                  Çekme kontrolü: çekme sonrası oturum <b>{setFoot.toLocaleString(LOC(), { maximumFractionDigits: 0 })} m²</b> ≥
                  TAKS oturumu <b>{taksFoot.toLocaleString(LOC(), { maximumFractionDigits: 0 })} m²</b> — belirleyici olan TAKS'tır.
                </div>
              );
              return (
                <div className="warn-box" style={{ marginTop: 10 }}>
                  ⚠ Çekme kontrolü: çekme sonrası oturabilir alan <b>{setFoot.toLocaleString(LOC(), { maximumFractionDigits: 0 })} m²</b>,
                  TAKS oturumundan (<b>{taksFoot.toLocaleString(LOC(), { maximumFractionDigits: 0 })} m²</b>) küçük.
                  Fiili taban oturumu çekme mesafeleriyle sınırlı olabilir; kat alanlarını buna göre gözden geçirin.
                  (Bilgi amaçlıdır; hesap motoru TAKS değerini kullanır.)
                </div>
              );
            })()}
            <Field label="Hmax"><Num value={z.hmax ?? 0} onChange={(val) => upd('zoning', { hmax: val || null })} suffix="m" /></Field>
          </div>
        ) : (
          <div className="grid-2">
            <Field label="Taban Oturumu"><Num value={z.directFootprint} onChange={(val) => upd('zoning', { directFootprint: val })} suffix="m²" /></Field>
            <Field label="Emsale Dahil Alan"><Num value={z.directEmsalArea} onChange={(val) => upd('zoning', { directEmsalArea: val })} suffix="m²" /></Field>
          </div>
        )}
        <div className="mini-kpi">
          <div><span>Taban oturumu</span><b>{fmtM2(c.footprintArea)}</b></div>
          <div><span>Emsale dahil alan</span><b>{fmtM2(c.emsalArea)}</b></div>
        </div>
      </div>

      <ZoningKmlCard input={input} upd={upd} />

      <div className="card card-wide">
        <div className="card-title">2 · Emsal Dışı Satılabilir Alan</div>
        <Field label="Emsal dışı satılabilir alan var mı?">
          <Seg value={e.hasExtra} onChange={(b) => upd('emsal', { hasExtra: b })}
               options={[{ value: false, label: 'Yok' }, { value: true, label: 'Var' }]} />
        </Field>
        {e.hasExtra && (
          <>
            <Field label="Nasıl hesaplansın?">
              <Seg value={e.extraMode} onChange={(m) => upd('emsal', { extraMode: m })}
                   options={[{ value: 'oran', label: 'Emsalin yüzdesi' }, { value: 'manuel', label: 'Elle giriş' }]} />
            </Field>
            {e.extraMode === 'oran' ? (
              <Field label="Oran" hint={`Emsale dahil alanın yüzdesi · ${fmtM2(c.emsalArea)} üzerinden`}>
                <Pct value={e.extraRate} onChange={(n) => upd('emsal', { extraRate: n })} />
              </Field>
            ) : (
              <Field label="Alan"><Num value={e.extraArea} onChange={(n) => upd('emsal', { extraArea: n })} suffix="m²" /></Field>
            )}
            <div className="note-box">Emsal dışı satılabilir alan: <b>{fmtM2(c.extraArea)}</b></div>
          </>
        )}
      </div>

      <div className="card card-wide">
        <div className="card-title">3 · Çatı Katı</div>
        <Field label="Çatı katı var mı?">
          <Seg value={e.hasAttic} onChange={(b) => upd('emsal', { hasAttic: b })}
               options={[{ value: false, label: 'Yok' }, { value: true, label: 'Var' }]} />
        </Field>
        {e.hasAttic && (
          <>
            <Field label="Nasıl hesaplansın?">
              <Seg value={e.atticMode} onChange={(m) => upd('emsal', { atticMode: m })}
                   options={[{ value: 'oran', label: 'Tabanın yüzdesi' }, { value: 'manuel', label: 'Elle giriş' }]} />
            </Field>
            {e.atticMode === 'oran' ? (
              <Field label="Oran" hint={`Taban oturumunun yüzdesi · ${fmtM2(c.footprintArea)} üzerinden`}>
                <Pct value={e.atticRate} onChange={(n) => upd('emsal', { atticRate: n })} />
              </Field>
            ) : (
              <Field label="Alan"><Num value={e.atticArea} onChange={(n) => upd('emsal', { atticArea: n })} suffix="m²" /></Field>
            )}
            <Field label="Emsale dahil mi?" hint="Dahilse emsalin içinden yer alır, toplam inşaat alanını artırmaz.">
              <Seg value={e.atticInEmsal} onChange={(b) => upd('emsal', { atticInEmsal: b })}
                   options={[{ value: false, label: 'Hayır' }, { value: true, label: 'Evet' }]} />
            </Field>
            <div className="note-box">Çatı katı alanı: <b>{fmtM2(c.atticArea)}</b></div>
          </>
        )}
      </div>

      <div className="card card-wide">
        <div className="card-title">4 · Bodrum Kat</div>
        <Field label="Bodrum kat var mı?">
          <Seg value={e.hasBasement} onChange={(b) => upd('emsal', { hasBasement: b })}
               options={[{ value: false, label: 'Yok' }, { value: true, label: 'Var' }]} />
        </Field>
        {e.hasBasement && (
          <>
            <Field label="Nasıl hesaplansın?">
              <Seg value={e.basementMode} onChange={(m) => upd('emsal', { basementMode: m })}
                   options={[{ value: 'oran', label: 'Tabanın yüzdesi' }, { value: 'manuel', label: 'Elle giriş' }]} />
            </Field>
            {e.basementMode === 'oran' ? (
              <Field label="Oran" hint={`Taban oturumunun yüzdesi · ${fmtM2(c.footprintArea)} üzerinden (%100 = taban kadar)`}>
                <Pct value={e.basementRate} onChange={(n) => upd('emsal', { basementRate: n })} />
              </Field>
            ) : (
              <Field label="Alan"><Num value={e.basementArea} onChange={(n) => upd('emsal', { basementArea: n })} suffix="m²" /></Field>
            )}
            <Field label="Emsale dahil mi?" hint="Dahilse emsalin içinden yer alır, toplam inşaat alanını artırmaz.">
              <Seg value={e.basementInEmsal} onChange={(b) => upd('emsal', { basementInEmsal: b })}
                   options={[{ value: false, label: 'Hayır' }, { value: true, label: 'Evet' }]} />
            </Field>
            <div className="note-box">Bodrum kat alanı: <b>{fmtM2(c.basementArea)}</b></div>
          </>
        )}
      </div>

      <div className="card result-preview">
        <div className="card-title">Toplam İnşaat Alanı</div>
        <div className="breakdown">
          <div>Emsale dahil alan: <b>{fmtM2(c.emsalArea)}</b></div>
          {c.extraArea > 0 && <div>+ Emsal dışı satılabilir alan: <b>{fmtM2(c.extraArea)}</b></div>}
          {e.hasAttic && !e.atticInEmsal && <div>+ Çatı katı (emsal dışı): <b>{fmtM2(c.atticArea)}</b></div>}
          {e.hasBasement && !e.basementInEmsal && <div>+ Bodrum kat (emsal dışı): <b>{fmtM2(c.basementArea)}</b></div>}
          {c.emsalConsumedByExtras > 0 && (
            <div className="leftover">
              Emsale dahil edilen {fmtM2(c.emsalConsumedByExtras)} (çatı/bodrum) toplamı artırmaz;
              emsalin içinden yer alır. Zemin üstü katlara kalan: <b>{fmtM2(c.aboveGroundArea)}</b>
            </div>
          )}
        </div>
        <div className="mini-kpi" style={{ marginTop: 12 }}>
          <div><span>Toplam inşaat alanı</span><b>{fmtM2(c.totalArea)}</b></div>
          <div><span>Bahçe / açık alan</span><b>{fmtM2(c.gardenArea)}</b></div>
        </div>
        {c.extraFloorsShare > 0.35 && (
          <div className="leftover" style={{ marginTop: 10 }}>
            Toplam alanın <b>%{(c.extraFloorsShare * 100).toFixed(0)}</b>'i bodrum ve çatı katıdır.
            Bu katlar zemin üstü katlarla aynı m² değerinde satılmaz; birim satış fiyatını
            belirlerken bu kompozisyonu dikkate alınız. <i>(Bu not rapora yazılmaz.)</i>
          </div>
        )}
      </div>

      <div className="card card-wide">
        <div className="card-title">5 · Villa Dağılımı (opsiyonel)</div>
        <div className="grid-2">
          <Field label="Villa Adedi" hint="Boş bırakılabilir">
            <Num value={v.unitCount} onChange={(n) => upd('villa', { unitCount: n })} suffix="adet" />
          </Field>
          <Field label="Zemin Üstü Kat Adedi" hint="Bodrum ve çatı katı hariç">
            <Num value={v.floorsAboveGround} onChange={(n) => upd('villa', { floorsAboveGround: n })} />
          </Field>
        </div>
        <Field label="Villa Tipi">
          <Sel value={v.villaType} onChange={(t) => upd('villa', { villaType: t })}
               options={[
                 { value: 'mustakil', label: 'Müstakil' },
                 { value: 'ikiz', label: 'İkiz' },
                 { value: 'sirali', label: 'Sıralı' },
               ]} />
        </Field>
        {c.unitCount > 0 && (
          <div className="mini-kpi three" style={{ marginTop: 4 }}>
            <div><span>Villa adedi</span><b>{c.unitCount}</b></div>
            <div><span>Villa başına alan</span><b>{fmtM2(c.areaPerUnit)}</b></div>
            <div><span>Villa başına arsa</span><b>{fmtM2(input.parcel.area / c.unitCount)}</b></div>
          </div>
        )}
        <div className={c.floorFits ? 'note-box' : 'leftover'} style={{ marginTop: 10 }}>
          Zemin üstü {fmtM2(c.aboveGroundArea)} alan {c.floorsAboveGround} kata bölündüğünde
          kat başına <b>{fmtM2(c.areaPerFloor)}</b> düşüyor; taban oturumu <b>{fmtM2(c.footprintArea)}</b>.
          {!c.floorFits && <> Bu yerleşim için en az <b>{c.minFloorsNeeded} kat</b> gerekir.</>}
        </div>
      </div>

      <div className="card card-wide">
        <div className="card-title">Plan Notları (opsiyonel)</div>
        <textarea value={z.planNotes} onChange={(ev) => upd('zoning', { planNotes: ev.target.value })}
                  placeholder="Emsal istisnaları, çıkma ve balkon kuralları — raporda aynen görünür." />
      </div>
    </div>
  );
}

/* ═══════════ ADIM 4 — MALİYET VE SATIŞ ═══════════ */
export function Step4(props: P) {
  const { input, upd } = props;
  if (input.assetType === 'ticari' && input.ticariMode === 'isletme') return <Step4Isletme {...props} />;
  const c = input.cost;
  const s = input.site;
  const karma = isKarma(input);
  const apartman = karma || input.housingType === 'apartman-3-8';
  const aptCap = apartman
    ? computeApartment(input.parcel, input.zoning, input.apartment, karma ? 'karma' : 'konut')
    : null;
  const villaCap = computeCapacity(input.parcel, input.zoning, input.emsal, input.villa);
  const cap = aptCap
    ? { totalArea: aptCap.totalArea, gardenArea: aptCap.gardenArea }
    : { totalArea: villaCap.totalArea, gardenArea: villaCap.gardenArea };
  const sinif = YAPI_SINIFLARI.find((x) => x.code === c.buildingClass);
  return (
    <div className="cols">
      <div className="card card-wide">
        <div className="card-title">Yapım Maliyeti</div>
        <Field label="Yapı Sınıfı (2026 Bakanlık Tebliği)">
          <Sel value={c.buildingClass}
               onChange={(code) => {
                 const x = YAPI_SINIFLARI.find((y) => y.code === code);
                 upd('cost', { buildingClass: code, unitCost: x ? x.unitCost : c.unitCost });
               }}
               options={YAPI_SINIFLARI.map((x) => ({ value: x.code, label: `${x.label} — ${fmtTLm2(x.unitCost)}` }))} />
        </Field>
        {sinif && <div className="hint" style={{ marginTop: -6, marginBottom: 10 }}>{sinif.examples}</div>}
        <div className="grid-2">
          <Field label="Birim Maliyet" hint="Elle değiştirebilirsiniz" error={!c.unitCost ? 'Zorunlu: birim maliyet giriniz veya yapı sınıfı seçiniz.' : null}>
            <Num value={c.unitCost} onChange={(n) => upd('cost', { unitCost: n })} suffix="₺/m²" />
          </Field>
          <Field label="Güncelleme Oranı" hint="Enflasyon / piyasa farkı">
            <Pct value={c.inflationRate} onChange={(n) => upd('cost', { inflationRate: n })} />
          </Field>
        </div>
        <Field label="Proje, Ruhsat, Harç ve Müşavirlik" hint="İnşaat maliyeti üzerinden oran">
          <Pct value={c.extrasRate} onChange={(n) => upd('cost', { extrasRate: n })} />
        </Field>
        <div className="note-box">
          Güncel birim maliyet <b>{fmtTLm2(c.unitCost * (1 + c.inflationRate))}</b> ·
          Toplam inşaat <b>{fmtM2(cap.totalArea)}</b><br />
          Kaynak: {TEBLIG_KAYNAK}. KDV hariçtir.
        </div>
      </div>

      <div className="card card-wide">
        <div className="card-title">Peyzaj ve Bahçe</div>
        <Field label="Peyzaj / Bahçe Alanı" hint="Otomatik: net parsel − taban oturumu">
          <Num value={s.landscapeArea > 0 ? s.landscapeArea : Math.round(cap.gardenArea)}
               onChange={(n) => upd('site', { landscapeArea: n })} suffix="m²" />
        </Field>
        {s.landscapeArea > 0 && (
          <button type="button" className="link-btn" onClick={() => upd('site', { landscapeArea: 0 })}>
            Otomatik hesaba dön ({fmtM2(cap.gardenArea)})
          </button>
        )}
        <div className="grid-2" style={{ marginTop: 10 }}>
          <Field label="Peyzaj Birim Maliyeti">
            <Num value={s.landscapeUnitCost} onChange={(n) => upd('site', { landscapeUnitCost: n })} suffix="₺/m²" />
          </Field>
          <Field label="Bahçe Satış Değeri" hint="0 → fiyata dahil">
            <Num value={s.gardenPricePerM2} onChange={(n) => upd('site', { gardenPricePerM2: n })} suffix="₺/m²" />
          </Field>
        </div>
      </div>

      {apartman ? (
        <ApartmentSalesCard {...props} karma={karma} />
      ) : (
        <div className="card card-wide">
          <div className="card-title">Satış</div>
          <Field label="Satış Birim Değeri" error={!input.sales.unitPrice ? 'Zorunlu: satış birim değeri giriniz.' : null} hint="TOPLAM İNŞAAT ALANI m² başına, KDV hariç. Bodrum, zemin ve çatı ayrımı yapılmaz.">
            <Num value={input.sales.unitPrice} onChange={(n) => upd('sales', { unitPrice: n })} suffix="₺/m²" />
          </Field>
          {cap.totalArea > 0 && input.sales.unitPrice > 0 && (
            <div className="note-box">
              Toplam inşaat <b>{fmtM2(cap.totalArea)}</b> × birim fiyat =
              {' '}<b>{(cap.totalArea * input.sales.unitPrice).toLocaleString(LOC())} ₺</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════ ADIM 5 — DEĞERLEME ═══════════ */
export function Step5({ input, upd, setTop }: P) {
  const r = input.residual;
  return (
    <div className="cols">
      <div className="card card-wide">
        <div className="card-title">Kâr ve Finansman</div>
        <Field label="Müteahhit Kâr Oranı" hint="Hasılat üzerinden.">
          <Pct value={r.profitRate} onChange={(n) => upd('residual', { profitRate: n })} />
        </Field>
        <Field label="Finansman Gideri" hint="Toplam maliyetin yüzdesi. Kredi yoksa %0 bırakın.">
          <Pct value={r.financeRateOfCost} onChange={(n) => upd('residual', { financeRateOfCost: n })} />
        </Field>
      </div>

      <div className="card card-wide">
        <div className="card-title">Günümüze İndirgeme</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          İnşaat bir anda değil süre içinde biter; hasılat ve maliyet bugünkü değerlerine
          indirgenerek arsanın daha dürüst artık değeri bulunur. Süre 0 bırakılırsa (varsayılan)
          sonuç değişmez — bu, mevcut hesabın birebir aynısıdır.
        </div>
        <Field label="Proje Süresi (ay)" hint="İnşaatın başlangıcından satışların bitimine kadarki süre.">
          <input type="number" min={0} className="input" value={r.projectMonths ?? 0}
                 onChange={(e) => upd('residual', { projectMonths: Math.max(0, Number(e.target.value) || 0) })} />
        </Field>
        <Field label="Yıllık İndirgeme Oranı" hint="Süre > 0 iken kullanılır.">
          <Pct value={r.timeDiscountRate ?? 0} onChange={(n) => upd('residual', { timeDiscountRate: n })} />
        </Field>
      </div>

      <div className="card card-wide">
        <div className="card-title">Kat Karşılığı Analizi</div>
        <Field label="Rapora eklensin mi?"
               hint="Kat karşılığı yöntemi artık değer yönteminden farklı sonuç verebilir.">
          <Seg value={input.share.enabled} onChange={(b) => upd('share', { enabled: b })}
               options={[{ value: true, label: 'Evet' }, { value: false, label: 'Hayır' }]} />
        </Field>
        {input.share.enabled && (
          <>
            <Field label="Arsa Sahibi Payı">
              <Pct value={input.share.ownerShare} onChange={(n) => upd('share', { ownerShare: n })} />
            </Field>
            <div className="note-box">
              Müteahhit payı: <b>%{((1 - input.share.ownerShare) * 100).toFixed(1).replace('.', ',')}</b>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">Rapor Görselleri</div>
        <Field label="PDF'te parsel krokisi ve yapı kesiti"
               hint="Kroki için KML gerekir; kesit, kat kurgusunun temsili çizimidir (mimari proje değildir).">
          <Seg value={input.reportVisuals === false ? 'hayir' : 'evet'}
               onChange={(v) => setTop('reportVisuals', v === 'evet')}
               options={[{ value: 'evet', label: 'Evet' }, { value: 'hayir', label: 'Hayır' }]} />
        </Field>
      </div>

      <div className="card">
        <div className="card-title">Döviz Karşılığı (opsiyonel)</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          Kur girilirse raporlarda arsa değeri döviz cinsinden de yazılır. Kur, rapor
          tarihine sabitlenmiş beyandır; boş bırakılırsa hiçbir şey değişmez.
        </div>
        <div className="grid-2">
          <Field label="1 USD kaç ₺" hint="Örn. 47,20">
            <Num value={input.fx?.usd ?? 0} step="0.0001"
                 onChange={(v) => upd('fx', { usd: v > 0 ? v : null })} suffix="₺" />
          </Field>
          <Field label="1 EUR kaç ₺" hint="Örn. 51,10">
            <Num value={input.fx?.eur ?? 0} step="0.0001"
                 onChange={(v) => upd('fx', { eur: v > 0 ? v : null })} suffix="₺" />
          </Field>
        </div>
      </div>
    </div>
  );
}
