import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import { defaultReportSettings, type Series, type Shot } from '../domain/model';
import { availableQuantities } from '../domain/analysis';
import { fieldDisplay, fieldUnit } from '../domain/customFields';
import { inspectPoints, summarizeShots } from '../domain/measurements';
import { providerTimestamp, rawPath } from '../domain/providerData';
import { projectileName } from '../domain/projectiles';
import { tableColumns, visibleColumns } from '../domain/table';
import { TARGET_FIELDS, TARGET_LABELS, targetText, targetUnit } from '../domain/targetMeasurement';
import { displayValue, formatValue, unitLabels } from '../domain/units';
import type { ReportInput } from './types';
import { safeFilename } from './filename';

/** Stable, filesystem-safe suggestion; the save dialog may replace it without changing the report. */
export function reportFilename(input: Pick<ReportInput, 'series' | 'createdAt'>): string {
  const date =
    input.series
      .map((item) => item.startedAt)
      .filter((date): date is string => !!date)
      .sort()[0] ?? input.createdAt;
  const label =
    input.series.length === 1 ? input.series[0]!.name : `${input.series.length}-strings`;
  const safe =
    safeFilename(label)
      .replace(/\s+/g, '-')
      .replace(/[. -]+$/g, '')
      .slice(0, 80) || 'report';
  return `VelociTrack_${date.slice(0, 10)}_${safe}.pdf`;
}

/** Human-readable local time with an explicit zone for archival use. */
function time(value: unknown): string {
  const timestamp = providerTimestamp(value);
  return timestamp === null
    ? 'Not recorded'
    : new Date(timestamp).toLocaleString('en-GB', { timeZoneName: 'short' });
}

/** Curated string context; arbitrary provider objects, account IDs and technical enum codes are excluded. */
export function reportDetails(input: ReportInput, series: Series): [string, string][] {
  const units = input.profile.unitSystem;
  const annotation = input.annotations.find((item) => item.entityId === series.id);
  const names = new Map(input.catalog.map((item) => [item.id, item.name]));
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '');
  const quantities = availableQuantities(
    [{ seriesId: series.id }],
    [series],
    input.fields,
    input.annotations,
    units,
    true,
  );
  const fields: [string, string][] = [
    ['Date', time(series.startedAt)],
    ['Location', text(rawPath(series.raw, 'weatherData.cityName')) || text(series.raw.location)],
    ['Firearm', names.get(series.firearmId) ?? text(rawPath(series.raw, 'firearm.name'))],
    ['Projectile', projectileName(series, names, true)],
    ['Weather', text(rawPath(series.raw, 'weatherData.weatherDescription'))],
  ];
  for (const id of [
    'source:weatherData.temperature',
    'source:weatherData.humidity',
    'source:weatherData.pressure',
    'source:altitude',
  ]) {
    const q = quantities.find((item) => item.id === id);
    const value = q?.read({ seriesId: series.id });
    if (q && value !== null && value !== undefined)
      fields.push([
        id.endsWith('pressure') ? 'Pressure (sea level)' : q.label,
        `${formatValue(value, 2)}${id.endsWith('pressure') ? ' hPa' : ''}`,
      ]);
  }
  fields.push(['Notes', text(series.raw.notes)], ['Local notes', annotation?.notes ?? '']);
  fields.push([
    'Tags',
    input.tags
      .filter((tag) => annotation?.tagIds?.includes(tag.id))
      .map((tag) => tag.name)
      .join(', '),
  ]);
  for (const field of input.fields) {
    const value = fieldDisplay(annotation?.values?.[field.id], field.type, units);
    if (value)
      fields.push([
        field.name + (fieldUnit(field.type, units) ? ` (${fieldUnit(field.type, units)})` : ''),
        value,
      ]);
  }
  return fields.filter(([, value]) => value !== '');
}

/** Render visible shot columns using the same quantity readers, units and custom values as the table. */
export function reportRecords(input: ReportInput) {
  const units = input.profile.unitSystem;
  const quantities = availableQuantities(
    input.shots,
    input.series,
    input.fields,
    input.annotations,
    units,
    true,
  );
  const definitions = tableColumns(input.fields, quantities, units);
  const columns = visibleColumns(input.profile).flatMap((id) =>
    definitions.filter((column) => column.id === id),
  );
  const names = new Map(input.catalog.map((item) => [item.id, item.name]));
  /** No UI controls or hidden raw fields are serialized into PDF cells. */
  function cell(shot: Shot, id: string): string {
    const parent = input.series.find((item) => item.id === shot.seriesId);
    const annotation = input.annotations.find((item) => item.entityId === shot.seriesId);
    const field = input.fields.find((item) => `field:${item.id}` === id);
    if (field) return fieldDisplay(annotation?.values?.[field.id], field.type, units) || '—';
    switch (id) {
      case 'series':
        return parent?.name ?? '—';
      case 'shot':
        return String(shot.number);
      case 'points':
        return String(inspectPoints(shot).points.length);
      case 'status':
        return 'Included';
      case 'rawUnit':
        return shot.rawUnit;
      case 'timestamp':
        return time(shot.raw.timestamp);
      case 'shotNotes':
        return typeof shot.raw.notes === 'string' ? shot.raw.notes : '—';
      case 'seriesNotes':
        return typeof parent?.raw.notes === 'string' ? parent.raw.notes : '—';
      case 'firearm':
        return parent ? (names.get(parent.firearmId) ?? '—') : '—';
      case 'projectile':
        return parent
          ? projectileName(parent, names, input.profile.showProjectileWeight ?? false)
          : '—';
      case 'tags':
        return (
          input.tags
            .filter((tag) => annotation?.tagIds?.includes(tag.id))
            .map((tag) => tag.name)
            .join(', ') || '—'
        );
      default:
        return formatValue(quantities.find((q) => q.id === id)?.read(shot) ?? null);
    }
  }
  return {
    columns,
    rows: input.shots.map((shot) => columns.map((column) => cell(shot, column.id))),
  };
}

