/**
 * TİCARİ İŞLETME — ADIM BİLEŞENLERİ
 * Ekle-mantığı: kullanıcı katalogdan yapı seçer, satır olarak eklenir;
 * her satırda alan, yıpranma ve birim maliyet (tebliğden otomatik, elle değişir).
 */
import type { ProjectInput, IsletmeBuilding, IsletmeInput } from '../engine';
import { computeIsletme, ISLETME_KATALOG } from '../engine';
import { YAPI_SINIFLARI } from '../data/yapiSiniflari';
import { Field, Txt, Num, Pct, Sel, Seg, fmtM2, fmtTL, fmtTLm2 } from './fields';
import type { Upd, SetTop } from './Steps';

interface P { input: ProjectInput; upd: Upd; setTop: SetTop; }

const TYPE_OPTIONS = ISLETME_KATALOG.flatMap((k) =>
  k.types.map((t) => ({ value: t.label, label: `${k.category} — ${t.label}`, cls: t.buildingClass })));

export function Step3Isletme({ input, upd }: P) {
  const inp = input.isletme;
  const r = computeIsletme(input.parcel, inp);
  const set = (patch: Partial<IsletmeInput>) => upd('isletme', patch);
  const setB = (i: number, patch: Partial<IsletmeBuilding>) =>
    set({ buildings: inp.buildings.map((b, k) => (k === i ? { ...b, ...patch } : b)) });

  const addBuilding = (typeLabel: string) => {
    const opt = TYPE_OPTIONS.find((o) => o.value === typeLabel);
    if (!opt) return;
    set({
      buildings: [...inp.buildings, {
        type: opt.value, buildingClass: opt.cls, area: 0,
        depreciation: 0, unitCostOverride: null,
      }],
    });
  };

  return (
    <div className="cols">
      <div className="card card-wide">
        <div className="card-title">1 · Yapılar</div>
        <div className="grid-2">
          <Field label="Yapı Ekle" hint="Katalogdan seçin; aynı türden birden fazla eklenebilir.">
            <Sel value="" onChange={(v) => v && addBuilding(v)}
                 options={[{ value: '', label: 'Yapı türü seçiniz…' }, ...TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))]} />
          </Field>
          <Field label="Güncelleme Oranı" hint="Tebliğ birim maliyetlerine uygulanır · tüm satırlara ortak">
            <Pct value={inp.inflationRate} onChange={(n) => set({ inflationRate: n })} />
          </Field>
        </div>

        {inp.buildings.map((b, i) => {
          const row = r.rows[i];
          return (
            <div className="b-row" key={i}>
              <div className="b-cell b-type" title={b.type}>{b.type}</div>
              <div className="b-cell">
                <Sel value={b.buildingClass}
                     onChange={(code) => setB(i, { buildingClass: code, unitCostOverride: null })}
                     options={YAPI_SINIFLARI.map((x) => ({ value: x.code, label: x.code }))} />
              </div>
              <div className="b-cell">
                <Num value={b.area} onChange={(n) => setB(i, { area: n })} suffix="m²" />
              </div>
              <div className="b-cell">
                <Pct value={b.depreciation} onChange={(n) => setB(i, { depreciation: n, unitCostOverride: null })} />
              </div>
              <div className="b-cell">
                <Num value={row.effectiveUnitCost}
                     onChange={(n) => setB(i, { unitCostOverride: n })} suffix="₺/m²" />
                {row.overridden && (
                  <button type="button" className="cell-reset" title="Otomatik hesaba dön"
                          onClick={() => setB(i, { unitCostOverride: null })}>↺</button>
                )}
              </div>
              <div className="b-cell b-cost">{fmtTL(row.cost)}</div>
              <button type="button" className="b-del" title="Satırı sil"
                      onClick={() => set({ buildings: inp.buildings.filter((_, k) => k !== i) })}>✕</button>
            </div>
          );
        })}
        {inp.buildings.length > 0 && (
          <div className="b-row b-head-note hint">
            Kolonlar: Yapı · Sınıf · Alan · Yıpranma · Birim Maliyet (↺ otomatiğe döner) · Maliyet
          </div>
        )}
        {inp.buildings.length > 0 && (
          <div className="mini-kpi" style={{ marginTop: 10 }}>
            <div><span>Toplam yapı alanı</span><b>{fmtM2(r.totalBuildingArea)}</b></div>
            <div><span>Yapı maliyetleri</span><b>{fmtTL(r.buildingsCost)}</b></div>
          </div>
        )}
      </div>

      <div className="card card-wide">
        <div className="card-title">2 · İlave Maliyetler (tercihe bağlı)</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          Peyzaj ve altyapı, parsel alanı ({fmtM2(input.parcel.area)}) üzerinden; çevre duvarı,
          girdiğiniz uzunluk üzerinden hesaplanır. 0 bırakılan satır hesaba girmez.
        </div>
        <div className="grid-2">
          <Field label="Çevre Duvarı — Parsel Uzunluğu"><Num value={inp.wallLength ?? 0} onChange={(n) => set({ wallLength: n })} suffix="m" /></Field>
          <Field label="Çevre Duvarı — Birim Maliyet"
                 hint={(inp.wallLength ?? 0) > 0 && inp.wallUnitCost > 0 ? `Duvar maliyeti: ${fmtTL((inp.wallLength ?? 0) * inp.wallUnitCost)}` : undefined}>
            <Num value={inp.wallUnitCost} onChange={(n) => set({ wallUnitCost: n })} suffix="₺/m" />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Peyzaj / Çevre Düz."><Num value={inp.landscapeUnitCost} onChange={(n) => set({ landscapeUnitCost: n })} suffix="₺/m²" /></Field>
          <Field label="Altyapı"><Num value={inp.infraUnitCost} onChange={(n) => set({ infraUnitCost: n })} suffix="₺/m²" /></Field>
        </div>
        {inp.otherCosts.map((oc, i) => (
          <div className="grid-2" key={i}>
            <Field label={`Diğer Maliyet ${i + 1}`}>
              <Txt value={oc.name} placeholder="Örn. trafo, arıtma, tabela"
                   onChange={(v) => set({ otherCosts: inp.otherCosts.map((x, k) => k === i ? { ...x, name: v } : x) })} />
            </Field>
            <Field label="Tutar">
              <Num value={oc.amount} suffix="₺"
                   onChange={(n) => set({ otherCosts: inp.otherCosts.map((x, k) => k === i ? { ...x, amount: n } : x) })} />
            </Field>
          </div>
        ))}
        <button type="button" className="link-btn"
                onClick={() => set({ otherCosts: [...inp.otherCosts, { name: '', amount: 0 }] })}>
          + Maliyet ekle
        </button>
        {inp.otherCosts.length > 0 && (
          <button type="button" className="link-btn" style={{ marginLeft: 12 }}
                  onClick={() => set({ otherCosts: inp.otherCosts.slice(0, -1) })}>
            Son maliyeti sil
          </button>
        )}
        {r.extrasTotal > 0 && (
          <div className="note-box" style={{ marginTop: 10 }}>İlave maliyetler toplamı: <b>{fmtTL(r.extrasTotal)}</b></div>
        )}
      </div>

      <div className="card result-preview">
        <div className="card-title">Maliyet Özeti</div>
        <div className="mini-kpi">
          <div><span>Yapı maliyetleri</span><b>{fmtTL(r.buildingsCost)}</b></div>
          <div><span>İlave maliyetler</span><b>{fmtTL(r.extrasTotal)}</b></div>
        </div>
        <div className="mini-kpi" style={{ marginTop: 8 }}>
          <div><span>TOPLAM MALİYET</span><b>{fmtTL(r.totalCost)}</b></div>
          <div><span>Yapı satırı</span><b>{r.rows.length} adet</b></div>
        </div>
      </div>
    </div>
  );
}

