/**
 * 3-8 KATLI BİNA — ADIM BİLEŞENLERİ
 *
 * Kat tablosu davranışı (Salih'in kilitlediği kurallar):
 *  · TAKS/KAKS: değerler gizli havuzdan otomatik türetilir; her hücre elle
 *    değiştirilebilir. Elle girilen SABİT kalır, "otomatik" bağlantısıyla geri döner.
 *  · Doğrudan Alan: 1. Normal Kat'a girilen değer diğer normal katlara kopyalanır;
 *    her satır tek tek düzenlenebilir.
 */
import type { ProjectInput, ApartmentInput, AptFloor } from '../engine';
import { computeApartment, floorsFromHmax } from '../engine';
import { LEJANTLAR } from '../data/yapiSiniflari';
import { Field, Txt, Num, Pct, Sel, Seg, fmtM2, fmtTL } from './fields';
import type { Upd, SetTop } from './Steps';
import { LOC } from '../i18n';
import { inwardOffset, polygonArea } from '../geo/kml';
import { ZoningKmlCard } from './ZoningKmlCard';

interface P { input: ProjectInput; upd: Upd; setTop: SetTop; karma?: boolean; }

/* Kat satırı → ApartmentInput içindeki override yuvası */
function patchFloor(
  apt: ApartmentInput, f: AptFloor, col: 'area' | 'saleable', value: number | null,
): Partial<ApartmentInput> {
  if (f.kind === 'bodrum') {
    const basements = apt.basements.map((b, i) =>
      i === f.index - 1 ? { ...b, [col]: value } : b);
    return { basements };
  }
  if (f.kind === 'zemin') {
    return col === 'area' ? { zeminArea: value } : { zeminSaleable: value };
  }
  if (f.kind === 'asma') {
    const key = col === 'area' ? 'asmaAreas' : 'asmaSaleables';
    const arr = [...apt[key]];
    arr[f.index - 1] = value;
    return { [key]: arr };
  }
  if (f.kind === 'normal') {
    const key = col === 'area' ? 'normalAreas' : 'normalSaleables';
    const arr = [...apt[key]];
    arr[f.index - 1] = value;
    return { [key]: arr };
  }
  return col === 'area' ? { piyesArea: value } : { piyesSaleable: value };
}

/** Otomatik değere dönüş bağlantısı gösterilsin mi? */
function canReset(mode: 'taks-kaks' | 'dogrudan' | 'cekme', f: AptFloor, auto: boolean): boolean {
  if (auto) return false;
  if (mode === 'taks-kaks' || mode === 'cekme') return true;
  /* doğrudan modda: kopyalanan normal satırlar + öneriden türeyen asma satırları */
  return (f.kind === 'normal' && f.index > 1) || f.kind === 'asma';
}

