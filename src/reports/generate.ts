import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import { db } from '../storage/database';
import { reportDocument } from './content';
import type { ReportInput } from './types';

pdfMake.addVirtualFileSystem(fonts);
// Report content is local data only. No URL embedded in a field may trigger a network request.
pdfMake.setUrlAccessPolicy(() => false);

/** Decode local originals, apply optional framing, and draw saved geometry without altering the photo. */
export async function reportPhotos(input: ReportInput): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (input.profile.report?.target === false) return result;
  for (const series of input.series) {
    const target = input.annotations.find((item) => item.entityId === series.id)?.target;
    const photo =
      input.attachments.find(
        (item) => item.id === target?.photoId && item.seriesId === series.id,
      ) ?? input.attachments.find((item) => item.seriesId === series.id);
    if (!photo) continue;
    const record = await db.attachmentContents.get(photo.id);
    if (!record)
      throw new Error(
        `The target photo for "${series.name}" is missing. Restore it or disable Target in Profile → Report.`,
      );
    const url = URL.createObjectURL(record.blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (
        !image.naturalWidth ||
        !image.naturalHeight ||
        image.naturalWidth * image.naturalHeight > 60_000_000
      )
        throw new Error('A target photo exceeds the supported image dimensions.');
      const measurement = target?.photoId === photo.id ? target : undefined;
      const crop = measurement?.reportCrop;
      if (crop && (crop.width !== image.naturalWidth || crop.height !== image.naturalHeight))
        throw new Error(
          `Reopen the report crop for "${series.name}"; the photo dimensions have changed.`,
        );
      const sx = crop?.x ?? 0;
      const sy = crop?.y ?? 0;
      const width = crop?.size ?? image.naturalWidth;
      const height = crop?.size ?? image.naturalHeight;
      const scale = Math.min(1, 1600 / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Target rendering is unavailable in this browser.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, sx, sy, width, height, 0, 0, canvas.width, canvas.height);
      const geometry = measurement?.geometry;
      if (geometry) {
        context.save();
        context.scale(scale, scale);
        context.translate(-sx, -sy);
        context.lineWidth = 2 / scale;
        context.strokeStyle = '#00a891';
        context.beginPath();
        context.arc(geometry.center.x, geometry.center.y, geometry.radius, 0, 2 * Math.PI);
        context.stroke();
        if (geometry.poa) {
          context.setLineDash([5 / scale, 4 / scale]);
          context.strokeRect(
            geometry.poa.x,
            geometry.poa.y,
            geometry.center.x - geometry.poa.x,
            geometry.center.y - geometry.poa.y,
          );
          context.setLineDash([]);
          context.beginPath();
          context.arc(geometry.poa.x, geometry.poa.y, 5 / scale, 0, 2 * Math.PI);
          context.stroke();
        }
        context.restore();
      }
      result.set(series.id, canvas.toDataURL('image/jpeg', 0.92));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return result;
}

/** Build a self-contained local PDF; fonts are bundled so first generation also works offline. */
export async function generateReport(input: ReportInput): Promise<Blob> {
  return pdfMake.createPdf(reportDocument(input, await reportPhotos(input))).getBlob();
}
