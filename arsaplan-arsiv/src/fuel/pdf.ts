/**
 * AKARYAKIT GELİR HESABI — PDF çıktısı.
 * Aynı kurumsal başlık/altbilgi/font/renk paletini kullanır — tüm modüllerde
 * tek görsel dil. Gelir ve (varsa) Maliyet yaklaşımı yan yana gösterilir.
 */
import { jsPDF } from 'jspdf';
import { BRAND } from '../brand/brand';
import { NAVY, INK, GRAY, FAINT, GOLD, GREEN, M, PW, W, tl } from '../export/pdf';
import { drawHeader, drawFooter, loadFonts } from '../export/pdf';
import type { FuelInput, FuelResult } from './engine';

export async function buildFuelPdf(input: FuelInput, r: FuelResult): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await loadFonts(doc);
  drawHeader(doc, 'Akaryakıt Gelir Hesabı', 'İstasyon satışları ve değerleme analizi (KDV hariç)');
  let y = 44;

  function sectionTitle(title: string) {
    doc.setFillColor(...NAVY);
    doc.rect(M, y - 4.5, W, 6.5, 'F');
    doc.setFont('NTRK', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text(title, M + 3, y);
    y += 8;
  }
  function row(label: string, value: string, bold = false) {
    doc.setFont('NTRK', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
    doc.text(label, M + 3, y);
    doc.setFont('NTRK', bold ? 'bold' : 'normal'); doc.setTextColor(...INK);
    doc.text(value, PW - M - 3, y, { align: 'right' });
    y += 6.2;
  }

  sectionTitle('AKARYAKIT SATIŞLARI (KDV HARİÇ)');
  const h = 6.2;
  const C = [M + 3, M + W * 0.42, M + W * 0.62, M + W * 0.80, PW - M - 3];
  doc.setFillColor(...FAINT);
  doc.rect(M, y - 4, W, h, 'F');
  doc.setFont('NTRK', 'bold'); doc.setFontSize(7); doc.setTextColor(...GRAY);
  doc.text('ÜRÜN', C[0], y);
  doc.text('YILLIK LİTRE', C[1], y, { align: 'right' });
  doc.text('CİRO', C[2], y, { align: 'right' });
  doc.text('KAZANÇ %', C[3], y, { align: 'right' });
  doc.text('NET KAZANÇ', C[4], y, { align: 'right' });
  y += h + 1;
  let z = false;
  for (const p of r.products) {
    if (z) { doc.setFillColor(...FAINT); doc.rect(M, y - 4, W, h, 'F'); }
    z = !z;
    doc.setFont('NTRK', 'normal'); doc.setFontSize(8.3); doc.setTextColor(...INK);
    doc.text(p.name, C[0], y);
    doc.text(Math.round(p.yearlyLitersUsed).toLocaleString('tr-TR') + ' Lt', C[1], y, { align: 'right' });
    doc.text(tl(p.turnover), C[2], y, { align: 'right' });
    doc.text('%' + p.profitPct.toLocaleString('tr-TR'), C[3], y, { align: 'right' });
    doc.setFont('NTRK', 'bold'); doc.setTextColor(...GREEN);
    doc.text(tl(p.net), C[4], y, { align: 'right' });
    y += h;

    if (p.mode === 'cokyil') {
      const vals = p.multiYearLiters.filter((v) => v > 0);
      const labels = p.multiYearLabels ?? vals.map((_, i) => `${i + 1}. Yıl`);
      p.multiYearLiters.forEach((v, i) => {
        if (v <= 0) return;
        doc.setFont('NTRK', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...GRAY);
        doc.text(`  ${labels[i] ?? `${i + 1}. Yıl`}`, C[0] + 2, y);
        doc.text(Math.round(v).toLocaleString('tr-TR') + ' Lt', C[1], y, { align: 'right' });
        doc.text(tl(v * p.unitPrice), C[2], y, { align: 'right' });
        y += h - 1.4;
      });
      if (vals.length > 0) {
        doc.setFont('NTRK', 'bold'); doc.setFontSize(7.4); doc.setTextColor(...INK);
        doc.text(`  ${vals.length} Yıllık Ortalama`, C[0] + 2, y);
        doc.text(Math.round(p.yearlyLitersUsed).toLocaleString('tr-TR') + ' Lt', C[1], y, { align: 'right' });
        y += h - 1.4;
      }
    }
  }
  y += 4;

  sectionTitle('DİĞER GELİRLER VE KESİNTİLER');
  row('Yakıt Net Kazancı/yıl', tl(r.fuelNet));
  if (r.extrasNet > 0) row('İlave Gelir Kalemleri/yıl', tl(r.extrasNet));
  if (r.otherIncomeFromPct > 0) row(`Diğer Gelirler (yakıt cirosunun %${input.otherIncomePctOfFuel})`, tl(r.otherIncomeFromPct));
  if (r.dealerRentApplied > 0) row('Dağıtıcı Kirası', '−' + tl(r.dealerRentApplied));
  row('TOPLAM NET KAZANÇ/yıl', tl(r.totalNet), true);
  y += 4;

  doc.setFillColor(...NAVY);
  const boxH = r.costValue != null ? 30 : 26;
  doc.roundedRect(M, y, W, boxH, 2, 2, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(M, y + boxH - 1.5, W, 1.5, 'F');
  const halfW = r.costValue != null ? W / 2 - 4 : W;
  doc.setFont('NTRK', 'normal'); doc.setFontSize(8); doc.setTextColor(196, 212, 229);
  doc.text('GELİR YAKLAŞIMI', M + 5, y + 8);
  doc.setFont('NTRK', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
  doc.text(tl(r.incomeValueRounded), M + 5, y + 19);
  doc.setFont('NTRK', 'normal'); doc.setFontSize(7.5); doc.setTextColor(196, 212, 229);
  doc.text(`Net kazanç ÷ %${input.capRate}`, M + 5, y + 25);
  if (r.costValue != null) {
    doc.setFont('NTRK', 'normal'); doc.setFontSize(8); doc.setTextColor(196, 212, 229);
    doc.text('MALİYET YAKLAŞIMI', M + halfW + 13, y + 8);
    doc.setFont('NTRK', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
    doc.text(tl(r.costValue), M + halfW + 13, y + 19);
    doc.setFont('NTRK', 'normal'); doc.setFontSize(7.5); doc.setTextColor(196, 212, 229);
    doc.text(`Arsa ${tl(r.costLand)} + Yapılar ${tl(r.costBuildings)}`, M + halfW + 13, y + 25);
  }
  y += boxH + 6;

  doc.setFont('NTRK', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
  doc.text('Kapitalizasyon Oranı', M + 3, y);
  doc.setFont('NTRK', 'bold'); doc.setTextColor(...INK);
  doc.text(`%${input.capRate}`, PW - M - 3, y, { align: 'right' });
  y += 8;

  drawFooter(doc, BRAND.version, 'Yöntem: Akaryakıt Gelir Hesabı · Tutarlar KDV hariçtir');
  return doc;
}

export async function downloadFuelPdf(input: FuelInput, r: FuelResult) {
  const doc = await buildFuelPdf(input, r);
  doc.save('Akaryakit-Gelir-Hesabi.pdf');
}
