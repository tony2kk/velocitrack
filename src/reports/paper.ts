import type { Profile } from '../domain/model';

/** Common page margins in PDF points: left, top, right, bottom. */
export const REPORT_MARGINS: [number, number, number, number] = [42, 38, 42, 44];

/** Landscape printable area; the footer stays inside the bottom margin on both paper sizes. */
export function reportPageArea(size: Profile['reportPaperSize'] = 'A4') {
  const width = size === 'LETTER' ? 792 : 841.89;
  const height = size === 'LETTER' ? 612 : 595.28;
  return {
    width: width - REPORT_MARGINS[0] - REPORT_MARGINS[2],
    height: height - REPORT_MARGINS[1] - REPORT_MARGINS[3],
  };
}
