import { useEffect, useMemo, useState } from 'react';
import type { ProjectInput } from './engine';
import { analyze } from './engine';
import { VILLA_DEFAULT_CLASS, YAPI_SINIFLARI } from './data/yapiSiniflari';
import { Step1, Step2, Step3, Step4, Step5, type Upd, type SetTop } from './ui/Steps';
import { Choice } from './ui/fields';
import { AgriApp } from './agri/AgriApp';
import { FuelApp } from './fuel/FuelApp';
import { DetailedUstHakkiApp } from './usthakki/DetailedUstHakkiApp';
import { SimpleUstHakkiApp } from './usthakki/SimpleUstHakkiApp';
import { Result } from './ui/Result';
import { BRAND } from './brand/brand';
import { readDataSheet } from './export/excelImport';
import { ThemeToggle } from './ui/ThemeToggle';
import { getLang, setLang, startDomTranslation, stopDomTranslation, type Lang } from './i18n';
import HotelApp from './hotel/HotelApp';

const VERSION = BRAND.version;
const DRAFT_KEY = 'arsaplan-taslak-v7';

const DEFAULT_INPUT: ProjectInput = {
  assetType: 'konut',
  housingType: 'villa',
  ticariMode: 'apartman',
  parcel: { il: 'İstanbul', ilce: '', mahalle: '', ada: '', parsel: '', area: 0, netArea: 0 },
  zoning: {
    mode: 'taks-kaks', lejant: '', taks: null, kaks: null, hmax: null,
    directFootprint: 0, directEmsalArea: 0, cekmeFront: 5, cekmeSide: 3, cekmeRear: 3, cekmeFrontEdge: null, planNotes: '',
  },
  emsal: {
    hasExtra: false, extraMode: 'oran', extraRate: 0.10, extraArea: 0,
    hasAttic: false, atticMode: 'oran', atticRate: 0.50, atticArea: 0, atticInEmsal: false,
    hasBasement: false, basementMode: 'oran', basementRate: 1.0, basementArea: 0, basementInEmsal: false,
  },
  villa: { villaType: 'mustakil', unitCount: 0, floorsAboveGround: 2 },
  apartment: {
    basementCount: 1,
    basements: [
      { use: 'konut', area: null, lossRate: 0.10, saleable: null },
      { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
      { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
      { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
    ],
    zeminArea: null, zeminLossRate: 0.15, zeminSaleable: null,
    normalCount: null,
    normalAreas: [null, null, null, null, null, null, null, null],
    normalSaleables: [null, null, null, null, null, null, null, null],
    normalCommonRate: 0.10,
    hasPiyes: false, piyesInEmsal: true, piyesRate: 0.30,
    piyesArea: null, piyesSaleable: null,
    asmaCount: 0, asmaInEmsal: true, asmaRate: 0.40,
    asmaAreas: [null, null, null, null],
    asmaSaleables: [null, null, null, null],
    hasExtraSaleable: false, extraMode: 'oran', extraRate: 0.10, extraArea: 0,
  },
  isletme: {
    buildings: [],
    inflationRate: 0,
    wallUnitCost: 0, landscapeUnitCost: 0, infraUnitCost: 0,
    otherCosts: [],
    salesTotal: 0,
  },
  cost: {
    buildingClass: VILLA_DEFAULT_CLASS,
    unitCost: YAPI_SINIFLARI.find((s) => s.code === VILLA_DEFAULT_CLASS)!.unitCost,
    inflationRate: 0, extrasRate: 0.12,
  },
  site: { landscapeArea: 0, landscapeUnitCost: 1200, gardenPricePerM2: 0 },
  sales: { unitPrice: 0, apt: { bodrum: 0, bodrumTicari: 0, zemin: 0, asma: 0, normal: 0, piyes: 0 } },
  residual: { profitRate: 0.25, financeRateOfCost: 0 },
  share: { enabled: true, ownerShare: 0.45 },
};

const STEPS_KONUT = [
  { title: 'Değerleme Konusu ve Taşınmaz', desc: 'Ne değerleniyor, konut ürünü ve parsel bilgileri.' },
  { title: 'İmar ve Alan Üretimi', desc: 'Yapılaşma hakları, emsal dışı alanlar, çatı ve bodrum.' },
  { title: 'Maliyet ve Satış', desc: 'Yapım maliyeti, peyzaj ve satış değeri.' },
  { title: 'Değerleme', desc: 'Kâr, finansman ve kat karşılığı.' },
];
const STEPS_KARMA = [
  { title: 'Değerleme Konusu ve Taşınmaz', desc: 'Ne değerleniyor, parsel bilgileri.' },
  { title: 'İmar ve Kat Kurgusu', desc: 'Yapılaşma hakları, bodrum, asma kat ve çatı arası piyesi.' },
  { title: 'Maliyet ve Satış', desc: 'Yapım maliyeti ve kat tipine göre satış değerleri.' },
  { title: 'Değerleme', desc: 'Kâr, finansman ve kat karşılığı.' },
];
const STEPS_TICARI_APT = [
  { title: 'Değerleme Konusu ve Taşınmaz', desc: 'Ne değerleniyor, ticari apartman / işletme seçimi ve parsel bilgileri.' },
  { title: 'İmar ve Kat Kurgusu', desc: 'Yapılaşma hakları, bodrum, asma kat ve çatı arası piyesi.' },
  { title: 'Maliyet ve Satış', desc: 'Yapım maliyeti ve kat tipine göre satış değerleri.' },
  { title: 'Değerleme', desc: 'Kâr, finansman ve kat karşılığı.' },
];
const STEPS_ISLETME = [
  { title: 'Değerleme Konusu ve Taşınmaz', desc: 'Ne değerleniyor, ticari apartman / işletme seçimi ve parsel bilgileri.' },
  { title: 'Yapılar ve Maliyetler', desc: 'Yapı satırları, güncelleme, yıpranma ve ilave maliyetler.' },
  { title: 'Satış Değeri', desc: 'Öngörülen toplam satış değeri.' },
];

/** Ham taslak nesnesini güvenli biçimde varsayılanlarla birleştirir (eksik alan toleransı). */
function mergeDraft(d: any): ProjectInput {
  const D = DEFAULT_INPUT;
  return {
      ...D, ...d,
      parcel: { ...D.parcel, ...(d.parcel ?? {}) },
      zoning: { ...D.zoning, ...(d.zoning ?? {}) },
      emsal: { ...D.emsal, ...(d.emsal ?? {}) },
      villa: { ...D.villa, ...(d.villa ?? {}) },
      apartment: {
        ...D.apartment, ...(d.apartment ?? {}),
        basements: (d.apartment?.basements ?? D.apartment.basements)
          .map((b: any, i: number) => ({ ...D.apartment.basements[i], ...b })),
      },
      isletme: {
        ...D.isletme, ...(d.isletme ?? {}),
        buildings: d.isletme?.buildings ?? [],
        otherCosts: d.isletme?.otherCosts ?? [],
      },
      cost: { ...D.cost, ...(d.cost ?? {}) },
      site: { ...D.site, ...(d.site ?? {}) },
      sales: {
        ...D.sales, ...(d.sales ?? {}),
        apt: { ...D.sales.apt, ...(d.sales?.apt ?? {}) },
      },
      residual: { ...D.residual, ...(d.residual ?? {}) },
      fx: { ...D.fx!, ...(d.fx ?? {}) },
      share: { ...D.share, ...(d.share ?? {}) },
    };
}

function loadDraft(): ProjectInput {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return DEFAULT_INPUT;
    const d = JSON.parse(raw);
    return mergeDraft(d);
  } catch {
    return DEFAULT_INPUT;
  }
}

/** ArsaPlan'ın mevcut "Arsa Gelir Projeksiyon Yöntemi" akışı — hiçbir satırı değiştirilmemiştir. */
function ArsaApp({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<ProjectInput>(DEFAULT_INPUT);
  const [hasSavedDraft] = useState(() => { try { return !!localStorage.getItem(DRAFT_KEY); } catch { return false; } });

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(input)); } catch { /* kota */ }
  }, [input]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const upd: Upd = (key, patch) =>
    setInput((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...(patch as object) } }));
  const setTop: SetTop = (key, value) => setInput((prev) => ({ ...prev, [key]: value }));

  const lang = getLang();

  const isIsletme = input.assetType === 'ticari' && input.ticariMode === 'isletme';

  /** Örnek proje: eğitim amaçlı dolu bir karma analiz. */
  function fillSample() {
    if (!window.confirm('Örnek proje yüklenecek ve mevcut girişlerin üzerine yazılacak. Devam edilsin mi?')) return;
    const sample = mergeDraft({
      assetType: 'karma', housingType: 'apartman-3-8', ticariMode: 'apartman',
      parcel: { il: 'İstanbul', ilce: 'Zeytinburnu', mahalle: 'Örnek', ada: '1954', parsel: '7', area: 1000, netArea: 1000 },
      zoning: { mode: 'taks-kaks', lejant: 'Konut + Ticaret Alanı', taks: 0.30, kaks: 2.70, hmax: 27.5, directFootprint: 0, directEmsalArea: 0, cekmeFront: 5, cekmeSide: 3, cekmeRear: 3, cekmeFrontEdge: null, planNotes: 'Örnek plan notu: çekme mesafeleri korunacaktır.' },
      apartment: {
        basementCount: 2,
        basements: [
          { use: 'ticari', area: null, lossRate: 0.10, saleable: null },
          { use: 'ortak', area: null, lossRate: 0.10, saleable: null },
        ],
        zeminLossRate: 0.15, normalCommonRate: 0.10,
        hasPiyes: true, piyesInEmsal: true, piyesRate: 0.30,
        asmaCount: 1, asmaInEmsal: true, asmaRate: 0.40,
        hasExtraSaleable: true, extraMode: 'oran', extraRate: 0.20,
      },
      cost: { buildingClass: 'IV-A', unitCost: 30000, inflationRate: 0, extrasRate: 0.05 },
      sales: { unitPrice: 0, apt: { bodrum: 60000, bodrumTicari: 120000, zemin: 150000, asma: 130000, normal: 100000, piyes: 90000 } },
      residual: { profitRate: 0.25, financeRateOfCost: 0 },
      share: { enabled: true, ownerShare: 0.45 },
    });
    setInput(sample);
    setStep(1);
    window.scrollTo({ top: 0 });
  }

  /** Taslağı .json dosyası olarak indirir (tarayıcı verisi silinse bile analiz korunur). */
  function exportDraft() {
    const payload = JSON.stringify({ app: 'ArsaPlan', draftKey: DRAFT_KEY, savedAt: new Date().toISOString(), input }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const t = input.parcel.ilce || input.parcel.il || 'taslak';
    a.download = `ArsaPlan-Taslak-${t.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  /** Dosyadan taslak yükler; eksik alanlar varsayılanla tamamlanır. */
  function importDraft(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result));
        const raw = d && typeof d === 'object' && 'input' in d ? d.input : d;
        setInput(mergeDraft(raw));
        setStep(1);
        window.scrollTo({ top: 0 });
      } catch {
        window.alert('Dosya okunamadı: geçerli bir ArsaPlan taslağı değil.');
      }
    };
    reader.readAsText(file);
  }

  /** Yalnızca görünen adımın alanlarını varsayılana döndürür; diğer adımlar korunur. */
  function resetStep() {
    if (!window.confirm('Bu adımdaki tüm girişler varsayılana dönecek. Emin misiniz?')) return;
    const D = DEFAULT_INPUT;
    setInput((prev) => {
      const next = { ...prev };
      const karma = prev.assetType === 'karma' ||
        (prev.assetType === 'ticari' && prev.ticariMode === 'apartman');
      const isletme = prev.assetType === 'ticari' && prev.ticariMode === 'isletme';
      switch (step) {
        case 1:
          next.assetType = D.assetType;
          next.housingType = D.housingType;
          next.ticariMode = D.ticariMode;
          break;
        case 2:
          next.parcel = { ...D.parcel };
          if (prev.assetType === 'konut') next.housingType = D.housingType;
          if (prev.assetType === 'ticari') next.ticariMode = D.ticariMode;
          break;
        case 3:
          if (isletme) {
            next.isletme = { ...D.isletme, buildings: [], otherCosts: [], salesTotal: prev.isletme.salesTotal };
          } else {
            next.zoning = { ...D.zoning };
            if (karma || prev.housingType === 'apartman-3-8') {
              next.apartment = {
                ...D.apartment,
                basements: D.apartment.basements.map((b) => ({ ...b })),
                normalAreas: [...D.apartment.normalAreas],
                normalSaleables: [...D.apartment.normalSaleables],
                asmaAreas: [...D.apartment.asmaAreas],
                asmaSaleables: [...D.apartment.asmaSaleables],
              };
            } else {
              next.emsal = { ...D.emsal };
              next.villa = { ...D.villa };
            }
          }
          break;
        case 4:
          if (isletme) {
            next.isletme = { ...prev.isletme, salesTotal: D.isletme.salesTotal };
          } else {
            next.cost = { ...D.cost };
            next.site = { ...D.site };
            next.sales = { ...D.sales, apt: { ...D.sales.apt } };
          }
          break;
        case 5:
          next.residual = { ...D.residual };
          next.share = { ...D.share };
          break;
      }
      return next;
    });
    window.scrollTo({ top: 0 });
  }
  const STEPS = input.assetType === 'karma' ? STEPS_KARMA
    : input.assetType === 'ticari' ? (isIsletme ? STEPS_ISLETME : STEPS_TICARI_APT)
    : STEPS_KONUT;
  const TOTAL = STEPS.length;
  useEffect(() => {
    /* Yol değişince adım sayısı kısalabilir; taşmayı engelle. */
    if (step > TOTAL + 1) setStep(TOTAL + 1);
  }, [TOTAL, step]);
  const result = useMemo(() => analyze(input), [input]);
  const isResult = step > TOTAL;
  const meta = STEPS[Math.min(step, TOTAL) - 1];

  const blocker = (): string | null => {
    if (step === 1) {
      if (!input.parcel.area) return 'Parsel alanı giriniz.';
      if (!input.parcel.netArea) return 'Net parsel alanı giriniz.';
    }
    const karma = input.assetType === 'karma' ||
      (input.assetType === 'ticari' && input.ticariMode === 'apartman');
    const apartman = karma || input.housingType === 'apartman-3-8';
    if (isIsletme) {
      if (step === 2) {
        if (input.isletme.buildings.length === 0) return 'En az bir yapı satırı ekleyiniz.';
        if (input.isletme.buildings.some((b) => !b.area)) return 'Tüm yapı satırlarına alan giriniz.';
      }
      if (step === 3 && !input.isletme.salesTotal) return 'Öngörülen satış değerini giriniz.';
      return null;
    }
    if (step === 2) {
      const z = input.zoning;
      if (z.mode === 'taks-kaks' && z.kaks == null) return 'KAKS (emsal) değerini giriniz.';
      if (z.mode === 'dogrudan' && !apartman && !z.directEmsalArea) return 'Emsale dahil alanı giriniz.';
    }
    if (step === 3) {
      if (!input.cost.unitCost) return 'Birim maliyet giriniz.';
      if (apartman) {
        if (!input.sales.apt.normal) return 'Normal kat satış birim değerini giriniz.';
      } else if (!input.sales.unitPrice) return 'Satış birim değeri giriniz.';
    }
    return null;
  };
  const stop = blocker();

  const reset = () => {
    if (!window.confirm('Tüm girdiler silinip yeni analiz başlatılacak. Emin misiniz?')) return;
    localStorage.removeItem(DRAFT_KEY);
    setInput(DEFAULT_INPUT);
    setStep(1);
  };

  const P = { input, upd, setTop };

  return (
    <div className="app" id="arsaplan-root" key={lang}>
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <h1>{BRAND.appName}</h1>
            <p>{BRAND.tagline}</p>
          </div>
          <div className="topbar-actions no-print">
            {hasSavedDraft && (
              <button type="button" className="link-btn topbar-link" title="Daha önce girdiğiniz, kaydedilmiş verileri geri yükler"
                      onClick={() => setInput(loadDraft())}>
                ↺ Eski verileri geri getir
              </button>
            )}
            <button type="button" className="link-btn topbar-link"
                    onClick={() => { window.location.hash = ''; }}
                    title="Yöntem seçim ekranına dön">← Başlangıç</button>
            <button type="button" className="link-btn topbar-link" onClick={exportDraft}
                    title="Analiz girişlerini .json dosyası olarak kaydeder">💾 Taslağı Kaydet</button>
            <label className="link-btn topbar-link" title="Kaydedilmiş .json taslağını geri yükler">
              📂 Taslak Yükle
              <input type="file" accept="application/json,.json" style={{ display: 'none' }}
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) importDraft(f); e.target.value = ''; }} />
            </label>
            <label className="link-btn topbar-link" title="Daha önce indirilen .xlsx dosyasından verileri geri yükler">
              📊 Excel Yükle
              <input type="file" accept=".xlsx" style={{ display: 'none' }}
                     onChange={async (e) => {
                       const f = e.target.files?.[0]; e.currentTarget.value = ''; if (!f) return;
                       const data = await readDataSheet<ProjectInput>(f);
                       if (data) { setInput(mergeDraft(data)); setStep(1); window.scrollTo({ top: 0 }); }
                       else window.alert('Bu Excel dosyasında ArsaPlan verisi bulunamadı.');
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

      {!isResult && input.parcel.area > 0 && result.financial.revenue > 0 && (
        <div className="hotel-summary-sticky no-print">
          <div className="hotel-summary-inner">
            <div><span>Hasılat</span><b>{Math.round(result.financial.revenue).toLocaleString('tr-TR')} ₺</b></div>
            <div><span>Toplam Maliyet</span><b>{Math.round(result.financial.totalCost).toLocaleString('tr-TR')} ₺</b></div>
            <div><span>Arsa Değeri (Artık Değer)</span><b>{Math.round(result.financial.residualLandValue).toLocaleString('tr-TR')} ₺</b></div>
          </div>
        </div>
      )}

      <div className="step" key={step}>
        {!isResult && (
          <div className="step-head">
            <div className="step-eyebrow">Adım {step}</div>
            <div className="step-title">{meta.title}</div>
            <div className="step-desc">{meta.desc}</div>
            <button type="button" className="link-btn step-reset" onClick={resetStep}>
              ↺ Bu adımı sıfırla
            </button>
          </div>
        )}

        {step === 1 && (<><Step1 {...P} onSample={fillSample} /><Step2 {...P} /></>)}
        {step === 2 && <Step3 {...P} />}
        {step === 3 && <Step4 {...P} />}
        {step === 4 && <Step5 {...P} />}
        {isResult && <Result input={input} result={result} version={VERSION} />}

        {stop && !isResult && (
          <div className="card blocker">{stop}</div>
        )}
        {!isResult && (
          <div className="stamp">
            {BRAND.preparedBy}<br />{BRAND.developerLine} · {BRAND.appName} {VERSION}
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
  );
}

/* ═══════════════════════════════════════════════════════════════
   BAŞLANGIÇ EKRANI — İki yöntem arasında seçim
   "Arsa Gelir Projeksiyon Yöntemi" mevcut haliyle korunur (ArsaApp);
   "Otel Gelir Hesabı" ise tamamen bağımsız yeni bir modüldür (HotelApp).
   ═══════════════════════════════════════════════════════════════ */
type AppMode = 'landing' | 'arsa' | 'otel' | 'tarimsal' | 'akaryakit' | 'usthakki-secim' | 'usthakki-detay' | 'usthakki-toplam' | 'usthakki-arsa';
function Landing({ onSelect }: { onSelect: (m: Exclude<AppMode, 'landing'>) => void }) {
  const [ver, date] = BRAND.version.split(' · ');
  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <h1>{BRAND.appName}</h1>
            <p>{BRAND.tagline}</p>
          </div>
          <img className="brand-logo brand-logo--hero" src={`${import.meta.env.BASE_URL}dora-logo.png`} alt={BRAND.company} />
        </div>
      </div>
      <div className="step">
        <div className="step-head">
          <div className="step-eyebrow">Başlangıç</div>
          <div className="step-title">Ne Hesaplamak İstiyorsunuz?</div>
          <div className="step-desc">Bir yöntem seçerek analize başlayın.</div>
        </div>
        <div className="card">
          <div className="choice-grid">
            <Choice on={false} name="Arsa Gelir Projeksiyon Yöntemi"
                    desc="Konut / Ticari / Karma Kullanım · Kat karşılığı ve gelir projeksiyonu karşılaştırması"
                    onClick={() => onSelect('arsa')} />
            <Choice on={false} name="Otel Gelir Hesabı"
                    desc="Gelir İndirgeme Yaklaşımı · Oda, yardımcı gelir ve ticari kira gelirleri üzerinden kapitalizasyon"
                    onClick={() => onSelect('otel')} />
            <Choice on={false} name="Akaryakıt Gelir Hesabı"
                    desc="Litre/ciro bazlı gelir yöntemi + opsiyonel maliyet yaklaşımı · KDV hariç fiyatlarla"
                    onClick={() => onSelect('akaryakit')} />
            <Choice on={false} name="Tarımsal Ürün Gelir Hesabı"
                    desc="Ekili / Dikili / Karma ürün deseni · verim kataloğu · amorti yılı yaklaşımı"
                    onClick={() => onSelect('tarimsal')} />
            <Choice on={false} name="Üst Hakkı Değerleme"
                    desc="Standart Hesap veya Ayrıntılı (otel tarzı) Değer Analizi · dönem sayısı kalan süre kadar"
                    onClick={() => onSelect('usthakki-secim')} />
          </div>
        </div>
        <div className="landing-footer">
          <span>Sürüm {ver}</span><span>·</span><span>Son Güncelleme {date}</span>
          <span>·</span><span>5 Modül</span><span>·</span><span>{BRAND.company} · Erhan Öntürk</span>
        </div>
      </div>
    </div>
  );
}

function modeFromHash(): AppMode {
  const h = window.location.hash.replace('#', '');
  return (['arsa', 'otel', 'tarimsal', 'akaryakit', 'usthakki-secim', 'usthakki-detay', 'usthakki-toplam', 'usthakki-arsa'] as const).includes(h as never) ? (h as AppMode) : 'landing';
}

export default function App() {
  // Hash tabanlı yönlendirme: #arsa / #otel. Tarayıcının GERİ tuşu doğal çalışır,
  // açılışta her zaman yöntem seçim ekranı gelir.
  const [mode, setMode] = useState<AppMode>(modeFromHash);

  const [lang, setLangState] = useState<Lang>(getLang());
  function switchLang(l: Lang) { setLang(l); setLangState(l); }
  useEffect(() => {
    // Not: kök eleman id'si "root" — önceden yanlışlıkla "arsaplan-root" aranıyordu, çeviri hiç tetiklenmiyordu.
    const root = document.getElementById('root');
    if (root && lang === 'en') startDomTranslation(root);
    else stopDomTranslation();
    return () => stopDomTranslation();
  }, [lang, mode]);

  useEffect(() => {
    const onHash = () => setMode(modeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const choose = (m: Exclude<AppMode, 'landing'>) => { window.location.hash = m; };
  const back = () => { window.location.hash = ''; };

  let content: React.ReactNode;
  if (mode === 'otel') content = <HotelApp onBack={back} />;
  else if (mode === 'tarimsal') content = <AgriApp onBack={back} />;
  else if (mode === 'akaryakit') content = <FuelApp onBack={back} />;
  else if (mode === 'usthakki-detay') content = <DetailedUstHakkiApp onBack={() => { window.location.hash = 'usthakki-secim'; }} />;
  else if (mode === 'usthakki-toplam') content = <SimpleUstHakkiApp method="toplam" onBack={() => { window.location.hash = 'usthakki-secim'; }} />;
  else if (mode === 'usthakki-arsa') content = <SimpleUstHakkiApp method="arsa" onBack={() => { window.location.hash = 'usthakki-secim'; }} />;
  else if (mode === 'usthakki-secim') content = (
    <div className="app">
      <div className="topbar"><div className="topbar-inner">
        <div><h1>{BRAND.appName}</h1><p>Üst Hakkı Değerleme</p></div>
        <img className="brand-logo" src={`${import.meta.env.BASE_URL}dora-logo.png`} alt={BRAND.company} />
      </div></div>
      <div className="step">
        <div className="step-head">
          <div className="step-eyebrow">Üst Hakkı Değerleme</div>
          <div className="step-title">Hangi Hesap Yöntemi?</div>
          <div className="step-desc">Bir yöntem seçin. İkisi de kalan süreye göre otomatik dönem sayısı üretir.</div>
        </div>
        <div className="card">
          <div className="choice-grid">
            <Choice on={false} name="Toplam Değer Esaslı Üst Hakkı Tespiti"
                    desc="Arsa+Yapı Değeri × 2/3 × (Kalan/Toplam Süre) — sade ve hızlı"
                    onClick={() => { window.location.hash = 'usthakki-toplam'; }} />
            <Choice on={false} name="Arsa Değeri Esaslı Üst Hakkı Tespiti"
                    desc="Yalnız arsa süreye göre oranlanır, bina değeri tam eklenir"
                    onClick={() => { window.location.hash = 'usthakki-arsa'; }} />
            <Choice on={false} name="Toplam Gelir Üzerinden Üst Hakkı Hesabı"
                    desc="Otel tarzı gelir/gider zinciri · dönemsel DCF tablo · döviz desteği"
                    onClick={() => { window.location.hash = 'usthakki-detay'; }} />
          </div>
        </div>
        <div className="card" style={{ marginTop: -4 }}>
          <button type="button" className="btn-ghost" onClick={back}>← Ana Sayfaya Dön</button>
        </div>
      </div>
    </div>
  );
  else if (mode === 'arsa') content = <ArsaApp onBack={back} />;
  else content = <Landing onSelect={choose} />;

  return (<>{content}<ThemeToggle />
    {lang === 'en' && (
      <div className="en-partial-note no-print">
        This version does not yet fully support English — some sections remain in Turkish.
      </div>
    )}
    <button type="button" className="lang-toggle-fab no-print"
    title={lang === 'tr' ? 'Switch the whole application to English' : 'Uygulamayı Türkçeye döndür'}
    onClick={() => switchLang(lang === 'tr' ? 'en' : 'tr')}>
    {lang === 'tr' ? '🌐 EN' : '🌐 TR'}
  </button></>);
}
