import { useState } from 'react';
import type { ProjectInput, AnalysisResult } from '../engine';
import { fmtTL, fmtTLm2, fmtM2, fmtPct, fmtNum, Row } from './fields';
import { TEBLIG_KAYNAK } from '../data/yapiSiniflari';
import { BRAND } from '../brand/brand';
import { fxLines, fxMoney } from '../export/fx';
import { LOC, getLang } from '../i18n';

const VERDICT_TEXT: Record<string, string> = {
  'yakin': 'İki yöntem birbirine yakın',
  'kat-karsiligi-yuksek': 'Kat karşılığı değeri daha yüksek',
  'gelir-yontemi-yuksek': 'Gelir projeksiyonu değeri daha yüksek',
};

export function Result({ input, result, version }: {
  input: ProjectInput; result: AnalysisResult; version: string;
}) {
  const { capacity: c, financial: f, share: s, advice, apartment: apt, isletme } = result;
  const p = input.parcel;
  const neg = f.residualLandValue < 0;
  const karma = apt != null && input.assetType !== 'konut';
  const [busy, setBusy] = useState<null | 'pdf' | 'advice' | 'jpeg' | 'excel'>(null);
  const [err, setErr] = useState<string | null>(null);

  /** Dışa aktarma modülleri yalnızca tıklandığında yüklenir (dinamik import). */
  async function run(kind: 'pdf' | 'advice' | 'jpeg' | 'excel') {
    setBusy(kind); setErr(null);
    try {
      if (kind === 'pdf') {
        const { downloadPdf } = await import('../export/pdf');
        await downloadPdf(input, result, version);
      } else if (kind === 'advice') {
        const { downloadAdvicePdf } = await import('../export/advicePdf');
        await downloadAdvicePdf(input, result, version);
      } else if (kind === 'jpeg') {
        const { downloadJpeg } = await import('../export/jpeg');
        await downloadJpeg(input, result, version);
      } else {
        const { downloadExcel } = await import('../export/excel');
        await downloadExcel(input, result, version);
      }
    } catch (e) {
      setErr('Dosya oluşturulamadı: ' + (e instanceof Error ? e.message : 'bilinmeyen hata'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="card no-print">
        <div className="card-title">Raporu İndir</div>
        <div className="dl-grid">
          <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => run('pdf')}>
            {busy === 'pdf' ? 'Hazırlanıyor…' : 'Rapor PDF'}
          </button>
          <button className="btn btn-accent btn-sm" disabled={busy !== null} onClick={() => run('excel')}>
            {busy === 'excel' ? 'Hazırlanıyor…' : 'Excel'}
          </button>
          <button className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={() => run('jpeg')}>
            {busy === 'jpeg' ? 'Hazırlanıyor…' : 'Özet JPEG'}
          </button>
          {!isletme && (
            <button className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={() => run('advice')}>
              {busy === 'advice' ? 'Hazırlanıyor…' : 'Uzman Notu PDF'}
            </button>
          )}
        </div>
        {!isletme && (
          <div className="hint" style={{ marginTop: 8 }}>
            Rapor PDF ve Özet JPEG, talep eden kişiyle paylaşılabilir; uzman değerlendirmesi içermez.
            Uzman Notu PDF yalnızca sistemi kullanan uzmana yöneliktir.
          </div>
        )}
        {err && <div className="hint" style={{ color: 'var(--red)', marginTop: 8 }}>{err}</div>}
      </div>

      {isletme ? (
      <>
        <div className="card">
          <div className="card-title">Taşınmaz</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {p.il} / {p.ilce}{p.mahalle ? ` · ${p.mahalle} Mah.` : ''}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            Ada {p.ada || '—'} · Parsel {p.parsel || '—'} · {fmtM2(p.area)} · Ticari İşletme
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi hero">
            <div className="kpi-label">Arsa Değeri (Gelir Projeksiyonu)</div>
            <div className="kpi-value" style={isletme.landValue < 0 ? { color: '#ff9c94' } : undefined}>{fmtTL(isletme.landValue)}</div>
            <div className="kpi-sub">Arsa birim değeri: <b>{fmtTLm2(isletme.landUnitValue)}</b> (tapu alanı üzerinden)</div>
            {fxLines(input.fx, isletme.landValue, isletme.landUnitValue).map((l) => (
              <div className="kpi-sub" key={l.code}>
                {l.code}: <b>{fxMoney(l.symbol, l.value)}</b> · {fxMoney(l.symbol, l.unitValue)}/m² · kur {l.rate.toLocaleString(LOC())}
              </div>
            ))}
          </div>
          <div className="kpi"><div className="kpi-label">Toplam Maliyet</div><div className="kpi-value">{fmtTL(isletme.totalCost)}</div></div>
          <div className="kpi"><div className="kpi-label">Öngörülen Satış Değeri</div><div className="kpi-value">{fmtTL(isletme.salesTotal)}</div></div>
          <div className="kpi"><div className="kpi-label">Toplam Yapı Alanı</div><div className="kpi-value">{fmtM2(isletme.totalBuildingArea)}</div></div>
        </div>

        <div className="card">
          <div className="card-title">Yapılar</div>
          <div className="floor-table floor-result">
            <div className="floor-head">
              <span>Yapı</span><span>Alan × Birim</span><span>Maliyet</span>
            </div>
            {isletme.rows.map((row, i) => (
              <div className="floor-row" key={i}>
                <span className="floor-label">{row.type} ({row.buildingClass}{row.depreciation > 0 ? ` · yıpranma %${(row.depreciation * 100).toFixed(0)}` : ''})</span>
                <span className="floor-cell">{fmtM2(row.area)} × {fmtTLm2(row.effectiveUnitCost)}</span>
                <span className="floor-cell">{fmtTL(row.cost)}</span>
              </div>
            ))}
            <div className="floor-row floor-total">
              <span className="floor-label">YAPI MALİYETLERİ</span>
              <span className="floor-cell"><b>{fmtM2(isletme.totalBuildingArea)}</b></span>
              <span className="floor-cell"><b>{fmtTL(isletme.buildingsCost)}</b></span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Değerleme</div>
          {isletme.wallCost > 0 && <Row label="Çevre Duvarı" value={fmtTL(isletme.wallCost)} />}
          {isletme.landscapeCost > 0 && <Row label="Peyzaj / Çevre Düzenleme" value={fmtTL(isletme.landscapeCost)} />}
          {isletme.infraCost > 0 && <Row label="Altyapı" value={fmtTL(isletme.infraCost)} />}
          {input.isletme.otherCosts.filter((o) => o.amount > 0).map((o, i) => (
            <Row key={i} label={o.name || 'Diğer'} value={fmtTL(o.amount)} />
          ))}
          <Row label="Yapı Maliyetleri" value={fmtTL(isletme.buildingsCost)} />
          <Row label="TOPLAM MALİYET" value={fmtTL(isletme.totalCost)} tone="neg" />
          <Row label="Öngörülen Satış Değeri" value={fmtTL(isletme.salesTotal)} tone="pos" />
          <Row label="ARSA DEĞERİ (GELİR PROJEKSİYONU)" value={fmtTL(isletme.landValue)} tone="total" />
          <Row label="Arsa m² Birim Değeri" value={fmtTLm2(isletme.landUnitValue)} />
        </div>

        {isletme.warnings.length > 0 && (
          <div className="card">
            <div className="card-title">Uyarılar</div>
            {isletme.warnings.map((w, i) => (
              <div key={i} className="advice uyari"><div className="advice-body">{w}</div></div>
            ))}
          </div>
        )}

        <div className="card">
          <div className="card-title">Yöntem ve Kaynak</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Değerleme yaklaşımı: <b>Gelir Projeksiyonu</b> — Öngörülen Satış Değeri − Toplam Maliyet = Arsa Değeri.
            Bu senaryoda projenin mülk sahibince yapılması amaçlandığından <b>müteahhit kârı kesilmemiştir</b>.
            Tüm tutarlar KDV hariçtir. Birim maliyet kaynağı: {TEBLIG_KAYNAK}.
            Satış değeri ve yıpranma varsayımları kullanıcıya aittir.
          </div>
        </div>

        <div className="brand-footer">
          <img src={`${import.meta.env.BASE_URL}dora-logo.png`} alt={BRAND.company} />
          <div>
            <b>{BRAND.preparedBy}</b><br />
            {BRAND.developerLine} · {BRAND.appName} {version}
          </div>
        </div>
      </>
      ) : (
      <>

      <div className="card">
        <div className="card-title">Taşınmaz</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {p.il} / {p.ilce}{p.mahalle ? ` · ${p.mahalle} Mah.` : ''}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
          Ada {p.ada || '—'} · Parsel {p.parsel || '—'} · {fmtM2(p.area)} · {input.zoning.lejant || 'Lejant girilmedi'}
          {karma && <> · {input.assetType === 'karma' ? 'Karma Kullanım' : 'Ticari Apartman'}</>}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi hero">
          <div className="kpi-label">Arsa Değeri (Gelir Projeksiyonu)</div>
          <div className="kpi-value" style={neg ? { color: '#ff9c94' } : undefined}>{fmtTL(f.residualLandValue)}</div>
          <div className="kpi-sub">Arsa birim değeri: <b>{fmtTLm2(f.landUnitValue)}</b> (tapu alanı üzerinden)</div>
          {(input.residual.projectMonths ?? 0) > 0 && f.discountedLandValue != null && (
            <div className="kpi-sub" style={{ marginTop: 4 }}>
              İndirgemeli Arsa Değeri ({input.residual.projectMonths} ay · %{((input.residual.timeDiscountRate ?? 0) * 100).toLocaleString(LOC())}):{' '}
              <b>{fmtTL(f.discountedLandValue)}</b>
            </div>
          )}
          {fxLines(input.fx, f.residualLandValue, f.landUnitValue).map((l) => (
            <div className="kpi-sub" key={l.code}>
              {l.code}: <b>{fxMoney(l.symbol, l.value)}</b> · {fxMoney(l.symbol, l.unitValue)}/m² · kur {l.rate.toLocaleString(LOC())}
            </div>
          ))}
        </div>
        {apt ? (
          <div className="kpi"><div className="kpi-label">Kat Adedi</div>
            <div className="kpi-value">{apt.floors.length}</div></div>
        ) : (
          <div className="kpi"><div className="kpi-label">Villa Adedi</div>
            <div className="kpi-value">{c.unitCount > 0 ? c.unitCount : '—'}</div></div>
        )}
        <div className="kpi"><div className="kpi-label">Toplam İnşaat Alanı</div><div className="kpi-value">{fmtM2(c.totalArea)}</div></div>
        {apt ? (
          <div className="kpi"><div className="kpi-label">Satılabilir Alan</div><div className="kpi-value">{fmtM2(apt.saleableTotal)}</div></div>
        ) : (
          <div className="kpi"><div className="kpi-label">Emsale Dahil Alan</div><div className="kpi-value">{fmtM2(c.emsalArea)}</div></div>
        )}
        <div className="kpi"><div className="kpi-label">Bahçe Alanı</div><div className="kpi-value">{fmtM2(c.gardenArea)}</div></div>
      </div>

      {apt ? (
      <div className="card">
        <div className="card-title">Kapasite ve Kat Tablosu</div>
        <Row label="Parsel Alanı (tapu)" value={fmtM2(p.area)} />
        <Row label="Net Parsel Alanı" value={fmtM2(p.netArea)} />
        <Row label="Hesap Yöntemi" value={apt.mode === 'taks-kaks' ? 'TAKS / KAKS' : 'Doğrudan Alan'} />
        {apt.mode === 'taks-kaks' && (
          <>
            <Row label="TAKS / KAKS" value={`${input.zoning.taks != null ? fmtNum(input.zoning.taks) : '—'} / ${input.zoning.kaks != null ? fmtNum(input.zoning.kaks) : '—'}`} />
            {input.zoning.hmax != null && <Row label="Hmax" value={`${input.zoning.hmax.toLocaleString(LOC())} m`} />}
            <Row label="Taban Oturumu Limiti" value={fmtM2(apt.footprintArea)} />
            {apt.extraSaleableArea > 0 && <Row label="İlave Satılabilir Alan (emsal dışı)" value={fmtM2(apt.extraSaleableArea)} />}
          </>
        )}
        <div className="floor-table floor-result" style={{ marginTop: 12 }}>
          <div className="floor-head">
            <span>Kat Bilgisi</span><span>Kat Alanı</span><span>Satılabilir Alan</span><span>Ortak Alan</span>
          </div>
          {[...apt.floors].reverse().map((fl) => (
            <div className="floor-row" key={`${fl.kind}-${fl.index}`}>
              <span className="floor-label">{fl.label}</span>
              <span className="floor-cell">{fmtM2(fl.area)}</span>
              <span className="floor-cell">{fl.kind === 'bodrum' && input.apartment.basements[fl.index - 1]?.use === 'ortak' ? 'ortak mahal' : fmtM2(fl.saleable)}</span>
              <span className="floor-cell">{fmtM2(Math.max(0, fl.area - fl.saleable))}</span>
            </div>
          ))}
          <div className="floor-row floor-total">
            <span className="floor-label">TOPLAM</span>
            <span className="floor-cell"><b>{fmtM2(apt.totalArea)}</b></span>
            <span className="floor-cell"><b>{fmtM2(apt.saleableTotal)}</b></span>
            <span className="floor-cell"><b>{fmtM2(Math.max(0, apt.totalArea - apt.saleableTotal))}</b></span>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Row label="Bahçe / Açık Alan" value={fmtM2(apt.gardenArea)} />
        </div>
      </div>
      ) : (
      <div className="card">
        <div className="card-title">Kapasite ve İmar</div>
        <Row label="Parsel Alanı (tapu)" value={fmtM2(p.area)} />
        <Row label="Net Parsel Alanı" value={fmtM2(p.netArea)} />
        <Row label="TAKS / KAKS" value={`${input.zoning.taks != null ? fmtNum(input.zoning.taks) : '—'} / ${input.zoning.kaks != null ? fmtNum(input.zoning.kaks) : '—'}`} />
        <Row label="Taban Oturumu" value={fmtM2(c.footprintArea)} />
        <Row label="Emsale Dahil Alan" value={fmtM2(c.emsalArea)} />
        {c.extraArea > 0 && <Row label="Emsal Dışı Satılabilir Alan" value={fmtM2(c.extraArea)} />}
        {c.atticArea > 0 && (
          <Row label={`Çatı Katı (${input.emsal.atticInEmsal ? 'emsale dahil' : 'emsal dışı'})`} value={fmtM2(c.atticArea)} />
        )}
        {c.basementArea > 0 && (
          <Row label={`Bodrum Kat (${input.emsal.basementInEmsal ? 'emsale dahil' : 'emsal dışı'})`} value={fmtM2(c.basementArea)} />
        )}
        {c.emsalConsumedByExtras > 0 && (
          <Row label="Emsalden Kullanılan (çatı/bodrum)" value={fmtM2(c.emsalConsumedByExtras)} tone="neg" />
        )}
        <Row label="Zemin Üstü Katlara Kalan" value={fmtM2(c.aboveGroundArea)} />
        <Row label="TOPLAM İNŞAAT ALANI" value={fmtM2(c.totalArea)} tone="total" />
        <Row label="Bahçe / Açık Alan" value={fmtM2(c.gardenArea)} />
        {c.unitCount > 0 && <Row label="Villa Adedi" value={`${c.unitCount} adet`} />}
        {c.unitCount > 0 && <Row label="Villa Başına Toplam Alan" value={fmtM2(c.areaPerUnit)} />}
        <Row label="Zemin Üstü Kat Adedi" value={`${c.floorsAboveGround} (kat başına ${fmtM2(c.areaPerFloor)})`} />
      </div>
      )}

      <div className="card">
        <div className="card-title">Fizibilite</div>
        <Row label="Yapı Sınıfı" value={input.cost.buildingClass} />
        <Row label="Birim Maliyet (güncel)" value={fmtTLm2(f.effectiveUnitCost)} />
        <Row label="İnşaat Maliyeti" value={fmtTL(f.constructionCost)} />
        {f.landscapeCost > 0 && <Row label="Peyzaj ve Bahçe Düzenlemesi" value={fmtTL(f.landscapeCost)} />}
        {f.extrasCost > 0 && <Row label="Proje, Ruhsat, Harç, Müşavirlik" value={fmtTL(f.extrasCost)} />}
        {f.financeCost > 0 && <Row label="Finansman Gideri" value={fmtTL(f.financeCost)} />}
        <Row label="Toplam Yapım Maliyeti" value={fmtTL(f.totalCost)} tone="neg" />
        {apt ? (
          <>
            {karma ? (
              <>
                {apt.bodrumSaleableByUse.ticari > 0 && (
                  <Row label="Bodrum (ticari) Satış Birim Değeri" value={fmtTLm2(input.sales.apt.bodrumTicari)} />
                )}
                {apt.bodrumSaleableByUse.konut > 0 && (
                  <Row label="Bodrum (konut) Satış Birim Değeri" value={fmtTLm2(input.sales.apt.bodrum)} />
                )}
              </>
            ) : apt.saleableByKind.bodrum > 0 && (
              <Row label="Bodrum Satış Birim Değeri" value={fmtTLm2(input.sales.apt.bodrum)} />
            )}
            <Row label={karma ? 'Zemin Kat (ticari) Satış Birim Değeri' : 'Zemin Kat Satış Birim Değeri'} value={fmtTLm2(input.sales.apt.zemin)} />
            {karma && apt.saleableByKind.asma > 0 && (
              <Row label="Asma Kat Satış Birim Değeri" value={fmtTLm2(input.sales.apt.asma)} />
            )}
            <Row label="Normal Kat Satış Birim Değeri" value={fmtTLm2(input.sales.apt.normal)} />
            {apt.saleableByKind.piyes > 0 && (
              <Row label="Piyes Satış Birim Değeri" value={fmtTLm2(input.sales.apt.piyes)} />
            )}
          </>
        ) : (
          <Row label="Satış Birim Değeri" value={fmtTLm2(input.sales.unitPrice)} />
        )}
        <Row label="Yapı Satış Hasılatı" value={fmtTL(f.buildingRevenue)} />
        {f.gardenRevenue > 0 && <Row label="Bahçe Satış Hasılatı" value={fmtTL(f.gardenRevenue)} />}
        <Row label="Toplam Satış Hasılatı" value={fmtTL(f.revenue)} tone="pos" />
        <Row label={`Müteahhit Kârı (${fmtPct(input.residual.profitRate, 0)})`} value={fmtTL(f.developerProfit)} tone="neg" />
        <Row label="ARSA DEĞERİ (GELİR PROJEKSİYONU)" value={fmtTL(f.residualLandValue)} tone="total" />
        <Row label="Arsa m² Birim Değeri" value={fmtTLm2(f.landUnitValue)} />
        <Row label="Arsa Değeri / Hasılat" value={fmtPct(f.landToRevenue)} />
      </div>

      {input.share.enabled && (
      <div className="card">
        <div className="card-title">Arsa Değeri — Yöntem Karşılaştırması</div>
        <Row label={`Arsa Sahibi Payı (%${(s.ownerShare * 100).toFixed(0)})`}
             value={`${s.ownerUnits > 0 ? fmtNum(s.ownerUnits, 1) + ' villa · ' : ''}${fmtM2(s.ownerArea)}`} />
        <Row label={`Müteahhit Payı (%${(s.contractorShare * 100).toFixed(0)})`}
             value={`${s.contractorUnits > 0 ? fmtNum(s.contractorUnits, 1) + ' villa · ' : ''}${fmtM2(s.contractorArea)}`} />
        <Row label="Kat Karşılığı Yöntemine Göre Arsa Değeri" value={fmtTL(s.shareLandValue)} />
        <Row label="Gelir Projeksiyonuna Göre Arsa Değeri" value={fmtTL(f.residualLandValue)} />
        <Row label="İki Yöntem Arasındaki Fark"
             value={`${fmtTL(Math.abs(s.difference))} (${fmtPct(Math.abs(s.differenceRate))})`} tone="total" />
        <Row label="Gelir Projeksiyonuna Denk Gelen Arsa Payı" value={fmtPct(s.balancedShare)} />
        <div style={{ marginTop: 10 }}>
          <span className={`badge ${s.verdict === 'yakin' ? 'badge-green' : 'badge-navy'}`}>
            {VERDICT_TEXT[s.verdict]}
          </span>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          İki yöntem farklı varsayımlardan hareket ettiği için sonuçları ayrışabilir; bu bölüm karşılaştırma amaçlıdır.
        </div>
      </div>
      )}

      <div className="card">
        <div className="card-title">Uzman Değerlendirmesi</div>
        {getLang() === 'en' && (
          <div className="hint" style={{ marginBottom: 8 }}>
            Expert notes are generated in Turkish; they are internal to the appraiser and are not part of the client-facing report.
          </div>
        )}
        {advice.map((a, i) => (
          <div key={i} className={`advice ${a.level}`}>
            <div className="advice-title">{a.title}</div>
            <div className="advice-body">{a.body}</div>
          </div>
        ))}
      </div>

      {input.zoning.planNotes.trim() && (
        <div className="card">
          <div className="card-title">Plan Notları</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{input.zoning.planNotes}</div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Yöntem ve Kaynak</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Değerleme yaklaşımı: <b>Gelir Projeksiyonu</b> — Hasılat − Toplam Maliyet − Müteahhit Kârı.
          Tüm tutarlar KDV hariçtir. Birim maliyet kaynağı: {TEBLIG_KAYNAK}.
          {apt ? (
            <> Kat tablosu, imar hakları ve girilen kayıp/ortak mahal oranları üzerinden üretilmiş bir <b>tahmindir</b>;
            kesin kat kurgusu mimari avan projeyle belirlenir.</>
          ) : (
            <> Villa adedi, yapılaşma zarfı ve yerleşim verimliliği üzerinden üretilmiş bir <b>tahmindir</b>;
            kesin adet mimari avan projeyle belirlenir.</>
          )}
          {' '}Satış fiyatı, kâr ve finansman varsayımları kullanıcıya aittir.
        </div>
      </div>

      <div className="brand-footer">
        <img src={`${import.meta.env.BASE_URL}dora-logo.png`} alt={BRAND.company} />
        <div>
          <b>{BRAND.preparedBy}</b><br />
          {BRAND.developerLine} · {BRAND.appName} {version}
        </div>
      </div>
      </>
      )}
    </>
  );
}
