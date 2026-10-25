import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { defaultReportSettings, type Series, type Shot } from '../domain/model';
import { availableQuantities } from '../domain/analysis';
import { fieldText, fieldUnit } from '../domain/customFields';
import { inspectPoints, summarizeShots } from '../domain/measurements';
import { providerTimestamp, rawPath } from '../domain/providerData';
import { projectileName } from '../domain/projectiles';
import { tableColumns, visibleColumns, stringBoundaryRows } from '../domain/table';
import {
  TARGET_FIELDS,
  TARGET_LABELS,
  targetDisplay,
  targetUnit,
} from '../domain/targetMeasurement';
import { displayValue, formatQuantity, unitLabels } from '../domain/units';
import type { ReportInput } from './types';
import { safeFilename } from './filename';
import { recordTable } from './recordTable';
import { reportStringInfo } from './stringInfo';
import { REPORT_MARGINS, reportPageArea } from './paper';

/** Keep each horizontal comparison group on its own page, with enough width for readable values. */
function overview(input: ReportInput, details: boolean, stats: boolean): Content[] {
  const blocks: Content[] = [];
  // Five landscape columns have roughly the same readable width as three portrait columns.
  const columnsPerPage = input.series.length > 3 ? 5 : 3;
  for (let start = 0; start < input.series.length; start += columnsPerPage) {
    const strings = input.series.slice(start, start + columnsPerPage);
    const columns = strings.map((series) => {
      const values = details ? reportDetails(input, series) : [];
      if (stats) {
        const summary = summarizeShots(input.shots.filter((shot) => shot.seriesId === series.id));
        values.push(['Included shots', String(summary.count)]);
        for (const [label, value] of [
          ['Mean velocity', summary.mean],
          ['Min velocity', summary.minimum],
          ['Max velocity', summary.maximum],
          ['Sample SD', summary.sd],
          ['Extreme spread', summary.spread],
        ] as const)
          values.push([
            `${label} (${unitLabels[input.profile.unitSystem].velocity})`,
            formatQuantity(displayValue(value, 'velocity', input.profile.unitSystem), 'velocity'),
          ]);
      }
      return new Map(values);
    });
    const labels = [...new Set(columns.flatMap((column) => [...column.keys()]))];
    blocks.push({
      // Never start the next group in leftover space below the previous table.
      ...(start > 0 ? { pageBreak: 'before' as const } : {}),
      table: {
        headerRows: 1,
        keepWithHeaderRows: 1,
        // Very long notes/custom fields may still span pages; repeated headers preserve context.
        // Do not make the entire table unbreakable, which can lose content taller than a page.
        widths: [110, ...strings.map(() => '*' as const)],
        body: [
          [
            { text: 'String', bold: true },
            ...strings.map((series) => ({ text: series.name, bold: true })),
          ],
          ...labels.map((label) => [label, ...columns.map((column) => column.get(label) ?? '—')]),
        ],
      },
      layout: 'lightHorizontalLines',
      fontSize: 9,
      margin: [0, 0, 0, 18],
    });
  }
  return blocks;
}

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
        `${formatQuantity(value, q.id, q.unit)}${id.endsWith('pressure') ? ' hPa' : ''}`,
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
    const value = fieldText(annotation?.values?.[field.id], field.type, units, field.options);
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
    if (field)
      return fieldText(annotation?.values?.[field.id], field.type, units, field.options) || '—';
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
        return formatQuantity(
          quantities.find((q) => q.id === id)?.read(shot) ?? null,
          id,
          quantities.find((q) => q.id === id)?.unit,
        );
    }
  }
  return {
    columns,
    rows: input.shots.map((shot) => columns.map((column) => cell(shot, column.id))),
    stringStarts: stringBoundaryRows(input.shots, input.profile.tableSort),
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
              text: formatQuantity(
                label === 'Included shots' ? value : displayValue(value, 'velocity', units),
                label === 'Included shots' ? 'count' : 'velocity',
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

/** Paginated document with selectable text, repeated table headings and deliberate landscape sections. */
export function reportDocument(
  input: ReportInput,
  photos: ReadonlyMap<string, string> = new Map(),
): TDocumentDefinitions {
  const options = { ...defaultReportSettings(), ...input.profile.report };
  const detailsEnabled = options.details || options.statistics;
  const hasTargets = options.target && input.series.some((series) => photos.has(series.id));
  const infoMode = input.profile.analysis?.mode === 'info';
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
  if (detailsEnabled && input.series.length > 1)
    content.push(...overview(input, options.details, options.statistics));
  for (const series of input.series.length === 1 ? input.series : []) {
    if (!detailsEnabled) break;
    content.push({
      text: series.name,
      style: 'heading',
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
  }
  if (hasTargets) {
    content.push({
      text: 'Targets',
      style: 'heading',
      pageOrientation: 'portrait',
      ...(detailsEnabled ? { pageBreak: 'before' as const } : {}),
    });
    for (const series of input.series.filter((item) => photos.has(item.id))) {
      const target = input.annotations.find((item) => item.entityId === series.id)?.target;
      const photo =
        input.attachments.find(
          (item) => item.id === target?.photoId && item.seriesId === series.id,
        ) ?? input.attachments.find((item) => item.seriesId === series.id);
      const image = photos.get(series.id);
      const caption = target
        ? TARGET_FIELDS.filter((key) => target.values[key] !== null)
            .map(
              (key) =>
                `${TARGET_LABELS[key]}: ${targetDisplay(target.values[key], input.profile.unitSystem)} ${targetUnit(input.profile.unitSystem).label}`,
            )
            .join('   ·   ')
        : '';
      // Each named target stays with its image and dimensions; the overview no longer competes for space.
      content.push({
        unbreakable: true,
        stack: [
          { text: series.name, style: 'section' },
          image
            ? { image, fit: [390, 235], alignment: 'center', margin: [0, 6, 0, 8] }
            : { text: 'No target photo attached.', style: 'small', margin: [0, 6, 0, 8] },
          ...(photo && image
            ? [{ text: photo.caption || photo.name, style: 'small', alignment: 'center' as const }]
            : []),
          ...(caption
            ? [
                {
                  text: caption,
                  fontSize: 9,
                  alignment: 'center' as const,
                  margin: [0, 6, 0, 12] as [number, number, number, number],
                },
              ]
            : []),
        ],
      });
    }
  }
  if (options.chart) {
    content.push({
      text: infoMode ? 'String info' : 'Analysis chart',
      style: 'heading',
      pageOrientation: infoMode ? 'portrait' : 'landscape',
      ...(detailsEnabled || hasTargets ? { pageBreak: 'before' as const } : {}),
    });
    if (infoMode) content.push(...reportStringInfo(input));
    else if (input.chart) {
      content.push({
        image: input.chart.image,
        width: reportPageArea(input.profile.reportPaperSize).width,
        margin: [0, 6, 0, 8],
      });
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
    content.push({
      text: 'Shot records',
      style: 'heading',
      pageOrientation: 'landscape',
      ...(detailsEnabled || hasTargets || options.chart ? { pageBreak: 'before' as const } : {}),
    });
    content.push({
      text: 'Selected valid shots in workspace table order. All visible columns stay together; complete rows continue onto further pages.',
      style: 'small',
      margin: [0, 0, 0, 10],
    });
    if (records.columns.length)
      content.push(
        recordTable(
          records.columns,
          records.rows,
          records.stringStarts,
          input.profile.reportPaperSize,
        ),
      );
    if (!records.columns.length)
      content.push({ text: 'No shot-record columns are selected.', style: 'small' });
  }
  if (!Object.values(options).some(Boolean))
    content.push({
      text: 'All report sections are disabled. Enable sections in Profile → Report.',
      style: 'small',
    });
  return {
    pageSize: input.profile.reportPaperSize ?? 'A4',
    pageOrientation:
      (detailsEnabled && input.series.length > 3) ||
      (!detailsEnabled &&
        !hasTargets &&
        ((options.chart && !infoMode) || (!options.chart && options.records)))
        ? 'landscape'
        : 'portrait',
    pageMargins: REPORT_MARGINS,
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
