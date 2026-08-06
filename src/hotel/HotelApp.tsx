/**
 * OTEL GELİRİ (GELİR İNDİRGEME YAKLAŞIMI) — ANA UYGULAMA
 *
 * ArsaPlan'ın mevcut tasarım dilini (topbar, card, Field, Choice, Seg, fmtTL vb.)
 * birebir kullanır; mevcut App.tsx / engine / ui dosyalarının hiçbirini değiştirmez.
 * Kendi state'ini, kendi localStorage taslağını ve kendi adım akışını yönetir.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BRAND } from '../brand/brand';
import { Field, Txt, Num, Pct, Sel, Seg } from '../ui/fields';

const CUR_SYM: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
const CurrencyCtx = createContext<string>('TRY');
function useFmt() {
  const cur = useContext(CurrencyCtx);
  return (v: number) => (isFinite(v) ? Math.round(v).toLocaleString('tr-TR') + ' ' + (CUR_SYM[cur] ?? '₺') : '–');
}
import {
  analyzeHotel, createDefaultHotelInput, newId,
} from './engine';
import {
  ODA_TIPLERI, YARDIMCI_GELIR_KATALOGU, TICARI_KIRA_KATALOGU,
} from './types';
import type {
  HotelIncomeInput, RoomRevenueRow, AncillaryIncomeRow, CommercialLeaseRow,
} from './types';
import { downloadHotelPdf } from './pdf';
import { downloadHotelExcel } from './excel';
import { HOTEL_PROFILES, type HotelProfile } from './profiles';
import { readDataSheet } from '../export/excelImport';
import { parseKml } from '../geo/kml';
import { BUILDING_TYPES } from '../usthakki/detailedEngine';

const DRAFT_KEY = 'arsaplan-otel-taslak-v1';

function loadDraft(): HotelIncomeInput {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return createDefaultHotelInput();
    const d = JSON.parse(raw);
    const D = createDefaultHotelInput();
    return {
      ...D, ...d,
      general: { ...D.general, ...(d.general ?? {}) },
      rooms: Array.isArray(d.rooms) ? d.rooms : [],
      ancillary: Array.isArray(d.ancillary) ? d.ancillary : [],
      leases: Array.isArray(d.leases) ? d.leases : [],
      opex: { ...D.opex, ...(d.opex ?? {}) },
      projection: { ...D.projection, ...(d.projection ?? {}) },
      costBuildings: Array.isArray(d.costBuildings) ? d.costBuildings : (D.costBuildings ?? []),
    };
  } catch {
    return createDefaultHotelInput();
  }
}

const STEPS = [
  { title: 'Genel Bilgiler ve Gelirler', desc: 'Tesis kimliği, oda gelirleri, yardımcı işletme gelirleri ve üçüncü kişilere kiralanan alanlar.' },
  { title: 'Gider · Projeksiyon · İNA', desc: 'Gider oranı, yıllara göre artışlar, kapitalizasyon ve iskonto.' },
];
const TOTAL = STEPS.length;

export default function HotelApp({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [costOpen, setCostOpen] = useState(false);
  const [inaOpen, setInaOpen] = useState(false);
  const [input, setInput] = useState<HotelIncomeInput>(createDefaultHotelInput);
  const [hasSavedDraft] = useState(() => { try { return !!localStorage.getItem(DRAFT_KEY); } catch { return false; } });

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(input)); } catch { /* kota */ }
  }, [input]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const result = useMemo(() => analyzeHotel(input), [input]);
  const isResult = step > TOTAL;
  const meta = STEPS[Math.min(step, TOTAL) - 1];

  const reset = () => {
    if (!window.confirm('Tüm otel geliri girdileri silinip yeni analiz başlatılacak. Emin misiniz?')) return;
    localStorage.removeItem(DRAFT_KEY);
    setInput(createDefaultHotelInput());
    setStep(1);
  };

  const setGeneral = (patch: Partial<HotelIncomeInput['general']>) =>
    setInput((p) => ({ ...p, general: { ...p.general, ...patch } }));
  const setRooms = (rooms: RoomRevenueRow[]) => setInput((p) => ({ ...p, rooms }));
  const setAncillary = (ancillary: AncillaryIncomeRow[]) => setInput((p) => ({ ...p, ancillary }));
  const setLeases = (leases: CommercialLeaseRow[]) => setInput((p) => ({ ...p, leases }));
  const setOpex = (patch: Partial<HotelIncomeInput['opex']>) =>
    setInput((p) => ({ ...p, opex: { ...p.opex, ...patch } }));
  const setProjection = (patch: Partial<HotelIncomeInput['projection']>) =>
    setInput((p) => ({ ...p, projection: { ...p.projection, ...patch } }));

  const blocker = (): string | null => {
    if (step === 1 && !input.general.facilityName.trim()) return 'Tesis adını giriniz.';
    if (step === 2 && input.projection.capRate <= 0) return 'Kapitalizasyon oranını giriniz (sıfır olamaz).';
    return null;
  };
  const stop = blocker();

  return (
    <CurrencyCtx.Provider value={input.currency ?? 'TRY'}>
    <div className="app" id="arsaplan-otel-root">
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <h1>{BRAND.appName} — Otel Gelir Hesabı</h1>
            <p>Gelir İndirgeme Yaklaşımı · Konaklama Tesisleri</p>
          </div>
          <div className="topbar-actions no-print">
            <button type="button" className="link-btn topbar-link" onClick={onBack}>← Başlangıca dön</button>
            {hasSavedDraft && (
              <button type="button" className="link-btn topbar-link" title="Daha önce girdiğiniz, kaydedilmiş verileri geri yükler"
                      onClick={() => setInput(loadDraft())}>
                ↺ Eski verileri geri getir
              </button>
            )}
            <label className="link-btn topbar-link" title="Daha önce indirilen .xlsx dosyasından verileri geri yükler">
              📊 Excel Yükle
              <input type="file" accept=".xlsx" style={{ display: 'none' }}
                     onChange={async (e) => {
                       const f = e.target.files?.[0]; e.currentTarget.value = ''; if (!f) return;
                       const data = await readDataSheet<HotelIncomeInput>(f);
                       if (data) { setInput(data); setStep(1); } else window.alert('Bu Excel dosyasında ArsaPlan verisi bulunamadı.');
                     }} />
            </label>
          </div>
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}dora-logo.png`} alt={BRAND.company} />
        </div>
        <div className="progress-row">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(step, TOTAL + 1) / (TOTAL + 1) * 100}%` }} />
          </div>
          <div className="progress-label">{isResult ? 'SONUÇ' : `Adım ${step} / ${TOTAL}`}</div>
        </div>
      </div>

      {!isResult && <HotelSummaryBar result={result} />}

      <div className="step" key={step}>
        {!isResult && (
          <div className="step-head">
            <div className="step-eyebrow">Adım {step}</div>
            <div className="step-title">{meta.title}</div>
            <div className="step-desc">{meta.desc}</div>
          </div>
        )}

        {step === 1 && (<>
          <StepGeneral general={input.general} setGeneral={setGeneral} input={input} setInput={setInput} />
          <StepRooms rooms={input.rooms} setRooms={setRooms} result={result} setInput={setInput} />
          <StepAncillary ancillary={input.ancillary} setAncillary={setAncillary} result={result} />
          <StepLeases leases={input.leases} setLeases={setLeases} result={result} />
        </>)}
        {step === 2 && (<>
          <StepOpex opex={input.opex} setOpex={setOpex} result={result} />
          <StepProjection projection={input.projection} setProjection={setProjection} result={result} input={input} setInput={setInput}
                          costOpen={costOpen} setCostOpen={setCostOpen} inaOpen={inaOpen} setInaOpen={setInaOpen} />
        </>)}
        {isResult && <HotelResult input={input} result={result} setFinal={(p) => setInput((x) => ({ ...x, ...p }))} />}

        {stop && !isResult && <div className="card blocker">{stop}</div>}
        {!isResult && (
          <div className="stamp">
            {BRAND.preparedBy}<br />{BRAND.developerLine} · Otel Gelir Hesabı Modülü
          </div>
        )}
      </div>

      <div className="navbar no-print">
        <div className="navbar-inner">
          {isResult ? (
            <>
              <button className="btn btn-ghost" onClick={() => setStep(TOTAL)}>Geri</button>
              <button className="btn btn-primary" onClick={reset}>Yeni Analiz</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => (step === 1 ? onBack() : setStep((s) => s - 1))}>Geri</button>
              <button className="btn btn-primary" disabled={!!stop} onClick={() => setStep((s) => s + 1)}>
                {step === TOTAL ? 'Sonucu Gör' : 'Devam'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </CurrencyCtx.Provider>
  );
}

