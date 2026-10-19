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
  label: string;
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

/** Expose recorded scalar quantities, source notes/time, and every custom field to the column picker. */
export function tableColumns(
  fields: FieldDefinition[],
  quantities: Quantity[],
  units: UnitSystem,
): TableColumn[] {
  return [
    { id: 'series', label: 'String' },
    { id: 'shot', label: 'Shot' },
    { id: 'velocity', label: `Muzzle velocity (${unitLabels[units].velocity})` },
    { id: 'g1', label: 'G1 (Caldwell)' },
    { id: 'g7', label: 'G7 (Caldwell)' },
    { id: 'points', label: 'Points' },
    { id: 'rawUnit', label: 'Source unit code' },
    { id: 'status', label: 'Status' },
    { id: 'tags', label: 'Tags' },
    { id: 'timestamp', label: 'Shot time' },
    { id: 'shotNotes', label: 'Shot notes (Caldwell)' },
    { id: 'seriesNotes', label: 'String notes (Caldwell)' },
    { id: 'firearm', label: 'Firearm' },
    { id: 'projectile', label: 'Projectile' },
    ...quantities
      .filter((q) => !['velocity', 'g1', 'g7'].includes(q.id) && !q.id.startsWith('field:'))
      .map((q) => ({ id: q.id, label: q.label })),
    ...fields.map((field) => ({
      id: `field:${field.id}`,
      label:
        field.name + (fieldUnit(field.type, units) ? ` (${fieldUnit(field.type, units)})` : ''),
    })),
  ];
}

/** Preserve v0.4 column choices until the first explicit ordered-column edit. */
export function visibleColumns(profile?: Profile): string[] {
  return (
    profile?.tableColumns ?? [
      ...DEFAULT_COLUMNS,
      ...(profile?.showTags ? ['tags'] : []),
      ...(profile?.visibleFieldIds ?? []).map((id) => `field:${id}`),
    ]
  );
}

/** Move one visible column to the target's position without duplicating or losing hidden IDs. */
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
        return shot.excluded
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
