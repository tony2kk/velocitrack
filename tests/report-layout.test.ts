import { describe, expect, it } from 'vitest';
import type { ContentTable } from 'pdfmake/interfaces';
import { recordTable } from '../src/reports/recordTable';
import { targetFigureLayout, drawTargetFigure } from '../src/reports/targetFigure';
import { emptyTarget, type TargetMeasurement } from '../src/domain/targetMeasurement';
import { defaultProfile } from '../src/domain/model';
import { reportDocument } from '../src/reports/content';
import { series, shot } from './fixtures/synthetic';
import { writeFileSync } from 'node:fs';
import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';

/** Synthetic off-center geometry on a high-contrast target; no real measurement is reused. */
const target: TargetMeasurement = {
  ...emptyTarget(),
  photoId: 'invented',
  mmPerPixel: 0.1,
  values: { horizontalOffset: -15, verticalOffset: -15, groupSize: 28 },
  geometry: {
    width: 1000,
    height: 800,
    center: { x: 500, y: 400 },
    poa: { x: 650, y: 250 },
    radius: 140,
  },
  reportCrop: { x: 200, y: 100, size: 600, width: 1000, height: 800 },
};

describe('print readability', () => {
  it('keeps target callouts outside the photo and each other, including small/edge crops', () => {
    const before = structuredClone(target);
    for (const crop of [target.reportCrop, { x: 0, y: 0, size: 20, width: 1000, height: 800 }]) {
      const figure = targetFigureLayout(1000, 800, { ...target, reportCrop: crop }, 'metric');
      expect(figure.dimensions.map((d) => d.key).sort()).toEqual(['G', 'H', 'V']);
      for (const [index, item] of figure.dimensions.entries()) {
        expect(item.label.x).toBeGreaterThan(figure.photo.x + figure.photo.width);
        expect(item.label.x + item.label.width).toBeLessThanOrEqual(figure.width);
        expect(item.label.y).toBeGreaterThanOrEqual(0);
        expect(item.label.y + item.label.height).toBeLessThanOrEqual(figure.height);
        if (index)
          expect(item.label.y).toBeGreaterThan(
            figure.dimensions[index - 1]!.label.y + item.label.height,
          );
      }
    }
    expect(
      targetFigureLayout(1000, 800, target, 'metric').dimensions.find((d) => d.key === 'G')!.value,
    ).toBe('2.80 cm');
    expect(target).toEqual(before);
    expect(targetFigureLayout(1000, 800, undefined, 'imperial').dimensions).toHaveLength(0);
  });
  it('fits 14 columns into one landscape table and prevents row splitting', () => {
    const columns = Array.from({ length: 14 }, (_, i) => ({
      id: `field-${i}`,
      label: `Field ${i}`,
    }));
    const rows = Array.from({ length: 40 }, (_, row) => columns.map((_, i) => `${row}-${i}`));
    const result = recordTable(columns, rows) as ContentTable;
    expect(result.table.body).toHaveLength(41);
    expect(result.table.body.every((row) => row.length === 14)).toBe(true);
    expect(result.table.dontBreakRows).toBe(true);
    expect(result.table.headerRows).toBe(1);
    expect((result.table.widths as number[]).reduce((sum, n) => sum + n, 0) + 14 * 4).toBeCloseTo(
      757.89,
    );
  });
  it('reports oversized text before PDF generation can silently lose an indivisible row', () => {
    expect(() =>
      recordTable([{ id: 'note', label: 'Note' }], [['long note '.repeat(5000)]]),
    ).toThrow('Hide long note columns');
  });
  it.skipIf(!process.env.VELOCI_CANVAS_MODULE)(
    'optionally renders an end-to-end synthetic layout for visual review',
    async () => {
      if (!process.env.VELOCI_CANVAS_MODULE) return;
      const { createCanvas, loadImage, GlobalFonts } = await import(
        /* @vite-ignore */ process.env.VELOCI_CANVAS_MODULE
      );
      GlobalFonts.registerFromPath('node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf', 'Arial');
      GlobalFonts.registerFromPath('node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf', 'Arial');
      const figure = targetFigureLayout(1000, 800, target, 'metric');
      const canvas = createCanvas(figure.width * 4, figure.height * 4);
      const ctx = canvas.getContext('2d');
      ctx.scale(4, 4);
      drawTargetFigure(ctx, await loadImage('.local/report-target.png'), figure);
      writeFileSync('.local/target-contrast-preview.png', canvas.toBuffer('image/png'));
      const input = {
        profile: {
          ...defaultProfile(),
          unitSystem: 'metric' as const,
          tableColumns: [
            'series',
            'shot',
            'velocity',
            'g1',
            'g7',
            'points',
            'status',
            'shotNotes',
            'target:groupSize',
            'target:horizontalOffset',
            'target:verticalOffset',
          ],
        },
        series: [series()],
        shots: Array.from({ length: 55 }, (_, index) =>
          shot({
            id: `sample-${index}`,
            number: index + 1,
            muzzleVelocity: 1000.12345 + index,
            ballisticCoefficientG1: 0.2,
            ballisticCoefficientG7: 0.15,
            raw: { notes: `RECORD-${index + 1}-END` },
          }),
        ),
        catalog: [],
        annotations: [{ entityId: 'series', notes: '', fields: {}, target }],
        fields: [],
        tags: [],
        attachments: [],
        createdAt: '2026-10-21T12:00:00Z',
        version: 'test',
        revision: 'synthetic',
      };
      pdfMake.addVirtualFileSystem(fonts);
      const bytes = await pdfMake
        .createPdf(reportDocument(input, new Map([['series', canvas.toDataURL('image/jpeg')]])))
        .getBuffer();
      writeFileSync('.local/readability-preview.pdf', bytes);
      expect(bytes.length).toBeGreaterThan(30_000);
    },
    30_000,
  );
});
