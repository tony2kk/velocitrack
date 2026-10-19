import type { FieldDefinition, Profile, UnitSystem } from './model';
import type { Quantity } from './analysis';
import { fieldUnit } from './customFields';
import { unitLabels } from './units';

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
    { id: 'series', label: 'Series' },
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
