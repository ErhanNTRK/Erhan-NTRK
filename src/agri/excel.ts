/**
 * TARIMSAL ÜRÜN GELİR HESABI — Excel (.xlsx) çıktısı.
 * Kurumsal banner, renk paleti ve tablo deseni export/excel.ts ile AYNIDIR
 * (banka/kurumsal alıcıya iletilebilir kalite). Yalnız "Excel indir" tıklanınca
 * dinamik yüklenir.
 */
import ExcelJS from 'exceljs';
import { attachDataSheet } from '../export/excelImport';
import { BRAND } from '../brand/brand';
import { DORA_LOGO_PNG } from '../brand/logo';
import { triggerDownload } from '../export/excel';
import type { AgriInput, AgriResult, CropRowResult } from './engine';

const NAVY = 'FF0F2A47';
const GOLD = 'FFB28D42';
const FAINT = 'FFF6F8FB';
const LINEC = 'FFDCE3EB';
const GREEN = 'FFE4EFE2';
const THIN = { style: 'thin' as const, color: { argb: LINEC } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const TL = '#,##0 "₺";[Red]-#,##0 "₺";"–"';
const M2 = '#,##0 "m²";[Red]-#,##0 "m²";"–"';

export async function downloadAgriExcel(input: AgriInput, r: AgriResult) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.company} · ${BRAND.author}`;
  wb.company = BRAND.company;
  wb.created = new Date();
  const logoId = wb.addImage({ base64: DORA_LOGO_PNG, extension: 'png' });

  const ws = wb.addWorksheet('Tarımsal Ürün', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 16 },
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  ws.columns = [{ width: 3 }, { width: 30 }, { width: 14 }, { width: 13 }, { width: 12 }, { width: 10 }, { width: 17 }, { width: 3 }];

  ws.mergeCells('A1:H2');
  const t = ws.getCell('A1');
  t.value = '  Tarımsal Ürün Gelir Hesabı';
  t.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 20;
  ws.mergeCells('A3:H3');
  const st = ws.getCell('A3');
  const idParts = [input.mahalle && `${input.mahalle} Mah.`, input.ada && `Ada ${input.ada}`, input.parsel && `Parsel ${input.parsel}`].filter(Boolean).join(' · ');
  st.value = `  Ürün Deseni ve Gelir Yaklaşımı${idParts ? ' — ' + idParts : ''} · ${BRAND.company}`;
  st.font = { name: 'Arial', size: 9.5, color: { argb: 'FFC4D4E5' } };
  st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  st.alignment = { vertical: 'middle' };
  ws.getRow(3).height = 15;
  ws.mergeCells('A4:H4');
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  ws.getRow(4).height = 3;
  ws.addImage(logoId, { tl: { col: 5.3, row: 0.3 }, ext: { width: 105, height: 32 } });

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

  section('PARSEL');
  kv('Parsel Alanı', input.parcelArea, M2);
  kv('Ekilebilir Alan', r.arableArea, M2, { bold: true });
  if (input.mahalle) kv('Mahalle', input.mahalle);
  if (input.ada) kv('Ada', input.ada);
  if (input.parsel) kv('Parsel', input.parsel);
  row++;

  function table(title: string, rows: CropRowResult[]) {
    section(title);
    const headRow = row;
    const heads = ['Ürün', 'Birim', 'Verim', 'Fiyat', 'Gider %', 'Net Gelir'];
    heads.forEach((h, i) => {
      const cell = ws.getCell(row, 2 + i);
      cell.value = h;
      cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF5A6774' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FAINT } };
      cell.border = BOX;
      cell.alignment = { horizontal: i === 0 ? 'left' : 'right' };
    });
    row++;
    for (const cr of rows) {
      ws.getCell(row, 2).value = cr.name || '(isimsiz)';
      ws.getCell(row, 3).value = cr.kind === 'ekili'
        ? `${Math.round(cr.areaM2).toLocaleString('tr-TR')} m²`
        : `${cr.units.toLocaleString('tr-TR')} ağaç`;
      ws.getCell(row, 4).value = `${cr.yieldPerUnit.toLocaleString('tr-TR')} kg`;
      ws.getCell(row, 5).value = cr.price;
      ws.getCell(row, 5).numFmt = '#,##0.00 "₺/kg"';
      ws.getCell(row, 6).value = cr.expensePct / 100;
      ws.getCell(row, 6).numFmt = '0.0%';
      ws.getCell(row, 7).value = cr.netWithByproduct;
      ws.getCell(row, 7).numFmt = TL;
      ws.getCell(row, 7).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E6B41' } };
      for (let c = 2; c <= 7; c++) {
        ws.getCell(row, c).border = BOX;
        ws.getCell(row, c).font = ws.getCell(row, c).font ?? { name: 'Arial', size: 9 };
        if (c > 2) ws.getCell(row, c).alignment = { horizontal: 'right' };
      }
      row++;
      if (cr.byproductResult) {
        const b = cr.byproductResult;
        ws.getCell(row, 2).value = `  + Yan ürün: ${b.name}`;
        ws.getCell(row, 3).value = cr.kind === 'ekili'
          ? `${Math.round(cr.areaM2).toLocaleString('tr-TR')} m²`
          : `${cr.units.toLocaleString('tr-TR')} ağaç`;
        ws.getCell(row, 4).value = `${b.yieldPerUnit.toLocaleString('tr-TR')} kg`;
        ws.getCell(row, 5).value = b.price;
        ws.getCell(row, 5).numFmt = '#,##0.00 "₺/kg"';
        ws.getCell(row, 6).value = b.expensePct / 100;
        ws.getCell(row, 6).numFmt = '0.0%';
        ws.getCell(row, 7).value = b.net;
        ws.getCell(row, 7).numFmt = TL;
        for (let c = 2; c <= 7; c++) {
          ws.getCell(row, c).font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF5A6774' } };
          if (c > 2) ws.getCell(row, c).alignment = { horizontal: 'right' };
        }
        row++;
      }
    }
    void headRow;
    row++;
  }

  const ekiliRows = r.rows.filter((x) => x.kind === 'ekili');
  const dikiliRows = r.rows.filter((x) => x.kind === 'dikili');
  if (ekiliRows.length) table('EKİLİ ÜRÜNLER', ekiliRows);
  if (dikiliRows.length) table('DİKİLİ ÜRÜNLER (AĞAÇ)', dikiliRows);
  if (r.remainingArea > 0 && dikiliRows.some((x) => x.areaM2 > 0)) {
    kv('Kalan Alan', r.remainingArea, M2);
    row++;
  }

  section('SONUÇ');
  kv('Toplam Brüt Gelir/yıl', r.totalGross, TL);
  kv('Toplam Net Gelir/yıl', r.totalNet, TL);
  kv('Amorti Yılı', input.amortYears);
  ws.mergeCells(`B${row}:F${row}`);
  const vcell = ws.getCell(`B${row}`);
  vcell.value = 'YAKLAŞIK DEĞER';
  vcell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  vcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  vcell.alignment = { vertical: 'middle', indent: 1 };
  ws.getCell(`G${row}`).value = r.value;
  ws.getCell(`G${row}`).numFmt = TL;
  ws.getCell(`G${row}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`G${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell(`G${row}`).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 20;
  row += 2;

  ws.mergeCells(`B${row}:F${row}`);
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF8C98A5' } };
  row += 2;
  ws.mergeCells(`B${row}:F${row}`);
  ws.getCell(`B${row}`).value = `${BRAND.preparedBy} · ${BRAND.developerLine} · Tarımsal Ürün Gelir Modülü`;
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 7.5, color: { argb: 'FF8C98A5' } };
  void GREEN;

  attachDataSheet(wb, input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const name = `Tarimsal-Urun-${(input.mahalle || 'Rapor').replace(/\s+/g, '-')}-${input.ada || ''}-${input.parsel || ''}.xlsx`.replace(/-+\./, '.');
  triggerDownload(blob, name);
}
