/**
 * OTEL GELİR HESABI — Excel dışa aktarma.
 * Diğer modüllerle aynı desen: görünür özet sayfa + gizli veri sayfası
 * (attachDataSheet) ile tam round-trip içe aktarma desteği.
 */
import ExcelJS from 'exceljs';
import { BRAND } from '../brand/brand';
import { DORA_LOGO_PNG } from '../brand/logo';
import { triggerDownload } from '../export/excel';
import { attachDataSheet } from '../export/excelImport';
import type { HotelIncomeInput, HotelIncomeResult } from './types';

const CUR_SYM: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };

export async function downloadHotelExcel(input: HotelIncomeInput, r: HotelIncomeResult) {
  const sym = CUR_SYM[input.currency ?? 'TRY'] ?? '₺';
  const cur = (v: number) => Math.round(v).toLocaleString('tr-TR') + ' ' + sym;
  const NAVY = 'FF0F2A47';
  const GOLD = 'FFB28D42';
  const FAINT = 'FFF4F6F9';

  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.company} · ${BRAND.author}`;
  wb.company = BRAND.company;
  wb.created = new Date();
  const logoId = wb.addImage({ base64: DORA_LOGO_PNG, extension: 'png' });

  const ws = wb.addWorksheet('Otel Geliri', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 3 }, { width: 34 }, { width: 22 }, { width: 3 }];

  ws.mergeCells('A1:D2');
  const t = ws.getCell('A1');
  t.value = `  ${input.general?.facilityName || 'Otel Gelir Analizi'}`;
  t.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24; ws.getRow(2).height = 20;
  ws.mergeCells('A3:D3');
  ws.getCell('A3').value = `  Gelir İndirgeme Yaklaşımı · Konaklama Tesisleri · ${BRAND.company}`;
  ws.getCell('A3').font = { name: 'Arial', size: 9.5, color: { argb: 'FFC4D4E5' } };
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getRow(3).height = 15;
  ws.mergeCells('A4:D4');
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  ws.getRow(4).height = 3;
  ws.addImage(logoId, { tl: { col: 2.4, row: 0.3 }, ext: { width: 105, height: 32 } });

  let row = 6;
  function section(text: string) {
    ws.mergeCells(`B${row}:C${row}`);
    ws.getCell(`B${row}`).value = text;
    ws.getCell(`B${row}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    ws.getCell(`B${row}`).alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 17;
    row++;
  }
  function kv(label: string, value: string, bold = false) {
    ws.getCell(`B${row}`).value = label;
    ws.getCell(`B${row}`).font = { name: 'Arial', size: 9.5, color: { argb: 'FF5A6774' } };
    ws.getCell(`C${row}`).value = value;
    ws.getCell(`C${row}`).font = { name: 'Arial', size: 9.5, bold };
    ws.getCell(`C${row}`).alignment = { horizontal: 'right' };
    row++;
  }

  section('GELİR ÖZETİ');
  kv('Toplam Brüt Gelir (Yıllık)', cur(r.totalGrossRevenue));
  kv('İşletme Gideri', cur(r.totalExpense));
  kv('Net İşletme Geliri (NOI)', cur(r.noi), true);
  row++;

  const method = input.finalMethod ?? 'direkt';
  const methodLabel: Record<string, string> = {
    direkt: 'Gelir (Direkt Kapitalizasyon)', ina: 'İNA (NBD)',
    maliyet: 'Maliyet Yaklaşımı', manuel: 'Uzman Takdiri',
  };
  const heroValue = method === 'ina' && r.ina ? r.ina.npv
    : method === 'maliyet' && r.cost ? r.cost.totalValueRounded
    : method === 'manuel' ? (input.finalManualValue ?? 0)
    : r.capitalizedValue;

  section('SEÇİLEN NİHAİ YÖNTEM: ' + (methodLabel[method] ?? methodLabel.direkt).toUpperCase());
  ws.getCell(`B${row}`).value = 'NİHAİ DEĞER';
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell(`B${row}`).alignment = { vertical: 'middle', indent: 1 };
  ws.getCell(`C${row}`).value = cur(heroValue);
  ws.getCell(`C${row}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`C${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell(`C${row}`).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 20;
  row += 2;

  section('YÖNTEMLERİN KARŞILAŞTIRMASI');
  kv('Gelir (Direkt Kapitalizasyon)', cur(r.capitalizedValue));
  if (r.ina) kv('İNA (NBD)', cur(r.ina.npv));
  if (r.cost) kv('Maliyet Yaklaşımı', cur(r.cost.totalValueRounded));
  row++;

  if (r.cost) {
    section('MALİYET YAKLAŞIMI DETAYI');
    kv('Arsa Değeri', cur(r.cost.landValue));
    kv('Yapı Değerleri', cur(r.cost.buildingsValue));
    if (r.cost.goodwill > 0) kv('Şerefiye', cur(r.cost.goodwill));
    row++;
  }

  section('YILLIK PROJEKSİYON TABLOSU');
  const heads = ['Yıl', 'Toplam Gelir', 'İşletme Gideri', 'NOI'];
  heads.forEach((h, i) => {
    const c = ws.getCell(row, 2 + i);
    c.value = h;
    c.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF5A6774' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FAINT } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'right' };
  });
  row++;
  for (const y of r.projectionTable) {
    ws.getCell(row, 2).value = y.year;
    ws.getCell(row, 3).value = cur(y.totalRevenue);
    ws.getCell(row, 4).value = cur(y.totalExpense);
    ws.getCell(row, 5).value = cur(y.noi);
    for (let c = 2; c <= 5; c++) { ws.getCell(row, c).font = { name: 'Arial', size: 8.5 }; if (c > 2) ws.getCell(row, c).alignment = { horizontal: 'right' }; }
    row++;
  }
  row += 2;
  ws.mergeCells(`B${row}:C${row}`);
  ws.getCell(`B${row}`).value = `${BRAND.preparedBy} · ${BRAND.developerLine} · Otel Gelir Hesabı Modülü`;
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 7.5, color: { argb: 'FF8C98A5' } };

  attachDataSheet(wb, input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, `Otel-Gelir-${(input.general?.facilityName || 'rapor').replace(/\s+/g, '-')}.xlsx`);
}
