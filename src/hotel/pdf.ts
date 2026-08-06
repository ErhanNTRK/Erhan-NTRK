/**
 * OTEL GELİRİ — PDF RAPORU
 * Mevcut export/pdf.ts kurumsal görsel dilini (font, header, footer, renk paleti)
 * yeniden kullanır; jsPDF font gömme ve logo çizim mantığı tekrar yazılmamıştır.
 */
import { jsPDF } from 'jspdf';
import {
  loadFonts, drawHeader, drawFooter,
  NAVY, GOLD, INK, GRAY, FAINT, LINE, M, PW, W, pct,
} from '../export/pdf';
import { triggerDownload } from '../export/excel';
import { BRAND } from '../brand/brand';
import type { HotelIncomeInput, HotelIncomeResult } from './types';

export async function buildHotelPdf(
  input: HotelIncomeInput, r: HotelIncomeResult,
): Promise<{ doc: jsPDF; name: string }> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await loadFonts(doc);
  const CUR_SYM: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
  const sym = CUR_SYM[input.currency ?? 'TRY'] ?? '₺';
  const cur = (v: number) => (isFinite(v) ? Math.round(v).toLocaleString('tr-TR') + ' ' + sym : '–');

  let y = 0;
  const tarih = new Date().toLocaleDateString('tr-TR');

  function pageBreak(need = 14) {
    if (y + need > 280) { doc.addPage(); y = 18; }
  }

  drawHeader(doc, input.general.facilityName || 'Otel Gelir Analizi', 'Gelir İndirgeme Yaklaşımı · Konaklama Tesisleri');
  y = 41;

  /* Künye */
  doc.setFillColor(...FAINT);
  doc.roundedRect(M, y, W, 13.5, 1.6, 1.6, 'F');
  doc.setDrawColor(...LINE);
  doc.roundedRect(M, y, W, 13.5, 1.6, 1.6, 'S');
  doc.setFont('NTRK', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK);
  const g = input.general;
  doc.text(`${g.il || '—'} / ${g.ilce || '—'}${g.mahalle ? ' · ' + g.mahalle + ' Mahallesi' : ''}`, M + 4, y + 5.6);
  doc.setFont('NTRK', 'normal'); doc.setFontSize(8.6); doc.setTextColor(...GRAY);
  doc.text(`Ada ${g.ada || '—'} · Parsel ${g.parsel || '—'}`, M + 4, y + 10.6);
  doc.setFontSize(8.2);
  doc.text(`Rapor Tarihi: ${tarih}`, PW - M - 4, y + 5.6, { align: 'right' });
  y += 19;

  /* Sonuç şeridi — SEÇİLEN nihai yönteme göre dinamik */
  const method = input.finalMethod ?? 'direkt';
  const methodLabel: Record<string, string> = {
    direkt: 'GELİR YAKLAŞIMINA GÖRE PİYASA DEĞERİ (DİREKT KAPİTALİZASYON)',
    ina: 'İNA (İNDİRGENMİŞ NAKİT AKIMI) DEĞERİ',
    maliyet: 'MALİYET YAKLAŞIMINA GÖRE PİYASA DEĞERİ',
    manuel: 'UZMAN TAKDİRİYLE BELİRLENEN NİHAİ DEĞER',
  };
  const heroValue = method === 'ina' && r.ina ? r.ina.npv
    : method === 'maliyet' && r.cost ? r.cost.totalValueRounded
    : method === 'manuel' ? (input.finalManualValue ?? 0)
    : r.capitalizedValue;

  const H = 27;
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, W, H, 2.2, 2.2, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(M, y + H - 1.2, W, 1.2, 'F');
  doc.setFont('NTRK', 'normal'); doc.setFontSize(8); doc.setTextColor(168, 189, 212);
  doc.text(methodLabel[method] ?? methodLabel.direkt, M + 5, y + 7);
  doc.setFont('NTRK', 'bold'); doc.setFontSize(21); doc.setTextColor(255, 255, 255);
  doc.text(cur(heroValue), M + 5, y + 18.5);
  const cx = M + W * 0.58;
  doc.setDrawColor(58, 88, 124);
  doc.line(cx - 4, y + 4.5, cx - 4, y + H - 4.5);
  const stat = (label: string, val: string, sy: number) => {
    doc.setFont('NTRK', 'normal'); doc.setFontSize(7.4); doc.setTextColor(168, 189, 212);
    doc.text(label, cx, sy);
    doc.setFont('NTRK', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text(val, cx, sy + 5.2);
  };
  if (method === 'ina' && r.ina) {
    stat('İSKONTO ORANI', pct(input.projection.discountRate ?? 0), y + 10.5);
    stat('TERMİNAL DEĞER DAHİL', cur(r.ina.terminalValue), y + 21.5);
  } else if (method === 'maliyet' && r.cost) {
    stat('ARSA DEĞERİ', cur(r.cost.landValue), y + 10.5);
    stat('YAPI DEĞERLERİ', cur(r.cost.buildingsValue), y + 21.5);
  } else {
    stat('NET İŞLETME GELİRİ (NOI)', cur(r.noi), y + 10.5);
    stat('KAPİTALİZASYON ORANI', pct(input.projection.capRate), y + 21.5);
  }
  y += H + 6;

  /* İkincil yöntemler — işaretli ama seçilen nihai yöntem OLMAYAN diğerleri */
  const secondary: { label: string; value: number }[] = [];
  if (method !== 'direkt' && (input.showIncomeInPdf ?? true)) secondary.push({ label: 'Gelir Yaklaşımı (Direkt Kapitalizasyon)', value: r.capitalizedValue });
  if (method !== 'ina' && (input.showInaInPdf ?? true) && r.ina) secondary.push({ label: 'İNA (NBD)', value: r.ina.npv });
  if (method !== 'maliyet' && (input.showCostInPdf ?? true) && r.cost) secondary.push({ label: 'Maliyet Yaklaşımı', value: r.cost.totalValueRounded });

  if (secondary.length > 0) {
    doc.setFont('NTRK', 'normal'); doc.setFontSize(8.3); doc.setTextColor(...GRAY);
    for (const s of secondary) {
      doc.text(s.label, M + 3, y);
      doc.setFont('NTRK', 'bold'); doc.setTextColor(...INK);
      doc.text(cur(s.value), PW - M - 3, y, { align: 'right' });
      doc.setFont('NTRK', 'normal'); doc.setTextColor(...GRAY);
      y += 5.6;
    }
    y += 4;
  }

  /* Gelir kırılımı tablosu */
  const sectionTitle = (title: string) => {
    pageBreak(16);
    doc.setFont('NTRK', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK);
    doc.text(title, M, y);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.6);
    doc.line(M, y + 1.6, M + 9, y + 1.6);
    y += 7;
  };

  const table = (head: string[], rows: string[][], widths: number[]) => {
    const rh = 6.4;
    doc.setFillColor(...NAVY);
    doc.rect(M, y, W, rh, 'F');
    doc.setFont('NTRK', 'bold'); doc.setFontSize(7.6); doc.setTextColor(255, 255, 255);
    let x = M + 2;
    head.forEach((h, i) => { doc.text(h, x, y + rh - 2); x += widths[i]; });
    y += rh;
    rows.forEach((row, ri) => {
      pageBreak(rh + 2);
      if (ri % 2 === 1) { doc.setFillColor(...FAINT); doc.rect(M, y, W, rh, 'F'); }
      doc.setFont('NTRK', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...INK);
      let xx = M + 2;
      row.forEach((cell, ci) => { doc.text(cell, xx, y + rh - 2); xx += widths[ci]; });
      y += rh;
    });
    doc.setDrawColor(...LINE);
    doc.line(M, y, M + W, y);
    y += 6;
  };

  sectionTitle('Gelir Özeti');
  table(
    ['Gelir Kalemi', 'Yıllık Tutar'],
    [
      ['Toplam Oda Geliri', cur(r.totalRoomRevenue)],
      ['Toplam Yardımcı İşletme Geliri', cur(r.totalAncillaryRevenue)],
      ['Toplam Ticari Kira Geliri', cur(r.totalLeaseRevenue)],
      ['TOPLAM BRÜT GELİR', cur(r.totalGrossRevenue)],
      ['İşletme Gideri', `%${Math.round(input.opex.expenseRate * 100)} · ${cur(r.totalExpense)}`],
      ['NET İŞLETME GELİRİ (NOI)', cur(r.noi)],
    ],
    [110, 70],
  );

  if (r.roomRows.length > 0) {
    sectionTitle('Oda Dağılım Tablosu');
    table(
      ['Oda Tipi', 'Adet', 'Fiyat', 'Doluluk', 'Yıllık Gelir'],
      r.roomRows.map((row) => [
        row.roomType, String(row.roomCount), cur(row.adr), pct(row.occupancy, 0), cur(row.annualRevenue),
      ]),
      [55, 20, 35, 30, 40],
    );
  }

  if (r.leaseRows.length > 0) {
    sectionTitle('Ticari Kira Tablosu');
    table(
      ['Alan Türü', 'Kiracı', 'Aylık Kira', 'Yıllık Kira'],
      r.leaseRows.map((row) => [row.areaType || '—', row.tenant || '—', cur(row.monthlyAmount), cur(row.annualAmount)]),
      [55, 55, 35, 35],
    );
  }

  if ((input.showInaInPdf ?? true) && r.ina) {
    sectionTitle('Yıllık Projeksiyon Tablosu');
    table(
      ['Yıl', 'Toplam Gelir', 'İşletme Gideri', 'NOI', 'Kapitalizasyon Değeri'],
      r.projectionTable.map((row) => [
        String(row.year), cur(row.totalRevenue), cur(row.totalExpense), cur(row.noi), cur(row.capitalizedValue),
      ]),
      [20, 45, 40, 40, 45],
    );
  }

  if ((input.showCostInPdf ?? true) && r.cost) {
    sectionTitle('Maliyet Yaklaşımı');
    table(
      ['Kalem', 'Değer'],
      [
        ['Arsa Değeri', cur(r.cost.landValue)],
        ['Yapı Değerleri', cur(r.cost.buildingsValue)],
        ...(r.cost.goodwill > 0 ? [['Şerefiye', cur(r.cost.goodwill)]] : []),
        ['Maliyet Yaklaşımı Değeri', cur(r.cost.totalValueRounded)],
      ],
      [110, 70],
    );
  }

  if (secondary.length > 0) {
    sectionTitle('Yöntemlerin Karşılaştırması');
    pageBreak(6 * (secondary.length + 1) + 8);
    const allMethods = [{ label: methodLabel[method]?.split('(')[0].trim() ?? 'Seçilen Yöntem', value: heroValue }, ...secondary];
    doc.setFont('NTRK', 'normal'); doc.setFontSize(8.6); doc.setTextColor(...INK);
    for (const m of allMethods) {
      doc.text(m.label, M + 3, y);
      doc.setFont('NTRK', 'bold');
      doc.text(cur(m.value), PW - M - 3, y, { align: 'right' });
      doc.setFont('NTRK', 'normal');
      y += 6.5;
    }
    y += 4;
  }

  drawFooter(doc, BRAND.version, `Yöntem: ${methodLabel[method]?.split('(')[0].trim() ?? 'Gelir İndirgeme Yaklaşımı'} · Tutarlar KDV hariçtir`);

  const name = `Otel-Gelir-Analizi-${(g.facilityName || g.ilce || g.il || 'rapor').replace(/\s+/g, '-')}.pdf`;
  return { doc, name };
}

export async function downloadHotelPdf(input: HotelIncomeInput, r: HotelIncomeResult) {
  const { doc, name } = await buildHotelPdf(input, r);
  triggerDownload(doc.output('blob'), name);
}
