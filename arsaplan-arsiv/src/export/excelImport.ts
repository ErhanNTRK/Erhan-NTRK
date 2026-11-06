/**
 * EXCEL İÇE/DIŞA AKTARMA — paylaşılan mekanizma.
 *
 * Yaklaşım: "güzel" (bankaya sunulan) sayfadaki formatlanmış sayıları geri
 * ayrıştırmaya çalışmak kırılgandır (binlik ayırıcı, para birimi sembolü,
 * yuvarlama farkları vb. yüzünden veri kaybı riski var). Bunun yerine her
 * Excel dosyasına GİZLİ bir "_data" sayfası eklenir; bu sayfa yalnızca
 * girdi durumunun (input state) ham JSON'unu bir hücreye yazar. İçe
 * aktarma bu gizli sayfayı okur — kullanıcı gördüğü tabloyu hiç
 * etkilemez, ama round-trip (dışa aktar → içe aktar) birebir ve güvenilirdir.
 *
 * Sınır: Kullanıcı "güzel" sayfadaki bir sayıyı Excel'de elle değiştirip
 * geri yüklerse bu değişiklik YANSIMAZ — yalnızca ilk dışa aktarma anındaki
 * veri geri yüklenir. Salih'in isteği ("excel alıp başkasına iletmek,
 * yeni kullanıcı yükleyince verileri birebir görmek") tam olarak budur.
 */
import ExcelJS from 'exceljs';

const SHEET_NAME = '_data';

/** Dışa aktarılan iş kitabına gizli veri sayfası ekler. Diğer tüm kodlardan SONRA çağrılmalı. */
export function attachDataSheet(wb: ExcelJS.Workbook, data: unknown) {
  const ws = wb.addWorksheet(SHEET_NAME);
  ws.state = 'veryHidden';
  ws.getCell('A1').value = JSON.stringify(data);
}

/** Yüklenen bir .xlsx dosyasından (File/Blob) gizli veri sayfasını okur. Bulunamazsa null döner. */
export async function readDataSheet<T = unknown>(file: File): Promise<T | null> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet(SHEET_NAME);
  if (!ws) return null;
  const raw = ws.getCell('A1').value;
  if (typeof raw !== 'string') return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
