import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import { db } from '../storage/database';
import { reportDocument } from './content';
import type { ReportInput } from './types';
import { renderTargetPhoto } from './renderTarget';

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
    result.set(
      series.id,
      await renderTargetPhoto(
        record.blob,
        target?.photoId === photo.id ? target : undefined,
        input.profile.unitSystem,
      ),
    );
  }
  return result;
}

/** Build a self-contained local PDF; fonts are bundled so first generation also works offline. */
export async function generateReport(input: ReportInput): Promise<Blob> {
  return pdfMake.createPdf(reportDocument(input, await reportPhotos(input))).getBlob();
}
