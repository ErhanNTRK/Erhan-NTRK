/**
 * EXCEL ÇIKTISI (.xlsx)
 * Bu modül yalnızca "Excel indir" tıklandığında yüklenir (dinamik import),
 * böylece uygulamanın ilk açılışı hafif kalır.
 */
import ExcelJS from 'exceljs';
import { attachDataSheet } from './excelImport';
import type { ProjectInput, AnalysisResult } from '../engine';
import { YAPI_SINIFLARI, TEBLIG_KAYNAK } from '../data/yapiSiniflari';
import { BRAND } from '../brand/brand';
import { fxLines, fxMoney, fxRateNote } from './fx';
import { DORA_LOGO_PNG } from '../brand/logo';
import { LOC, t as tt } from '../i18n';

const NAVY = 'FF0F2A47';
const GOLD = 'FFB28D42';
const FAINT = 'FFF6F8FB';
const LINEC = 'FFDCE3EB';
const GREEN = 'FFE4EFE2';
const THIN = { style: 'thin' as const, color: { argb: LINEC } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };
/** Banner satır 1-4'ü kaplar; içerik 6'dan başlar. */
const START = 6;

const VERDICT_TEXT: Record<string, string> = {
  'yakin': 'İki yöntem birbirine yakın',
  'kat-karsiligi-yuksek': 'Kat karşılığı değeri daha yüksek',
  'gelir-yontemi-yuksek': 'Gelir projeksiyonu değeri daha yüksek',
};

const TL = '#,##0 "₺";[Red]-#,##0 "₺";"–"';
const TLM2 = '#,##0 "₺/m²";[Red]-#,##0 "₺/m²";"–"';
const M2 = '#,##0 "m²";[Red]-#,##0 "m²";"–"';
const PCT = '0.0%;[Red]-0.0%;"–"';
const NUM2 = '0.00';

type Row = [string, string | number, string?];

