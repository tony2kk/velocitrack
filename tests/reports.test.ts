import { describe, expect, it } from 'vitest';
import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { defaultProfile, defaultReportSettings } from '../src/domain/model';
import { emptyTarget, validTargetMeasurement } from '../src/domain/targetMeasurement';
import { constrainCrop, initialReportCrop, validReportCrop } from '../src/domain/reportCrop';
import {
  reportDetails,
  reportDocument,
  reportFilename,
  reportRecords,
} from '../src/reports/content';
import { summarizeShots } from '../src/domain/measurements';
import type { ReportInput } from '../src/reports/types';
import { series, shot } from './fixtures/synthetic';

/** Invented archive example, with Unicode notes and enough records to exercise pagination. */
export function reportFixture(): ReportInput {
  return {
    profile: { ...defaultProfile(), nickname: 'Synthetic tester', unitSystem: 'metric' },
    series: [
      series({
        name: 'Synthetic range · Žluťoučký test',
        raw: {
          location: 'Invented indoor range',
          notes: 'Příliš žluťoučký kůň. Synthetic notes only.',
          altitude: 600,
          weatherData: { temperature: 68, pressure: 1018, humidity: 40 },
          privateSourceField: 'NEVER_SERIALIZE_THIS',
        },
      }),
    ],
    shots: Array.from({ length: 65 }, (_, i) =>
      shot({
        id: `shot-${i}`,
        number: i + 1,
        muzzleVelocity: 1000 + i,
        rawUnit: '0',
        ballisticCoefficientG1: 0.15,
        ballisticCoefficientG7: 0.08,
        distances: [0, 20, 40],
        velocities: [1000 + i, 995 + i, 990 + i],
      }),
    ),
    catalog: [],
    annotations: [],
    fields: [],
    tags: [],
    attachments: [],
    createdAt: '2026-10-21T12:00:00Z',
    version: 'test',
    revision: 'synthetic',
  };
}

describe('local PDF composition', () => {
  it('enables every section by default and can produce a chart-only page without an empty cover', () => {
    expect(Object.values(defaultReportSettings())).toEqual([true, true, true, true, true]);
    const input = reportFixture();
    const all = JSON.stringify(reportDocument(input));
    for (const section of ['Target', 'Mean velocity', 'Analysis chart', 'Shot records'])
      expect(all).toContain(section);
    expect(all).not.toContain('NEVER_SERIALIZE_THIS');
    input.profile.report = {
      details: false,
      target: false,
      statistics: false,
      chart: true,
      records: false,
    };
    const chart = reportDocument(input);
    expect(chart.pageOrientation).toBe('landscape');
    expect(JSON.stringify(chart)).not.toContain('pageBreak');
    expect(JSON.stringify(chart)).not.toContain('Mean velocity');
  });
  it('uses current column order, selected rows and profile units without screen pagination', () => {
    const input = reportFixture();
    input.profile.tableColumns = ['g1', 'velocity', 'shot'];
    input.profile.tableColumnOrder = ['shot', 'velocity', 'g1'];
    const records = reportRecords(input);
    expect(records.columns.map((column) => column.id)).toEqual(['shot', 'velocity', 'g1']);
    expect(records.rows).toHaveLength(65);
    expect(records.rows[0]).toEqual(['1', '304.8', '0.15']);
    input.profile.unitSystem = 'imperial';
    expect(reportRecords(input).rows[0]).toEqual(['1', '1000', '0.15']);
    expect(reportDetails(input, input.series[0]!)).toContainEqual([
      'Pressure (sea level)',
      '1018 hPa',
    ]);
  });
  it('preserves readable Unicode names while removing unsafe filename characters', () => {
    const input = reportFixture();
    input.series[0]!.name = 'Žlutý / test: 1\u0000';
    expect(reportFilename(input)).toBe('VelociTrack_2026-01-01_Žlutý---test--1.pdf');
  });
  it('reports minimum and maximum of included valid readings', () => {
    expect(
      summarizeShots([
        shot({ muzzleVelocity: 20 }),
        shot({ muzzleVelocity: 30 }),
        shot({ excluded: true, muzzleVelocity: 1 }),
      ]),
    ).toMatchObject({ minimum: 20, maximum: 30 });
    expect(summarizeShots([])).toMatchObject({ minimum: null, maximum: null });
  });
  it('produces a real multipage PDF with embedded fonts and no remote resources', async () => {
    pdfMake.addVirtualFileSystem(fonts);
    pdfMake.setUrlAccessPolicy(() => false);
    const input = reportFixture();
    const photos = new Map<string, string>();
    if (process.env.VELOCI_REPORT_SAMPLE === '1' && existsSync('.local/report-target.png')) {
      photos.set(
        'series',
        'data:image/png;base64,' + readFileSync('.local/report-target.png').toString('base64'),
      );
    }
    const bytes = await pdfMake.createPdf(reportDocument(input, photos)).getBuffer();
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(20_000);
    if (process.env.VELOCI_REPORT_SAMPLE === '1') {
      mkdirSync('.local', { recursive: true });
      writeFileSync('.local/report-preview.pdf', bytes);
    }
  }, 30_000);
});

describe('independent report framing', () => {
  it('constrains crops to the original image and supports a crop without group calibration', () => {
    const crop = initialReportCrop(1200, 800, { x: 100, y: 100 }, 200);
    expect(crop).toMatchObject({ x: 0, y: 0, size: 320 });
    expect(validReportCrop(crop)).toBe(true);
    expect(constrainCrop({ ...crop, x: 2000, y: -20, size: 900 })).toMatchObject({
      x: 400,
      y: 0,
      size: 800,
    });
    expect(validTargetMeasurement({ ...emptyTarget(), photoId: 'photo', reportCrop: crop })).toBe(
      true,
    );
    expect(validTargetMeasurement({ ...emptyTarget(), reportCrop: crop })).toBe(false);
    for (const invalid of [{ size: -1 }, { x: 1200 }, { width: Infinity }, { height: 0 }])
      expect(validReportCrop({ ...crop, ...invalid })).toBe(false);
  });
});
