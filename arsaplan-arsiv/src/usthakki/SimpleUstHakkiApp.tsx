/**
 * ÜST HAKKI — YÖNTEM 1 (Toplam Değerden) VE YÖNTEM 2 (Sadece Arsa Değeri
 * Üzerinden). İkisi de aynı Kimlik + Maliyet Yaklaşımı + Süre girişini
 * paylaşır; yalnız Sonuç kartındaki formül farklıdır. Ara hesaplar
 * (2/3, oranlama) PDF/Excel'de gösterilmez — yalnız nihai değer(ler).
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  computeWholeValueMethod, computeLandOnlyMethod, BUILDING_TYPES,
  type BuildingValueRow,
} from './simpleCostEngine';
import { BRAND } from '../brand/brand';
import { parseKml } from '../geo/kml';
import { readDataSheet } from '../export/excelImport';
import { Num } from '../ui/fields';
import { downloadSimpleUstHakkiPdf } from './simplePdf';
import { downloadSimpleUstHakkiExcel } from './simpleExcel';

const uid = () => Math.random().toString(36).slice(2, 9);
const R2 = (v: number) => Math.round(v * 100) / 100;
type Method = 'toplam' | 'arsa';
type Currency = 'TL' | 'USD' | 'EUR';
const CUR_SYM: Record<Currency, string> = { TL: '₺', USD: '$', EUR: '€' };
const DEFAULT_BUILDING: BuildingValueRow = { id: uid(), type: BUILDING_TYPES[2], area: 0, unitCost: 0, depreciationPct: 100 };

interface S {
  hotelName: string; mahalle: string; ada: string; parsel: string; parcelArea: number; fromKml: boolean;
  currency: Currency; fxRate: number;
  landUnitValue: number; buildings: BuildingValueRow[];
  sureUnit: 'yil' | 'ay'; kalanSure: number; toplamSure: number;
}
const DEFAULT: S = {
  hotelName: '', mahalle: '', ada: '', parsel: '', parcelArea: 0, fromKml: false,
  currency: 'TL', fxRate: 1,
  landUnitValue: 0, buildings: [DEFAULT_BUILDING],
  sureUnit: 'yil', kalanSure: 0, toplamSure: 0,
};

export function SimpleUstHakkiApp({ method, onBack }: { method: Method; onBack: () => void }) {
  const DRAFT = `arsaplan-usthakki-simple-${method}-v1`;
  const [state, setState] = useState<S>(() => {
    try { const s = localStorage.getItem(DRAFT); if (s) return JSON.parse(s); } catch { /* yok */ }
    return DEFAULT;
  });
  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify(state)); } catch { /* dolu */ } }, [state]);

  const fileRef = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<S>) => setState((s) => ({ ...s, ...p }));
  const patchBuilding = (id: string, p: Partial<BuildingValueRow>) =>
    patch({ buildings: state.buildings.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  const cur = CUR_SYM[state.currency];
  const TL = (v: number) => Math.round(v).toLocaleString('tr-TR') + ' ' + cur;
  const costInput = { parcelArea: state.parcelArea, landUnitValue: state.landUnitValue, buildings: state.buildings };

  const whole = useMemo(() => computeWholeValueMethod(costInput, state.kalanSure, state.toplamSure),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.parcelArea, state.landUnitValue, state.buildings, state.kalanSure, state.toplamSure]);
  const land = useMemo(() => computeLandOnlyMethod(costInput, state.kalanSure, state.toplamSure),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.parcelArea, state.landUnitValue, state.buildings, state.kalanSure, state.toplamSure]);
  const r = method === 'toplam' ? whole : land;
  const finalValue = method === 'toplam' ? whole.ustHakkiValue : land.nihaiUstHakkiDegeri;

  async function onKml(f: File) {
    try {
      const parsed = parseKml(await f.text());
      if (!parsed) { alert('KML okunamadı.'); return; }
      const area = parsed.deedArea || parsed.polygonArea || 0;
      patch({
        parcelArea: area > 0 ? Math.round(area) : state.parcelArea,
        mahalle: parsed.mahalle || state.mahalle, ada: parsed.ada || state.ada, parsel: parsed.parsel || state.parsel,
        fromKml: true,
      });
    } catch { alert('KML okunamadı.'); }
  }

  const title = method === 'toplam' ? 'Toplam Değer Esaslı Üst Hakkı Tespiti' : 'Arsa Değeri Esaslı Üst Hakkı Tespiti';
  const busyRef = useRef(false);
  async function onPdf() { if (busyRef.current) return; busyRef.current = true; try { await downloadSimpleUstHakkiPdf(method, state, whole, land); } finally { busyRef.current = false; } }
  async function onExcel() { if (busyRef.current) return; busyRef.current = true; try { await downloadSimpleUstHakkiExcel(method, state, whole, land); } finally { busyRef.current = false; } }

  return (
    <div className="app usthakki-app">
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
            const data = await readDataSheet<S>(f);
            if (data) setState(data); else alert('Bu Excel dosyasında ArsaPlan verisi bulunamadı.');
            e.currentTarget.value = '';
          }} />
        </label>
      </div></div>
      <div className="hint" style={{ margin: "6px 0 0" }}>Excel'e görünmeyen bir veri sayfası eklenir; aynı dosyayı "Excel Yükle" ile geri yükleyince tüm girdiler birebir doldurulur.</div>

      {state.parcelArea > 0 && (
        <div className="hotel-summary-sticky no-print">
          <div className="hotel-summary-inner">
            <div><span>Maliyet Toplamı</span><b>{TL(r.cost.totalValue)}</b></div>
            <div><span>Taşınmazın Değeri</span><b>{TL(finalValue)}</b></div>
          </div>
        </div>
      )}

      <div className="step" style={{ paddingBottom: 76 }}>
        <div className="step-head">
          <div className="step-eyebrow">Üst Hakkı Değerleme</div>
          <div className="step-title">{title}</div>
          <div className="step-desc">Ara hesaplar (2/3 oranı, süre oranlaması) yalnızca uygulama içinde görünür; PDF/Excel'de sadece nihai değer(ler) yer alır.</div>
        </div>

        <div className="card">
          <div className="card-title">Kimlik</div>
          <div className="hrow-labeled">
            <label className="pfield"><span>Otel Adı <em>(opsiyonel)</em></span>
              <input value={state.hotelName} placeholder="—" onChange={(e) => patch({ hotelName: e.target.value })} /></label>
            <label className="pfield pfield--s"><span>Mahalle <em>(opsiyonel)</em></span>
              <input value={state.mahalle} placeholder="—" onChange={(e) => patch({ mahalle: e.target.value })} /></label>
            <label className="pfield pfield--s"><span>Ada <em>(opsiyonel)</em></span>
              <input value={state.ada} placeholder="—" onChange={(e) => patch({ ada: e.target.value })} /></label>
            <label className="pfield pfield--s"><span>Parsel <em>(opsiyonel)</em></span>
              <input value={state.parsel} placeholder="—" onChange={(e) => patch({ parsel: e.target.value })} /></label>
            <label className="pfield"><span>Parsel Alanı m² <b style={{ color: '#c0392b' }}>*zorunlu</b> {state.fromKml && <em>(KML)</em>}</span>
              <Num value={state.parcelArea} onChange={(n) => patch({ parcelArea: n, fromKml: false })} /></label>
            <label className="pfield"><span>KML (TKGM)</span>
              <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>Dosya Yükle</button>
              <input ref={fileRef} type="file" accept=".kml" hidden
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) onKml(f); e.currentTarget.value = ''; }} />
            </label>
          </div>
          {state.parcelArea <= 0 && <div className="warn-line">Parsel Alanı zorunludur — girilmeden hesap yapılamaz.</div>}
        </div>

        <div className="card">
          <div className="card-title">Maliyet Yaklaşımı</div>
          <div className="hrow-labeled">
            <label className="pfield pfield--s"><span>Para Birimi</span>
              <select value={state.currency} onChange={(e) => patch({ currency: e.target.value as Currency })}>
                <option value="TL">TL (₺)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
              </select></label>
            {state.currency !== 'TL' && (
              <label className="pfield pfield--s"><span>Kur (1 {state.currency} = ? ₺)</span>
                <Num value={state.fxRate} onChange={(n) => patch({ fxRate: n })} /></label>
            )}
            <label className="pfield"><span>Arsa m² Birim Değeri ({cur})</span>
              <Num value={state.landUnitValue} onChange={(n) => patch({ landUnitValue: n })} /></label>
            <div className="pfield pfield--ro"><span>Arsa Değeri</span><b>{TL(r.cost.landValue)}</b></div>
          </div>

          <div className="card-title" style={{ marginTop: 14, fontSize: 13 }}>Yapılar</div>
          {state.buildings.map((b) => (
            <div className="prop-card" key={b.id}>
              <div className="prop-card__top">
                <label className="pfield"><span>Yapı Türü</span>
                  <select value={BUILDING_TYPES.includes(b.type) ? b.type : 'Diğer'}
                          onChange={(e) => patchBuilding(b.id, { type: e.target.value })}>
                    {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {(!BUILDING_TYPES.includes(b.type) || b.type === 'Diğer') && (
                    <input style={{ marginTop: 6 }} placeholder="Yapı adını yazın"
                           value={BUILDING_TYPES.includes(b.type) ? '' : b.type}
                           onChange={(e) => patchBuilding(b.id, { type: e.target.value || 'Diğer' })} />
                  )}</label>
                <label className="pfield pfield--s"><span>Yapı Alanı m²</span>
                  <Num value={b.area} onChange={(n) => patchBuilding(b.id, { area: n })} /></label>
                <label className="pfield pfield--s"><span>Birim Maliyet ({cur})</span>
                  <Num value={b.unitCost} onChange={(n) => patchBuilding(b.id, { unitCost: n })} /></label>
                <label className="pfield pfield--s"><span>Amortisman %</span>
                  <Num value={b.depreciationPct} onChange={(n) => patchBuilding(b.id, { depreciationPct: n })} /></label>
                <div className="pfield pfield--ro"><span>Yapı Değeri</span>
                  <b>{TL(Math.max(0, b.area) * Math.max(0, b.unitCost) * Math.min(100, Math.max(0, b.depreciationPct)) / 100)}</b></div>
                {state.buildings.length > 1 && (
                  <button type="button" className="b-del" onClick={() => patch({ buildings: state.buildings.filter((x) => x.id !== b.id) })}>✕</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => patch({ buildings: [...state.buildings, { ...DEFAULT_BUILDING, id: uid() }] })}>➕ Yapı Ekle</button>

          <div className="hrow-labeled" style={{ marginTop: 12 }}>
            <div className="pfield pfield--ro"><span>Toplam Yapı Değeri</span><b>{TL(r.cost.buildingValues)}</b></div>
            <div className="pfield pfield--ro pfield--big"><span>TOPLAM DEĞER</span><b>{TL(r.cost.totalValue)}</b></div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Üst Hakkı Süresi</div>
          <div className="hrow-labeled">
            <label className="pfield pfield--s"><span>Süre Birimi</span>
              <select value={state.sureUnit} onChange={(e) => patch({ sureUnit: e.target.value as S['sureUnit'] })}>
                <option value="yil">Yıl</option><option value="ay">Ay</option>
              </select></label>
            <label className="pfield pfield--s"><span>Kalan Süre ({state.sureUnit === 'ay' ? 'ay' : 'yıl'})</span>
              <Num value={state.kalanSure} onChange={(n) => patch({ kalanSure: R2(n) })} /></label>
            <label className="pfield pfield--s"><span>Toplam Süre ({state.sureUnit === 'ay' ? 'ay' : 'yıl'})</span>
              <Num value={state.toplamSure} onChange={(n) => patch({ toplamSure: R2(n) })} /></label>
          </div>
          {r.warnings.map((w, i) => <div className="warn-line" key={i}>{w}</div>)}
        </div>

        <div className="card result-card">
          <div className="card-title">Sonuç</div>
          {method === 'toplam' ? (
            <div className="hrow-labeled">
              <div className="pfield pfield--ro"><span>Taşınmazın Değeri</span><b>{TL(whole.cost.totalValue)}</b></div>
              <div className="pfield pfield--ro pfield--big"><span>ÜST HAKKI DEĞERİ</span><b>{TL(whole.ustHakkiValue)}</b></div>
              {state.currency !== 'TL' && (
                <div className="pfield pfield--ro"><span>TL Karşılığı</span><b>{Math.round(whole.ustHakkiValue * (state.fxRate || 1)).toLocaleString('tr-TR')} ₺</b></div>
              )}
            </div>
          ) : (
            <div className="hrow-labeled">
              <div className="pfield pfield--ro"><span>Üst Hakkı Arsa Değeri</span><b>{TL(land.ustHakkiArsaDegeri)}</b></div>
              <div className="pfield pfield--ro"><span>+ Bina Değeri</span><b>{TL(land.buildingValueAdded)}</b></div>
              <div className="pfield pfield--ro pfield--big"><span>NİHAİ ÜST HAKKI DEĞERİ</span><b>{TL(land.nihaiUstHakkiDegeri)}</b></div>
              {state.currency !== 'TL' && (
                <div className="pfield pfield--ro"><span>TL Karşılığı</span><b>{Math.round(land.nihaiUstHakkiDegeri * (state.fxRate || 1)).toLocaleString('tr-TR')} ₺</b></div>
              )}
            </div>
          )}
          <div className="export-row no-print">
            <button type="button" className="btn-ghost" onClick={onPdf}>📄 PDF İndir</button>
            <button type="button" className="btn-ghost" onClick={onExcel}>📊 Excel İndir</button>
          </div>
        </div>

        <div className="stamp">{BRAND.preparedBy}<br />{BRAND.developerLine} · {title}</div>
      </div>

      <div className="navbar no-print">
        <div className="navbar-inner">
          <button type="button" className="btn btn-ghost" onClick={onBack}>← Ana Sayfaya Dön</button>
        </div>
      </div>
    </div>
  );
}
