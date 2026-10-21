import type { Content, TableCell } from 'pdfmake/interfaces';
import type { TableColumn } from '../domain/table';

/** An actionable layout limit is safer than silently clipping or dropping an oversized shot row. */
export class ReportLayoutError extends Error {}

/** Fit every visible column across one landscape sheet; only whole shot rows may continue to another. */
export function recordTable(columns: TableColumn[], rows: string[][]): Content {
  const availableWidth = 841.89 - 84; // Landscape A4, less the report's two 42 pt margins.
  const padding = columns.length > 12 ? 2 : 4;
  const usableWidth = availableWidth - padding * 2 * columns.length;
  const desired = columns.map((column, index) => {
    const longest = rows.reduce(
      (length, row) => Math.max(length, row[index]!.length),
      (column.heading ?? column.label).length,
    );
    return Math.max(28, Math.min(200, longest * 4.5));
  });
  const total = desired.reduce((sum, value) => sum + value, 0);
  const factor = Math.min(1, usableWidth / total);
  const fontSize = factor > 0.85 ? 9 : factor > 0.65 ? 8 : 7;
  const widths = desired.map((value) => (value * usableWidth) / total);
  if (widths.some((width) => width < 12))
    throw new ReportLayoutError(
      'Too many columns to fit across a landscape page. Hide some columns before generating the report.',
    );
  for (const row of rows) {
    const lines = Math.max(
      ...row.map((text, index) =>
        text
          .split('\n')
          .reduce(
            (count, line) =>
              count + Math.max(1, Math.ceil((line.length * fontSize * 0.65) / widths[index]!)),
            0,
          ),
      ),
    );
    if (lines * fontSize * 1.05 > 400)
      throw new ReportLayoutError(
        'A shot record contains more text than one landscape page can hold. Hide long note columns before generating the report; string notes can remain in String details.',
      );
  }
  const headings: TableCell[] = columns.map((column) => ({
    text: `${column.heading ?? column.label}${column.unit ? '\n' + column.unit : ''}`,
    bold: true,
  }));
  return {
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      widths,
      body: [headings, ...rows],
    },
    layout: {
      fillColor: (row) => (row === 0 ? '#e1eee7' : row % 2 === 0 ? '#f5f8f6' : null),
      hLineWidth: () => 0.4,
      vLineWidth: () => 0,
      hLineColor: () => '#dbe5df',
      paddingLeft: () => padding,
      paddingRight: () => padding,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    fontSize,
    lineHeight: 1.05,
  };
}
