/**
 * JPEG ÇIKTISI — Rapor PDF'inin 1. sayfasının birebir görüntüsü.
 * Ayrı bir tasarım YOKTUR: PDF'te ne varsa JPEG'de o vardır; iki çıktı
 * hiçbir zaman birbirinden ayrışamaz. pdf.js ile tarayıcıda çizilir.
 */
import type { ProjectInput, AnalysisResult } from '../engine';
import { buildPdf } from './pdf';
import { triggerDownload } from './excel';

export async function downloadJpeg(input: ProjectInput, r: AnalysisResult, version: string) {
  const { doc, name } = await buildPdf(input, r, version);
  const data = doc.output('arraybuffer');

  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const scale = 150 / 72;                     // 150 dpi
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG üretilemedi'))), 'image/jpeg', 0.92));
  triggerDownload(blob, name.replace(/\.pdf$/, '.jpg'));
}
