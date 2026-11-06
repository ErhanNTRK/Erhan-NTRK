/**
 * UZMAN NOTU PDF'İ — ayrı belge
 * Ana rapor PDF'i talep eden kişiye gönderilir; bu belge yalnızca sistemi kullanan
 * uzmana yöneliktir ve uzman değerlendirmesini içerir. 'uyari-uygulama' düzeyindeki
 * notlar bu belgeye de yazılmaz (yalnızca uygulama ekranında görünür).
 */
import { jsPDF } from 'jspdf';
import type { ProjectInput, AnalysisResult } from '../engine';
import { triggerDownload } from './excel';
import { LOC } from '../i18n';
import {
  loadFonts, drawHeader, drawFooter,
  NAVY, GRAY, INK, LINE, FAINT, GOLD, GREEN, RED, M, PW, W, tl,
} from './pdf';

const AMBER: [number, number, number] = [146, 97, 10];
const LEVEL_COLOR: Record<string, [number, number, number]> = {
  olumlu: GREEN, bilgi: NAVY, dikkat: AMBER, uyari: RED,
};
const LEVEL_TEXT: Record<string, string> = {
  olumlu: 'OLUMLU', bilgi: 'BİLGİ', dikkat: 'DİKKAT', uyari: 'UYARI',
};

export async function downloadAdvicePdf(input: ProjectInput, r: AnalysisResult, version: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await loadFonts(doc);

  const p = input.parcel;
  const tarih = new Date().toLocaleDateString(LOC());
  let y = 41;

  function pageBreak(need = 14) {
    if (y + need > 280) { doc.addPage(); y = 18; }
  }

  drawHeader(doc, 'UZMAN DEĞERLENDİRME NOTU', 'Sistemi kullanan uzmana yöneliktir · Rapor ekine girmez');

  /* Künye */
  doc.setFillColor(...FAINT);
  doc.roundedRect(M, y, W, 13.5, 1.6, 1.6, 'F');
  doc.setDrawColor(...LINE);
  doc.roundedRect(M, y, W, 13.5, 1.6, 1.6, 'S');
  doc.setFont('NTRK', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK);
  doc.text(`${p.il} / ${p.ilce}${p.mahalle ? ' · ' + p.mahalle + ' Mahallesi' : ''}`, M + 4, y + 5.6);
  doc.setFont('NTRK', 'normal'); doc.setFontSize(8.6); doc.setTextColor(...GRAY);
  doc.text(`Ada ${p.ada || '—'} · Parsel ${p.parsel || '—'} · Arsa Değeri (Gelir Projeksiyonu): ${tl(r.financial.residualLandValue)}`, M + 4, y + 10.6);
  doc.setFontSize(8.2);
  doc.text(`Tarih: ${tarih}`, PW - M - 4, y + 5.6, { align: 'right' });
  y += 20;

  /* Amaç notu */
  doc.setFont('NTRK', 'normal'); doc.setFontSize(8.4); doc.setTextColor(...GRAY);
  const intro = doc.splitTextToSize(
    'Bu belge, analiz sırasında kural bazlı motorun ürettiği değerlendirme notlarını içerir. ' +
    'Varsayımların gözden geçirilmesi ve raporun kalite kontrolü için kullanılır; rapor talep eden tarafla paylaşılması gerekmez.',
    W - 2,
  );
  for (const line of intro) { doc.text(line, M + 1, y); y += 4.4; }
  y += 5;

  /* Değerlendirmeler */
  for (const a of r.advice) {
    if (a.level === 'uyari-uygulama') continue;
    pageBreak(20);
    const color = LEVEL_COLOR[a.level] ?? NAVY;
    /* Sol renk şeridi + düzey rozeti */
    doc.setFillColor(...color);
    doc.rect(M, y - 3.6, 1.8, 5.2, 'F');
    doc.setFont('NTRK', 'bold'); doc.setFontSize(7); doc.setTextColor(...color);
    doc.text(LEVEL_TEXT[a.level] ?? '', PW - M - 1, y, { align: 'right' });
    doc.setFontSize(9.6); doc.setTextColor(...NAVY);
    doc.text(a.title, M + 4.6, y);
    y += 5.2;
    doc.setFont('NTRK', 'normal'); doc.setFontSize(8.8); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(a.body, W - 6);
    for (const line of lines) { pageBreak(6); doc.text(line, M + 4.6, y); y += 4.4; }
    y += 1.6;
    doc.setDrawColor(...LINE);
    doc.line(M, y, PW - M, y);
    y += 5;
  }

  /* Altın kapanış çizgisi */
  pageBreak(10);
  doc.setFillColor(...GOLD);
  doc.rect(M, y, W, 0.9, 'F');

  drawFooter(doc, version, 'Uzman Notu · Rapor ekine girmez');

  const name = `Uzman-Notu-${(p.ilce || p.il || 'analiz').replace(/\s+/g, '-')}-${p.ada || ''}-${p.parsel || ''}.pdf`
    .replace(/-+\./, '.');
  triggerDownload(doc.output('blob'), name);
}
