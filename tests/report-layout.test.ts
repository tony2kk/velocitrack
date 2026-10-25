import { describe, expect, it } from 'vitest';
import type { ContentTable } from 'pdfmake/interfaces';
import { recordTable } from '../src/reports/recordTable';
import { targetFigureLayout, drawTargetFigure } from '../src/reports/targetFigure';
import { emptyTarget, type TargetMeasurement } from '../src/domain/targetMeasurement';
import { defaultProfile } from '../src/domain/model';
import { reportDocument } from '../src/reports/content';
import type { ReportInput } from '../src/reports/types';
import { series, shot } from './fixtures/synthetic';
import { writeFileSync } from 'node:fs';
import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import { reportChartHeight } from '../src/reports/chartLayout';
import { reportPageArea } from '../src/reports/paper';

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
  it('draws stronger group boundaries without splitting rows or changing ordinary separators', () => {
    const table = recordTable(
      [{ id: 'shot', label: 'Shot' }],
      [['1'], ['2'], ['1']],
      new Set([2]),
    ) as ContentTable;
    const layout = table.layout as {
      hLineWidth: (index: number) => number;
      hLineColor: (index: number) => string;
    };
    expect(layout.hLineWidth(3)).toBeGreaterThan(layout.hLineWidth(2));
    expect(layout.hLineColor(3)).not.toBe(layout.hLineColor(2));
    expect(table.table.dontBreakRows).toBe(true);
    expect(table.table.body).toHaveLength(4);
  });
  it('places an accurate cm/in ruler beneath the image, capped at 30% of its width', () => {
    for (const units of ['metric', 'imperial'] as const) {
      const figure = targetFigureLayout(1000, 800, target, units);
      expect(figure.ruler!.y).toBeGreaterThan(figure.photo.y + figure.photo.height);
      expect(figure.ruler!.pixels).toBeLessThanOrEqual(figure.photo.width * 0.3);
      expect(figure.ruler!.y + 17).toBeLessThan(figure.height);
      const length = parseFloat(figure.ruler!.label) * (units === 'metric' ? 10 : 25.4);
      expect(
        (figure.ruler!.pixels / (figure.photo.width / figure.source.width)) * target.mmPerPixel!,
      ).toBeCloseTo(length);
    }
    expect(targetFigureLayout(1000, 800, undefined, 'metric').ruler).toBeUndefined();
  });
  it('keeps target callouts outside the photo and each other, including small/edge crops', () => {
    const before = structuredClone(target);
    for (const crop of [target.reportCrop, { x: 0, y: 0, size: 20, width: 1000, height: 800 }]) {
      const figure = targetFigureLayout(1000, 800, { ...target, reportCrop: crop }, 'metric');
      expect(figure.dimensions.map((d) => d.key).sort()).toEqual(['G', 'H', 'V']);
      for (const [index, item] of figure.dimensions.entries()) {
        expect(item.label.x + item.label.width).toBeLessThan(figure.photo.x);
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
  it('routes negative H labels left and nonnegative H labels right with a diagonal departure', () => {
    for (const horizontalOffset of [-15, 0, 15]) {
      const figure = targetFigureLayout(
        1000,
        800,
        { ...target, values: { ...target.values, horizontalOffset } },
        'metric',
      );
      expect(figure.labelSide).toBe(horizontalOffset < 0 ? 'left' : 'right');
      for (const item of figure.dimensions) {
        if (horizontalOffset < 0)
          expect(item.label.x + item.label.width).toBeLessThan(figure.photo.x);
        else expect(item.label.x).toBeGreaterThan(figure.photo.x + figure.photo.width);
        expect(item.leader[1]!.x).not.toBe(item.leader[0]!.x);
        expect(item.leader[1]!.y).not.toBe(item.leader[0]!.y);
      }
    }
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
      const canvasImage = await loadImage('.local/report-target.png');
      drawTargetFigure(ctx, canvasImage, figure);
      writeFileSync('.local/target-contrast-preview.png', canvas.toBuffer('image/png'));
      const input: ReportInput = {
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
      const multi = structuredClone(input);
      multi.series = ['Alpha', 'Beta', 'Gamma'].map((name, index) =>
        series({
          id: `series-${index}`,
          name: `Synthetic ${name}`,
          raw: {
            location: 'Invented range',
            notes: `${name} context`,
            altitude: 800,
            weatherData: {
              temperature: 63,
              pressure: 1018,
              humidity: 45,
              cityName: 'Example location',
              weatherDescription: 'Cloudy',
            },
            nestedExample: { precise: 1.23456789, retained: true },
          },
        }),
      );
      multi.shots = input.shots
        .map((item, index) => ({
          ...item,
          seriesId: multi.series[index % 3]!.id,
        }))
        .sort((a, b) => a.seriesId.localeCompare(b.seriesId) || a.number - b.number);
      const photos = new Map<string, string>();
      multi.annotations = multi.series.map((item, index) => {
        const measurement = structuredClone(target);
        measurement.photoId = `photo-${index}`;
        if (index === 1) {
          measurement.values.horizontalOffset = 15;
          measurement.geometry!.poa!.x = 350;
        }
        const layout = targetFigureLayout(1000, 800, measurement, 'metric');
        const targetCanvas = createCanvas(layout.width * 4, layout.height * 4);
        const targetContext = targetCanvas.getContext('2d');
        targetContext.scale(4, 4);
        drawTargetFigure(targetContext, canvasImage, layout);
        photos.set(item.id, targetCanvas.toDataURL('image/jpeg'));
        return {
          entityId: item.id,
          notes: `${item.name} local note`,
          fields: {},
          target: measurement,
        };
      });
      multi.attachments = multi.series.map((item, index) => ({
        id: `photo-${index}`,
        seriesId: item.id,
        name: `Invented target ${index + 1}`,
        caption: '',
        mime: 'image/jpeg',
        size: 100,
        createdAt: multi.createdAt,
      }));
      const chartLegend = multi.series.map((item, index) => ({
        label: item.name,
        color: ['#2563eb', '#c26a00', '#9333ea'][index]!,
      }));
      const chartDescriptions = ['Invented layout fixture.'];
      const paperHeight = reportChartHeight(chartLegend, chartDescriptions, false);
      const chartCanvas = createCanvas(1400, (paperHeight * 1400) / reportPageArea().width);
      const chartContext = chartCanvas.getContext('2d');
      chartContext.fillStyle = 'white';
      chartContext.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
      chartContext.strokeStyle = '#08796e';
      chartContext.lineWidth = 3;
      chartContext.beginPath();
      chartContext.moveTo(40, 45);
      chartContext.lineTo(1320, chartCanvas.height - 65);
      chartContext.stroke();
      chartContext.fillStyle = '#263e35';
      chartContext.font = '16px Arial';
      chartContext.fillText('Synthetic chart for layout verification', 40, chartCanvas.height - 25);
      multi.chart = {
        image: chartCanvas.toDataURL('image/jpeg'),
        legend: chartLegend,
        descriptions: chartDescriptions,
      };
      for (const mode of ['simple', 'dual', 'compare', 'info'] as const) {
        const sample = structuredClone(multi);
        sample.profile.analysis!.mode = mode;
        if (mode === 'compare') {
          sample.series = sample.series.slice(0, 2);
          sample.shots = sample.shots.filter((item) =>
            sample.series.some((parent) => parent.id === item.seriesId),
          );
        }
        const pdf = await pdfMake.createPdf(reportDocument(sample, photos)).getBuffer();
        writeFileSync(`.local/multiple-${mode}.pdf`, pdf);
      }
    },
    30_000,
  );
});