export function Step4Isletme({ input, upd, setTop }: P) {
  const inp = input.isletme;
  const r = computeIsletme(input.parcel, inp);
  return (
    <div className="cols">
      <div className="card card-wide">
        <div className="card-title">Öngörülen Satış Değeri</div>
        <Field label="Taşınmazın Toplam Satış Değeri" hint="Tek toplam tutar, KDV hariç">
          <Num value={inp.salesTotal} onChange={(n) => upd('isletme', { salesTotal: n })} suffix="₺" />
        </Field>
        <Field label="Müteahhit Kârı" hint="Varsayılan 0 — amaç arsa + yapı değeridir; gerekirse oran girin.">
          <Pct value={inp.profitRate ?? 0} onChange={(n) => upd('isletme', { profitRate: n })} />
        </Field>
        {inp.salesTotal > 0 && (
          <div className="note-box">
            Satış {fmtTL(r.salesTotal)} − maliyet {fmtTL(r.totalCost)}
            {r.profit > 0 && <> − kâr {fmtTL(r.profit)}</>} =
            {' '}<b>{fmtTL(r.landValue)}</b> arsa değeri
            {input.parcel.area > 0 && <> · {fmtTLm2(r.landUnitValue)}</>}
          </div>
        )}
        <div className="hint" style={{ marginTop: 8 }}>
          Bu senaryoda proje mülk sahibince yapılır; kat karşılığı karşılaştırması
          uygulanmaz. Müteahhit kârı varsayılan olarak 0'dır.
        </div>
      </div>

      <div className="card">
        <div className="card-title">Rapor Görselleri</div>
        <Field label="PDF'te parsel krokisi"
               hint="Kroki için Taşınmaz adımında KML yüklenmiş olmalıdır.">
          <Seg value={input.reportVisuals === false ? 'hayir' : 'evet'}
               onChange={(v: string) => setTop('reportVisuals', v === 'evet')}
               options={[{ value: 'evet', label: 'Evet' }, { value: 'hayir', label: 'Hayır' }]} />
        </Field>
      </div>

      <div className="card">
        <div className="card-title">Döviz Karşılığı (opsiyonel)</div>
        <div className="hint" style={{ marginBottom: 10 }}>
          Kur girilirse raporlarda arsa değeri döviz cinsinden de yazılır; boş bırakılırsa hiçbir şey değişmez.
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
