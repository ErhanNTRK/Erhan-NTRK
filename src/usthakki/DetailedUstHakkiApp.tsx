/**
 * AYRINTILI ÜST HAKKI DEĞER ANALİZİ — tek ekran.
 * Standart Hesap'tan tamamen ayrı, otel-tarzı gelir/gider zincirli DCF.
 * 2026-07-31 revizyonu: döviz tam yaygınlaştırıldı, Oda Fiyat Artış Oranı
 * Oda Gelirleri kartına taşındı, Maliyet Yaklaşımı Arsa+Yapı satırlarından
 * hesaplanır hale geldi, tek iskonto oranı (risksiz+prim ayrımı kaldırıldı).
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import { computeDetailedUstHakki, BUILDING_TYPES, type DetailedUstHakkiInput, type DetailedRoomRow, type BuildingCostRow } from './detailedEngine';
import { BRAND } from '../brand/brand';
import { parseKml } from '../geo/kml';
import { readDataSheet } from '../export/excelImport';
import { Num } from '../ui/fields';
import { downloadDetailedUstHakkiPdf } from './detailedPdf';
import { downloadDetailedUstHakkiExcel } from './detailedExcel';

const DRAFT = 'arsaplan-usthakki-detailed-draft-v2';
const uid = () => Math.random().toString(36).slice(2, 9);
const R2 = (v: number) => Math.round(v * 100) / 100;
const CUR_SYM: Record<S['currency'], string> = { TL: '₺', USD: '$', EUR: '€' };

const DEFAULT_ROOM: DetailedRoomRow = { id: uid(), name: 'Standart Oda', count: 0, price: 0, occupancyPct: 60, days: 365 };
const DEFAULT_BUILDING: BuildingCostRow = { id: uid(), type: BUILDING_TYPES[2], area: 0, unitCost: 0 };

const DEFAULT: DetailedUstHakkiInput & { sureUnit: 'yil' | 'ay' } = {
  hotelName: '', ada: '', parsel: '', parcelArea: 0, fromKml: false,
  sureUnit: 'yil', kalanSureYil: 31, toplamSureYil: 49,
  currency: 'TL', fxRate: 1,
  rooms: [DEFAULT_ROOM], roomGrowthPct: 3,
  foodIncomeBase: 250000, otherIncomeBase: 300000, meetingIncomeBase: 0, shopIncomeBase: 0,
  roomExpensePct: 30, foodExpensePct: 40, otherExpensePct: 25, generalMgmtPct: 10, energyPct: 7, repairPct: 2,
  landUnitValue: 0, buildings: [DEFAULT_BUILDING], buildingDepreciationPct: 25, showCostApproachInPdf: true,
  operatorPremiumPct: 12, propertyTaxPct: 0.4, insurancePct: 0.3, renewalFundPct: 4,
  ecrimisilBase: 0, ecrimisilGrowthPct: 0,
  ustHakkiOdemeBase: 0, ustHakkiOdemeGrowthPct: 2,
  bayilikBase: 0, bayilikGrowthPct: 0,
  discountRatePct: 11,
  donemSonuIndirgemePct: 0,
};
type S = typeof DEFAULT;

export function DetailedUstHakkiApp({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<S>(() => {
    try { const s = localStorage.getItem(DRAFT); if (s) return JSON.parse(s); } catch { /* yok */ }
    return DEFAULT;
  });
  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify(state)); } catch { /* dolu */ } }, [state]);

  const fileRef = useRef<HTMLInputElement>(null);
  const r = useMemo(() => computeDetailedUstHakki(state), [state]);
  const patch = (p: Partial<S>) => setState((s) => ({ ...s, ...p }));
  const patchRoom = (id: string, p: Partial<DetailedRoomRow>) =>
    patch({ rooms: state.rooms.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const patchBuilding = (id: string, p: Partial<BuildingCostRow>) =>
    patch({ buildings: state.buildings.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  const cur = CUR_SYM[state.currency];
  const TL = (v: number) => Math.round(v).toLocaleString('tr-TR') + ' ' + cur;

  async function onKml(f: File) {
    try {
      const parsed = parseKml(await f.text());
      if (!parsed) { alert('KML okunamadı.'); return; }
      const area = parsed.deedArea || parsed.polygonArea || 0;
      patch({
        parcelArea: area > 0 ? Math.round(area) : state.parcelArea,
        ada: parsed.ada || state.ada, parsel: parsed.parsel || state.parsel, fromKml: true,
      });
    } catch { alert('KML okunamadı.'); }
  }

  const sureField = (label: string, key: 'kalanSureYil' | 'toplamSureYil') => (
    <label className="pfield pfield--s"><span>{label} ({state.sureUnit === 'ay' ? 'ay' : 'yıl'})</span>
      <Num value={state.sureUnit === 'ay' ? Math.round(state[key] * 12) : state[key]}
           onChange={(n) => patch({ [key]: state.sureUnit === 'ay' ? R2(n / 12) : n } as Partial<S>)} /></label>
  );

  const busyRef = useRef(false);
  async function onPdf() { if (busyRef.current) return; busyRef.current = true; try { await downloadDetailedUstHakkiPdf(state, r); } finally { busyRef.current = false; } }
  async function onExcel() { if (busyRef.current) return; busyRef.current = true; try { await downloadDetailedUstHakkiExcel(state, r); } finally { busyRef.current = false; } }

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

      {state.rooms.length > 0 && (
        <div className="hotel-summary-sticky no-print">
          <div className="hotel-summary-inner">
            <div><span>1. Yıl Toplam Gelir</span><b>{Math.round(r.years[0]?.totalRevenue ?? 0).toLocaleString('tr-TR')} ₺</b></div>
            <div><span>Taşınmazın Değeri</span><b>{Math.round(r.propertyValueTl).toLocaleString('tr-TR')} ₺</b></div>
          </div>
        </div>
      )}

      <div className="step" style={{ paddingBottom: 76 }}>
        <div className="step-head">
          <div className="step-eyebrow">Üst Hakkı Değerleme</div>
          <div className="step-title">Toplam Gelir Üzerinden Üst Hakkı Hesabı</div>
          <div className="step-desc">
            Otel tarzı gelir/gider zinciriyle kalan süre kadar dönemsel DCF. 1. dönem indirgenmez.
            Tüm oranlar yönlendiricidir, serbestçe değiştirilir.
          </div>
        </div>

        <div className="card">
          <div className="card-title">Kimlik <em style={{ fontWeight: 400, fontSize: 12, opacity: .7 }}>(hiçbiri zorunlu değil)</em></div>
          <div className="hrow-labeled">
            <label className="pfield"><span>Otel Adı</span>
              <input value={state.hotelName} placeholder="—" onChange={(e) => patch({ hotelName: e.target.value })} /></label>
            <label className="pfield pfield--s"><span>Ada</span>
              <input value={state.ada} placeholder="—" onChange={(e) => patch({ ada: e.target.value })} /></label>
            <label className="pfield pfield--s"><span>Parsel</span>
              <input value={state.parsel} placeholder="—" onChange={(e) => patch({ parsel: e.target.value })} /></label>
            <label className="pfield"><span>Parsel Alanı m² {state.fromKml && <em>(KML)</em>}</span>
              <Num value={state.parcelArea} onChange={(n) => patch({ parcelArea: n, fromKml: false })} /></label>
            <label className="pfield"><span>KML (TKGM)</span>
              <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>Dosya Yükle</button>
              <input ref={fileRef} type="file" accept=".kml" hidden
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) onKml(f); e.currentTarget.value = ''; }} />
            </label>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Üst Hakkı Süresi</div>
          <div className="hrow-labeled">
            <label className="pfield pfield--s"><span>Süre Birimi</span>
              <select value={state.sureUnit} onChange={(e) => patch({ sureUnit: e.target.value as 'yil' | 'ay' })}>
                <option value="yil">Yıl</option><option value="ay">Ay</option>
              </select></label>
            {sureField('Kalan Süre', 'kalanSureYil')}
            {sureField('Toplam Süre', 'toplamSureYil')}
            <label className="pfield pfield--s"><span>Para Birimi</span>
              <select value={state.currency} onChange={(e) => patch({ currency: e.target.value as S['currency'] })}>
                <option value="TL">TL (₺)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
              </select></label>
            {state.currency !== 'TL' && (
              <label className="pfield pfield--s"><span>Kur (1 {state.currency} = ? ₺)</span>
                <Num value={state.fxRate} onChange={(n) => patch({ fxRate: n })} /></label>
            )}
          </div>
          <div className="hint">DCF tablosu tam <b>{Math.max(0, Math.round(state.kalanSureYil))} dönem</b> içerir.</div>
        </div>

        <div className="card">
          <div className="card-title">Oda Gelirleri <em style={{ fontWeight: 400, fontSize: 12, opacity: .7 }}>(Otel modülüyle aynı hesap: Adet × Fiyat × Doluluk × Gün)</em></div>
          {state.rooms.map((rm) => (
            <div className="prop-card" key={rm.id}>
              <div className="prop-card__top">
                <label className="pfield"><span>Oda Tipi</span>
                  <input value={rm.name} onChange={(e) => patchRoom(rm.id, { name: e.target.value })} /></label>
                <label className="pfield pfield--s"><span>Oda Sayısı</span>
                  <Num value={rm.count} onChange={(n) => patchRoom(rm.id, { count: n })} /></label>
                <label className="pfield pfield--s"><span>Günlük Ort. Fiyat ({cur})</span>
                  <Num value={rm.price} onChange={(n) => patchRoom(rm.id, { price: n })} /></label>
                <label className="pfield pfield--s"><span>Doluluk %</span>
                  <Num value={rm.occupancyPct} onChange={(n) => patchRoom(rm.id, { occupancyPct: n })} /></label>
                <label className="pfield pfield--s"><span>Faaliyet Gün</span>
                  <Num value={rm.days} onChange={(n) => patchRoom(rm.id, { days: n })} /></label>
                {state.rooms.length > 1 && (
                  <button type="button" className="b-del" onClick={() => patch({ rooms: state.rooms.filter((x) => x.id !== rm.id) })}>✕</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => patch({ rooms: [...state.rooms, { ...DEFAULT_ROOM, id: uid(), name: '' }] })}>➕ Oda Tipi Ekle</button>
          <div className="hrow-labeled" style={{ marginTop: 10 }}>
            <div className="pfield pfield--ro"><span>1. Yıl Oda Geliri</span><b>{TL(r.baseRoomIncome)}</b></div>
            <label className="pfield pfield--s"><span>Oda Fiyat Artış Oranı %</span>
              <Num step="0.5" value={state.roomGrowthPct} onChange={(n) => patch({ roomGrowthPct: n })} /></label>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Gelirler Tablosu <em style={{ fontWeight: 400, fontSize: 12, opacity: .7 }}>(1. yıl tutarı girilir, Oda Fiyat Artış Oranı ile birlikte büyür)</em></div>
          <div className="hrow-labeled">
            <label className="pfield"><span>Yiyecek/İçecek Geliri ({cur}, 1. yıl)</span>
              <Num value={state.foodIncomeBase} onChange={(n) => patch({ foodIncomeBase: n })} /></label>
            <div className="pct-badge" title="Toplam gelir içindeki payı">%{r.years[0] ? (r.years[0].foodIncome / r.years[0].totalRevenue * 100).toFixed(1) : '—'}</div>
            <label className="pfield"><span>Diğer Gelirler ({cur}, 1. yıl)</span>
              <Num value={state.otherIncomeBase} onChange={(n) => patch({ otherIncomeBase: n })} /></label>
            <div className="pct-badge" title="Toplam gelir içindeki payı">%{r.years[0] ? (r.years[0].otherIncome / r.years[0].totalRevenue * 100).toFixed(1) : '—'}</div>
            <label className="pfield"><span>Toplantı/Salon Geliri ({cur}, 1. yıl)</span>
              <Num value={state.meetingIncomeBase} onChange={(n) => patch({ meetingIncomeBase: n })} /></label>
            <div className="pct-badge" title="Toplam gelir içindeki payı">%{r.years[0] ? (r.years[0].meetingIncome / r.years[0].totalRevenue * 100).toFixed(1) : '—'}</div>
            <label className="pfield"><span>Dükkan Kira Geliri ({cur}, 1. yıl)</span>
              <Num value={state.shopIncomeBase} onChange={(n) => patch({ shopIncomeBase: n })} /></label>
            <div className="pct-badge" title="Toplam gelir içindeki payı">%{r.years[0] ? (r.years[0].shopIncome / r.years[0].totalRevenue * 100).toFixed(1) : '—'}</div>
            <div className="pct-badge pct-badge--room" title="Oda Gelirinin toplam gelir içindeki payı (kalan)">Oda %{r.years[0]?.roomIncomePct.toFixed(1) ?? '—'}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">İşletme Giderleri</div>
          <div className="hrow-labeled">
            <label className="pfield pfield--s"><span>Oda Gideri %</span>
              <Num step="0.5" value={state.roomExpensePct} onChange={(n) => patch({ roomExpensePct: n })} /></label>
            <div className="pct-badge" title="1. yıl karşılığı">{r.years[0] ? TL(r.years[0].roomExpense) : '—'}</div>
            <label className="pfield pfield--s"><span>Yiyecek Gideri %</span>
              <Num step="0.5" value={state.foodExpensePct} onChange={(n) => patch({ foodExpensePct: n })} /></label>
            <div className="pct-badge" title="1. yıl karşılığı">{r.years[0] ? TL(r.years[0].foodExpense) : '—'}</div>
            <label className="pfield pfield--s"><span>Diğer Gider %</span>
              <Num step="0.5" value={state.otherExpensePct} onChange={(n) => patch({ otherExpensePct: n })} /></label>
            <div className="pct-badge" title="1. yıl karşılığı">{r.years[0] ? TL(r.years[0].otherExpense) : '—'}</div>
            <label className="pfield pfield--s"><span>Genel Yönetim %</span>
              <Num step="0.5" value={state.generalMgmtPct} onChange={(n) => patch({ generalMgmtPct: n })} /></label>
            <div className="pct-badge" title="1. yıl karşılığı">{r.years[0] ? TL(r.years[0].generalMgmtExpense) : '—'}</div>
            <label className="pfield pfield--s"><span>Enerji %</span>
              <Num step="0.5" value={state.energyPct} onChange={(n) => patch({ energyPct: n })} /></label>
            <div className="pct-badge" title="1. yıl karşılığı">{r.years[0] ? TL(r.years[0].energyExpense) : '—'}</div>
            <label className="pfield pfield--s"><span>Basit Tamirat %</span>
              <Num step="0.5" value={state.repairPct} onChange={(n) => patch({ repairPct: n })} /></label>
            <div className="pct-badge" title="1. yıl karşılığı">{r.years[0] ? TL(r.years[0].repairExpense) : '—'}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>Maliyet Yaklaşımı</span>
            <label className="pdf-toggle"><input type="checkbox" checked={state.showCostApproachInPdf}
                     onChange={(e) => patch({ showCostApproachInPdf: e.target.checked })} /> PDF ve Excel'de Göster</label>
          </div>
          <div className="hint">İşaretliyse Maliyet Yaklaşımı hem PDF hem Excel çıktısında tam gösterilir; işaretsizse yalnız uygulama içinde hesaplanır, çıktılarda görünmez.</div>
          <div className="hint">Arsa alanı Kimlik kartındaki değerle (KML varsa ondan) paylaşılır.</div>
          <div className="hrow-labeled" style={{ marginTop: 8 }}>
            <label className="pfield"><span>Arsa m² Birim Değeri ({cur})</span>
              <Num value={state.landUnitValue} onChange={(n) => patch({ landUnitValue: n })} /></label>
            <label className="pfield pfield--s"><span>Bina Aşınma Oranı % <em title="Yalnız Emlak Vergisi tabanında kullanılır: Emlak Vergisi Esas Değer = Arsa + Yapı×(1-Aşınma%)">(yalnız Emlak Vergisi)</em></span>
              <Num step="1" value={state.buildingDepreciationPct} onChange={(n) => patch({ buildingDepreciationPct: n })} /></label>
            <div className="pfield pfield--ro"><span>Arsa Değeri</span><b>{TL(r.cost.landValue)}</b></div>
          </div>

          <div className="card-title" style={{ marginTop: 14, fontSize: 13 }}>Yapı Maliyetleri</div>
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
                <label className="pfield pfield--s"><span>Alan m²</span>
                  <Num value={b.area} onChange={(n) => patchBuilding(b.id, { area: n })} /></label>
                <label className="pfield pfield--s"><span>Birim Maliyet ({cur})</span>
                  <Num value={b.unitCost} onChange={(n) => patchBuilding(b.id, { unitCost: n })} /></label>
                <div className="pfield pfield--ro"><span>Toplam Yapı Maliyeti</span><b>{TL(Math.max(0, b.area) * Math.max(0, b.unitCost))}</b></div>
                {state.buildings.length > 1 && (
                  <button type="button" className="b-del" onClick={() => patch({ buildings: state.buildings.filter((x) => x.id !== b.id) })}>✕</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => patch({ buildings: [...state.buildings, { ...DEFAULT_BUILDING, id: uid() }] })}>➕ Yapı Ekle</button>

          <div className="hrow-labeled" style={{ marginTop: 12 }}>
            <div className="pfield pfield--ro"><span>Toplam Yapı Maliyeti</span><b>{TL(r.cost.buildingsCost)}</b></div>
            <div className="pfield pfield--ro pfield--big"><span>TOPLAM MALİYET</span><b>{TL(r.cost.totalCost)}</b></div>
          </div>
          <div className="hint">Emlak Vergisi, Bina Sigortası ve Yenileme Fonu bu Toplam Maliyet üzerinden hesaplanır.</div>
        </div>

        <div className="card">
          <div className="card-title">Sabit Giderler</div>
          <div className="hrow-labeled">
            <label className="pfield pfield--s"><span>İşletmeci Prim % <em title="Brüt İşletme Kârı üzerinden">(brüt kâr)</em></span>
              <Num step="0.5" value={state.operatorPremiumPct} onChange={(n) => patch({ operatorPremiumPct: n })} /></label>
            <label className="pfield pfield--s"><span>Emlak Vergisi % <em>(Toplam Maliyet)</em></span>
              <Num step="0.1" value={state.propertyTaxPct} onChange={(n) => patch({ propertyTaxPct: n })} /></label>
            <label className="pfield pfield--s"><span>Bina Sigortası % <em>(Toplam Maliyet)</em></span>
              <Num step="0.1" value={state.insurancePct} onChange={(n) => patch({ insurancePct: n })} /></label>
            <label className="pfield pfield--s"><span>Yenileme Fonu % <em>(Toplam Maliyet)</em></span>
              <Num step="0.5" value={state.renewalFundPct} onChange={(n) => patch({ renewalFundPct: n })} /></label>
          </div>
          <div className="hrow-labeled" style={{ marginTop: 10 }}>
            <label className="pfield pfield--s"><span>Ecrimisil ({cur}, 1. yıl)</span>
              <Num value={state.ecrimisilBase} onChange={(n) => patch({ ecrimisilBase: n })} /></label>
            <label className="pfield pfield--s"><span>Üst Hakkı Ödemesi ({cur}, 1. yıl)</span>
              <Num value={state.ustHakkiOdemeBase} onChange={(n) => patch({ ustHakkiOdemeBase: n })} /></label>
            <label className="pfield pfield--s"><span>Bayilik Ödemesi ({cur}, 1. yıl)</span>
              <Num value={state.bayilikBase} onChange={(n) => patch({ bayilikBase: n })} /></label>
          </div>
        </div>

        <div className="card">
          <div className="card-title">İskonto ve Dönem Sonu</div>
          <div className="hrow-labeled">
            <label className="pfield pfield--s"><span>İskonto Oranı %</span>
              <Num step="0.5" value={state.discountRatePct} onChange={(n) => patch({ discountRatePct: n })} /></label>
            <label className="pfield pfield--s"><span>Dönem Sonu Değer İndirgeme %</span>
              <Num step="0.5" value={state.donemSonuIndirgemePct} onChange={(n) => patch({ donemSonuIndirgemePct: n })} /></label>
          </div>
          <div className="hint">1. dönem indirgenmez; 2. dönemden itibaren iskonto oranıyla bugüne çekilir.</div>
        </div>

        <div className="card">
          <div className="card-title">Dönemsel Tablo <em style={{ fontWeight: 400, fontSize: 12, opacity: .7 }}>(önizleme — tam liste PDF/Excel'de)</em></div>
          <div className="dcf-table no-print">
            <div className="dcf-head">
              <span>Yıl</span><span>Toplam Gelir</span><span>Toplam Gider</span><span>Net Kâr</span><span>Bugünkü Değer</span>
            </div>
            {r.years.slice(0, 6).map((yr) => (
              <div className="dcf-row" key={yr.year}>
                <span>{yr.year}</span><span>{TL(yr.totalRevenue)}</span><span>{TL(yr.totalExpense)}</span>
                <span>{TL(yr.netOperatingProfit)}</span><span>{TL(yr.presentValue)}</span>
              </div>
            ))}
            {r.years.length > 6 && <div className="dcf-row dcf-more">… {r.years.length - 6} dönem daha (PDF/Excel'de tam liste) …</div>}
          </div>
        </div>

        <div className="card result-card">
          <div className="card-title">Sonuç</div>
          <div className="hrow-labeled">
            <div className="pfield pfield--ro"><span>Nakit Akış BD Toplamı</span><b>{TL(r.sumPresentValue)}</b></div>
            <div className="pfield pfield--ro pfield--big"><span>TAŞINMAZ DEĞERİ</span>
              <b>{Math.round(r.propertyValueRounded).toLocaleString('tr-TR')} {cur}</b></div>
            {state.currency !== 'TL' && (
              <div className="pfield pfield--ro"><span>TL Karşılığı</span><b>{Math.round(r.propertyValueTl).toLocaleString('tr-TR')} ₺</b></div>
            )}
          </div>
          {r.warnings.map((w, i) => <div className="warn-line" key={i}>{w}</div>)}
          <div className="export-row no-print">
            <button type="button" className="btn-ghost" onClick={onPdf}>📄 PDF İndir</button>
            <button type="button" className="btn-ghost" onClick={onExcel}>📊 Excel İndir</button>
          </div>
        </div>

        <div className="stamp">{BRAND.preparedBy}<br />{BRAND.developerLine} · Toplam Gelir Üzerinden Üst Hakkı Hesabı</div>
      </div>

      <div className="navbar no-print">
        <div className="navbar-inner">
          <button type="button" className="btn btn-ghost" onClick={onBack}>← Ana Sayfaya Dön</button>
        </div>
      </div>
    </div>
  );
}