/** Six recorded-only statistics; unavailable values are explicit and source mixing remains guarded. */
function statistics(shots: Shot[], input: ReportInput): Content {
  const summary = summarizeShots(shots);
  const units = input.profile.unitSystem;
  const values = [
    ['Included shots', summary.count],
    ['Mean velocity', summary.mean],
    ['Min velocity', summary.minimum],
    ['Max velocity', summary.maximum],
    ['Sample SD', summary.sd],
    ['Extreme spread', summary.spread],
  ] as const;
  return {
    table: {
      widths: ['*', '*', '*'],
      body: [0, 3].map((start) =>
        values.slice(start, start + 3).map(([label, value]) => ({
          stack: [
            { text: label, style: 'small' },
            {
              text: formatValue(
                label === 'Included shots' ? value : displayValue(value, 'velocity', units),
                2,
              ),
              fontSize: 17,
              bold: true,
              margin: [0, 4, 0, 2],
            },
            {
              text:
                label === 'Included shots' ? 'Valid muzzle readings' : unitLabels[units].velocity,
              style: 'small',
            },
          ],
          margin: [8, 8, 8, 8],
          fillColor: '#f2f7f4',
        })),
      ),
    },
    layout: 'noBorders',
    margin: [0, 8, 0, 14],
  };
}

