import type {
  Annotation,
  CatalogItem,
  FieldDefinition,
  Profile,
  Series,
  Shot,
  Tag,
  UnitSystem,
} from './model';
import type { Quantity } from './analysis';
import { fieldUnit } from './customFields';
import { unitLabels } from './units';
import { inspectPoints } from './measurements';
import { providerTimestamp, rawPath } from './providerData';
import { projectileName } from './projectiles';

/** Stable column identity is separate from its translated/display-unit-dependent label. */
export interface TableColumn {
  id: string;
  /** Full picker/accessibility name; stored column identity never depends on this text. */
  label: string;
  /** Compact visual heading, with the display unit on its own line. */
  heading?: string;
  unit?: string;
  /** Meaning, scope or provenance shown by the heading's hover/focus/tap explanation. */
  description?: string;
}
export const DEFAULT_COLUMNS = [
  'series',
  'shot',
  'velocity',
  'g1',
  'g7',
  'points',
  'rawUnit',
  'status',
];

/** Compact names are keyed by stable IDs so changing units never changes meaning or saved order. */
const QUANTITY_HEADINGS: Readonly<Record<string, string>> = {
  airDensity: 'Air density',
  soundSpeed: 'Sound speed',
  'target:horizontalOffset': 'Offset H',
  'target:verticalOffset': 'Offset V',
  'target:groupSize': 'Group size',
  projectileWeight: 'Proj. mass',
  'source:altitude': 'Altitude',
  'source:distanceToChronograph': 'Chrono dist.',
  'source:projectile.diameter': 'Proj. diameter',
  'source:weatherData.temperature': 'Temp.',
  'source:weatherData.temperatureMin': 'Temp. min',
  'source:weatherData.temperatureMax': 'Temp. max',
  'source:weatherData.feelsLikeTemperature': 'Feels like',
  'source:weatherData.humidity': 'Humidity',
  'source:weatherData.pressure': 'Pressure',
  'source:weatherData.windSpeed': 'Wind speed',
  'source:weatherData.windGust': 'Wind gust',
  'source:weatherData.windDegrees': 'Wind direction',
  'source:weatherData.visibility': 'Visibility',
  'source:statistics.minimum': 'String min',
  'source:statistics.maximum': 'String max',
  'source:statistics.average': 'String mean',
  'source:statistics.muzzleVelocity': 'String V₀',
  'source:statistics.standardDeviation': 'String SD',
  'source:statistics.spread': 'String ES',
  'source:statistics.totalShots': 'String shots',
  'source:statistics.ballisticCoefficientG1': 'String G1',
  'source:statistics.ballisticCoefficientG7': 'String G7',
};

/** Distinguish string-level source summaries and local target values from individual shot readings. */
function quantityDescription(quantity: Quantity): string {
  if (quantity.description) return quantity.description;
  if (quantity.id === 'source:weatherData.pressure')
    return 'Recorded pressure reduced to sea level, in hPa. This is not local station pressure.';
  if (quantity.id === 'target:horizontalOffset')
    return 'Group-center horizontal offset from the point of aim. Positive to the right; shared by the string.';
  if (quantity.id === 'target:verticalOffset')
    return 'Group-center vertical offset from the point of aim. Positive upward; shared by the string.';
  if (quantity.id === 'target:groupSize')
    return "Diameter of the string's measured target group, entered manually or measured on a photo.";
  if (quantity.id.startsWith('source:statistics.'))
    return 'String summary reported by Caldwell, repeated for each shot. It is not recalculated from the current selection.';
  return (
    'Recorded string attribute, repeated for each shot.' +
    (quantity.unit === 'source units' ? ' Source units are displayed unchanged.' : '')
  );
}

/** Expose recorded scalar quantities, source notes/time, and every custom field to the column picker. */
export function tableColumns(
  fields: FieldDefinition[],
  quantities: Quantity[],
  units: UnitSystem,
): TableColumn[] {
  return [
    { id: 'series', label: 'String', description: 'The measurement string containing this shot.' },
    { id: 'shot', label: 'Shot', description: 'Original shot number within its string.' },
    {
      id: 'velocity',
      label: `Muzzle velocity (${unitLabels[units].velocity})`,
      heading: 'V₀',
      unit: unitLabels[units].velocity,
      description: 'Recorded muzzle velocity for this shot.',
    },
    {
      id: 'g1',
      label: 'G1',
      description: 'G1 ballistic coefficient reported by Caldwell for this shot; dimensionless.',
    },
    {
      id: 'g7',
      label: 'G7',
      description: 'G7 ballistic coefficient reported by Caldwell for this shot; dimensionless.',
    },
    {
      id: 'points',
      label: 'Points',
      description:
        'Usable distance/velocity samples for this shot, excluding padding and invalid pairs.',
    },
    {
      id: 'rawUnit',
      label: 'Source unit code',
      heading: 'Unit code',
      description: 'Provider unit enum, preserved as metadata. It does not select display units.',
    },
    { id: 'status', label: 'Status' },
    { id: 'tags', label: 'Tags' },
    { id: 'timestamp', label: 'Shot time' },
    { id: 'shotNotes', label: 'Shot notes (Caldwell)', heading: 'Shot notes' },
    { id: 'seriesNotes', label: 'String notes (Caldwell)', heading: 'String notes' },
    { id: 'firearm', label: 'Firearm' },
    { id: 'projectile', label: 'Projectile' },
    ...quantities
      .filter((q) => !['velocity', 'g1', 'g7'].includes(q.id) && !q.id.startsWith('field:'))
      .map((q) => ({
        id: q.id,
        label: q.label,
        heading: QUANTITY_HEADINGS[q.id] ?? q.label,
        unit: q.unit,
        description: quantityDescription(q),
      })),
    ...fields.map((field) => ({
      id: `field:${field.id}`,
      label:
        field.name + (fieldUnit(field.type, units) ? ` (${fieldUnit(field.type, units)})` : ''),
      heading: field.name,
      unit: fieldUnit(field.type, units) || undefined,
      description:
        'Custom string field, repeated for each shot. Its name is defined in your local profile.',
    })),
  ];
}

