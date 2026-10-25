import { expect, it } from 'vitest';
import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { reportDocument } from '../src/reports/content';
import { defaultProfile } from '../src/domain/model';
import type { ReportInput } from '../src/reports/types';
import { series, shot } from './fixtures/synthetic';

/** Invented comparison with weather, notes and custom values, sized to exercise the overview break. */
function overviewFixture(count: number): ReportInput {
  const parents = Array.from({ length: count }, (_, index) =>
    series({
      id: `series-${index}`,
      name: `Comparison ${index + 1} / 2026-01-01 / morning`,
      raw: {
        location: 'Invented outdoor range',
        notes: `Context ${index + 1}`,
        altitude: 900,
        firearm: { name: 'Example firearm' },
        projectile: { name: 'Example projectile', weight: 10, weightUnit: 1 },
        weatherData: {
          temperature: 60,
          pressure: 1015,
          humidity: 42,
          weatherDescription: 'Cloudy',
        },
      },
    }),
  );
  return {
    profile: {
      ...defaultProfile(),
      unitSystem: 'metric',
      report: { details: true, statistics: true, target: false, chart: false, records: false },
    },
    series: parents,
    shots: parents.flatMap((parent, index) => [
      shot({ id: `a-${index}`, seriesId: parent.id, muzzleVelocity: 1000 + index }),
      shot({ id: `b-${index}`, seriesId: parent.id, muzzleVelocity: 1010 + index }),
    ]),
    annotations: parents.map((parent) => ({
      entityId: parent.id,
      notes: '',
      fields: {},
      values: { location: 'Lane A', category: 'Practice' },
    })),
    fields: [
      { id: 'location', name: 'Lane', type: 'short-text', order: 0 },
      { id: 'category', name: 'Session', type: 'short-text', order: 1 },
    ],
    catalog: [],
    tags: [],
    attachments: [],
    createdAt: '2026-01-01T12:00:00Z',
    version: 'test',
    revision: 'synthetic',
  };
}

it.each(['A4', 'LETTER'] as const)(
  'keeps comparison groups on dedicated %s pages without partial trailing blocks',
  async (paper) => {
    pdfMake.addVirtualFileSystem(fonts);
    for (const count of [2, 3, 5, 7, 11]) {
      const input = overviewFixture(count);
      input.profile.reportPaperSize = paper;
      const document = reportDocument(input);
      expect(document.pageOrientation).toBe(count > 3 ? 'landscape' : 'portrait');
      const bytes = await pdfMake.createPdf(document).getBuffer();
      const pageCount = (bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
      expect(pageCount).toBe(count > 3 ? Math.ceil(count / 5) : 1);
      if (process.env.VELOCI_REPORT_SAMPLE === '1') {
        mkdirSync('.local', { recursive: true });
        writeFileSync(`.local/overview-${paper}-${count}.pdf`, bytes);
      }
    }
  },
  30000,
);

it('returns to portrait targets and preserves repeated headings for long overview content', () => {
  const input = overviewFixture(7);
  input.profile.report!.target = true;
  const content = reportDocument(input, new Map([['series-0', 'synthetic-image']]))
    .content as unknown as Record<string, unknown>[];
  expect(content.find((item) => item.text === 'Targets')).toMatchObject({
    pageOrientation: 'portrait',
    pageBreak: 'before',
  });
  const tables = content.filter((item) => item.table);
  expect(tables[1]).toMatchObject({
    pageBreak: 'before',
    table: { headerRows: 1, keepWithHeaderRows: 1 },
  });
  expect(tables.every((item) => !item.unbreakable)).toBe(true);
});
