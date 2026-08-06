/**
 * AYRINTILI ÜST HAKKI DEĞER ANALİZİ — Excel (.xlsx) çıktısı.
 * Kurumsal banner ve renk paleti export/excel.ts ile aynıdır.
 */
import ExcelJS from 'exceljs';
import { attachDataSheet } from '../export/excelImport';
import { BRAND } from '../brand/brand';
import { DORA_LOGO_PNG } from '../brand/logo';
import { triggerDownload } from '../export/excel';
import type { DetailedUstHakkiInput, DetailedUstHakkiResult } from './detailedEngine';

const NAVY = 'FF0F2A47';
const GOLD = 'FFB28D42';
const FAINT = 'FFF6F8FB';
const LINEC = 'FFDCE3EB';
const THIN = { style: 'thin' as const, color: { argb: LINEC } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const TL = '#,##0 "₺";[Red]-#,##0 "₺";"–"';
const R = (v: number) => Math.round(v * 100) / 100;
const SYM: Record<DetailedUstHakkiInput['currency'], string> = { TL: '₺', USD: '$', EUR: '€' };
const curFmt = (input: DetailedUstHakkiInput) =>
  input.currency === 'TL' ? TL : `#,##0 "${SYM[input.currency]}";[Red]-#,##0 "${SYM[input.currency]}";"–"`;

export async function downloadDetailedUstHakkiExcel(input: DetailedUstHakkiInput, r: DetailedUstHakkiResult) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.company} · ${BRAND.author}`;
  wb.company = BRAND.company;
  wb.created = new Date();
  const logoId = wb.addImage({ base64: DORA_LOGO_PNG, extension: 'png' });

  const ws = wb.addWorksheet('Ayrintili Ust Hakki', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 16 },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  const N = r.years.length;
  ws.columns = [{ width: 3 }, { width: 30 }, { width: 11 },
    ...Array.from({ length: N }, () => ({ width: 10 })), { width: 3 }];

  ws.mergeCells('A1:K2');
  const t = ws.getCell('A1');
  t.value = '  Ayrintili Ust Hakki Deger Analizi';
  t.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24; ws.getRow(2).height = 20;
  ws.mergeCells('A3:K3');
  const st = ws.getCell('A3');
  st.value = `  Gelir Indirgeme (DCF) — Donemsel Tablo · ${BRAND.company}`;
  st.font = { name: 'Arial', size: 9.5, color: { argb: 'FFC4D4E5' } };
  st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  st.alignment = { vertical: 'middle' };
  ws.getRow(3).height = 15;
  ws.mergeCells('A4:K4');
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  ws.getRow(4).height = 3;
  ws.addImage(logoId, { tl: { col: 8.6, row: 0.3 }, ext: { width: 105, height: 32 } });

  let row = 6;
  function section(text: string, span = 'B:F') {
    const [c1, c2] = span.split(':');
    ws.mergeCells(`${c1}${row}:${c2}${row}`);
    const cell = ws.getCell(`${c1}${row}`);
    cell.value = text;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 17;
    row++;
  }
  /** B'den (3+N)'ye kadar tam genişlikte, sayısal sütun indeksiyle bölüm başlığı (harf sınırı yok, N=49'a kadar çalışır). */
  function sectionWide(text: string) {
    ws.mergeCells(row, 2, row, 3 + N);
    const cell = ws.getCell(row, 2);
    cell.value = text;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 17;
    row++;
  }
  /** Kategori satırı: Etiket | Oran% (null ise boş) | 1..N dönem değeri — sayısal sütun indeksiyle. */
  function wideRow(label: string, ratioPct: number | null, values: number[], bold = false) {
    const c0 = ws.getCell(row, 2);
    c0.value = label;
    c0.font = { name: 'Arial', size: 8.5, bold, color: { argb: 'FF17202C' } };
    c0.border = BOX;
    const c1 = ws.getCell(row, 3);
    if (ratioPct != null) { c1.value = ratioPct / 100; c1.numFmt = '0.0%'; }
    c1.font = { name: 'Arial', size: 8.5, bold };
    c1.alignment = { horizontal: 'right' };
    c1.border = BOX;
    values.forEach((v, i) => {
      const c = ws.getCell(row, 4 + i);
      c.value = v;
      c.numFmt = curFmt(input);
      c.font = { name: 'Arial', size: 8, bold };
      c.alignment = { horizontal: 'right' };
      c.border = BOX;
    });
    row++;
  }
  function kv(label: string, value: string | number, fmt?: string) {
    ws.getCell(`B${row}`).value = label;
    ws.getCell(`B${row}`).font = { name: 'Arial', size: 9.5, color: { argb: 'FF5A6774' } };
    ws.mergeCells(row, 3, row, 5);
    const vc = ws.getCell(row, 3);
    vc.value = value;
    vc.font = { name: 'Arial', size: 9.5 };
    if (fmt) vc.numFmt = fmt;
    vc.alignment = { horizontal: 'right' };
    row++;
  }

  section('SURE VE PARA BIRIMI');
  kv('Toplam Sure', `${input.toplamSureYil} yil`);
  kv('Kalan Sure', `${input.kalanSureYil} yil`);
  kv('Iskonto Orani', r.discountRate, '0.0%');
  kv('Para Birimi', input.currency);
  row++;

  if (input.showCostApproachInPdf) {
    section('MALIYET YAKLASIMI');
    kv('Arsa Alani', `${input.parcelArea.toLocaleString('tr-TR')} m²` + (input.fromKml ? ' (KML)' : ''));
    kv('Arsa m² Birim Degeri', input.landUnitValue, curFmt(input));
    kv('Arsa Degeri', r.cost.landValue, curFmt(input));
    for (const b of input.buildings) {
      if (b.area > 0 || b.unitCost > 0) kv(`  ${b.type} (${b.area.toLocaleString('tr-TR')} m²)`, b.area * b.unitCost, curFmt(input));
    }
    kv('Toplam Yapi Maliyeti', r.cost.buildingsCost, curFmt(input));
    kv('TOPLAM MALIYET', r.cost.totalCost, curFmt(input));
    kv('Toplam Maliyet', r.cost.totalCostRounded, curFmt(input));
    row++;
  }

  sectionWide(`DONEMSEL TABLO (${N} DONEM) — kategori satir, donem sutun`);

  // Dönemler başlık satırı: etiket | "Toplam Gelir Icerisinde Orani" | 1, 2, 3 ... N
  {
    const c0 = ws.getCell(row, 2); c0.value = 'Donemler';
    c0.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF5A6774' } }; c0.border = BOX;
    const c1 = ws.getCell(row, 3); c1.value = 'Toplam Gelir Icerisinde Orani';
    c1.font = { name: 'Arial', size: 7.5, bold: true, color: { argb: 'FF5A6774' } };
    c1.alignment = { horizontal: 'right', wrapText: true }; c1.border = BOX;
    for (let t = 1; t <= N; t++) {
      const c = ws.getCell(row, 3 + t);
      c.value = t;
      c.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF5A6774' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FAINT } };
      c.alignment = { horizontal: 'right' };
      c.border = BOX;
    }
    row++;
  }
  row++;

  // Oranlar 1. dönemden — karışım her yıl sabit kalır (aynı oranla büyür), tek kez hesaplanması yeterli
  const y1 = r.years[0];
  const roomPct = y1 ? y1.roomIncomePct : 0;
  const pctOf = (v: number) => (y1 && y1.totalRevenue > 0 ? R(v / y1.totalRevenue * 100) : 0);

  sectionWide('GELIRLER');
  wideRow('Oda Gelirleri', roomPct, r.years.map((y) => y.roomIncome));
  wideRow('Yiyecek/Icecek Gelirleri', y1 ? pctOf(y1.foodIncome) : 0, r.years.map((y) => y.foodIncome));
  wideRow('Diger Gelirler', y1 ? pctOf(y1.otherIncome) : 0, r.years.map((y) => y.otherIncome));
  wideRow('Toplanti/Salon Kiralama Gelirleri', y1 ? pctOf(y1.meetingIncome) : 0, r.years.map((y) => y.meetingIncome));
  wideRow('Dukkan Kira Gelirleri', y1 ? pctOf(y1.shopIncome) : 0, r.years.map((y) => y.shopIncome));
  wideRow('Toplam Gelirler', 100, r.years.map((y) => y.totalRevenue), true);
  row++;

  sectionWide('GIDERLER');
  sectionWide('ISLETME GIDERLERI');
  wideRow('Oda Giderleri', null, r.years.map((y) => y.roomExpense));
  wideRow('Yiyecek/Icecek Giderleri', null, r.years.map((y) => y.foodExpense));
  wideRow('Diger Giderler', null, r.years.map((y) => y.otherExpense));
  wideRow('Genel Yonetim Giderleri', null, r.years.map((y) => y.generalMgmtExpense));
  wideRow('Enerji Giderleri', null, r.years.map((y) => y.energyExpense));
  wideRow('Basit Tamiratlar', null, r.years.map((y) => y.repairExpense));
  wideRow('TOPLAM ISLETME GIDERLERI', null, r.years.map((y) => y.totalOperatingExpense), true);
  wideRow('BRUT ISLETME KARI', null, r.years.map((y) => y.grossOperatingProfit), true);
  row++;

  sectionWide('SABIT GIDERLER');
  wideRow('Isletmeci Prim/Kazanc', null, r.years.map((y) => y.operatorPremium));
  wideRow('Emlak Vergisi', null, r.years.map((y) => y.propertyTax));
  wideRow('Bina Sigorta', null, r.years.map((y) => y.insurance));
  wideRow('Yenileme Fonu', null, r.years.map((y) => y.renewalFund));
  wideRow('Ecrimisil Odemeleri', null, r.years.map((y) => y.ecrimisil));
  wideRow('Ust Hakki Odemeleri', null, r.years.map((y) => y.ustHakkiOdeme));
  wideRow('Bayilik Odemeleri', null, r.years.map((y) => y.bayilik));
  wideRow('TOPLAM SABIT GIDERLER', null, r.years.map((y) => y.totalFixedExpense), true);
  row++;

  wideRow('TOPLAM GIDERLER', null, r.years.map((y) => y.totalExpense), true);
  wideRow('NET ISLETME KARI', null, r.years.map((y) => y.netOperatingProfit), true);
  wideRow('NAKIT AKIS', null, r.years.map((y) => y.netOperatingProfit));
  wideRow('NAKIT AKIS NET BUGUNKU DEGER', null, r.years.map((y) => y.presentValue), true);
  row++;

  section('SONUC', 'B:F');
  kv('Nakit Akis Bugunku Deger Toplami', r.sumPresentValue, curFmt(input));
  if (input.donemSonuIndirgemePct > 0) kv(`Donem Sonu Deger Indirgeme (%${input.donemSonuIndirgemePct})`, -(r.sumPresentValue - r.propertyValueLocal), curFmt(input));
  row++;
  ws.mergeCells(row, 2, row, 4);
  const vcell = ws.getCell(row, 2);
  vcell.value = 'TASINMAZ DEGERI';
  vcell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  vcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  vcell.alignment = { vertical: 'middle', indent: 1 };
  ws.mergeCells(row, 5, row, 7);
  const valCell = ws.getCell(row, 5);
  valCell.value = r.propertyValueRounded;
  valCell.numFmt = input.currency === 'TL' ? TL : `#,##0 "${input.currency}"`;
  valCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  valCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 20;
  row++;
  if (input.currency !== 'TL') {
    kv('TL Karsiligi', r.propertyValueTl, TL);
  }
  row += 2;
  ws.mergeCells(`B${row}:F${row}`);
  ws.getCell(`B${row}`).value = `${BRAND.preparedBy} · ${BRAND.developerLine} · Ayrintili Ust Hakki Deger Analizi`;
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 7.5, color: { argb: 'FF8C98A5' } };

  attachDataSheet(wb, input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, 'Ayrintili-Ust-Hakki-Degerleme-Raporu.xlsx');
}
