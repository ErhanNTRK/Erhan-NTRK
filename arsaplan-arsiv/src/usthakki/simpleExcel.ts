/**
 * ÜST HAKKI YÖNTEM 1/2 — Excel çıktısı. Ara hesaplar gösterilmez.
 */
import ExcelJS from 'exceljs';
import { attachDataSheet } from '../export/excelImport';
import { BRAND } from '../brand/brand';
import { DORA_LOGO_PNG } from '../brand/logo';
import { triggerDownload } from '../export/excel';
import type { WholeValueResult, LandOnlyResult } from './simpleCostEngine';

interface SimpleInput {
  hotelName: string; mahalle: string; ada: string; parsel: string; parcelArea: number; fromKml: boolean;
  currency: 'TL' | 'USD' | 'EUR'; fxRate?: number;
  sureUnit: 'yil' | 'ay'; kalanSure: number; toplamSure: number;
}
const SYM: Record<SimpleInput['currency'], string> = { TL: '₺', USD: '$', EUR: '€' };
const NAVY = 'FF0F2A47';
const GOLD = 'FFB28D42';

export async function downloadSimpleUstHakkiExcel(
  method: 'toplam' | 'arsa', input: SimpleInput, whole: WholeValueResult, land: LandOnlyResult,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.company} · ${BRAND.author}`;
  wb.company = BRAND.company;
  wb.created = new Date();
  const logoId = wb.addImage({ base64: DORA_LOGO_PNG, extension: 'png' });
  const title = method === 'toplam' ? 'Toplam Degerden Ust Hakki Hesabi' : 'Sadece Arsa Degeri Uzerinden Ust Hakki Hesabi';
  const r = method === 'toplam' ? whole : land;
  const sureBirimi = input.sureUnit === 'ay' ? 'Ay' : 'Yil';

  const ws = wb.addWorksheet('Ust Hakki', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 3 }, { width: 46 }, { width: 22 }, { width: 3 }];

  ws.mergeCells('A1:D2');
  const t = ws.getCell('A1');
  t.value = `  ${title}`;
  t.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24; ws.getRow(2).height = 20;
  ws.mergeCells('A3:D3');
  ws.getCell('A3').value = `  Ust Hakki Degerleme Raporu · ${BRAND.company}`;
  ws.getCell('A3').font = { name: 'Arial', size: 9.5, color: { argb: 'FFC4D4E5' } };
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getRow(3).height = 15;
  ws.mergeCells('A4:D4');
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  ws.getRow(4).height = 3;
  ws.addImage(logoId, { tl: { col: 3.15, row: 0.3 }, ext: { width: 105, height: 32 } });

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
  const cur = (v: number) => Math.round(v).toLocaleString('tr-TR') + ' ' + SYM[input.currency];

  section('PARSEL BILGILERI');
  if (input.hotelName) kv('Otel Adi', input.hotelName);
  if (input.mahalle) kv('Mahalle', input.mahalle);
  if (input.ada) kv('Ada', input.ada);
  if (input.parsel) kv('Parsel', input.parsel);
  kv('Parsel Alani', `${input.parcelArea.toLocaleString('tr-TR')} m²` + (input.fromKml ? ' (KML)' : ''));
  row++;

  section('UST HAKKI HESAP BASLIGI');
  kv('Yontem', title);
  kv('Arsa Degeri', cur(r.cost.landValue));
  kv('Yapi Degeri', cur(r.cost.buildingValues));
  kv('Toplam Deger', cur(r.cost.totalValue), true);
  row++;

  section('SURE');
  kv('Kalan Sure', `${input.kalanSure} ${sureBirimi}`);
  kv('Toplam Sure', `${input.toplamSure} ${sureBirimi}`);
  kv('Sure Birimi', sureBirimi);
  row++;

  if (method === 'toplam') {
    section('TASINMAZIN DEGERI');
    kv('Tasinmazin Degeri', cur(whole.cost.totalValue), true);
    row++;
  } else {
    section('SONUC');
    kv('Ust Hakki Arsa Degeri', cur(land.ustHakkiArsaDegeri));
    kv('+ Bina Degeri', cur(land.buildingValueAdded));
    row++;
  }

  ws.mergeCells(`B${row}:B${row}`);
  const label = method === 'toplam' ? 'UST HAKKI DEGERI' : 'NIHAI UST HAKKI DEGERI';
  ws.getCell(`B${row}`).value = label;
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell(`B${row}`).alignment = { vertical: 'middle', indent: 1 };
  ws.getCell(`C${row}`).value = cur(method === 'toplam' ? whole.ustHakkiValue : land.nihaiUstHakkiDegeri);
  ws.getCell(`C${row}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(`C${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell(`C${row}`).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 20;
  row++;
  if (input.currency !== 'TL') {
    const finalValue = method === 'toplam' ? whole.ustHakkiValue : land.nihaiUstHakkiDegeri;
    kv('TL Karsiligi', `${Math.round(finalValue * (input.fxRate ?? 1)).toLocaleString('tr-TR')} ₺`, false);
  }
  row += 2;
  ws.mergeCells(`B${row}:C${row}`);
  ws.getCell(`B${row}`).value = `${BRAND.preparedBy} · ${BRAND.developerLine} · ${title}`;
  ws.getCell(`B${row}`).font = { name: 'Arial', size: 7.5, color: { argb: 'FF8C98A5' } };

  attachDataSheet(wb, input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, method === 'toplam' ? 'Ust-Hakki-Toplam-Degerden.xlsx' : 'Ust-Hakki-Sadece-Arsa.xlsx');
}
