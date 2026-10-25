import type { Profile } from '../domain/model';
import { reportPageArea } from './paper';
/** Snapshot width in pixels; its height follows the available paper area rather than screen height. */
export const REPORT_CHART_PIXELS = 1400;

/** Conservative line count for the bundled proportional font, including explicit newlines. */
function textLines(text: string, fontSize: number, availableWidth: number): number {
  const width = (word: string) =>
    [...word].reduce(
      (sum, char) =>
        sum + (/[ilI.,' :;!|]/.test(char) ? 0.28 : /[MW@%■]/.test(char) ? 0.9 : 0.56) * fontSize,
      0,
    );
  return text.split('\n').reduce((total, paragraph) => {
    let lines = 1;
    let used = 0;
    for (const word of paragraph.split(/\s+/)) {
      const length = width(word);
      if (used && used + length > availableWidth) {
        lines++;
        used = 0;
      }
      lines += Math.max(0, Math.ceil(length / availableWidth) - 1);
      used += (length % availableWidth) + fontSize * 0.28;
    }
    return total + lines;
  }, 0);
}

/** Fit the plot to its landscape page while reserving readable legend, model notes and footer space. */
export function reportChartHeight(
  legend: { label: string }[],
  descriptions: string[],
  firstPage: boolean,
  paperSize: Profile['reportPaperSize'] = 'A4',
): number {
  const page = reportPageArea(paperSize);
  const headingAndImageMargins = 39 + 14;
  const legendHeight =
    textLines(legend.map((item) => `■ ${item.label}     `).join(''), 9, page.width) * 12.6 + 12;
  const notesHeight = descriptions.reduce(
    (sum, text) => sum + textLines(text, 8.5, page.width) * 12 + 5,
    0,
  );
  // A chart-only report shares its first page with the compact report identity block.
  const introduction = firstPage ? 92 : 0;
  // Long notes may continue on another page; never compress the actual plot below readability.
  return Math.max(
    160,
    Math.floor(
      page.height - headingAndImageMargins - legendHeight - notesHeight - introduction - 8,
    ),
  );
}
