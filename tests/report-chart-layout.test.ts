import { expect, it } from 'vitest';
import { reportChartHeight } from '../src/reports/chartLayout';
import { reportPageArea } from '../src/reports/paper';
import { recordTable } from '../src/reports/recordTable';
import type { ContentTable } from 'pdfmake/interfaces';

it('uses the chosen physical paper for both chart and shot-table bounds', () => {
  for (const paper of ['A4', 'LETTER'] as const) {
    const table = recordTable(
      [
        { id: 'shot', label: 'Shot' },
        { id: 'velocity', label: 'Velocity' },
      ],
      [['1', '300.0']],
      new Set(),
      paper,
    ) as ContentTable;
    const widths = table.table.widths as number[];
    expect(widths.reduce((sum, width) => sum + width, 0) + 16).toBeCloseTo(
      reportPageArea(paper).width,
    );
  }
  expect(reportChartHeight([{ label: 'Test' }], [], false, 'LETTER')).toBeGreaterThan(
    reportChartHeight([{ label: 'Test' }], [], false, 'A4'),
  );
});

it('uses the page height while reserving room for wrapped notes and a first-page introduction', () => {
  const legend = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((label) => ({ label }));
  const notes = [
    'Velocity detail: Individual recorded shot traces, colored by string. No averaging.',
  ];
  const height = reportChartHeight(legend, notes, false);
  expect(height).toBeGreaterThan(400);
  expect(height).toBeLessThan(440);
  expect(reportChartHeight(legend, notes, true)).toBe(height - 92);
  expect(reportChartHeight(legend, ['Long model explanation. '.repeat(35)], false)).toBeLessThan(
    height,
  );
  expect(
    reportChartHeight(
      Array.from({ length: 30 }, () => ({ label: 'A long string name' })),
      notes,
      false,
    ),
  ).toBeLessThan(height);
});
