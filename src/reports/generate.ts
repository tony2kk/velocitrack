import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import { db } from '../storage/database';
import { reportDocument } from './content';
import type { ReportInput } from './types';
import { targetFigureLayout, drawTargetFigure } from './targetFigure';

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
      const figure = targetFigureLayout(
        image.naturalWidth,
        image.naturalHeight,
        measurement,
        input.profile.unitSystem,
      );
      const scale = 1600 / Math.max(figure.width, figure.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(figure.width * scale);
      canvas.height = Math.ceil(figure.height * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Target rendering is unavailable in this browser.');
      context.scale(scale, scale);
      drawTargetFigure(context, image, figure);
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