export function Step3Apartment({ input, upd, karma = false }: P) {
  const z = input.zoning;
  const a = input.apartment;
  const c = computeApartment(input.parcel, z, a, karma ? 'karma' : 'konut');
  const taksKaks = z.mode === 'taks-kaks';
  const cekmeMode = z.mode === 'cekme';
  const lejantOther = z.lejant === ' ' || (z.lejant !== '' && !LEJANTLAR.includes(z.lejant));
  const derived = floorsFromHmax(z.hmax);
  const setApt = (patch: Partial<ApartmentInput>) => upd('apartment', patch);

  return (
    <div className="cols step-cols">
      {/* ── 1 · İMAR DURUMU ── */}
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
          <Seg value={z.mode}
               onChange={(m) => {
                 upd('zoning', { mode: m });
                 if (m === 'cekme') {
                   setApt({ ...a, zeminLossRate: 0.10,
                            basements: a.basements.map((b) => ({ ...b, lossRate: 0.07 })) });
                 }
               }}
               options={[{ value: 'taks-kaks', label: 'TAKS / KAKS' }, { value: 'dogrudan', label: 'Alan Bilgisi Girilerek' }, { value: 'cekme', label: 'Çekme Mesafesi' }]} />
        </Field>
        {z.mode === 'cekme' && (
          <>
            <div className="hint" style={{ marginBottom: 8 }}>
              Belediye imar durumu kurgusu: oturum, KML parsel şekli ve bahçe
              mesafelerinden hesaplanıp <b>zemin kata yazılır</b>; bodrumlar da bu alanla
              başlar. Kat sayısı Hmax'tan türetilir; kat tablosunda her hücre elle
              değiştirilebilir. Emsal (KAKS) bu yöntemde kullanılmaz. Ön cephe sağdaki
              krokiden seçilir.
            </div>
            <div className="grid-2">
              <Field label="Hmax" hint="Kat sayısı buradan türetilir; elle kat eklenirse uyarı verilir.">
                <Num value={z.hmax ?? 0} onChange={(val) => upd('zoning', { hmax: val || null })} suffix="m" />
              </Field>
              <span />
            </div>
            <div className="grid-3">
              <Field label="Ön Bahçe"><Num value={z.cekmeFront} step="0.5" suffix="m" onChange={(v) => upd('zoning', { cekmeFront: v })} /></Field>
              <Field label="Yan Bahçe"><Num value={z.cekmeSide} step="0.5" suffix="m" onChange={(v) => upd('zoning', { cekmeSide: v })} /></Field>
              <Field label="Arka Bahçe"><Num value={z.cekmeRear} step="0.5" suffix="m" onChange={(v) => upd('zoning', { cekmeRear: v })} /></Field>
            </div>
            <div className="grid-3">
              <Field label="Çıkma — Ön" hint="0 = çıkma yok">
                <Num value={a.cikmaOn ?? 0} step="0.1" suffix="m" onChange={(v) => setApt({ ...a, cikmaOn: v })} />
              </Field>
              <Field label="Çıkma — Arka" hint="0 = çıkma yok">
                <Num value={a.cikmaArka ?? 0} step="0.1" suffix="m" onChange={(v) => setApt({ ...a, cikmaArka: v })} />
              </Field>
              <Field label="Çıkma — Yan" hint="Her iki yana uygulanır">
                <Num value={a.cikmaYan ?? 0} step="0.1" suffix="m" onChange={(v) => setApt({ ...a, cikmaYan: v })} />
              </Field>
            </div>
            <div className="hint">
              Çıkmalar yalnızca <b>normal kat</b> alanını büyütür: oturum poligonu ilgili
              cephelerden dışa ötelenir (örn. 12×10 oturum, ön 1 + arka 1 + yan 1 → 14×12).
            </div>
            {(!input.parcel.kml || input.parcel.kml.points.length < 3) && (
              <div className="warn-box">⚠ Çekme Mesafesi yöntemi için Taşınmaz adımında KML dosyası yüklenmelidir.</div>
            )}
            {input.parcel.kml && z.cekmeFrontEdge == null && (
              <div className="note-box">👆 Sağdaki krokide ön cepheye tıklayın.</div>
            )}
          </>
        )}
        {taksKaks ? (
          <>
            <div className="grid-3">
              <Field label="TAKS"><Num value={z.taks ?? 0} onChange={(val) => upd('zoning', { taks: val || null })} step="0.01" /></Field>
              <Field label="KAKS" error={z.kaks == null ? 'Zorunlu: emsal değerini giriniz.' : null}><Num value={z.kaks ?? 0} onChange={(val) => upd('zoning', { kaks: val || null })} step="0.01" /></Field>
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
            <div className="mini-kpi">
              <div><span>Taban oturumu limiti</span><b>{fmtM2(c.footprintArea)}</b></div>
              <div><span>Emsale dahil alan</span><b>{fmtM2(c.emsalArea)}</b></div>
            </div>
            {derived != null && (
              <div className="note-box" style={{ marginTop: 8 }}>
                Hmax {z.hmax} m → zemin dahil <b>{derived} kat</b> (zemin + {derived - 1} normal kat).
                Bodrum katlar ve çatı arası piyesi bu sayıya dahil değildir.
              </div>
            )}
          </>
        ) : (
          <div className="note-box">
            Doğrudan Alan yönteminde kat alanları ve satılabilir alanlar aşağıdaki
            kat tablosuna elle girilir; imar katsayısı kullanılmaz.
          </div>
        )}
      </div>

      <ZoningKmlCard input={input} upd={upd} />

      {/* ── 2 · İLAVE SATILABİLİR ALAN (yalnızca TAKS/KAKS) ── */}
      {taksKaks && (
        <div className="card card-wide">
          <div className="card-title">2 · İlave Satılabilir Alan</div>
          <Field label="Emsale dahil olmayan satılabilir alan var mı?"
                 hint="Tip İmar Yönetmeliği gereği emsal dışı kalan ancak satılabilen alanlar">
            <Seg value={a.hasExtraSaleable} onChange={(b) => setApt({ hasExtraSaleable: b })}
                 options={[{ value: false, label: 'Yok' }, { value: true, label: 'Var' }]} />
          </Field>
          {a.hasExtraSaleable && (
            <>
              <Field label="Nasıl hesaplansın?">
                <Seg value={a.extraMode} onChange={(m) => setApt({ extraMode: m })}
                     options={[{ value: 'oran', label: 'Emsalin yüzdesi' }, { value: 'manuel', label: 'Elle giriş' }]} />
              </Field>
              {a.extraMode === 'oran' ? (
                <Field label="Oran" hint={`Emsale dahil alanın yüzdesi · ${fmtM2(c.emsalArea)} üzerinden`}>
                  <Pct value={a.extraRate} onChange={(n) => setApt({ extraRate: n })} />
                </Field>
              ) : (
                <Field label="Alan"><Num value={a.extraArea} onChange={(n) => setApt({ extraArea: n })} suffix="m²" /></Field>
              )}
              <div className="note-box">İlave satılabilir alan: <b>{fmtM2(c.extraSaleableArea)}</b></div>
            </>
          )}
        </div>
      )}

      {/* ── 3 · KAT KURGUSU ── */}
      <div className="card card-wide">
        <div className="card-title">{taksKaks ? '3' : '2'} · Kat Kurgusu</div>

        <Field label="Bodrum Kat Sayısı" hint="0-8 arası">
          <Num value={a.basementCount}
               onChange={(v) => setApt({ basementCount: Math.max(0, Math.min(8, Math.round(v))) })} suffix="kat" />
        </Field>
        {Array.from({ length: Math.min(8, Math.max(0, a.basementCount)) }, (_, i) => {
          const b = a.basements[i] ?? { use: 'konut' as const, area: null, lossRate: 0.10, saleable: null };
          const setB = (patch: Partial<typeof b>) => setApt({
            basements: Array.from({ length: Math.max(a.basements.length, i + 1) }, (_, k) =>
              k === i ? { ...(a.basements[k] ?? b), ...patch } : (a.basements[k] ?? { use: 'konut' as const, area: null, lossRate: 0.10, saleable: null })),
          });
          return (
          <div className="grid-3" key={i}>
            <Field label={`${i + 1}. Bodrum — Satılabilir alan var mı?`}>
              <Sel value={b.use}
                   onChange={(u) => setB({ use: u })}
                   options={karma ? [
                     { value: 'ortak', label: 'Yok — ortak alan (otopark vb.)' },
                     { value: 'ticari', label: 'Var — ticari' },
                     { value: 'konut', label: 'Var — konut' },
                   ] : [
                     { value: 'konut', label: 'Var — konut' },
                     { value: 'ortak', label: 'Yok — ortak alan (otopark vb.)' },
                   ]} />
            </Field>
            {taksKaks && b.use !== 'ortak' ? (
              <Field label="Emsale dahil mi?"
                     hint="Dahilse satılabiliri emsal havuzundan düşer; değilse üstüne eklenir.">
                <Seg value={b.inEmsal !== false}
                     onChange={(v) => setB({ inEmsal: v })}
                     options={[{ value: true, label: 'Dahil' }, { value: false, label: 'Değil' }]} />
              </Field>
            ) : <div />}
            {taksKaks && b.use !== 'ortak' ? (
              <Field label="Ortak Alan Payı" hint="Satılabilir = alan × (1 − oran)">
                <Pct value={b.lossRate} onChange={(n) => setB({ lossRate: n, saleable: null })} />
              </Field>
            ) : <div />}
          </div>
          );
        })}

        {taksKaks && (
          <div className="grid-2">
            <Field label={'Zemin Kat Alan Kaybı \u24D8'}
                   hint={(() => {
                     const zf = c.floors.find((f) => f.kind === 'zemin');
                     const base = 'Bina girişi, kapıcı dairesi, sığınak koridoru gibi satılamayan kısımların payı.';
                     if (!zf || zf.area <= 0) return base;
                     return `${base} Bu katta: ${fmtM2(zf.area)} kat alanının %${(a.zeminLossRate * 100).toFixed(0)}'ı düşer → satılabilir ${fmtM2(zf.saleable)}.`;
                   })()}>
              <Pct value={a.zeminLossRate} onChange={(n) => setApt({ zeminLossRate: n })} />
            </Field>
            <Field label={'Normal Kat Ortak Mahal Payı \u24D8'}
                   hint={(() => {
                     const nf = c.floors.find((f) => f.kind === 'normal');
                     const base = 'Merdiven, asansör ve kat holü payı; satılabilir daire alanının üstüne eklenir.';
                     if (!nf || nf.saleable <= 0) return base;
                     return `${base} Bu projede: ${fmtM2(nf.saleable)} satılabilir alana %${(a.normalCommonRate * 100).toFixed(0)} eklenir → kat alanı ${fmtM2(nf.area)}.`;
                   })()}>
              <Pct value={a.normalCommonRate} onChange={(n) => setApt({ normalCommonRate: n })} />
            </Field>
          </div>
        )}

        <Field label="Normal Kat Sayısı"
               hint={(taksKaks || cekmeMode) && derived != null
                 ? `Hmax'tan otomatik: ${derived - 1} normal kat · elle değiştirilebilir${cekmeMode ? '; Hmax aşılırsa uyarı verilir' : ', üst sınır yoktur'}`
                 : 'Üst sınır yoktur'}>
          <Num value={c.normalFloorCount}
               onChange={(v) => setApt({ normalCount: v > 0 ? Math.round(v) : null })} suffix="kat" />
        </Field>
        {(taksKaks || cekmeMode) && a.normalCount != null && derived != null && a.normalCount !== derived - 1 && (
          <button type="button" className="link-btn" onClick={() => setApt({ normalCount: null })}>
            Hmax türetimine dön ({derived - 1} normal kat)
          </button>
        )}

        {karma && (
          <>
            <Field label="Asma Kat var mı?"
                   hint="Zemin katın ticari uzantısı · genelde 1 adet olur">
              <Seg value={a.asmaCount > 0} onChange={(b) => setApt({ asmaCount: b ? 1 : 0 })}
                   options={[{ value: false, label: 'Yok' }, { value: true, label: 'Var' }]} />
            </Field>
            {a.asmaCount > 0 && (
              <div className="grid-2">
                <Field label="Asma Kat Sayısı">
                  <Num value={a.asmaCount}
                       onChange={(n) => setApt({ asmaCount: Math.max(1, Math.round(n)) })} suffix="adet" />
                </Field>
                {taksKaks ? (
                  <Field label="Emsale dahil mi?"
                         hint="Dahilse satılabilir alan hakkından düşülür; değilse üstüne eklenir.">
                    <Seg value={a.asmaInEmsal} onChange={(b) => setApt({ asmaInEmsal: b })}
                         options={[{ value: true, label: 'Evet' }, { value: false, label: 'Hayır' }]} />
                  </Field>
                ) : <div />}
              </div>
            )}
            {a.asmaCount > 0 && (
              <div className="note-box" style={{ marginBottom: 10 }}>
                Asma kat alanı sistem tarafından otomatik oluşturulur. Gerekirse kat tablosundan değiştirilebilir.
              </div>
            )}
          </>
        )}
        <Field label="Çatı Arası Piyesi var mı?">
          <Seg value={a.hasPiyes} onChange={(b) => setApt({ hasPiyes: b })}
               options={[{ value: false, label: 'Yok' }, { value: true, label: 'Var' }]} />
        </Field>
        {a.hasPiyes && taksKaks && (
          <div className="grid-2">
            <Field label="Emsale dahil mi?"
                   hint="Dahilse satılabilir alan hakkından pay alır; değilse toplamın üstüne eklenir.">
              <Seg value={a.piyesInEmsal} onChange={(b) => setApt({ piyesInEmsal: b })}
                   options={[{ value: true, label: 'Evet' }, { value: false, label: 'Hayır' }]} />
            </Field>
            <Field label="Piyes Oranı" hint="Normal kat satılabilir alanının yüzdesi">
              <Pct value={a.piyesRate} onChange={(n) => setApt({ piyesRate: n })} />
            </Field>
          </div>
        )}
      </div>

      <div className="card card-wide">
        <div className="card-title">{taksKaks ? '4' : '3'} · Kat Tablosu</div>
        {cekmeMode ? (
          <div className="hint" style={{ marginBottom: 10 }}>
            Zemin ve bodrumlar çekme oturumuyla, normal katlar çıkmalı alanla başlar.
            Yüzde kutusu kayıp oranıdır (satılabilir = alan × (1 − oran)); alan ve
            satılabilir hücreleri ayrıca elle yazılabilir, ↺ otomatiğe döndürür.
          </div>
        ) : taksKaks ? (
          <div className="hint" style={{ marginBottom: 10 }}>
            Değerler imar haklarından otomatik türetilmiştir; her hücre elle değiştirilebilir.
            Elle girilenler sabit kalır, kalan alan otomatik satırlara dağıtılır.
          </div>
        ) : (
          <div className="hint" style={{ marginBottom: 10 }}>
            1. Normal Kat'a girilen değerler diğer normal katlara kopyalanır; her satır tek tek düzenlenebilir.
          </div>
        )}
        <div className="floor-cards">
          {c.floors.map((f) => {
            const ortak = f.kind === 'bodrum' && a.basements[f.index - 1]?.use === 'ortak';
            return (
              <div className="prop-card floor-card" key={`${f.kind}-${f.index}`}>
                <div className="floor-card__title">{f.label}</div>
                <div className="prop-card__top">
                  <label className="pfield">
                    <span>Kat Alanı</span>
                    <span className="floor-cell">
                      <Num value={f.area}
                           onChange={(n) => setApt(patchFloor(a, f, 'area', n))} suffix="m²" />
                      {canReset(z.mode, f, f.autoArea) && (
                        <button type="button" className="cell-reset" title="Otomatik değere dön"
                                onClick={() => setApt(patchFloor(a, f, 'area', null))}>↺</button>
                      )}
                    </span>
                  </label>
                  <label className="pfield">
                    <span>Ortak Alan Payı</span>
                    {ortak ? (
                      <span className="floor-fixed">%100 ortak</span>
                    ) : (
                      <span className="rate-cell" title="Ortak alan payı · satılabilir = alan × (1 − oran)">
                        <Pct value={f.area > 0 ? Math.max(0, (f.area - f.saleable) / f.area) : 0}
                             onChange={(n) => {
                               if (cekmeMode) {
                                 if (f.kind === 'zemin') setApt({ zeminLossRate: n, zeminSaleable: null });
                                 else if (f.kind === 'bodrum') setApt({ basements: a.basements.map((b, i) => i === f.index - 1 ? { ...b, lossRate: n, saleable: null } : b) });
                                 else if (f.kind === 'piyes') setApt({ cekmePiyesLossRate: n, piyesSaleable: null });
                                 else setApt({ cekmeNormalLossRate: n, normalSaleables: a.normalSaleables.map(() => null) });
                               } else {
                                 // Diğer modlarda oran, satılabiliri doğrudan yazar
                                 setApt(patchFloor(a, f, 'saleable', Math.round(f.area * (1 - Math.max(0, Math.min(1, n))))));
                               }
                             }} />
                      </span>
                    )}
                  </label>
                  <label className="pfield">
                    <span>Satılabilir Alan</span>
                    {ortak ? (
                      <span className="floor-fixed">0 m²</span>
                    ) : (
                      <span className="floor-cell">
                        <Num value={f.saleable}
                             onChange={(n) => setApt(patchFloor(a, f, 'saleable', n))} suffix="m²" />
                        {canReset(z.mode, f, f.autoSaleable) && (
                          <button type="button" className="cell-reset" title="Otomatik değere dön"
                                  onClick={() => setApt(patchFloor(a, f, 'saleable', null))}>↺</button>
                        )}
                      </span>
                    )}
                  </label>
                  <div className="pfield pfield--ro">
                    <span>Ortak Alan</span>
                    <b>{fmtM2(Math.max(0, f.area - f.saleable))}</b>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="floor-card floor-total">
            <span className="floor-label">TOPLAM</span>
            <span className="floor-cell"><b>{fmtM2(c.totalArea)}</b> kat alanı</span>
            <span className="floor-cell"><b>{fmtM2(c.saleableTotal)}</b> satılabilir</span>
          </div>
        </div>
        {c.warnings.map((w, i) => (
          <div className="leftover" style={{ marginTop: 8 }} key={i}>{w}</div>
        ))}
        {taksKaks && c.poolRemainder > 0.5 && (
          <div className="leftover" style={{ marginTop: 8 }}>
            Elle girişler nedeniyle <b>{fmtM2(c.poolRemainder)}</b> satılabilir alan hakkı dağıtılmadı.
          </div>
        )}
        {taksKaks && c.poolRemainder < -0.5 && (
          <div className="warn-line" style={{ marginTop: 8 }}>
            Elle girilen alanlar toplamı, KAKS/TAKS'tan türeyen satılabilir alan hakkını <b>{fmtM2(Math.abs(c.poolRemainder))}</b> aşıyor
            (örn. KAKS sonradan küçültüldüyse). Kat tablosunu gözden geçirin.
          </div>
        )}
      </div>

      {/* ── ÖZET ── */}
      <div className="card result-preview">
        <div className="card-title">Alan Özeti</div>
        <div className="mini-kpi">
          <div><span>Toplam inşaat alanı</span><b>{fmtM2(c.totalArea)}</b></div>
          <div><span>Toplam satılabilir alan</span><b>{fmtM2(c.saleableTotal)}</b></div>
        </div>
        <div className="mini-kpi" style={{ marginTop: 8 }}>
          <div><span>Bahçe / açık alan</span><b>{fmtM2(c.gardenArea)}</b></div>
          <div><span>Kat adedi</span><b>{c.floors.length}</b></div>
        </div>
        <div className="mini-kpi" style={{ marginTop: 8 }}>
          <div><span>Emsale dahil alan</span><b>{fmtM2(c.emsalArea)}</b></div>
          <div><span>Taban oturumu</span><b>{fmtM2(c.footprintArea)}</b></div>
        </div>
        {c.totalArea > 0 && (c.areaByKind.bodrum + c.areaByKind.piyes) / c.totalArea > 0.35 && (
          <div className="leftover" style={{ marginTop: 10 }}>
            Toplam alanın <b>%{(((c.areaByKind.bodrum + c.areaByKind.piyes) / c.totalArea) * 100).toFixed(0)}</b>'i
            bodrum ve çatı arası piyesidir. Bu katlar normal katlarla aynı m² değerinde satılmaz;
            birim satış fiyatlarını belirlerken bu kompozisyonu dikkate alınız. <i>(Bu not rapora yazılmaz.)</i>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Plan Notları (opsiyonel)</div>
        <textarea value={z.planNotes} onChange={(ev) => upd('zoning', { planNotes: ev.target.value })}
                  placeholder="Emsal istisnaları, çıkma ve piyes kuralları — raporda aynen görünür." />
      </div>
    </div>
  );
}

/** Adım 4 — Satış kartı (kat tipine göre birim değerler) */
export function ApartmentSalesCard({ input, upd, karma = false }: P) {
  const s = input.sales.apt;
  const c = computeApartment(input.parcel, input.zoning, input.apartment, karma ? 'karma' : 'konut');
  const setApt = (patch: Partial<typeof s>) => upd('sales', { apt: { ...s, ...patch } });
  const bodrumGelir = karma
    ? c.bodrumSaleableByUse.konut * s.bodrum + c.bodrumSaleableByUse.ticari * s.bodrumTicari
    : c.saleableByKind.bodrum * s.bodrum;
  const gelir =
    bodrumGelir + c.saleableByKind.zemin * s.zemin + c.saleableByKind.asma * s.asma +
    c.saleableByKind.normal * s.normal + c.saleableByKind.piyes * s.piyes;

  return (
    <div className="card card-wide">
      <div className="card-title">Satış — Kat Tipine Göre Birim Değerler</div>
      <div className="hint" style={{ marginBottom: 10 }}>
        Satılabilir m² başına, KDV hariç. Normal katlar için tek ortalama değer girilir.
      </div>
      {karma ? (
        <>
          {c.bodrumSaleableByUse.ticari > 0 && (
            <Field label="Bodrum Kat (ticari)" hint={`Satılabilir ${fmtM2(c.bodrumSaleableByUse.ticari)}`}>
              <Num value={s.bodrumTicari} onChange={(n) => setApt({ bodrumTicari: n })} suffix="₺/m²" />
            </Field>
          )}
          {c.bodrumSaleableByUse.konut > 0 && (
            <Field label="Bodrum Kat (konut)" hint={`Satılabilir ${fmtM2(c.bodrumSaleableByUse.konut)}`}>
              <Num value={s.bodrum} onChange={(n) => setApt({ bodrum: n })} suffix="₺/m²" />
            </Field>
          )}
        </>
      ) : c.saleableByKind.bodrum > 0 && (
        <Field label="Bodrum Kat" hint={`Satılabilir ${fmtM2(c.saleableByKind.bodrum)}`}>
          <Num value={s.bodrum} onChange={(n) => setApt({ bodrum: n })} suffix="₺/m²" />
        </Field>
      )}
      <Field label={karma ? 'Zemin Kat (ticari)' : 'Zemin Kat'} hint={`Satılabilir ${fmtM2(c.saleableByKind.zemin)}`}>
        <Num value={s.zemin} onChange={(n) => setApt({ zemin: n })} suffix="₺/m²" />
      </Field>
      {karma && c.saleableByKind.asma > 0 && (
        <Field label="Asma Kat (ticari)" hint={`Satılabilir ${fmtM2(c.saleableByKind.asma)}`}>
          <Num value={s.asma} onChange={(n) => setApt({ asma: n })} suffix="₺/m²" />
        </Field>
      )}
      <Field label="Normal Kat (ortalama)" hint={`Satılabilir ${fmtM2(c.saleableByKind.normal)}`}>
        <Num value={s.normal} onChange={(n) => setApt({ normal: n })} suffix="₺/m²" />
      </Field>
      {input.apartment.hasPiyes && (
        <Field label="Çatı Arası Piyesi"
               hint={`Satılabilir ${fmtM2(c.saleableByKind.piyes)} · manzaraya göre normal kattan yüksek veya düşük olabilir`}>
          <Num value={s.piyes} onChange={(n) => setApt({ piyes: n })} suffix="₺/m²" />
        </Field>
      )}
      {gelir > 0 && (
        <div className="note-box">Yapı satış hasılatı: <b>{fmtTL(gelir)}</b></div>
      )}
    </div>
  );
}
