/**
 * TARIMSAL ÜRÜN GELİR HESABI — tek ekran modül.
 *
 * Seçim kapısı: Ekili / Dikili / Karma seçilmeden alt veriler görünmez.
 * Ada/parsel opsiyonel (KML doldurur ama dayatmaz, elle yazılabilir).
 * Ekilebilir Alan varsayılan %100; oran ↔ m² çift yönlü bağlı.
 * "Diğer" ürün: listede olmayan ürün elle yazılabilir, uzman tahminli
 * verim/fiyat/gider ile başlar (en yakın katalog ürününden), değiştirilebilir.
 * Yan Ürün: opsiyonel, tıklayınca açılır, yalnız ekili satırlarda, tekil.
 * Dikili: ağaç sayısı doğrudan girilir + ürün seçilince hesap başlar;
 * dikim aralığı yalnız yardımcı öneri aracıdır. "Farklı Ağaç Ekle" ile çoğalır.
 * Amorti yılı varsayılan 25. Değer en yakın 5.000 TL'ye yuvarlanır.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { computeAgri, suggestTreeCount, type AgriInput, type CropRow, type Byproduct } from './engine';
import { FIELD_CROPS, TREE_CROPS, BYPRODUCTS } from './catalog';
import { BRAND } from '../brand/brand';
import { parseKml } from '../geo/kml';
import { readDataSheet } from '../export/excelImport';
import { downloadAgriPdf } from './pdf';
import { downloadAgriExcel } from './excel';

const DRAFT = 'arsaplan-agri-draft-v2';
const uid = () => Math.random().toString(36).slice(2, 9);
const TL = (v: number) => Math.round(v).toLocaleString('tr-TR') + ' ₺';
const DIGER = 'Diğer…';

function defaultRow(kind: CropRow['kind']): CropRow {
  const c = kind === 'ekili' ? FIELD_CROPS[0] : TREE_CROPS[TREE_CROPS.length - 1];
  return { id: uid(), kind, name: c.name, areaM2: 0, treeCount: 0, yieldPerUnit: c.yieldPerUnit, price: c.price, expensePct: c.expensePct, byproduct: null };
}

type Mode = 'ekili' | 'dikili' | 'karma';
type St = AgriInput & { mode: Mode | null };

const DEFAULT: St = { mode: null, parcelArea: 10000, arablePct: 100, amortYears: 25, rows: [], mahalle: '', ada: '', parsel: '', fromKml: false };

export function AgriApp({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<St>(() => {
    try { const s = localStorage.getItem(DRAFT); if (s) return JSON.parse(s); } catch { /* yok */ }
    return DEFAULT;
  });
  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify(state)); } catch { /* dolu */ } }, [state]);

  const [spacing, setSpacing] = useState({ a: 4, b: 5, edgeFull: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const result = useMemo(() => computeAgri(state), [state]);

  const patch = (p: Partial<St>) => setState((s) => ({ ...s, ...p }));
  const patchRow = (id: string, p: Partial<CropRow>) =>
    patch({ rows: state.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const refOf = (r: CropRow) => (r.kind === 'ekili' ? FIELD_CROPS : TREE_CROPS).find((x) => x.name === r.name);

  const applyCatalog = (id: string, kind: CropRow['kind'], name: string) => {
    if (name === DIGER) { patchRow(id, { name: '' }); return; }
    const c = (kind === 'ekili' ? FIELD_CROPS : TREE_CROPS).find((x) => x.name === name);
    if (c) patchRow(id, { name, yieldPerUnit: c.yieldPerUnit, price: c.price, expensePct: c.expensePct });
    else patchRow(id, { name });
  };

  const setMode = (mode: Mode) => {
    const first = mode === 'dikili' ? defaultRow('dikili') : defaultRow('ekili');
    patch({ mode, rows: [first] });
  };

  async function onKml(f: File) {
    try {
      const parsed = parseKml(await f.text());
      if (!parsed) { alert('KML okunamadı.'); return; }
      const area = parsed.deedArea || parsed.polygonArea || 0;
      patch({
        parcelArea: area > 0 ? Math.round(area) : state.parcelArea,
        mahalle: parsed.mahalle || state.mahalle,
        ada: parsed.ada || state.ada,
        parsel: parsed.parsel || state.parsel,
        fromKml: true,
      });
    } catch { alert('KML okunamadı.'); }
  }

  const arableNow = state.parcelArea * state.arablePct / 100;
  const treeSuggestion = suggestTreeCount(arableNow, spacing.a, spacing.b, spacing.edgeFull);

  function addByproduct(rowId: string) {
    const row = state.rows.find((x) => x.id === rowId);
    const ref = row ? FIELD_CROPS.find((c) => c.name === row.name) : undefined;
    const hinted = ref?.byproductHint ? BYPRODUCTS.find((b) => b.name === ref.byproductHint) : undefined;
    const src = hinted ?? BYPRODUCTS[0];
    const b: Byproduct = { name: src.name, yieldPerUnit: src.yieldPerUnit, price: src.price, expensePct: src.expensePct };
    patchRow(rowId, { byproduct: b });
  }
  const applyByproductCatalog = (rowId: string, name: string) => {
    if (name === DIGER) { patchRow(rowId, { byproduct: { name: '', yieldPerUnit: 0, price: 0, expensePct: 0 } }); return; }
    const b = BYPRODUCTS.find((x) => x.name === name);
    if (b) patchRow(rowId, { byproduct: { name: b.name, yieldPerUnit: b.yieldPerUnit, price: b.price, expensePct: b.expensePct } });
  };

  const busyRef = useRef(false);
  async function onPdf() {
    if (busyRef.current) return;
    busyRef.current = true;
    try { await downloadAgriPdf(state, result); } finally { busyRef.current = false; }
  }
  async function onExcel() {
    if (busyRef.current) return;
    busyRef.current = true;
    try { await downloadAgriExcel(state, result); } finally { busyRef.current = false; }
  }

  return (
    <div className="app agri-app">
      <div className="topbar no-print"><div className="topbar-inner">
        <img src={`${import.meta.env.BASE_URL}dora-logo.png`} alt={BRAND.company} className="topbar-logo" />
        <button type="button" className="btn-ghost" onClick={onBack}>← Ana Sayfaya Dön</button>
        <button type="button" className="btn-ghost" title="Tüm alanları temizler"
                onClick={() => { if (window.confirm('Sayfa sıfırlansın mı? Tüm girdiler silinecek.')) { localStorage.removeItem(DRAFT); setState(DEFAULT); } }}>
          ↺ Sayfayı Sıfırla
        </button>
        <label className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          📂 Excel Yükle
          <input type="file" accept=".xlsx" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const data = await readDataSheet<St>(f);
            if (data) setState(data); else alert('Bu Excel dosyasında ArsaPlan verisi bulunamadı.');
            e.currentTarget.value = '';
          }} />
        </label>
      </div></div>
      <div className="hint" style={{ margin: "6px 0 0" }}>Excel'e görünmeyen bir veri sayfası eklenir; aynı dosyayı "Excel Yükle" ile geri yükleyince tüm girdiler birebir doldurulur.</div>

      {state.rows.length > 0 && (
        <div className="hotel-summary-sticky no-print">
          <div className="hotel-summary-inner">
            <div><span>Toplam Brüt Gelir</span><b>{TL(result.totalGross)}</b></div>
            <div><span>Toplam Net Gelir</span><b>{TL(result.totalNet)}</b></div>
            <div><span>Yaklaşık Değer</span><b>{TL(result.value)}</b></div>
          </div>
        </div>
      )}

      <div className="step" style={{ paddingBottom: 76 }}>
        <div className="step-head">
          <div className="step-eyebrow">Tarımsal Ürün Gelir Hesabı</div>
          <div className="step-title">Ürün Deseni ve Gelir</div>
          <div className="step-desc">Tüm öneriler yönlendiricidir; her kutu serbestçe değiştirilebilir.</div>
        </div>

        {/* ── SEÇİM KAPISI: mod seçilmeden hiçbir veri görünmez ── */}
        {!state.mode ? (
          <div className="card">
            <div className="card-title">Ne Tür Bir Arazi?</div>
            <div className="choice-grid">
              <button type="button" className="choice" onClick={() => setMode('ekili')}>
                <div className="choice-name">Ekili Ürün</div>
                <div className="choice-desc">Tarla — buğday, arpa, mısır, sebze… (m² bazlı)</div>
              </button>
              <button type="button" className="choice" onClick={() => setMode('dikili')}>
                <div className="choice-name">Dikili Ürün</div>
                <div className="choice-desc">Ağaç — zeytin, kiraz, ceviz… (adet bazlı)</div>
              </button>
              <button type="button" className="choice" onClick={() => setMode('karma')}>
                <div className="choice-name">Karma</div>
                <div className="choice-desc">Aynı parselde hem tarla hem ağaç</div>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Parsel</span>
                <button type="button" className="linklike" onClick={() => patch({ mode: null })}>↺ Türü değiştir</button>
              </div>
              <div className="hrow-labeled">
                <label className="pfield"><span>Mahalle <em>(opsiyonel)</em></span>
                  <input value={state.mahalle ?? ''} placeholder="—" onChange={(e) => patch({ mahalle: e.target.value })} /></label>
                <label className="pfield pfield--s"><span>Ada <em>(opsiyonel)</em></span>
                  <input value={state.ada ?? ''} placeholder="—" onChange={(e) => patch({ ada: e.target.value })} /></label>
                <label className="pfield pfield--s"><span>Parsel <em>(opsiyonel)</em></span>
                  <input value={state.parsel ?? ''} placeholder="—" onChange={(e) => patch({ parsel: e.target.value })} /></label>
                <label className="pfield"><span>Parsel Alanı m² {state.fromKml && <em title="KML'den geldi, değiştirilebilir">(KML)</em>}</span>
                  <input type="number" value={state.parcelArea || ''}
                         onChange={(e) => patch({ parcelArea: Number(e.target.value) || 0, fromKml: false })} /></label>
                <label className="pfield"><span>KML (TKGM)</span>
                  <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>Dosya Yükle</button>
                  <input ref={fileRef} type="file" accept=".kml" hidden
                         onChange={(e) => { const f = e.target.files?.[0]; if (f) onKml(f); e.currentTarget.value = ''; }} />
                </label>
              </div>
              <div className="hrow-labeled" style={{ marginTop: 10 }}>
                <label className="pfield"><span>Ekilebilir Alan %</span>
                  <input type="number" value={state.arablePct || ''}
                         onChange={(e) => {
                           const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                           patch({ arablePct: pct });
                         }} /></label>
                <label className="pfield"><span>Ekilebilir Alan m²</span>
                  <input type="number" value={result.arableArea || ''}
                         onChange={(e) => {
                           const m2v = Math.max(0, Number(e.target.value) || 0);
                           const pct = state.parcelArea > 0 ? Math.min(100, R2(m2v / state.parcelArea * 100)) : 0;
                           patch({ arablePct: pct });
                         }} /></label>
                {state.mode === 'karma' && (
                  <div className="pfield pfield--ro"><span>Kalan Alan</span>
                    <b>{result.remainingArea.toLocaleString('tr-TR')} m²</b></div>
                )}
              </div>
            </div>

            {state.mode !== 'ekili' && (
              <div className="card">
                <div className="card-title">Ağaç Aralığından Adet Önerisi <em style={{ fontWeight: 400, fontSize: 12, opacity: .7 }}>(opsiyonel yardımcı araç — ağaç sayısını doğrudan da yazabilirsiniz)</em></div>
                <div className="hrow-labeled">
                  <label className="pfield"><span>Sıra Arası (m)</span>
                    <input type="number" value={spacing.a} onChange={(e) => setSpacing({ ...spacing, a: Number(e.target.value) || 0 })} /></label>
                  <label className="pfield"><span>Ağaç Arası (m)</span>
                    <input type="number" value={spacing.b} onChange={(e) => setSpacing({ ...spacing, b: Number(e.target.value) || 0 })} /></label>
                  <label className="pfield"><span>Kenar Payı</span>
                    <select value={spacing.edgeFull ? '1' : '0'} onChange={(e) => setSpacing({ ...spacing, edgeFull: e.target.value === '1' })}>
                      <option value="0">Yarım aralık (standart)</option>
                      <option value="1">Tam mesafe (muhafazakâr)</option>
                    </select></label>
                  <div className="pfield pfield--ro"><span>Öneri (ekilebilir alanda)</span><b>{treeSuggestion.toLocaleString('tr-TR')} ağaç</b></div>
                  <label className="pfield"><span>Uygula</span>
                    <select value="" onChange={(e) => { if (e.target.value) patchRow(e.target.value, { treeCount: treeSuggestion }); }}>
                      <option value="">Satır seç…</option>
                      {state.rows.filter((r) => r.kind === 'dikili').map((r) => (
                        <option key={r.id} value={r.id}>{r.name || '(isimsiz)'}</option>))}
                    </select></label>
                </div>
                <div className="hint">Komşu sınırına yarım aralık payı standarttır. Sayı öneridir; satırda elle değiştirin.</div>
              </div>
            )}

            <div className="card">
              <div className="card-title">Ürün Satırları</div>
              {result.rows.map((r) => {
                const ref = refOf(r);
                const isCustom = !ref && r.kind === 'ekili' ? true : !ref;
                return (
                  <div className="prop-card" key={r.id}>
                    <div className="prop-card__top">
                      {state.mode === 'karma' && (
                        <label className="pfield pfield--s"><span>Tip</span>
                          <select value={r.kind} onChange={(e) => {
                            const kind = e.target.value as CropRow['kind'];
                            const c = (kind === 'ekili' ? FIELD_CROPS : TREE_CROPS)[0];
                            patchRow(r.id, { kind, name: c.name, yieldPerUnit: c.yieldPerUnit, price: c.price, expensePct: c.expensePct, byproduct: null });
                          }}>
                            <option value="ekili">Ekili</option><option value="dikili">Dikili</option>
                          </select></label>
                      )}
                      <label className="pfield"><span>Ürün {ref && <em title={ref.note ?? ''}>({ref.source})</em>}</span>
                        <select value={isCustom ? DIGER : r.name} onChange={(e) => applyCatalog(r.id, r.kind, e.target.value)}>
                          {(r.kind === 'ekili' ? FIELD_CROPS : TREE_CROPS).map((c) => (
                            <option key={c.name} value={c.name}>{c.name}</option>))}
                          <option value={DIGER}>{DIGER}</option>
                        </select>
                        {isCustom && (
                          <input style={{ marginTop: 6 }} placeholder="Ürün adını yazın (örn. Ispanak)"
                                 value={r.name} onChange={(e) => patchRow(r.id, { name: e.target.value })} />
                        )}
                      </label>
                      {r.kind === 'ekili' ? (
                        <label className="pfield"><span>Ayrılan Alan m²</span>
                          <input type="number" value={r.areaM2 || ''} onChange={(e) => patchRow(r.id, { areaM2: Number(e.target.value) || 0 })} /></label>
                      ) : (
                        <>
                          <label className="pfield"><span>Ağaç Adedi</span>
                            <input type="number" value={r.treeCount || ''} onChange={(e) => patchRow(r.id, { treeCount: Number(e.target.value) || 0 })} /></label>
                          <label className="pfield"><span>Alan m² <em>(opsiyonel)</em></span>
                            <input type="number" value={r.areaM2 || ''} placeholder="—"
                                   onChange={(e) => patchRow(r.id, { areaM2: Number(e.target.value) || 0 })} /></label>
                        </>
                      )}
                      <label className="pfield"><span>{r.kind === 'ekili' ? 'Verim kg/dönüm' : 'Verim kg/ağaç'}</span>
                        <input type="number" value={r.yieldPerUnit || ''} onChange={(e) => patchRow(r.id, { yieldPerUnit: Number(e.target.value) || 0 })} /></label>
                      <label className="pfield"><span>Fiyat TL/kg</span>
                        <input type="number" value={r.price || ''} onChange={(e) => patchRow(r.id, { price: Number(e.target.value) || 0 })} /></label>
                      <label className="pfield pfield--s"><span>Gider %</span>
                        <input type="number" value={r.expensePct || ''} onChange={(e) => patchRow(r.id, { expensePct: Number(e.target.value) || 0 })} /></label>
                    </div>
                    <div className="prop-card__bottom">
                      <div className="pfield pfield--ro"><span>{r.kind === 'ekili' ? 'Dönüm' : 'Ağaç'}</span><b>{r.units.toLocaleString('tr-TR')}</b></div>
                      <div className="pfield pfield--ro"><span>Brüt Gelir</span><b>{TL(r.gross)}</b></div>
                      <div className="pfield pfield--ro"><span>Gider</span><b>{TL(r.expense)}</b></div>
                      <div className="pfield pfield--ro"><span>Net Gelir</span><b>{TL(r.netWithByproduct)}</b></div>
                      {r.kind === 'ekili' && !r.byproduct && (
                        <button type="button" className="btn-ghost" onClick={() => addByproduct(r.id)}>➕ Yan Ürün Ekle</button>
                      )}
                      <button type="button" className="b-del" title="Satırı sil"
                              onClick={() => patch({ rows: state.rows.filter((x) => x.id !== r.id) })}>✕</button>
                    </div>

                    {r.kind === 'ekili' && r.byproduct && (
                      <div className="prop-card__bottom byproduct-row">
                        <label className="pfield"><span>Yan Ürün</span>
                          <select value={BYPRODUCTS.some((b) => b.name === r.byproduct!.name) ? r.byproduct!.name : DIGER}
                                  onChange={(e) => applyByproductCatalog(r.id, e.target.value)}>
                            {BYPRODUCTS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                            <option value={DIGER}>{DIGER}</option>
                          </select>
                          {!BYPRODUCTS.some((b) => b.name === r.byproduct!.name) && (
                            <input style={{ marginTop: 6 }} placeholder="Yan ürün adı"
                                   value={r.byproduct!.name}
                                   onChange={(e) => patchRow(r.id, { byproduct: { ...r.byproduct!, name: e.target.value } })} />
                          )}
                        </label>
                        <label className="pfield pfield--s"><span>Verim kg/dönüm</span>
                          <input type="number" value={r.byproduct!.yieldPerUnit || ''}
                                 onChange={(e) => patchRow(r.id, { byproduct: { ...r.byproduct!, yieldPerUnit: Number(e.target.value) || 0 } })} /></label>
                        <label className="pfield pfield--s"><span>Fiyat TL/kg</span>
                          <input type="number" value={r.byproduct!.price || ''}
                                 onChange={(e) => patchRow(r.id, { byproduct: { ...r.byproduct!, price: Number(e.target.value) || 0 } })} /></label>
                        <label className="pfield pfield--s"><span>Gider %</span>
                          <input type="number" value={r.byproduct!.expensePct || ''}
                                 onChange={(e) => patchRow(r.id, { byproduct: { ...r.byproduct!, expensePct: Number(e.target.value) || 0 } })} /></label>
                        <div className="pfield pfield--ro"><span>Yan Ürün Net</span><b>{TL(r.byproductResult?.net ?? 0)}</b></div>
                        <button type="button" className="b-del" title="Yan ürünü kaldır" onClick={() => patchRow(r.id, { byproduct: null })}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button type="button" className="btn-ghost"
                      onClick={() => patch({ rows: [...state.rows, defaultRow(state.mode === 'dikili' ? 'dikili' : state.mode === 'karma' ? 'dikili' : 'ekili')] })}>
                {state.mode === 'dikili' ? '➕ Farklı Ağaç Ekle' : '➕ Ürün Satırı Ekle'}
              </button>
              {state.mode !== 'dikili' && (
                <div className={result.areaOk ? 'hint' : 'warn-line'}>
                  Alan bütçesi: {(result.ekiliAllocated + result.dikiliAllocated).toLocaleString('tr-TR')} / {result.arableArea.toLocaleString('tr-TR')} m² dağıtıldı
                  {result.dikiliAllocated > 0 && ` (ekili ${result.ekiliAllocated.toLocaleString('tr-TR')} + dikili ${result.dikiliAllocated.toLocaleString('tr-TR')})`}.
                </div>
              )}
              {result.warnings.map((w, i) => <div className="warn-line" key={i}>{w}</div>)}
            </div>

            <div className="card result-card">
              <div className="card-title">Sonuç</div>
              <div className="hrow-labeled">
                <div className="pfield pfield--ro"><span>Toplam Brüt Gelir/yıl</span><b>{TL(result.totalGross)}</b></div>
                <div className="pfield pfield--ro"><span>Toplam Net Gelir/yıl</span><b>{TL(result.totalNet)}</b></div>
                <label className="pfield pfield--s"><span>Amorti Yılı</span>
                  <input type="number" title="Bu bölgede bu tür arazi kaç yılda kendini amorti eder?"
                         value={state.amortYears || ''} onChange={(e) => patch({ amortYears: Number(e.target.value) || 0 })} /></label>
                <div className="pfield pfield--ro pfield--big"><span>Yaklaşık Değer</span><b>{TL(result.value)}</b></div>
              </div>
                            <div className="export-row no-print">
                <button type="button" className="btn-ghost" onClick={onPdf}>📄 PDF İndir</button>
                <button type="button" className="btn-ghost" onClick={onExcel}>📊 Excel İndir</button>
              </div>
            </div>
          </>
        )}

        <div className="stamp">{BRAND.preparedBy}<br />{BRAND.developerLine} · Tarımsal Ürün Gelir Modülü</div>
      </div>

      <div className="navbar no-print">
        <div className="navbar-inner">
          <button type="button" className="btn btn-ghost" onClick={onBack}>← Ana Sayfaya Dön</button>
        </div>
      </div>
    </div>
  );
}

function R2(v: number) { return Math.round(v * 100) / 100; }
