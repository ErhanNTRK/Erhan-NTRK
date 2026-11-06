/**
 * AKARYAKIT GELİR HESABI — Excel (.xlsx) çıktısı.
 * Kurumsal banner ve renk paleti export/excel.ts ile aynıdır. Sütun genişlikleri
 * gerçek TL değerlerini taşıyacak şekilde ayarlanmıştır (#### hatasına karşı).
 */
import ExcelJS from 'exceljs';
import { attachDataSheet } from '../export/excelImport';
import { BRAND } from '../brand/brand';
import { DORA_LOGO_PNG } from '../brand/logo';
import { triggerDownload } from '../export/excel';
import type { FuelInput, FuelResult } from './engine';

const NAVY = 'FF0F2A47';
const GOLD = 'FFB28D42';
const FAINT = 'FFF6F8FB';
const LINEC = 'FFDCE3EB';
const THIN = { style: 'thin' as const, color: { argb: LINEC } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const TL = '#,##0 "₺";[Red]-#,##0 "₺";"–"';

export async function downloadFuelExcel(input: FuelInput, r: FuelResult) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.company} · ${BRAND.author}`;
  wb.company = BRAND.company;
  wb.created = new Date();
  const logoId = wb.addImage({ base64: DORA_LOGO_PNG, extension: 'png' });

  const ws = wb.addWorksheet('Akaryakıt', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 16 },
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  ws.columns = [{ width: 3 }, { width: 26 }, { width: 16 }, { width: 15 }, { width: 12 }, { width: 17 }, { width: 3 }];

  ws.mergeCells('A1:G2');
  const t = ws.getCell('A1');
  t.value = '  Akaryakıt Gelir Hesabı';
  t.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 20;
  ws.mergeCells('A3:G3');
  const st = ws.getCell('A3');
  st.value = `  İstasyon Satışları ve Değerleme (KDV Hariç) · ${BRAND.company}`;
  st.font = { name: 'Arial', size: 9.5, color: { argb: 'FFC4D4E5' } };
  st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  st.alignment = { vertical: 'middle' };
  ws.getRow(3).height = 15;
  ws.mergeCells('A4:G4');
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  ws.getRow(4).height = 3;
  ws.addImage(logoId, { tl: { col: 4.4, row: 0.3 }, ext: { width: 105, height: 32 } });

  let row = 6;
  function section(text: string) {
    ws.mergeCells(`B${row}:F${row}`);
    const cell = ws.getCell(`B${row}`);
    cell.value = text;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 17;
    row++;
  }
  function kv(label: string, value: string | number, fmt?: string, opts: { bold?: boolean } = {}) {
    ws.getCell(`B${row}`).value = label;
    ws.getCell(`B${row}`).font = { name: 'Arial', size: 9.5, color: { argb: 'FF5A6774' } };
    ws.getCell(`C${row}`).value = value;
    ws.getCell(`C${row}`).font = { name: 'Arial', size: 9.5, bold: !!opts.bold };
    if (fmt) ws.getCell(`C${row}`).numFmt = fmt;
    ws.getCell(`C${row}`).alignment = { horizontal: 'right' };
    row++;
  }

  section('AKARYAKIT SATIŞLARI');
  const heads = ['Ürün', 'Yıllık Litre', 'Ciro', 'Kazanç %', 'Net Kazanç'];
  heads.forEach((hh, i) => {
    const cell = ws.getCell(row, 2 + i);
    cell.value = hh;
    cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF5A6774' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FAINT } };
    cell.border = BOX;
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right' };
  });
  row++;
  for (const p of r.products) {
    ws.getCell(row, 2).value = p.name;
    ws.getCell(row, 3).value = Math.round(p.yearlyLitersUsed);
    ws.getCell(row, 3).numFmt = '#,##0 "Lt"';
    ws.getCell(row, 4).value = p.turnover;
    ws.getCell(row, 4).numFmt = TL;
    ws.getCell(row, 5).value = p.profitPct / 100;
    ws.getCell(row, 5).numFmt = '0.0%';
    ws.getCell(row, 6).value = p.net;
    ws.getCell(row, 6).numFmt = TL;
    ws.getCell(row, 6).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E6B41' } };
    for (let c = 2; c <= 6; c++) {
      ws.getCell(row, c).border = BOX;
      if (!ws.getCell(row, c).font) ws.getCell(row, c).font = { name: 'Arial', size: 9 };
      if (c > 2) ws.getCell(row, c).alignment = { horizontal: 'right' };
    }
    row++;

    if (p.mode === 'cokyil') {
      const vals = p.multiYearLiters.filter((v) => v > 0);
      const labels = p.multiYearLabels ?? vals.map((_, i) => `${i + 1}. Yıl`);
      p.multiYearLiters.forEach((v, i) => {
        if (v <= 0) return;
        ws.getCell(row, 2).value = `  ${labels[i] ?? `${i + 1}. Yıl`}`;
        ws.getCell(row, 2).font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF5A6774' } };
        ws.getCell(row, 3).value = Math.round(v); ws.getCell(row, 3).numFmt = '#,##0 "Lt"';
        ws.getCell(row, 3).alignment = { horizontal: 'right' };
        ws.getCell(row, 4).value = v * p.unitPrice; ws.getCell(row, 4).numFmt = TL;
        ws.getCell(row, 4).alignment = { horizontal: 'right' };
        row++;
      });
      if (vals.length > 0) {
        ws.getCell(row, 2).value = `  ${vals.length} Yıllık Ortalama`;
        ws.getCell(row, 2).font = { name: 'Arial', size: 8.5, bold: true };
        ws.getCell(row, 3).value = Math.round(p.yearlyLitersUsed); ws.getCell(row, 3).numFmt = '#,##0 "Lt"';
        ws.getCell(row, 3).alignment = { horizontal: 'right' };
        row++;
      }
    }
  }
  row++;

  section('DİĞER GELİRLER VE KESİNTİLER');
  kv('Yakıt Net Kazancı/yıl', r.fuelNet, TL);
  if (r.extrasNet > 0) kv('İlave Gelir Kalemleri/yıl', r.extrasNet, TL);
  if (r.otherIncomeFromPct > 0) kv(`Diğer Gelirler (yakıt cirosunun %${input.otherIncomePctOfFuel})`, r.otherIncomeFromPct, TL);
  if (r.dealerRentApplied > 0) kv('Dağıtıcı Kirası', -r.dealerRentApplied, TL);
  kv('TOPLAM NET KAZANÇ/yıl', r.totalNet, TL, { bold: true });
  row++;

  section('DEĞERLEME SONUCU');
  ws.mergeCells(`B${row}:E${row}`);
  const vcell = ws.getCell(`B${row}`);
  vcell.value = 'GELİR YAKLAŞIMI';
  vcell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  vcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  vcell.alignment = { vertical: 'middle', indent: 1 };
  ws.getCell(`F${row}`).value = r.incomeValueRounded;
  ws.getCell(`F${row}`).numFmt = TL;
  ws.getCell(`F${row}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`F${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell(`F${row}`).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 20;
  row++;
  if (r.costValue != null) {
    ws.mergeCells(`B${row}:E${row}`);
    const ccell = ws.getCell(`B${row}`);
    ccell.value = `MALİYET YAKLAŞIMI (Arsa ${r.costLand.toLocaleString('tr-TR')} + Yapılar ${r.costBuildings.toLocaleString('tr-TR')})`;
    ccell.font = { name: 'Arial', size: 9, color: { argb: 'FF5A6774' } };
    ws.getCell(`F${row}`).value = r.costValue;
    ws.getCell(`F${row}`).numFmt = TL;
    ws.getCell(`F${row}`).font = { name: 'Arial', size: 10, bold: true };
    ws.getCell(`F${row}`).alignment = { horizontal: 'right' };
    row++;
  }
  ws.getCell(`B${row}`).value = 'Kapitalizasyon Oranı';
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 9, color: { argb: 'FF5A6774' } };
  ws.getCell(`F${row}`).value = `%${input.capRate}`;
  ws.getCell(`F${row}`).font = { name: 'Arial', size: 9.5, bold: true };
  ws.getCell(`F${row}`).alignment = { horizontal: 'right' };
  row++;
  row += 2;
  ws.mergeCells(`B${row}:F${row}`);
  ws.getCell(`B${row}`).value = 'İki yöntem yan yana sunulur; nihai değer takdiri uzmana aittir.';
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF8C98A5' } };
  row += 2;
  ws.mergeCells(`B${row}:F${row}`);
  ws.getCell(`B${row}`).value = `${BRAND.preparedBy} · ${BRAND.developerLine} · Akaryakıt Gelir Modülü`;
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 7.5, color: { argb: 'FF8C98A5' } };

  attachDataSheet(wb, input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, 'Akaryakit-Gelir-Hesabi.xlsx');
}