export async function downloadExcel(input: ProjectInput, r: AnalysisResult, version: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.company} · ${BRAND.author}`;
  wb.company = BRAND.company;
  wb.created = new Date();
  const logoId = wb.addImage({ base64: DORA_LOGO_PNG, extension: 'png' });

  const { capacity: c, financial: f, share: s, apartment: apt, isletme } = r;
  const karma = apt != null && input.assetType !== 'konut';
  const p = input.parcel;
  const sinif = YAPI_SINIFLARI.find((x) => x.code === input.cost.buildingClass);

  function sheet(name: string, title: string) {
    const ws = wb.addWorksheet(name, {
      views: [{ showGridLines: false }],
      properties: { defaultRowHeight: 16 },
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    });
    ws.columns = [{ width: 3 }, { width: 46 }, { width: 24 }, { width: 30 }, { width: 3 }];
    /* Kurumsal banner: lacivert blok + alt başlık + altın şerit */
    ws.mergeCells('A1:E2');
    const t = ws.getCell('A1');
    t.value = `  ${tt(title)}`;
    t.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    t.alignment = { vertical: 'middle' };
    ws.getRow(1).height = 24;
    ws.getRow(2).height = 20;
    ws.mergeCells('A3:E3');
    const st = ws.getCell('A3');
    st.value = `  ${tt('Gelir Projeksiyonu Yöntemi')} · ${BRAND.company}`;
    st.font = { name: 'Arial', size: 9.5, color: { argb: 'FFC4D4E5' } };
    st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    st.alignment = { vertical: 'middle' };
    ws.getRow(3).height = 15;
    ws.mergeCells('A4:E4');
    ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
    ws.getRow(4).height = 3;
    /* Büyütülmüş kurumsal logo — banner sağında */
    ws.addImage(logoId, { tl: { col: 3.25, row: 0.3 }, ext: { width: 132, height: 40 } });
    return ws;
  }

  function section(ws: ExcelJS.Worksheet, row: number, text: string) {
    ws.mergeCells(`B${row}:D${row}`);
    const cell = ws.getCell(`B${row}`);
    cell.value = tt(text);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 17;
    return row + 1;
  }

  function rows(ws: ExcelJS.Worksheet, start: number, list: Row[], fmt?: string, highlight = false) {
    let row = start;
    for (const [label, value, note] of list) {
      const zebra = (row - start) % 2 === 1;
      const bg = zebra ? FAINT : 'FFFFFFFF';
      const l = ws.getCell(`B${row}`);
      l.value = tt(label);
      l.font = { name: 'Arial', size: 10, bold: highlight, color: { argb: highlight ? NAVY : 'FF5A6774' } };
      l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      l.border = BOX;
      l.alignment = { indent: 1, vertical: 'middle' };
      const v = ws.getCell(`C${row}`);
      v.value = typeof value === 'string' ? tt(value) : value;
      v.font = { name: 'Arial', size: 10, bold: true, color: { argb: highlight ? 'FF1E6B41' : 'FF17202C' } };
      v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: highlight ? GREEN : bg } };
      v.border = BOX;
      v.alignment = { horizontal: 'right', indent: 1, vertical: 'middle' };
      if (typeof value === 'number' && fmt) v.numFmt = fmt;
      const n = ws.getCell(`D${row}`);
      if (note) {
        n.value = tt(note);
        n.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF5B6B7F' } };
      }
      n.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      n.border = BOX;
      n.alignment = { indent: 1, wrapText: false, vertical: 'middle' };
      ws.getRow(row).height = 15;
      row++;
    }
    return row;
  }

  /* ── 1. RAPOR ── */
  const ws1 = sheet('RAPOR', 'ARSA DEĞER ANALİZİ');
  let row = START;
  /* Künye çipi */
  ws1.mergeCells(`B${row}:D${row}`);
  const kk1 = ws1.getCell(`B${row}`);
  kk1.value = `${p.il} / ${p.ilce}${p.mahalle ? ' · ' + p.mahalle + ' Mahallesi' : ''}`;
  kk1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF17202C' } };
  kk1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FAINT } };
  kk1.border = { top: THIN, left: THIN, right: THIN };
  kk1.alignment = { indent: 1, vertical: 'middle' };
  ws1.getRow(row).height = 18;
  row++;
  ws1.mergeCells(`B${row}:D${row}`);
  const kk2 = ws1.getCell(`B${row}`);
  kk2.value = tt(`Ada ${p.ada || '—'} · Parsel ${p.parsel || '—'} · Tapu Alanı ${p.area.toLocaleString(LOC())} m²`) + ` · ${input.zoning.lejant.trim() || tt('Lejant girilmedi')} · ${new Date().toLocaleDateString(LOC())}`;
  kk2.font = { name: 'Arial', size: 9, color: { argb: 'FF5A6774' } };
  kk2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FAINT } };
  kk2.border = { left: THIN, right: THIN, bottom: THIN };
  kk2.alignment = { indent: 1, vertical: 'middle' };
  ws1.getRow(row).height = 14;
  row += 2;

  /* Sonuç bloğu — lacivert hero */
  ws1.mergeCells(`B${row}:B${row + 1}`);
  const hero = ws1.getCell(`B${row}`);
  hero.value = tt('ARSA DEĞERİ (GELİR PROJEKSİYONU)').replace(' (', '\n(');
  hero.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFC4D4E5' } };
  hero.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  hero.alignment = { vertical: 'middle', indent: 1, wrapText: true };
  ws1.mergeCells(`C${row}:D${row + 1}`);
  const hv = ws1.getCell(`C${row}`);
  hv.value = Math.round(f.residualLandValue);
  hv.numFmt = TL;
  hv.font = { name: 'Arial', size: 19, bold: true, color: { argb: 'FFFFFFFF' } };
  hv.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  hv.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
  ws1.getRow(row).height = 19;
  ws1.getRow(row + 1).height = 19;
  row += 2;
  const hsub = ws1.getCell(`B${row}`);
  hsub.value = f.revenue > 0
    ? tt('Arsa Değeri / Hasılat') + `: %${(f.landToRevenue * 100).toFixed(1).replace('.', ',')}`
    : '';
  hsub.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FFC4D4E5' } };
  hsub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  hsub.alignment = { indent: 1, vertical: 'middle' };
  ws1.mergeCells(`C${row}:D${row}`);
  const hbir = ws1.getCell(`C${row}`);
  hbir.value = Math.round(f.landUnitValue);
  hbir.numFmt = TLM2;
  hbir.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  hbir.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  hbir.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  ws1.getRow(row).height = 14;
  row++;
  ws1.mergeCells(`B${row}:D${row}`);
  ws1.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  ws1.getRow(row).height = 3;
  row += 2;

  if (isletme) {
    row = section(ws1, row, 'PARSEL');
    row = rows(ws1, row, [
      ['Parsel Alanı (tapu)', p.area, 'm²'],
      ['Net Parsel Alanı', p.netArea, 'm²'],
      ['Değerleme Konusu', 'Ticari İşletme'],
    ]);
    ws1.getCell(`C${row - 3}`).numFmt = M2;
    ws1.getCell(`C${row - 2}`).numFmt = M2;
    row++;

    row = section(ws1, row, 'YAPILAR');
    const th2 = ['YAPI', 'ALAN × BİRİM', 'MALİYET'];
    th2.forEach((h, i) => {
      const cell = ws1.getCell(row, 2 + i);
      cell.value = tt(h);
      cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3F66' } };
      cell.alignment = i === 0 ? { indent: 1, vertical: 'middle' } : { horizontal: 'right', vertical: 'middle', indent: 1 };
      cell.border = BOX;
    });
    ws1.getRow(row).height = 14;
    row++;
    for (const rw of isletme.rows) {
      const zebra = row % 2 === 0;
      const bg = zebra ? FAINT : 'FFFFFFFF';
      const cells: Array<[number, string | number, boolean]> = [
        [2, `${tt(rw.type)} (${rw.buildingClass}${rw.depreciation > 0 ? ` · ${tt('yıpranma')} %${(rw.depreciation * 100).toFixed(0)}` : ''})`, false],
        [3, `${Math.round(rw.area).toLocaleString(LOC())} m² × ${Math.round(rw.effectiveUnitCost).toLocaleString(LOC())} ₺/m²`, true],
        [4, rw.cost, true],
      ];
      for (const [col, val, right] of cells) {
        const cell = ws1.getCell(row, col);
        cell.value = val;
        if (col === 4 && typeof val === 'number') cell.numFmt = TL;
        cell.font = { name: 'Arial', size: 9.5, bold: col === 4 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = BOX;
        cell.alignment = right ? { horizontal: 'right', vertical: 'middle', indent: 1 } : { indent: 1, vertical: 'middle' };
      }
      ws1.getRow(row).height = 14;
      row++;
    }
    const tot: Array<[number, string | number]> = [
      [2, tt('YAPI MALİYETLERİ')],
      [3, `${Math.round(isletme.totalBuildingArea).toLocaleString(LOC())} m²`],
      [4, isletme.buildingsCost],
    ];
    for (const [col, val] of tot) {
      const cell = ws1.getCell(row, col);
      cell.value = val;
      if (col === 4 && typeof val === 'number') cell.numFmt = TL;
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      cell.border = BOX;
      cell.alignment = col === 2 ? { indent: 1, vertical: 'middle' } : { horizontal: 'right', vertical: 'middle', indent: 1 };
    }
    ws1.getRow(row).height = 15;
    row += 2;

    row = section(ws1, row, 'DEĞERLEME');
    const dStart = row;
    row = rows(ws1, row, [
      ...(isletme.wallCost > 0 ? [['Çevre Duvarı', isletme.wallCost] as Row] : []),
      ...(isletme.landscapeCost > 0 ? [['Peyzaj / Çevre Düzenleme', isletme.landscapeCost] as Row] : []),
      ...(isletme.infraCost > 0 ? [['Altyapı', isletme.infraCost] as Row] : []),
      ...input.isletme.otherCosts.filter((o) => o.amount > 0)
        .map((o): Row => [o.name || 'Diğer', Math.round(o.amount)]),
      ['Yapı Maliyetleri', isletme.buildingsCost],
      ['TOPLAM MALİYET', isletme.totalCost],
      ['Öngörülen Satış Değeri', isletme.salesTotal],
      ...(isletme.profit > 0 ? [[`Müteahhit Kazancı (%${(isletme.profitRate * 100).toFixed(0)})`, isletme.profit] as Row] : []),
      ['ARSA DEĞERİ (GELİR PROJEKSİYONU)', isletme.landValue],
      ['Arsa m² Birim Değeri', Math.round(isletme.landUnitValue)],
      ...fxLines(input.fx, isletme.landValue, isletme.landUnitValue).map((l): Row => [
        `Arsa Değeri (${l.code}) · ${fxRateNote(l.rate, new Date().toLocaleDateString(LOC()))}`,
        `${fxMoney(l.symbol, l.value)} · ${fxMoney(l.symbol, l.unitValue)}/m²`,
      ]),
    ], TL);
    ws1.getCell(`C${row - 1}`).numFmt = TLM2;
    /* Bantlı toplamlar */
    for (let i = dStart; i < row; i++) {
      const lbl = String(ws1.getCell(`B${i}`).value);
      if (lbl === 'TOPLAM MALİYET' || lbl === 'ARSA DEĞERİ (GELİR PROJEKSİYONU)') {
        ['B', 'C', 'D'].forEach((col) => {
          const cell = ws1.getCell(`${col}${i}`);
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        });
      }
    }
    row += 2;
    ws1.mergeCells(`B${row}:D${row}`);
    const ftr0 = ws1.getCell(`B${row}`);
    ftr0.value =
      `${tt(BRAND.preparedBy)} · ${tt(BRAND.developerLine)}\n` +
      `${tt('Yöntem: Gelir Projeksiyonu')} · ${tt('Müteahhit kazancı kesilmemiştir')} · ${tt('Tutarlar KDV hariçtir')} · ${tt('Birim maliyet kaynağı')}: ${TEBLIG_KAYNAK} · ${BRAND.appName} ${version}`;
    ftr0.alignment = { indent: 1, wrapText: true };
    ws1.getRow(row).height = 26;
    ftr0.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF5B6B7F' } };

    /* GİRDİLER sayfası — işletme varyantı */
    const wsi = sheet('GİRDİLER', 'ANALİZDE KULLANILAN VARSAYIMLAR');
    let ri = START;
    ri = section(wsi, ri, 'GİRDİ ÖZETİ');
    ri = rows(wsi, ri, [
      ['Güncelleme Oranı (tüm satırlar)', input.isletme.inflationRate],
      ['Yapı Satırı Sayısı', isletme.rows.length],
      ...isletme.rows.map((rw, i): Row => [
        `Yapı ${i + 1}`, `${rw.type} · ${rw.buildingClass} · ${Math.round(rw.area).toLocaleString(LOC())} m² · yıpranma %${(rw.depreciation * 100).toFixed(0)}${rw.overridden ? ' · birim elle sabit' : ''}`,
      ]),
      ['Çevre Duvarı Birim Maliyeti', input.isletme.wallUnitCost],
      ['Peyzaj Birim Maliyeti', input.isletme.landscapeUnitCost],
      ['Altyapı Birim Maliyeti', input.isletme.infraUnitCost],
      ['Öngörülen Satış Değeri', Math.round(input.isletme.salesTotal)],
    ]);
    for (let i = START + 1; i < ri; i++) {
      const lbl = String(wsi.getCell(`B${i}`).value);
      const cell = wsi.getCell(`C${i}`);
      if (typeof cell.value !== 'number') continue;
      if (lbl.includes('Oranı')) cell.numFmt = PCT;
      else if (lbl.includes('Birim Maliyeti')) cell.numFmt = TLM2;
      else if (lbl.includes('Satış Değeri')) cell.numFmt = TL;
    }

    const buf0 = await wb.xlsx.writeBuffer();
    const blob0 = new Blob([buf0], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const name0 = `Arsa-Analizi-${(p.ilce || p.il || 'rapor').replace(/\s+/g, '-')}-${p.ada || ''}-${p.parsel || ''}.xlsx`
      .replace(/-+\./, '.');
    triggerDownload(blob0, name0);
    return;
  }

  row = section(ws1, row, 'PARSEL VE İMAR');
  row = rows(ws1, row, [
    ['Parsel Alanı (tapu)', p.area, 'm²'],
    ['Net Parsel Alanı', p.netArea, 'm²'],
    ['Değerleme Konusu', input.assetType === 'konut' ? 'Konut' : input.assetType === 'ticari' ? 'Ticari' : 'Karma Kullanım'],
    ['Proje Tipi', isletme ? 'Ticari İşletme'
      : input.assetType === 'karma' ? 'Karma Kullanım'
      : input.assetType === 'ticari' ? 'Ticari Apartman'
      : apt ? 'Çok Katlı Bina' : 'Villa'],
    ['Plan Lejantı', input.zoning.lejant.trim() || '—'],
    ['Hesap Yöntemi', input.zoning.mode === 'taks-kaks' ? 'TAKS / KAKS' : 'Doğrudan alan girişi'],
    ['TAKS', input.zoning.taks ?? '—'],
    ['KAKS / Emsal', input.zoning.kaks ?? '—'],
    ['Hmax', input.zoning.hmax ?? '—'],
  ]);
  ws1.getCell(`C${row - 9}`).numFmt = M2;
  ws1.getCell(`C${row - 8}`).numFmt = M2;
  ws1.getCell(`C${row - 3}`).numFmt = NUM2;
  ws1.getCell(`C${row - 2}`).numFmt = NUM2;
  row++;

  if (apt) {
    row = section(ws1, row, 'KAT TABLOSU');
    /* Başlık satırı */
    const heads = ['KAT BİLGİSİ', 'KAT ALANI', 'SATILABİLİR ALAN'];
    heads.forEach((h, i) => {
      const cell = ws1.getCell(row, 2 + i);
      cell.value = h;
      cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF5B6B7F' } };
      cell.alignment = i === 0 ? { indent: 1 } : { horizontal: 'right', indent: 1 };
    });
    row++;
    for (const fl of [...apt.floors].reverse()) {
      ws1.getCell(`B${row}`).value = fl.label;
      ws1.getCell(`B${row}`).font = { name: 'Arial', size: 10 };
      ws1.getCell(`B${row}`).alignment = { indent: 1 };
      const ca = ws1.getCell(`C${row}`);
      ca.value = fl.area; ca.numFmt = M2;
      ca.font = { name: 'Arial', size: 10 }; ca.alignment = { horizontal: 'right', indent: 1 };
      const cs = ws1.getCell(`D${row}`);
      const ortak = fl.kind === 'bodrum' && input.apartment.basements[fl.index - 1]?.use === 'ortak';
      cs.value = ortak ? 'ortak mahal' : fl.saleable;
      if (typeof cs.value === 'number') cs.numFmt = M2;
      cs.font = { name: 'Arial', size: 10, italic: typeof cs.value === 'string' };
      cs.alignment = { horizontal: 'right', indent: 1 };
      row++;
    }
    /* Toplam satırı */
    ws1.getCell(`B${row}`).value = 'TOPLAM';
    ws1.getCell(`C${row}`).value = apt.totalArea;
    ws1.getCell(`D${row}`).value = apt.saleableTotal;
    ['B', 'C', 'D'].forEach((col) => {
      const cell = ws1.getCell(`${col}${row}`);
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
      if (col !== 'B') { cell.numFmt = M2; cell.alignment = { horizontal: 'right', indent: 1 }; }
      else cell.alignment = { indent: 1 };
    });
    row += 2;
    const sumStart = row;
    row = rows(ws1, row, [
      ...(apt.mode === 'taks-kaks' ? [
        ['Taban Oturumu Limiti (parsel × TAKS)', Math.round(apt.footprintArea), 'm²'] as Row,
        ['İlave Satılabilir Alan (emsal dışı)', Math.round(apt.extraSaleableArea), 'm²'] as Row,
      ] : []),
      ['Bahçe / Açık Alan', Math.round(apt.gardenArea), 'm²'],
    ]);
    for (let i = sumStart; i < row; i++) {
      const cell = ws1.getCell(`C${i}`);
      if (typeof cell.value === 'number') cell.numFmt = M2;
    }
    row++;
  } else {
  row = section(ws1, row, 'ALAN ÜRETİMİ');
  const capStart = row;
  row = rows(ws1, row, [
    ['Taban Oturumu', Math.round(c.footprintArea), 'm²'],
    ['Emsale Dahil Alan', Math.round(c.emsalArea), 'm²'],
    ['Emsal Dışı Satılabilir Alan', Math.round(c.extraArea), 'm²'],
    ['Çatı Katı', Math.round(c.atticArea), input.emsal.atticInEmsal ? 'emsale dahil' : 'emsal dışı'],
    ['Bodrum Kat', Math.round(c.basementArea), input.emsal.basementInEmsal ? 'emsale dahil' : 'emsal dışı'],
    ['Emsalden Kullanılan (çatı/bodrum)', Math.round(c.emsalConsumedByExtras), 'm²'],
    ['Zemin Üstü Katlara Kalan', Math.round(c.aboveGroundArea), 'm²'],
    ['TOPLAM İNŞAAT ALANI', Math.round(c.totalArea), 'm²'],
    ['Bahçe / Açık Alan', Math.round(c.gardenArea), 'm²'],
    ['Villa Adedi', c.unitCount > 0 ? c.unitCount : '—'],
    ['Villa Başına Toplam Alan', Math.round(c.areaPerUnit), 'm²'],
    ['Zemin Üstü Kat Adedi', c.floorsAboveGround],
    ['Kat Başına Alan', Math.round(c.areaPerFloor), 'm²'],
  ]);
  for (let i = capStart; i < row; i++) {
    const cell = ws1.getCell(`C${i}`);
    const lbl = String(ws1.getCell(`B${i}`).value);
    if (typeof cell.value === 'number' && lbl !== 'Villa Adedi' && lbl !== 'Zemin Üstü Kat Adedi') cell.numFmt = M2;
  }
  ws1.getCell(`B${capStart + 7}`).font = { name: 'Arial', size: 10, bold: true };
  ws1.getCell(`C${capStart + 7}`).font = { name: 'Arial', size: 10, bold: true };
  row++;
  }

  row = section(ws1, row, 'FİZİBİLİTE');
  if (apt) {
    /* [etiket, değer, biçim, kalın] — apartman fizibilitesi kat tipi bazlı birim değerlerle */
    const aptFin: Array<[string, string | number, string | null, boolean]> = [
      ['Yapı Sınıfı', `${input.cost.buildingClass}${sinif ? ' — ' + sinif.label : ''}`, null, false],
      ['Tebliğ Birim Maliyeti', Math.round(input.cost.unitCost), TLM2, false],
      ['Güncelleme Oranı', input.cost.inflationRate, PCT, false],
      ['Güncel Birim Maliyet', Math.round(f.effectiveUnitCost), TLM2, false],
      ['İnşaat Maliyeti (toplam kat alanı üzerinden)', Math.round(f.constructionCost), TL, false],
      ['Peyzaj ve Bahçe Düzenlemesi', Math.round(f.landscapeCost), TL, false],
      ['Proje, Ruhsat, Harç, Müşavirlik', Math.round(f.extrasCost), TL, false],
      ['Finansman Gideri', Math.round(f.financeCost), TL, false],
      ['TOPLAM MALİYET', Math.round(f.totalCost), TL, true],
      ...(karma
        ? [
            ...(apt.bodrumSaleableByUse.ticari > 0
              ? [['Bodrum (ticari) Satış Birim Değeri', Math.round(input.sales.apt.bodrumTicari), TLM2, false] as [string, number, string, boolean]] : []),
            ...(apt.bodrumSaleableByUse.konut > 0
              ? [['Bodrum (konut) Satış Birim Değeri', Math.round(input.sales.apt.bodrum), TLM2, false] as [string, number, string, boolean]] : []),
          ]
        : apt.saleableByKind.bodrum > 0
          ? [['Bodrum Satış Birim Değeri', Math.round(input.sales.apt.bodrum), TLM2, false] as [string, number, string, boolean]] : []),
      [karma ? 'Zemin Kat (ticari) Satış Birim Değeri' : 'Zemin Kat Satış Birim Değeri', Math.round(input.sales.apt.zemin), TLM2, false],
      ...(karma && apt.saleableByKind.asma > 0
        ? [['Asma Kat Satış Birim Değeri', Math.round(input.sales.apt.asma), TLM2, false] as [string, number, string, boolean]] : []),
      ['Normal Kat Satış Birim Değeri', Math.round(input.sales.apt.normal), TLM2, false],
      ...(apt.saleableByKind.piyes > 0
        ? [['Piyes Satış Birim Değeri', Math.round(input.sales.apt.piyes), TLM2, false] as [string, number, string, boolean]] : []),
      ['Yapı Satış Hasılatı', Math.round(f.buildingRevenue), TL, false],
      ['Bahçe Satış Hasılatı', Math.round(f.gardenRevenue), TL, false],
      ['TOPLAM SATIŞ HASILATI', Math.round(f.revenue), TL, true],
      ['Müteahhit Kazancı', Math.round(f.developerProfit), TL, false],
      ['ARSA DEĞERİ (GELİR PROJEKSİYONU)', Math.round(f.residualLandValue), TL, true],
      ['Arsa m² Birim Değeri', Math.round(f.landUnitValue), TLM2, false],
      ['Arsa Değeri / Hasılat', f.landToRevenue, PCT, false],
      ['Satılabilir m² Başına Maliyet', Math.round(f.costPerSaleableM2), TLM2, false],
      ...fxLines(input.fx, f.residualLandValue, f.landUnitValue).map((l): [string, number | string, string, boolean] => [
        `Arsa Değeri (${l.code}) · ${fxRateNote(l.rate, new Date().toLocaleDateString(LOC()))}`,
        `${fxMoney(l.symbol, l.value)} · ${fxMoney(l.symbol, l.unitValue)}/m²`, '', true,
      ]),
    ];
    for (const [label, value, fmt, bold] of aptFin) {
      const l = ws1.getCell(`B${row}`);
      l.value = tt(label); l.font = { name: 'Arial', size: 10, bold }; l.alignment = { indent: 1 };
      const v = ws1.getCell(`C${row}`);
      v.value = value;
      v.font = { name: 'Arial', size: 10, bold };
      v.alignment = { horizontal: 'right', indent: 1 };
      if (typeof value === 'number' && fmt) v.numFmt = fmt;
      if (bold) {
        l.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
        l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        v.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
        v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      }
      l.border = BOX; v.border = BOX;
      ws1.getRow(row).height = 15;
      row++;
    }
  } else {
  const finStart = row;
  row = rows(ws1, row, [
    ['Yapı Sınıfı', `${input.cost.buildingClass}${sinif ? ' — ' + sinif.label : ''}`],
    ['Tebliğ Birim Maliyeti', Math.round(input.cost.unitCost)],
    ['Güncelleme Oranı', input.cost.inflationRate],
    ['Güncel Birim Maliyet', Math.round(f.effectiveUnitCost)],
    ['İnşaat Maliyeti', Math.round(f.constructionCost)],
    ['Peyzaj ve Bahçe Düzenlemesi', Math.round(f.landscapeCost)],
    ['Proje, Ruhsat, Harç, Müşavirlik', Math.round(f.extrasCost)],
    ['Finansman Gideri', Math.round(f.financeCost)],
    ['TOPLAM MALİYET', Math.round(f.totalCost)],
    ['Villa Satış Hasılatı', Math.round(f.buildingRevenue)],
    ['Bahçe Satış Hasılatı', Math.round(f.gardenRevenue)],
    ['TOPLAM SATIŞ HASILATI', Math.round(f.revenue)],
    ['Müteahhit Kazancı', Math.round(f.developerProfit)],
    ['ARSA DEĞERİ (GELİR PROJEKSİYONU)', Math.round(f.residualLandValue)],
    ['Arsa m² Birim Değeri', Math.round(f.landUnitValue)],
    ['Arsa Değeri / Hasılat', f.landToRevenue],
    ['Satılabilir m² Başına Maliyet', Math.round(f.costPerSaleableM2)],
    ...fxLines(input.fx, f.residualLandValue, f.landUnitValue).map((l): Row => [
      `Arsa Değeri (${l.code}) · ${fxRateNote(l.rate, new Date().toLocaleDateString(LOC()))}`,
      `${fxMoney(l.symbol, l.value)} · ${fxMoney(l.symbol, l.unitValue)}/m²`,
    ]),
  ], TL);
  ws1.getCell(`C${finStart + 1}`).numFmt = TLM2;
  ws1.getCell(`C${finStart + 2}`).numFmt = PCT;
  ws1.getCell(`C${finStart + 3}`).numFmt = TLM2;
  ws1.getCell(`C${finStart + 14}`).numFmt = TLM2;
  ws1.getCell(`C${finStart + 15}`).numFmt = PCT;
  ws1.getCell(`C${finStart + 16}`).numFmt = TLM2;
  [finStart + 8, finStart + 11, finStart + 13].forEach((i) => {
    ['B', 'C'].forEach((col) => {
      const cell = ws1.getCell(`${col}${i}`);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    });
    ws1.getCell(`D${i}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  });
  }
  row++;

  if (input.share.enabled) {
  row = section(ws1, row, 'ARSA DEĞERİ — YÖNTEM KARŞILAŞTIRMASI');
  const shStart = row;
  row = rows(ws1, row, [
    ['Arsa Sahibi Payı', s.ownerShare],
    ['Müteahhit Payı', s.contractorShare],
    ['Kat Karşılığı Yöntemine Göre Arsa Değeri', Math.round(s.shareLandValue)],
    ['Gelir Projeksiyonuna Göre Arsa Değeri', Math.round(f.residualLandValue)],
    ['İki Yöntem Arasındaki Fark', Math.round(Math.abs(s.difference))],
    ['Farkın Oranı', Math.abs(s.differenceRate)],
    ['Gelir Projeksiyonuna Denk Gelen Arsa Payı', s.balancedShare],
    ['Değerlendirme', VERDICT_TEXT[s.verdict]],
  ], TL);
  ws1.getCell(`C${shStart}`).numFmt = PCT;
  ws1.getCell(`C${shStart + 1}`).numFmt = PCT;
  ws1.getCell(`C${shStart + 5}`).numFmt = PCT;
  ws1.getCell(`C${shStart + 6}`).numFmt = PCT;
  [shStart + 2, shStart + 3].forEach((i) => {
    ws1.getCell(`B${i}`).font = { name: 'Arial', size: 10, bold: true };
    ws1.getCell(`C${i}`).font = { name: 'Arial', size: 10, bold: true };
  });
  }
  row += 2;

  ws1.mergeCells(`B${row}:D${row}`);
  ws1.getCell(`B${row}`).value =
    `${tt(BRAND.preparedBy)} · ${tt(BRAND.developerLine)}\n` +
    `${tt('Yöntem: Gelir Projeksiyonu')} · ${tt('Tutarlar KDV hariçtir')} · ${tt('Birim maliyet kaynağı')}: ${TEBLIG_KAYNAK} · ${BRAND.appName} ${version}`;
  ws1.getCell(`B${row}`).alignment = { indent: 1, wrapText: true };
  ws1.getRow(row).height = 26;
  ws1.getCell(`B${row}`).font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF5B6B7F' } };
  ws1.getCell(`B${row}`).alignment = { indent: 1 };

  /* ── 2. GİRDİLER ── */
  const ws2 = sheet('GİRDİLER', 'ANALİZDE KULLANILAN VARSAYIMLAR');
  let r2 = START;
  r2 = section(ws2, r2, 'GİRDİ ÖZETİ');
  if (apt) {
    const a = input.apartment;
    const aktifBodrum = a.basements.slice(0, Math.min(4, Math.max(0, a.basementCount)));
    const list: Row[] = [
      ['Hesap Yöntemi', apt.mode === 'taks-kaks' ? 'TAKS / KAKS' : 'Alan Bilgisi Girilerek'],
      ['Bodrum Kat Sayısı', aktifBodrum.length],
      ...aktifBodrum.map((b, i): Row => [
        `${i + 1}. Bodrum Kullanımı`,
        b.use === 'ortak' ? 'Ortak mahal (satılamaz)' : `Konut${apt.mode === 'taks-kaks' ? ` · kayıp %${(b.lossRate * 100).toFixed(0)}` : ''}`,
      ]),
      ['Normal Kat Sayısı', apt.normalFloorCount,
        apt.mode === 'taks-kaks' && apt.derivedFloorsFromHmax != null
          ? `Hmax → zemin dahil ${apt.derivedFloorsFromHmax} kat` : undefined],
      ...(karma ? [['Asma Kat', a.asmaCount > 0
        ? `${a.asmaCount} adet · zeminin %${(a.asmaRate * 100).toFixed(0)}'ı önerisi · ${a.asmaInEmsal ? 'emsale dahil' : 'emsal dışı'}`
        : 'Yok'] as Row] : []),
      ['Çatı Arası Piyesi', a.hasPiyes
        ? (apt.mode === 'taks-kaks'
          ? `Var · normal katın %${(a.piyesRate * 100).toFixed(0)}'i · ${a.piyesInEmsal ? 'emsale dahil' : 'emsal dışı'}`
          : 'Var')
        : 'Yok'],
      ...(apt.mode === 'taks-kaks' ? [
        ['Zemin Kat Alan Kaybı', a.zeminLossRate] as Row,
        ['Normal Kat Ortak Mahal Payı', a.normalCommonRate] as Row,
        ['İlave Satılabilir Alan', a.hasExtraSaleable
          ? (a.extraMode === 'oran' ? `Emsalin %${(a.extraRate * 100).toFixed(1)}'i` : `${a.extraArea} m² (elle)`)
          : 'Yok'] as Row,
      ] : []),
      ['Peyzaj Birim Maliyeti', input.site.landscapeUnitCost],
      ['Bahçe Satış Değeri', input.site.gardenPricePerM2],
      ['Bodrum Satış Birim Değeri', input.sales.apt.bodrum],
      ['Zemin Kat Satış Birim Değeri', input.sales.apt.zemin],
      ['Normal Kat Satış Birim Değeri', input.sales.apt.normal],
      ['Piyes Satış Birim Değeri', input.sales.apt.piyes],
      ['Müteahhit Kazanç Oranı', input.residual.profitRate],
      ['Finansman Gideri (toplam maliyetin yüzdesi)', input.residual.financeRateOfCost],
      ['Kat Karşılığı Bölümü', input.share.enabled ? 'Raporda gösteriliyor' : 'Kapalı'],
      ['Arsa Sahibi Payı', input.share.ownerShare],
    ];
    const start2 = r2;
    r2 = rows(ws2, start2, list);
    for (let i = start2; i < r2; i++) {
      const lbl = String(ws2.getCell(`B${i}`).value);
      const cell = ws2.getCell(`C${i}`);
      if (typeof cell.value !== 'number') continue;
      if (lbl.includes('Birim Değeri') || lbl.includes('Birim Maliyeti') || lbl.includes('Satış Değeri')) cell.numFmt = TLM2;
      else if (lbl.includes('Oranı') || lbl.includes('Kaybı') || lbl.includes('Payı') || lbl.includes('Gideri')) cell.numFmt = PCT;
    }
  } else {
  r2 = rows(ws2, r2, [
    ['Villa Tipi', input.villa.villaType === 'mustakil' ? 'Müstakil' : input.villa.villaType === 'ikiz' ? 'İkiz' : 'Sıralı'],
    ['Villa Adedi', input.villa.unitCount > 0 ? input.villa.unitCount : 'Girilmedi'],
    ['Zemin Üstü Kat Adedi', input.villa.floorsAboveGround],
    ['Emsal Dışı Satılabilir Alan', input.emsal.hasExtra
      ? (input.emsal.extraMode === 'oran' ? `Emsalin %${(input.emsal.extraRate * 100).toFixed(1)}'i` : `${input.emsal.extraArea} m² (elle)`) : 'Yok'],
    ['Çatı Katı', input.emsal.hasAttic
      ? `${input.emsal.atticMode === 'oran' ? 'Tabanın %' + (input.emsal.atticRate * 100).toFixed(0) + "'i" : input.emsal.atticArea + ' m² (elle)'} · ${input.emsal.atticInEmsal ? 'emsale dahil' : 'emsal dışı'}` : 'Yok'],
    ['Bodrum Kat', input.emsal.hasBasement
      ? `${input.emsal.basementMode === 'oran' ? 'Tabanın %' + (input.emsal.basementRate * 100).toFixed(0) + "'i" : input.emsal.basementArea + ' m² (elle)'} · ${input.emsal.basementInEmsal ? 'emsale dahil' : 'emsal dışı'}` : 'Yok'],
    ['Peyzaj Birim Maliyeti', input.site.landscapeUnitCost],
    ['Bahçe Satış Değeri', input.site.gardenPricePerM2],
    ['Satış Birim Değeri (toplam inşaat m²)', input.sales.unitPrice],
    ['Müteahhit Kazanç Oranı', input.residual.profitRate],
    ['Finansman Gideri (toplam maliyetin yüzdesi)', input.residual.financeRateOfCost],
    ['Kat Karşılığı Bölümü', input.share.enabled ? 'Raporda gösteriliyor' : 'Kapalı'],
    ['Arsa Sahibi Payı', input.share.ownerShare],
  ]);
  ['C13', 'C14', 'C15'].forEach((a) => { ws2.getCell(a).numFmt = TLM2; });
  ['C16', 'C17', 'C19'].forEach((a) => { ws2.getCell(a).numFmt = PCT; });
  }
  if (input.zoning.planNotes.trim()) {
    r2 += 1;
    r2 = section(ws2, r2, 'PLAN NOTLARI');
    ws2.mergeCells(`B${r2}:D${r2 + 4}`);
    const pn = ws2.getCell(`B${r2}`);
    pn.value = input.zoning.planNotes;
    pn.font = { name: 'Arial', size: 9.5 };
    pn.alignment = { vertical: 'top', wrapText: true, indent: 1 };
  }

  /* ── 3. UZMAN GÖRÜŞÜ ── */
  const ws3 = sheet('UZMAN GÖRÜŞÜ', 'UZMAN DEĞERLENDİRMESİ');
  ws3.columns = [{ width: 3 }, { width: 14 }, { width: 34 }, { width: 92 }, { width: 3 }];
  let r3 = START;
  const head = ['DÜZEY', 'BAŞLIK', 'DEĞERLENDİRME'];
  head.forEach((h, i) => {
    const cell = ws3.getCell(r3, 2 + i);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3F66' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  r3++;
  const levelText: Record<string, string> = { olumlu: 'OLUMLU', bilgi: 'BİLGİ', dikkat: 'DİKKAT', uyari: 'UYARI', 'uyari-uygulama': 'UYARI' };
  const levelColor: Record<string, string> = { olumlu: 'FF1E6B41', bilgi: 'FF0F2A47', dikkat: 'FF92610A', uyari: 'FFB42318', 'uyari-uygulama': 'FF92610A' };
  for (const a of r.advice) {
    if (a.level === 'uyari-uygulama') continue;   // yalnızca uygulama ekranında gösterilir
    ws3.getCell(`B${r3}`).value = levelText[a.level];
    ws3.getCell(`B${r3}`).font = { name: 'Arial', size: 9, bold: true, color: { argb: levelColor[a.level] } };
    ws3.getCell(`B${r3}`).alignment = { horizontal: 'center', vertical: 'top' };
    ws3.getCell(`C${r3}`).value = a.title;
    ws3.getCell(`C${r3}`).font = { name: 'Arial', size: 9.5, bold: true };
    ws3.getCell(`C${r3}`).alignment = { vertical: 'top', wrapText: true, indent: 1 };
    ws3.getCell(`D${r3}`).value = a.body;
    ws3.getCell(`D${r3}`).font = { name: 'Arial', size: 9.5 };
    ws3.getCell(`D${r3}`).alignment = { vertical: 'top', wrapText: true, indent: 1 };
    ws3.getRow(r3).height = Math.max(30, Math.ceil(a.body.length / 95) * 13);
    r3++;
  }

  attachDataSheet(wb, input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const name = `Arsa-Analizi-${(p.ilce || p.il || 'rapor').replace(/\s+/g, '-')}-${p.ada || ''}-${p.parsel || ''}.xlsx`
    .replace(/-+\./, '.');
  triggerDownload(blob, name);
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