/* ─────────────────── Sabit Özet Paneli ─────────────────── */
function HotelSummaryBar({ result }: { result: ReturnType<typeof analyzeHotel> }) {
  const fmt = useFmt();
  return (
    <div className="hotel-summary-sticky no-print">
      <div className="hotel-summary-inner">
        <div><span>Toplam Gelir</span><b>{fmt(result.totalGrossRevenue)}</b></div>
        <div><span>Gelir (Direkt Kap.)</span><b>{fmt(result.capitalizedValue)}</b></div>
        {result.ina && <div><span>İNA (NBD)</span><b>{fmt(result.ina.npv)}</b></div>}
        {result.cost && <div><span>Maliyet Yaklaşımı</span><b>{fmt(result.cost.totalValueRounded)}</b></div>}
      </div>
    </div>
  );
}

/* ─────────────────── Adım 1 — Genel Bilgiler ─────────────────── */
function StepGeneral({ general, setGeneral, input, setInput }: {
  general: HotelIncomeInput['general']; setGeneral: (p: Partial<HotelIncomeInput['general']>) => void;
  input: HotelIncomeInput; setInput: (fn: (p: HotelIncomeInput) => HotelIncomeInput) => void;
}) {
  const cur = input.currency ?? 'TRY';
  return (
    <div className="cols step-cols">
      <div className="card">
        <div className="card-title">Para Birimi</div>
        <div className="hint" style={{ marginBottom: 8 }}>Seçilen para birimi tüm hesap, ekran ve rapor çıktılarına uygulanır.</div>
        <div className="grid-2">
          <Field label="Para Birimi">
            <Sel value={cur} onChange={(v) => setInput((p) => ({ ...p, currency: v as HotelIncomeInput['currency'], fxRate: v === 'TRY' ? null : (p.fxRate ?? 1) }))}
                 options={[{ value: 'TRY', label: 'TL (₺)' }, { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }]} />
          </Field>
          {cur !== 'TRY' && (
            <Field label={`Kur (1 ${cur} = ? ₺)`}>
              <Num value={input.fxRate ?? 1} onChange={(n) => setInput((p) => ({ ...p, fxRate: n }))} />
            </Field>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-title">Tesis Bilgileri</div>
        <Field label="Tesis Adı"><Txt value={general.facilityName} onChange={(v) => setGeneral({ facilityName: v })} placeholder="Örn. Örnek Resort & Spa" /></Field>
        <Field label="Adres"><Txt value={general.address} onChange={(v) => setGeneral({ address: v })} placeholder="Açık adres" /></Field>
      </div>
      <div className="card">
        <div className="card-title">Taşınmaz Kimliği</div>
        <div className="grid-2">
          <Field label="İl"><Txt value={general.il} onChange={(v) => setGeneral({ il: v })} /></Field>
          <Field label="İlçe"><Txt value={general.ilce} onChange={(v) => setGeneral({ ilce: v })} /></Field>
        </div>
        <Field label="Mahalle"><Txt value={general.mahalle} onChange={(v) => setGeneral({ mahalle: v })} /></Field>
        <div className="grid-2">
          <Field label="Ada"><Txt value={general.ada} onChange={(v) => setGeneral({ ada: v })} /></Field>
          <Field label="Parsel"><Txt value={general.parsel} onChange={(v) => setGeneral({ parsel: v })} /></Field>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Adım 2 — Oda Gelirleri ─────────────────── */
function StepRooms({ rooms, setRooms, result, setInput }: {
  rooms: RoomRevenueRow[]; setRooms: (r: RoomRevenueRow[]) => void; result: ReturnType<typeof analyzeHotel>;
  setInput: (fn: (p: HotelIncomeInput) => HotelIncomeInput) => void;
}) {
  const fmt = useFmt();
  const add = () => setRooms([...rooms, {
    id: newId(), roomType: ODA_TIPLERI[0], roomCount: 0, adr: 0, occupancy: 0, operatingDays: 365,
  }]);
  const upd = (i: number, patch: Partial<RoomRevenueRow>) =>
    setRooms(rooms.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const del = (i: number) => setRooms(rooms.filter((_, k) => k !== i));
  const applyProfile = (p: HotelProfile) => {
    setInput((prev) => ({
      ...prev,
      rooms: [{ id: newId(), roomType: 'Standart', roomCount: p.roomCount, adr: p.adr, occupancy: p.occupancy, operatingDays: p.operatingDays }],
      opex: { ...prev.opex, expenseRate: p.expenseRate },
      projection: { ...prev.projection, capRate: p.capRate },
    }));
  };

  return (
    <div className="cols">
      {rooms.length === 0 && (
        <div className="card card-wide">
          <div className="card-title">Hazır Profil ile Başla (opsiyonel)</div>
          <div className="hint" style={{ marginBottom: 10 }}>
            Bunlar <b>ÖRNEK/başlangıç verileridir</b>, gerçek piyasa verisi değildir — yalnızca hızlı bir
            başlangıç noktası sunar. Seçtikten sonra tüm alanları kendi verilerinizle değiştirin.
          </div>
          <div className="choice-grid">
            {HOTEL_PROFILES.map((p) => (
              <button key={p.name} type="button" className="btn-ghost" style={{ textAlign: 'left', height: 'auto', padding: '10px 12px' }}
                      onClick={() => applyProfile(p)}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="card card-wide">
        <div className="card-title">Oda Tipleri</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          Her satır için Yıllık Gelir = Oda Sayısı × Günlük Ortalama Fiyat × Doluluk Oranı × Faaliyet Günü olarak anlık hesaplanır.
        </div>
        {rooms.map((r, i) => {
          const calc = result.roomRows[i];
          return (
            <div className="h-row" key={r.id}>
              <div className="b-cell">
                <Sel value={ODA_TIPLERI.includes(r.roomType) ? r.roomType : 'Diğer'}
                     onChange={(v) => upd(i, { roomType: v })}
                     options={ODA_TIPLERI.map((t) => ({ value: t, label: t }))} />
              </div>
              <div className="b-cell"><Num value={r.roomCount} onChange={(n) => upd(i, { roomCount: n })} suffix="oda" /></div>
              <div className="b-cell"><Num value={r.adr} onChange={(n) => upd(i, { adr: n })} suffix="₺" /></div>
              <div className="b-cell"><Pct value={r.occupancy} onChange={(n) => upd(i, { occupancy: n })} /></div>
              <div className="b-cell"><Num value={r.operatingDays} onChange={(n) => upd(i, { operatingDays: n })} suffix="gün" /></div>
              <div className="b-cell b-cost">{calc ? fmt(calc.annualRevenue) : '—'}</div>
              <button type="button" className="b-del" title="Satırı sil" onClick={() => del(i)}>✕</button>
            </div>
          );
        })}
        {rooms.length > 0 && (
          <div className="hint" style={{ margin: '4px 0 8px' }}>
            Kolonlar: Oda Tipi · Oda Sayısı · Günlük Ortalama Fiyat · Doluluk · Faaliyet Günü · Yıllık Gelir
          </div>
        )}
        <button type="button" className="btn add-btn" onClick={add}>+ Oda Tipi Ekle</button>

        {rooms.length > 0 && (
          <div className="mini-kpi" style={{ marginTop: 14 }}>
            <div><span>Toplam Oda Sayısı</span><b>{result.performance.totalRoomCount}</b></div>
            <div><span>Toplam Oda Geliri</span><b>{fmt(result.totalRoomRevenue)}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Adım 3 — Yardımcı Gelirler ─────────────────── */
function StepAncillary({ ancillary, setAncillary, result }: {
  ancillary: AncillaryIncomeRow[]; setAncillary: (a: AncillaryIncomeRow[]) => void; result: ReturnType<typeof analyzeHotel>;
}) {
  const fmt = useFmt();
  const add = () => setAncillary([...ancillary, { id: newId(), name: YARDIMCI_GELIR_KATALOGU[0], annualIncome: 0, note: '' }]);
  useEffect(() => {
    if (ancillary.length === 0) add();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const upd = (i: number, patch: Partial<AncillaryIncomeRow>) =>
    setAncillary(ancillary.map((a, k) => (k === i ? { ...a, ...patch } : a)));
  const del = (i: number) => setAncillary(ancillary.filter((_, k) => k !== i));

  return (
    <div className="cols">
      <div className="card card-wide">
        <div className="card-title">Yardımcı İşletme Gelirleri</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          Yalnızca otel tarafından işletilen, üçüncü kişiye kiraya verilmemiş gelir kalemlerini buraya ekleyin.
          Kiraya verilmiş alanlar için "Ticari Kiralar" adımını kullanın (çifte hesaplamayı önler).
        </div>
        {ancillary.map((a, i) => (
          <div className="h-row h-row-anc" key={a.id}>
            <div className="b-cell">
              <Sel value={YARDIMCI_GELIR_KATALOGU.includes(a.name) ? a.name : 'Diğer'}
                   onChange={(v) => upd(i, { name: v })}
                   options={YARDIMCI_GELIR_KATALOGU.map((t) => ({ value: t, label: t }))} />
            </div>
            <div className="b-cell">
              <Seg value={a.mode ?? 'tutar'} onChange={(v) => upd(i, { mode: v })}
                   options={[{ value: 'tutar', label: '₺' }, { value: 'oran', label: '% oda' }]} />
            </div>
            <div className="b-cell">
              {(a.mode ?? 'tutar') === 'oran'
                ? <Pct value={a.rate ?? 0} onChange={(n) => upd(i, { rate: n })} />
                : <Num value={a.annualIncome} onChange={(n) => upd(i, { annualIncome: n })} suffix="₺" />}
            </div>
            <div className="b-cell b-cost">
              {(() => { const c = result.ancillaryRows?.[i]; return c ? fmt(c.effectiveIncome) : fmt(a.annualIncome); })()}
            </div>
            <button type="button" className="b-del" title="Satırı sil" onClick={() => del(i)}>✕</button>
          </div>
        ))}
        {ancillary.length > 0 && (
          <div className="hint" style={{ margin: '4px 0 8px' }}>
            Kolonlar: Gelir Adı · Giriş Türü (₺ tutar / oda gelirinin %'si) · Değer · Yıllık Gelir
          </div>
        )}
        <button type="button" className="btn add-btn" onClick={add}>+ Yardımcı Gelir Ekle</button>

        {ancillary.length > 0 && (
          <div className="mini-kpi" style={{ marginTop: 14 }}>
            <div><span>Kalem Sayısı</span><b>{ancillary.length}</b></div>
            <div><span>Toplam Yardımcı Gelir</span><b>{fmt(result.totalAncillaryRevenue)}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Adım 4 — Ticari Kiralar ─────────────────── */
function StepLeases({ leases, setLeases, result }: {
  leases: CommercialLeaseRow[]; setLeases: (l: CommercialLeaseRow[]) => void; result: ReturnType<typeof analyzeHotel>;
}) {
  const fmt = useFmt();
  const add = () => setLeases([...leases, {
    id: newId(), areaName: '', areaType: TICARI_KIRA_KATALOGU[0], tenant: '', inputMode: 'aylik', amount: 0, note: '',
  }]);
  const upd = (i: number, patch: Partial<CommercialLeaseRow>) =>
    setLeases(leases.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const del = (i: number) => setLeases(leases.filter((_, k) => k !== i));

  return (
    <div className="cols">
      <div className="card card-wide">
        <div className="card-title">Ticari Alan Kira Gelirleri</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          Bu bölüm yalnızca üçüncü kişilere kiralanan bağımsız alanlar içindir (otel işletmesinin kendi işlettiği alanlar için "Yardımcı Gelirler" adımını kullanın).
        </div>
        {leases.map((l, i) => {
          const calc = result.leaseRows[i];
          return (
            <div className="isletme-row" key={l.id}>
              <div className="isletme-row-head">
                <b>{l.tenant ? `${l.areaType} — ${l.tenant}` : (l.areaType || `Kira Alanı ${i + 1}`)}</b>
                <button type="button" className="link-btn" onClick={() => del(i)}>Satırı sil</button>
              </div>
              <Field label="Alan Türü">
                <Sel value={l.areaType} onChange={(v) => upd(i, { areaType: v })}
                     options={TICARI_KIRA_KATALOGU.map((t) => ({ value: t, label: t }))} />
              </Field>
              <Field label="Kiracı"><Txt value={l.tenant} onChange={(v) => upd(i, { tenant: v })} /></Field>
              <Field label="Kira Girişi">
                <Seg value={l.inputMode} onChange={(v) => upd(i, { inputMode: v })}
                     options={[{ value: 'aylik', label: 'Aylık' }, { value: 'yillik', label: 'Yıllık' }]} />
              </Field>
              <Field label={l.inputMode === 'aylik' ? 'Aylık Kira' : 'Yıllık Kira'}>
                <Num value={l.amount} onChange={(n) => upd(i, { amount: n })} suffix="₺" />
              </Field>
              {calc && (
                <div className="note-box" style={{ marginTop: 8 }}>
                  Aylık {fmt(calc.monthlyAmount)} · Yıllık <b>{fmt(calc.annualAmount)}</b>
                </div>
              )}
            </div>
          );
        })}
        <button type="button" className="btn add-btn" onClick={add}>+ Kira Alanı Ekle</button>

        {leases.length > 0 && (
          <div className="mini-kpi" style={{ marginTop: 14 }}>
            <div><span>Alan Sayısı</span><b>{leases.length}</b></div>
            <div><span>Toplam Kira Geliri</span><b>{fmt(result.totalLeaseRevenue)}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Adım 5 — İşletme Gideri ─────────────────── */
function StepOpex({ opex, setOpex, result }: {
  opex: HotelIncomeInput['opex']; setOpex: (p: Partial<HotelIncomeInput['opex']>) => void; result: ReturnType<typeof analyzeHotel>;
}) {
  const fmt = useFmt();
  return (
    <div className="cols">
      <div className="card card-wide">
        <div className="card-title">İşletme Gideri</div>
        <div className="hrow-labeled">
          <label className="pfield pfield--s"><span>İşletme Gider Oranı</span>
            <Pct value={opex.expenseRate} onChange={(n) => setOpex({ expenseRate: n })} /></label>
          <div className="pct-badge" title="Toplam gelirin bu orana göre gideri">
            {fmt(result.totalGrossRevenue)} × %{Math.round(opex.expenseRate * 100)} = {fmt(result.totalExpense)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Adım 6 — Projeksiyon ─────────────────── */

function StepProjection({ projection, setProjection, result, input, setInput, costOpen, setCostOpen, inaOpen, setInaOpen }: {
  projection: HotelIncomeInput['projection']; setProjection: (p: Partial<HotelIncomeInput['projection']>) => void;
  result: ReturnType<typeof analyzeHotel>;
  input: HotelIncomeInput; setInput: (fn: (p: HotelIncomeInput) => HotelIncomeInput) => void;
  costOpen: boolean; setCostOpen: (v: boolean) => void; inaOpen: boolean; setInaOpen: (v: boolean) => void;
}) {
  const fmt = useFmt();
  const isTl = (input.currency ?? 'TRY') === 'TRY';
  return (
    <div className="cols">
      <div className="card card-wide">
        <div className="card-title">Projeksiyon Parametreleri</div>
        <div className="hrow-labeled">
          <label className="pfield pfield--s"><span>Başlangıç Yılı</span>
            <Num value={projection.startYear} onChange={(n) => setProjection({ startYear: n })} plain /></label>
          <label className="pfield pfield--s"><span>Projeksiyon Süresi</span>
            <Num value={projection.years} onChange={(n) => setProjection({ years: Math.max(3, Math.min(25, Math.round(n || 10))) })} suffix="yıl" /></label>
          <label className="pfield pfield--s" title={isTl ? 'TÜFE\'ye yakın önerilir, ör. %28-33' : 'Döviz enflasyonuna yakın, ör. %2-5'}>
            <span>Gelir Artış Oranı</span>
            <Pct value={projection.incomeGrowthRate} onChange={(n) => setProjection({ incomeGrowthRate: n })} /></label>
          <label className="pfield pfield--s" title="Genelde gelir artışına yakın tutulur">
            <span>Gider Artış Oranı</span>
            <Pct value={projection.expenseGrowthRate} onChange={(n) => setProjection({ expenseGrowthRate: n })} /></label>
        </div>
        <Field label="Kapitalizasyon Oranı" hint={isTl ? 'NOI ÷ Kapitalizasyon Oranı — Türkiye otelcilikte piyasa aralığı ~%7-11' : 'NOI ÷ Kapitalizasyon Oranı — döviz bazlı piyasalarda ~%6-9'}>
          <Pct value={projection.capRate} onChange={(n) => setProjection({ capRate: n })} />
        </Field>
      </div>

      <div className="card card-optional card-wide">
        <details open={inaOpen || !!result.ina} onToggle={(e) => setInaOpen(e.currentTarget.open)}>
        <summary className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          İNA (İndirgenmiş Nakit Akımı)
          <span className="optional-badge">OPSİYONEL</span>
        </summary>
        <div className="hint" style={{ marginBottom: 8, marginTop: 8 }}>Boş bırakılırsa hesaba dahil edilmez, yalnız Direkt Kapitalizasyon kullanılır.</div>
        <div className="grid-2">
          <Field label="Risksiz Getiri Oranı" hint={isTl ? 'TCMB politika faizine yakın, ör. %35-38' : 'Döviz bazlı, ör. %5-8'}>
            <Pct value={projection.riskFreeRate ?? 0} onChange={(n) => {
              const prim = projection.riskPremium ?? 0;
              setProjection({ riskFreeRate: n, discountRate: n + prim > 0 ? n + prim : null });
            }} />
          </Field>
          <Field label="Risk Primi" hint={isTl ? 'Otelcilik için tipik, ör. %3-8' : 'Döviz bazlı, ör. %2-5'}>
            <Pct value={projection.riskPremium ?? 0} onChange={(n) => {
              const rf = projection.riskFreeRate ?? 0;
              setProjection({ riskPremium: n, discountRate: rf + n > 0 ? rf + n : null });
            }} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="İskonto Oranı" hint="Risksiz + prim (elle de ezilebilir)">
            <Pct value={projection.discountRate ?? 0} onChange={(n) => setProjection({ discountRate: n > 0 ? n : null })} />
          </Field>
          <Field label="Terminal Kap. Oranı" hint={projection.terminalCapRate == null ? 'Kapitalizasyon Oranı ile aynı' : 'Elle ayrı girildi'}>
            {projection.terminalCapRate == null ? (
              <div className="suffix-wrap">
                <input type="text" readOnly value={`${(projection.capRate * 100).toLocaleString('tr-TR')}`} style={{ background: 'var(--navy-50,#eef2f7)', color: 'var(--text-2)' }} />
                <span className="suffix">%</span>
              </div>
            ) : (
              <Pct value={projection.terminalCapRate} onChange={(n) => setProjection({ terminalCapRate: n > 0 ? n : 0.0001 })} />
            )}
            <button type="button" className="link-btn" style={{ marginTop: 4, fontSize: 11.5 }}
                    onClick={() => setProjection({ terminalCapRate: projection.terminalCapRate == null ? projection.capRate : null })}>
              {projection.terminalCapRate == null ? 'Farklı gir' : 'Kapitalizasyon Oranı ile senkronize et'}
            </button>
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Yenileme Fonu Oranı" hint="Her yıl için hesaplanır — %3-5 oranında önerilir">
            <Pct value={projection.renewalFundRate ?? 0} onChange={(n) => setProjection({ renewalFundRate: n > 0 ? n : null })} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Periyodik Bakım — Yıl Aralığı" hint="Örn. 5 → 5,10,15... yıllarda tekrar eder (0 = yok)">
            <Num value={projection.maintenanceYear ?? 0} onChange={(n) => setProjection({ maintenanceYear: n > 0 ? Math.round(n) : null })} />
          </Field>
          <Field label="Periyodik Bakım — Tutar" hint="İlk tekrara yansır; sonraki tekrarlar Gider Artış Oranıyla büyür">
            <Num value={projection.maintenanceAmount ?? 0} onChange={(n) => setProjection({ maintenanceAmount: n > 0 ? n : null })} suffix="₺" />
          </Field>
        </div>
        {(projection.maintenanceAmount ?? 0) > 0 && !projection.maintenanceYear && (
          <div className="warn-line">Periyodik Bakım Tutarı girildi ama Yıl Aralığı boş — bu gider hiçbir yıla uygulanmıyor, hesaba hiç girmiyor.</div>
        )}
        {result.ina && (
          <div className="note-box" style={{ marginTop: 10 }}>
            İNA sonucu: Terminal {fmt(result.ina.terminalValue)} · <b>NBD {fmt(result.ina.npv)}</b>
          </div>
        )}
        </details>
      </div>

      <div className="card card-wide">
        <details open={costOpen || !!result.cost} onToggle={(e) => setCostOpen(e.currentTarget.open)}>
        <summary className="card-title" style={{ cursor: 'pointer' }}>Maliyet Yaklaşımı — opsiyonel</summary>
        <div className="hint" style={{ marginBottom: 8, marginTop: 8 }}>Arsa Değeri + Yapı Değerleri toplanarak hesaplanır. Boş bırakılırsa hesaba dahil edilmez.</div>
        <div className="grid-2">
          <Field label="Arsa Alanı m²">
            <Num value={input.costParcelArea ?? 0} onChange={(n) => setInput((p) => ({ ...p, costParcelArea: n, costFromKml: false }))} suffix="m²" />
          </Field>
          <Field label="Arsa m² Birim Değeri">
            <Num value={input.costLandUnitValue ?? 0} onChange={(n) => setInput((p) => ({ ...p, costLandUnitValue: n }))} suffix="₺/m²" />
          </Field>
        </div>
        <label className="btn-ghost" style={{ display: 'inline-block', cursor: 'pointer', marginTop: 4 }}>
          KML Yükle (Arsa Alanı otomatik)
          <input type="file" accept=".kml" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try {
              const parsed = parseKml(await f.text());
              const area = parsed?.deedArea || parsed?.polygonArea || 0;
              if (area > 0) setInput((p) => ({ ...p, costParcelArea: Math.round(area), costFromKml: true }));
            } catch { /* yok say */ }
            e.currentTarget.value = '';
          }} />
        </label>
        {input.costParcelArea != null && input.costParcelArea > 0 && !input.costFromKml && (
          <div className="hint" style={{ marginTop: 4 }}>Arsa alanı elle girildi/değiştirildi.</div>
        )}

        <div className="card-title" style={{ marginTop: 14, fontSize: 13 }}>Yapılar</div>
        {(input.costBuildings ?? []).map((b, i) => (
          <div className="isletme-row" key={b.id}>
            <div className="grid-2">
              <Field label="Yapı Türü">
                <Sel value={BUILDING_TYPES.includes(b.type) ? b.type : 'Diğer'}
                     onChange={(v) => setInput((p) => ({ ...p, costBuildings: (p.costBuildings ?? []).map((x, j) => j === i ? { ...x, type: v } : x) }))}
                     options={BUILDING_TYPES.map((t) => ({ value: t, label: t }))} />
                {(!BUILDING_TYPES.includes(b.type) || b.type === 'Diğer') && (
                  <Txt value={BUILDING_TYPES.includes(b.type) ? '' : b.type} placeholder="Yapı adını yazın"
                       onChange={(v) => setInput((p) => ({ ...p, costBuildings: (p.costBuildings ?? []).map((x, j) => j === i ? { ...x, type: v || 'Diğer' } : x) }))} />
                )}
              </Field>
              <Field label="Alan m²">
                <Num value={b.area} onChange={(n) => setInput((p) => ({ ...p, costBuildings: (p.costBuildings ?? []).map((x, j) => j === i ? { ...x, area: n } : x) }))} suffix="m²" />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Birim Maliyet">
                <Num value={b.unitCost} onChange={(n) => setInput((p) => ({ ...p, costBuildings: (p.costBuildings ?? []).map((x, j) => j === i ? { ...x, unitCost: n } : x) }))} suffix="₺/m²" />
              </Field>
              <Field label="Amortisman % (opsiyonel)">
                <Num value={b.depreciationPct} onChange={(n) => setInput((p) => ({ ...p, costBuildings: (p.costBuildings ?? []).map((x, j) => j === i ? { ...x, depreciationPct: n } : x) }))} suffix="%" />
              </Field>
            </div>
            <button type="button" className="link-btn" onClick={() => setInput((p) => ({ ...p, costBuildings: (p.costBuildings ?? []).filter((_, j) => j !== i) }))}>Satırı sil</button>
          </div>
        ))}
        <button type="button" className="btn-ghost btn-sm" onClick={() => setInput((p) => ({
          ...p, costBuildings: [...(p.costBuildings ?? []), { id: newId(), type: BUILDING_TYPES[0], area: 0, unitCost: 0, depreciationPct: 0 }],
        }))}>➕ Yapı Ekle</button>

        <Field label="Şerefiye (opsiyonel)">
          <Num value={input.costGoodwill ?? 0} onChange={(n) => setInput((p) => ({ ...p, costGoodwill: n > 0 ? n : null }))} suffix="₺" />
        </Field>

        {result.cost && (
          <div className="note-box" style={{ marginTop: 10 }}>
            Arsa {fmt(result.cost.landValue)} + Yapılar {fmt(result.cost.buildingsValue)}{result.cost.goodwill > 0 ? ` + Şerefiye ${fmt(result.cost.goodwill)}` : ''} =
            <b> Maliyet Yaklaşımı Değeri: {fmt(result.cost.totalValueRounded)}</b>
          </div>
        )}
        </details>
      </div>

      {result.ina && (
      <div className="card card-wide">
        <div className="card-title">Yıllık Projeksiyon Tablosu</div>
        <div className="hint" style={{ marginBottom: 8 }}>İNA hesaplandığı için gösteriliyor — yalnız Direkt Kapitalizasyon kullanılıyorsa bu tablo gerekmez.</div>
        <div className="proj-table-wrap">
          <table className="proj-table">
            <thead>
              <tr><th>Yıl</th><th>Toplam Gelir</th><th>İşletme Gideri</th><th>NOI</th><th>Kapitalizasyon Değeri</th></tr>
            </thead>
            <tbody>
              {result.projectionTable.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{fmt(row.totalRevenue)}</td>
                  <td>{fmt(row.totalExpense)}</td>
                  <td>{fmt(row.noi)}</td>
                  <td>{fmt(row.capitalizedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

/* ─────────────────── Sonuç Ekranı ─────────────────── */
function HotelResult({ input, result, setFinal }: {
  input: HotelIncomeInput; result: ReturnType<typeof analyzeHotel>;
  setFinal: (p: Partial<HotelIncomeInput>) => void;
}) {
  const fmt = useFmt();
  const finalValue = input.finalMethod === 'ina' && result.ina ? result.ina.npv
    : input.finalMethod === 'maliyet' && result.cost ? result.cost.totalValueRounded
    : input.finalMethod === 'manuel' ? (input.finalManualValue ?? 0)
    : result.capitalizedValue;
  const [busy, setBusy] = useState(false);
  return (
    <div className="cols">
      <div className="card result-preview">
        <div className="dual-values">
          <div className={`dual-box${(input.finalMethod ?? 'direkt') === 'direkt' ? ' dual-box--chosen' : ''}`}>
            <span>DİREKT KAPİTALİZASYON</span>
            <b>{fmt(result.capitalizedValue)}</b>
            <em>NOI ÷ %{(input.projection.capRate * 100).toFixed(1).replace('.', ',')}</em>
          </div>
          {result.ina && (
            <div className={`dual-box${input.finalMethod === 'ina' ? ' dual-box--chosen' : ''}`}>
              <span>İNA (NBD)</span>
              <b>{fmt(result.ina.npv)}</b>
              <em>{input.projection.years} yıl · iskonto %{((input.projection.discountRate ?? 0) * 100).toFixed(1).replace('.', ',')} · terminal dahil</em>
            </div>
          )}
          {result.cost && (
            <div className={`dual-box${input.finalMethod === 'maliyet' ? ' dual-box--chosen' : ''}`}>
              <span>MALİYET YAKLAŞIMI</span>
              <b>{fmt(result.cost.totalValueRounded)}</b>
              <em>Arsa + Yapı Değerleri</em>
            </div>
          )}
        </div>
        <div className="hrow-labeled" style={{ margin: '12px 0' }}>
          <label className="pfield"><span>Nihai Değer Seçimi (uzman takdiri)</span>
            <select value={input.finalMethod ?? 'direkt'}
                    onChange={(e) => setFinal({ finalMethod: e.target.value as HotelIncomeInput['finalMethod'] })}>
              <option value="direkt">Direkt Kapitalizasyon</option>
              {result.ina && <option value="ina">İNA (NBD)</option>}
              {result.cost && <option value="maliyet">Maliyet Yaklaşımı</option>}
              <option value="manuel">Elle tutar</option>
            </select></label>
          {input.finalMethod === 'manuel' && (
            <label className="pfield"><span>Elle Nihai Değer ₺</span>
              <input type="number" value={input.finalManualValue ?? ''}
                     onChange={(e) => setFinal({ finalManualValue: Number(e.target.value) || 0 })} /></label>
          )}
          <div className="pfield pfield--ro pfield--big"><span>NİHAİ DEĞER</span><b>{fmt(finalValue)}</b></div>
        </div>
        <div className="kpi-grid" style={{ marginTop: 12 }}>
          <div className="kpi"><div className="kpi-label">Toplam Brüt Gelir (yıllık)</div><div className="kpi-value">{fmt(result.totalGrossRevenue)}</div></div>
          <div className="kpi"><div className="kpi-label">Toplam İşletme Gideri</div><div className="kpi-value">{fmt(result.totalExpense)}</div></div>
          <div className="kpi"><div className="kpi-label">Net İşletme Geliri</div><div className="kpi-value">{fmt(result.noi)}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Gelir Kırılımı</div>
        <div className="row"><span className="row-label">Toplam Oda Geliri</span><span className="row-value">{fmt(result.totalRoomRevenue)}</span></div>
        <div className="row"><span className="row-label">Toplam Yardımcı Gelir</span><span className="row-value">{fmt(result.totalAncillaryRevenue)}</span></div>
        <div className="row"><span className="row-label">Toplam Ticari Kira Geliri</span><span className="row-value">{fmt(result.totalLeaseRevenue)}</span></div>
        <div className="row total"><span className="row-label">TOPLAM BRÜT GELİR</span><span className="row-value">{fmt(result.totalGrossRevenue)}</span></div>
      </div>

      {result.warnings.length > 0 && (
        <div className="card">
          <div className="card-title">Uyarılar</div>
          {result.warnings.map((w, i) => (
            <div key={i} className={w.level === 'uyari' ? 'note-box note-warn' : 'note-box'} style={{ marginBottom: 6 }}>
              ⚠ {w.message}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">Değerlendirme Özeti</div>
        <p className="hint" style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{result.summaryText}</p>
      </div>

      <div className="card no-print">
        <div className="card-title">Rapor</div>
        <div className="hint" style={{ marginBottom: 8 }}>PDF'te gösterilecek yöntemler:</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
          <label className="pdf-toggle"><input type="checkbox" checked={input.showIncomeInPdf ?? true}
                   onChange={(e) => setFinal({ showIncomeInPdf: e.target.checked })} /> Gelir (Direkt Kapitalizasyon)</label>
          <label className="pdf-toggle"><input type="checkbox" checked={input.showInaInPdf ?? true}
                   onChange={(e) => setFinal({ showInaInPdf: e.target.checked })} /> İNA</label>
          <label className="pdf-toggle"><input type="checkbox" checked={input.showCostInPdf ?? true}
                   onChange={(e) => setFinal({ showCostInPdf: e.target.checked })} /> Maliyet Yaklaşımı</label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try { await downloadHotelPdf(input, result); }
                  finally { setBusy(false); }
                }}>
          {busy ? 'Hazırlanıyor…' : '📄 PDF Raporu İndir'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try { await downloadHotelExcel(input, result); }
                  finally { setBusy(false); }
                }}>
          📊 Excel Raporu İndir
        </button>
        </div>
      </div>
    </div>
  );
}