/** Paginated A4 document with selectable text, repeated table headings and deliberate landscape sections. */
export function reportDocument(
  input: ReportInput,
  photos: ReadonlyMap<string, string> = new Map(),
): TDocumentDefinitions {
  const options = { ...defaultReportSettings(), ...input.profile.report };
  const detailsEnabled = options.details || options.target || options.statistics;
  const records = options.records ? reportRecords(input) : undefined;
  const content: Content[] = [
    { text: 'VELOCITRACK', color: '#08796e', bold: true, characterSpacing: 2, fontSize: 11 },
    { text: 'Range report', style: 'title' },
    {
      text: `${input.series.length} string${input.series.length === 1 ? '' : 's'} · ${input.shots.length} included shot${input.shots.length === 1 ? '' : 's'}${input.profile.nickname ? ` · ${input.profile.nickname}` : ''}`,
      style: 'small',
      margin: [0, 0, 0, 16],
    },
  ];
  for (const [index, series] of input.series.entries()) {
    if (!detailsEnabled) break;
    content.push({
      text: series.name,
      style: 'heading',
      ...(index > 0 ? { pageBreak: 'before' as const } : {}),
    });
    if (options.details)
      content.push({
        table: {
          widths: [125, '*'],
          body: reportDetails(input, series).map(([label, value]) => [
            { text: label, color: '#61716b' },
            { text: value },
          ]),
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12],
      });
    if (options.statistics)
      content.push(
        statistics(
          input.shots.filter((shot) => shot.seriesId === series.id),
          input,
        ),
      );
    if (options.target) {
      const target = input.annotations.find((item) => item.entityId === series.id)?.target;
      const photo =
        input.attachments.find(
          (item) => item.id === target?.photoId && item.seriesId === series.id,
        ) ?? input.attachments.find((item) => item.seriesId === series.id);
      const image = photos.get(series.id);
      // Keep the label with the image when a long string description pushes it to the next page.
      content.push({
        unbreakable: true,
        stack: [
          { text: 'Target', style: 'section' },
          image
            ? { image, fit: [260, 260], alignment: 'center', margin: [0, 6, 0, 8] }
            : { text: 'No target photo attached.', style: 'small', margin: [0, 6, 0, 8] },
        ],
      });
      if (photo && image)
        content.push({ text: photo.caption || photo.name, style: 'small', alignment: 'center' });
      if (target)
        content.push({
          text: TARGET_FIELDS.filter((key) => target.values[key] !== null)
            .map(
              (key) =>
                `${TARGET_LABELS[key]}: ${targetText(target.values[key], input.profile.unitSystem)} ${targetUnit(input.profile.unitSystem).label}`,
            )
            .join('   ·   '),
          fontSize: 10,
          margin: [0, 8, 0, 8],
        });
    }
  }
  if (options.chart) {
    content.push({
      text: 'Analysis chart',
      style: 'heading',
      pageOrientation: 'landscape',
      ...(detailsEnabled ? { pageBreak: 'before' as const } : {}),
    });
    if (input.chart) {
      content.push({ image: input.chart.image, width: 750, margin: [0, 6, 0, 8] });
      content.push({
        text: input.chart.legend.flatMap((item) => [
          { text: '■ ', color: item.color },
          { text: item.label + '     ' },
        ]),
        fontSize: 9,
        margin: [0, 0, 0, 12],
      });
      content.push(
        ...input.chart.descriptions.map((text): Content => ({
          text,
          style: 'small',
          margin: [0, 0, 0, 5],
        })),
      );
    } else
      content.push({
        text: 'No chart is displayed in the current workspace view.',
        style: 'small',
      });
  }
  if (records) {
    // Keep wide tables readable without shrinking type: repeat row identity across column bands.
    const bands = Array.from({ length: Math.ceil(records.columns.length / 8) }, (_, i) =>
      records.columns.slice(i * 8, i * 8 + 8),
    );
    for (const [bandIndex, band] of bands.entries()) {
      const wide = records.columns.length > 5;
      const indexes = band.map((column) => records.columns.indexOf(column));
      const identity = bands.length > 1;
      const compactWidths: Record<string, number> = {
        shot: 28,
        velocity: 62,
        g1: 38,
        g7: 38,
        points: 32,
        rawUnit: 40,
        status: 48,
      };
      const hasFlexibleColumn = band.some((column) => !compactWidths[column.id]);
      const headings: TableCell[] = [
        ...(identity ? [{ text: 'Row', bold: true }] : []),
        ...band.map((column) => ({
          text: `${column.heading ?? column.label}${column.unit ? '\n' + column.unit : ''}`,
          bold: true,
        })),
      ];
      content.push({
        text:
          'Shot records' + (bands.length > 1 ? ` · Columns ${bandIndex + 1}/${bands.length}` : ''),
        style: 'heading',
        pageOrientation: wide ? 'landscape' : 'portrait',
        ...(detailsEnabled || options.chart || bandIndex > 0
          ? { pageBreak: 'before' as const }
          : {}),
      });
      content.push({
        text: 'Selected valid shots in workspace table order. All rows are included; screen pagination does not apply.',
        style: 'small',
        margin: [0, 0, 0, 10],
      });
      content.push({
        table: {
          headerRows: 1,
          widths: [
            ...(identity ? [25] : []),
            ...band.map((column) => (hasFlexibleColumn ? (compactWidths[column.id] ?? '*') : '*')),
          ],
          body: [
            headings,
            ...records.rows.map((row, index) => [
              ...(identity ? [String(index + 1)] : []),
              ...indexes.map((i) => row[i]!),
            ]),
          ],
        },
        layout: {
          fillColor: (row) => (row === 0 ? '#e1eee7' : row % 2 === 0 ? '#f5f8f6' : null),
          hLineWidth: () => 0.4,
          vLineWidth: () => 0,
          hLineColor: () => '#dbe5df',
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        fontSize: 9,
        lineHeight: 1.05,
      });
    }
    if (!records.columns.length)
      content.push({ text: 'No shot-record columns are selected.', style: 'small' });
  }
  if (!Object.values(options).some(Boolean))
    content.push({
      text: 'All report sections are disabled. Enable sections in Profile → Report.',
      style: 'small',
    });
  return {
    pageSize: 'A4',
    pageOrientation:
      !detailsEnabled && (options.chart || (records?.columns.length ?? 0) > 5)
        ? 'landscape'
        : 'portrait',
    pageMargins: [42, 38, 42, 44],
    info: {
      title: 'VelociTrack range report',
      author: input.profile.nickname || 'VelociTrack',
      subject: 'Recorded measurements and current analysis',
      creator: `VelociTrack ${input.version} (${input.revision})`,
    },
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.15, color: '#263e35' },
    styles: {
      title: { fontSize: 26, bold: true, margin: [0, 8, 0, 6] },
      heading: { fontSize: 18, bold: true, margin: [0, 0, 0, 14] },
      section: { fontSize: 13, bold: true, margin: [0, 8, 0, 4] },
      small: { fontSize: 8.5, color: '#61716b' },
    },
    footer: (page, total) => ({
      columns: [
        {
          text: `VelociTrack ${input.version} · ${input.revision}\nGenerated ${time(input.createdAt)}`,
          style: 'small',
        },
        { text: `${page} / ${total}`, alignment: 'right', style: 'small', width: 45 },
      ],
      margin: [42, 8, 42, 0],
    }),
    content,
  };
}