/** Preserve legacy visibility choices and project them through the independent saved order. */
export function visibleColumns(profile?: Profile): string[] {
  const selected = profile?.tableColumns ?? [
    ...DEFAULT_COLUMNS,
    ...(profile?.showTags ? ['tags'] : []),
    ...(profile?.visibleFieldIds ?? []).map((id) => `field:${id}`),
  ];
  return profile?.tableColumnOrder
    ? [...new Set([...profile.tableColumnOrder, ...selected])].filter((id) => selected.includes(id))
    : selected;
}

/** Seed old profiles from their visible order; append new definitions without moving saved columns. */
export function columnOrder(available: TableColumn[], profile?: Profile): string[] {
  return [
    ...new Set([
      ...(profile?.tableColumnOrder ?? []),
      ...visibleColumns(profile),
      ...available.map((item) => item.id),
    ]),
  ];
}

/** Move one column to the target's position without duplicating or losing hidden IDs. */
export function moveColumn(ids: string[], from: string, to: string): string[] {
  if (from === to || !ids.includes(from) || !ids.includes(to)) return ids;
  const result = ids.filter((id) => id !== from);
  result.splice(ids.indexOf(to), 0, from);
  return result;
}

/** Insert at an explicit gap in the original list, preserving every other column's relative order. */
export function insertColumn(ids: string[], from: string, gap: number): string[] {
  const index = ids.indexOf(from);
  if (index < 0) return ids;
  const result = ids.filter((id) => id !== from);
  result.splice(Math.max(0, Math.min(result.length, gap - (index < gap ? 1 : 0))), 0, from);
  return result;
}

/** Sort actual values, with natural text order, missing values last in either direction and stable ties. */
export function sortShots(
  shots: Shot[],
  series: Series[],
  sort: Profile['tableSort'],
  context: {
    quantities: Quantity[];
    annotations: Annotation[];
    tags: Tag[];
    catalog: CatalogItem[];
    hiddenShots?: ReadonlySet<string>;
    invalidShots?: ReadonlySet<string>;
    showProjectileWeight?: boolean;
  },
): Shot[] {
  const sessions = new Map(series.map((item) => [item.id, item]));
  const annotations = new Map(context.annotations.map((item) => [item.entityId, item]));
  const catalog = new Map(context.catalog.map((item) => [item.id, item.name]));
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  const key = sort?.columnId === 'shot' ? 'series' : (sort?.columnId ?? 'series');
  const direction = sort?.direction === 'desc' ? -1 : 1;
  /** Read canonical numeric values instead of formatted text, including fields shared by a string. */
  function value(shot: Shot): string | number | null {
    const session = sessions.get(shot.seriesId);
    const annotation = annotations.get(shot.seriesId);
    if (key.startsWith('field:')) return annotation?.values?.[key.slice(6)] ?? null;
    switch (key) {
      case 'series':
        return session?.name ?? null;
      case 'points':
        return inspectPoints(shot).points.length;
      case 'rawUnit':
        return shot.rawUnit;
      case 'status':
        return context.invalidShots?.has(shot.id)
          ? 'Invalid'
          : shot.excluded
            ? 'Source excluded'
            : context.hiddenShots?.has(shot.id)
              ? 'Not selected'
              : 'Included';
      case 'tags':
        return context.tags
          .filter((tag) => annotation?.tagIds?.includes(tag.id))
          .map((tag) => tag.name)
          .join(', ');
      case 'firearm':
        return session
          ? (catalog.get(session.firearmId) ?? String(rawPath(session.raw, 'firearm.name') ?? ''))
          : null;
      case 'projectile':
        return session
          ? projectileName(session, catalog, context.showProjectileWeight ?? false)
          : null;
      case 'shotNotes':
        return typeof shot.raw.notes === 'string' ? shot.raw.notes : null;
      case 'seriesNotes':
        return typeof session?.raw.notes === 'string' ? session.raw.notes : null;
      case 'timestamp': {
        return providerTimestamp(shot.raw.timestamp);
      }
      default:
        return context.quantities.find((item) => item.id === key)?.read(shot) ?? null;
    }
  }
  const values = new Map(shots.map((shot) => [shot.id, value(shot)]));
  return [...shots].sort((a, b) => {
    const av = values.get(a.id),
      bv = values.get(b.id);
    const am = av === null || av === undefined || av === '',
      bm = bv === null || bv === undefined || bv === '';
    const primary =
      am || bm
        ? Number(am) - Number(bm)
        : direction *
          (typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : collator.compare(String(av), String(bv)));
    return (
      primary ||
      collator.compare(
        sessions.get(a.seriesId)?.name ?? '',
        sessions.get(b.seriesId)?.name ?? '',
      ) ||
      a.seriesId.localeCompare(b.seriesId) ||
      a.number - b.number ||
      a.id.localeCompare(b.id)
    );
  });
}
