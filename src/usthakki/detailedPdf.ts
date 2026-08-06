/**
 * AYRINTILI ÜST HAKKI DEĞER ANALİZİ — PDF çıktısı.
 * Dönem sayısı kalan süreye göre değişir; otomatik sayfalanır. "â" harfi
 * kullanılmaz (font sınırı, bkz. Fuel modülü düzeltmesi 2026-07-30).
 */
import { jsPDF } from 'jspdf';
import { BRAND } from '../brand/brand';
import { NAVY, INK, GRAY, FAINT, GOLD, M, PW, W, tl } from '../export/pdf';
import { drawHeader, drawFooter, loadFonts } from '../export/pdf';
import type { DetailedUstHakkiInput, DetailedUstHakkiResult } from './detailedEngine';

const SYM: Record<DetailedUstHakkiInput['currency'], string> = { TL: '₺', USD: '$', EUR: '€' };
const CUR = (input: DetailedUstHakkiInput) => SYM[input.currency];
/** Seçilen para biriminde biçimlendirir — TL sabit ₺ değil, seçilen birimin sembolüyle. */
const cur = (v: number, input: DetailedUstHakkiInput) =>
  Math.round(v).toLocaleString('tr-TR') + ' ' + CUR(input);

export async function buildDetailedUstHakkiPdf(input: DetailedUstHakkiInput, r: DetailedUstHakkiResult): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await loadFonts(doc);
  drawHeader(doc, 'Ayrıntılı Üst Hakkı Değer Analizi', 'Gelir İndirgeme (DCF) — Dönemsel Tablo');
  let y = 44;

  function pageBreak(need: number): boolean { if (y + need > 280) { doc.addPage(); y = 20; return true; } return false; }
  function sectionTitle(title: string) {
    pageBreak(10);
    doc.setFillColor(...NAVY);
    doc.rect(M, y - 4.5, W, 6.5, 'F');
    doc.setFont('NTRK', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text(title, M + 3, y);
    y += 8;
  }
  function row(label: string, value: string, bold = false) {
    pageBreak(7);
    doc.setFont('NTRK', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
    doc.text(label, M + 3, y);
    doc.setFont('NTRK', bold ? 'bold' : 'normal'); doc.setTextColor(...INK);
    doc.text(value, PW - M - 3, y, { align: 'right' });
    y += 6.2;
  }

  const hasIdentity = !!(input.hotelName || input.ada || input.parsel);
  if (hasIdentity) {
    doc.setFont('NTRK', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
    const parts = [input.hotelName, input.ada && `Ada ${input.ada}`, input.parsel && `Parsel ${input.parsel}`,
      input.fromKml && '(KML)'].filter(Boolean).join(' · ');
    doc.text(parts, M, y); y += 7;
  }

  sectionTitle('SÜRE VE PARA BİRİMİ');
  row('Toplam Süre', `${input.toplamSureYil} yıl`);
  row('Kalan Süre', `${input.kalanSureYil} yıl`);
  row('İskonto Oranı', `%${(r.discountRate * 100).toFixed(1)}`);
  row('Para Birimi', input.currency + (input.currency !== 'TL' ? ` (kur: ${input.fxRate} ₺)` : ''));
  row('1. Yıl Oda Geliri', cur(r.baseRoomIncome, input) + ' (taban)');
  y += 2;

  if (input.showCostApproachInPdf) {
    sectionTitle('MALİYET YAKLAŞIMI');
    row('Arsa Alanı', `${input.parcelArea.toLocaleString('tr-TR')} m²` + (input.fromKml ? ' (KML)' : ''));
    row('Arsa m² Birim Değeri', cur(input.landUnitValue, input));
    row('Arsa Değeri', cur(r.cost.landValue, input));
    for (const b of input.buildings) {
      if (b.area > 0 || b.unitCost > 0) {
        row(`  ${b.type} (${b.area.toLocaleString('tr-TR')} m²)`, cur(b.area * b.unitCost, input));
      }
    }
    row('Toplam Yapı Maliyeti', cur(r.cost.buildingsCost, input), true);
    row('TOPLAM MALİYET', cur(r.cost.totalCost, input), true);
    row('Toplam Maliyet', cur(r.cost.totalCostRounded, input));
    y += 2;
  }

  sectionTitle(`DÖNEMSEL GELİR-GİDER TABLOSU (${r.years.length} DÖNEM)`);
  const h = 5.4;
  const C = [M + 2, M + W * 0.24, M + W * 0.40, M + W * 0.56, M + W * 0.72, M + W * 0.86, PW - M - 2];
  function tableHead() {
    doc.setFillColor(...FAINT);
    doc.rect(M, y - 3.8, W, h, 'F');
    doc.setFont('NTRK', 'bold'); doc.setFontSize(6.2); doc.setTextColor(...GRAY);
    doc.text('YIL', C[0], y);
    doc.text('TOPLAM GELİR', C[1], y, { align: 'right' });
    doc.text('TOPLAM GİDER', C[2], y, { align: 'right' });
    doc.text('BRÜT KAR', C[3], y, { align: 'right' });
    doc.text('NET KAR', C[4], y, { align: 'right' });
    doc.text('NET KAR %', C[5], y, { align: 'right' });
    doc.text('BUGÜNKÜ DEĞER', C[6], y, { align: 'right' });
    y += h + 0.5;
  }
  tableHead();
  let zebra = false;
  for (const yr of r.years) {
    const newPage = pageBreak(h + 2);
    if (newPage) tableHead();
    if (zebra) { doc.setFillColor(...FAINT); doc.rect(M, y - 3.8, W, h, 'F'); }
    zebra = !zebra;
    doc.setFont('NTRK', 'normal'); doc.setFontSize(7.2); doc.setTextColor(...INK);
    doc.text(String(yr.year), C[0], y);
    doc.text(cur(yr.totalRevenue, input), C[1], y, { align: 'right' });
    doc.text(cur(yr.totalExpense, input), C[2], y, { align: 'right' });
    doc.text(cur(yr.grossOperatingProfit, input), C[3], y, { align: 'right' });
    doc.text(cur(yr.netOperatingProfit, input), C[4], y, { align: 'right' });
    doc.text('%' + yr.netOperatingProfitPct.toFixed(1), C[5], y, { align: 'right' });
    doc.setFont('NTRK', 'bold');
    doc.text(cur(yr.presentValue, input), C[6], y, { align: 'right' });
    y += h;
  }
  y += 4;

  pageBreak(40);
  sectionTitle('SONUÇ');
  row('Nakit Akış Bugünkü Değerleri Toplamı', cur(r.sumPresentValue, input));
  if (input.donemSonuIndirgemePct > 0) {
    row(`Dönem Sonu Değer İndirgeme (%${input.donemSonuIndirgemePct})`, '−' + cur(r.sumPresentValue - r.propertyValueLocal, input));
  }
  y += 2;
  const boxH = input.currency !== 'TL' ? 32 : 24;
  pageBreak(boxH + 6);
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, W, boxH, 2, 2, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(M, y + boxH - 1.5, W, 1.5, 'F');
  doc.setFont('NTRK', 'normal'); doc.setFontSize(8); doc.setTextColor(196, 212, 229);
  doc.text('TAŞINMAZ DEĞERİ', M + 5, y + 8);
  doc.setFont('NTRK', 'bold'); doc.setFontSize(19); doc.setTextColor(255, 255, 255);
  doc.text(`${Math.round(r.propertyValueRounded).toLocaleString('tr-TR')} ${CUR(input)}`, M + 5, y + 19);
  if (input.currency !== 'TL') {
    doc.setFont('NTRK', 'normal'); doc.setFontSize(9); doc.setTextColor(196, 212, 229);
    doc.text(`TL Karşılığı: ${tl(r.propertyValueTl)}`, M + 5, y + 27);
  }
  y += boxH + 6;

  drawFooter(doc, BRAND.version, 'Yöntem: Ayrıntılı Üst Hakkı Değer Analizi (DCF) · Tutarlar KDV hariçtir');
  return doc;
}

export async function downloadDetailedUstHakkiPdf(input: DetailedUstHakkiInput, r: DetailedUstHakkiResult) {
  const doc = await buildDetailedUstHakkiPdf(input, r);
  doc.save('Ayrintili-Ust-Hakki-Degerleme-Raporu.pdf');
}
