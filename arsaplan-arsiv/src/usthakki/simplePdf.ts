/**
 * ÜST HAKKI YÖNTEM 1/2 — PDF çıktısı.
 * Salih'in kuralı: "150.000.000 ÷3 ×2 gibi ara hesaplar gösterilmeyecek" —
 * yalnız Parsel bilgileri ve nihai Üst Hakkı Değeri (Yöntem 2'de ayrıca
 * Üst Hakkı Arsa Değeri + Bina Değeri bileşenleri, çünkü Salih'in örneği
 * bunları açıkça "gösterilecek" diye belirtti).
 */
import { jsPDF } from 'jspdf';
import { BRAND } from '../brand/brand';
import { NAVY, INK, GRAY, GOLD, M, PW, W } from '../export/pdf';
import { drawHeader, drawFooter, loadFonts } from '../export/pdf';
import type { WholeValueResult, LandOnlyResult } from './simpleCostEngine';

interface SimpleInput {
  hotelName: string; mahalle: string; ada: string; parsel: string; parcelArea: number; fromKml: boolean;
  currency: 'TL' | 'USD' | 'EUR'; fxRate?: number;
  sureUnit: 'yil' | 'ay'; kalanSure: number; toplamSure: number;
}
const SYM: Record<SimpleInput['currency'], string> = { TL: '₺', USD: '$', EUR: '€' };
const cur = (v: number, input: SimpleInput) => Math.round(v).toLocaleString('tr-TR') + ' ' + SYM[input.currency];

export async function buildSimpleUstHakkiPdf(
  method: 'toplam' | 'arsa', input: SimpleInput, whole: WholeValueResult, land: LandOnlyResult,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await loadFonts(doc);
  const title = method === 'toplam' ? 'Toplam Değer Esaslı Üst Hakkı Tespiti' : 'Arsa Değeri Esaslı Üst Hakkı Tespiti';
  drawHeader(doc, title, 'Üst Hakkı Değerleme Raporu');
  let y = 44;

  function sectionTitle(t: string) {
    doc.setFillColor(...NAVY);
    doc.rect(M, y - 4.5, W, 6.5, 'F');
    doc.setFont('NTRK', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text(t, M + 3, y);
    y += 8;
  }
  function row(label: string, value: string, bold = false) {
    doc.setFont('NTRK', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
    doc.text(label, M + 3, y);
    doc.setFont('NTRK', bold ? 'bold' : 'normal'); doc.setTextColor(...INK);
    doc.text(value, PW - M - 3, y, { align: 'right' });
    y += 6.5;
  }
  const r = method === 'toplam' ? whole : land;
  const sureBirimi = input.sureUnit === 'ay' ? 'Ay' : 'Yıl';

  sectionTitle('PARSEL BİLGİLERİ');
  if (input.hotelName) row('Otel Adı', input.hotelName);
  if (input.mahalle) row('Mahalle', input.mahalle);
  if (input.ada) row('Ada', input.ada);
  if (input.parsel) row('Parsel', input.parsel);
  row('Parsel Alanı', `${input.parcelArea.toLocaleString('tr-TR')} m²` + (input.fromKml ? ' (KML)' : ''));
  y += 4;

  sectionTitle('ÜST HAKKI HESAP BAŞLIĞI');
  row('Yöntem', title);
  row('Arsa Değeri', cur(r.cost.landValue, input));
  row('Yapı Değeri', cur(r.cost.buildingValues, input));
  row('Toplam Değer', cur(r.cost.totalValue, input), true);
  y += 2;

  sectionTitle('SÜRE');
  row('Kalan Süre', `${input.kalanSure} ${sureBirimi}`);
  row('Toplam Süre', `${input.toplamSure} ${sureBirimi}`);
  row('Süre Birimi', sureBirimi);
  y += 2;

  if (method === 'toplam') {
    sectionTitle('DAİMİ MÜSTAKİL HAK HESABI');
    row('Taşınmazın Değeri', cur(whole.cost.totalValue, input), true);
    y += 2;
  } else {
    sectionTitle('SONUÇ');
    row('Üst Hakkı Arsa Değeri', cur(land.ustHakkiArsaDegeri, input));
    row('+ Bina Değeri', cur(land.buildingValueAdded, input));
    y += 2;
  }

  const boxH = input.currency !== 'TL' ? 32 : 24;
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, W, boxH, 2, 2, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(M, y + boxH - 1.5, W, 1.5, 'F');
  doc.setFont('NTRK', 'normal'); doc.setFontSize(8); doc.setTextColor(196, 212, 229);
  doc.text(method === 'toplam' ? 'ÜST HAKKI DEĞERİ' : 'NİHAİ ÜST HAKKI DEĞERİ', M + 5, y + 8);
  doc.setFont('NTRK', 'bold'); doc.setFontSize(19); doc.setTextColor(255, 255, 255);
  const finalValue = method === 'toplam' ? whole.ustHakkiValue : land.nihaiUstHakkiDegeri;
  doc.text(cur(finalValue, input), M + 5, y + 19);
  if (input.currency !== 'TL') {
    doc.setFont('NTRK', 'normal'); doc.setFontSize(9); doc.setTextColor(196, 212, 229);
    doc.text(`TL Karşılığı: ${Math.round(finalValue * (input.fxRate ?? 1)).toLocaleString('tr-TR')} ₺`, M + 5, y + 27);
  }
  y += boxH + 8;

  drawFooter(doc, BRAND.version, `Yöntem: ${title} · Tutarlar KDV hariçtir`);
  return doc;
}

export async function downloadSimpleUstHakkiPdf(
  method: 'toplam' | 'arsa', input: SimpleInput, whole: WholeValueResult, land: LandOnlyResult,
) {
  const doc = await buildSimpleUstHakkiPdf(method, input, whole, land);
  doc.save(method === 'toplam' ? 'Ust-Hakki-Toplam-Degerden.pdf' : 'Ust-Hakki-Sadece-Arsa.pdf');
}
