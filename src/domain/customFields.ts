import type { FieldType, ListOption, UnitSystem } from './model';
import { formatQuantity } from './units';

export const FIELD_TYPES: Record<FieldType, string> = {
  list: 'List',
  'short-text': 'Short text',
  note: 'Note',
  number: 'Number',
  weight: 'Weight (profile units)',
  'weight-grams': 'Weight (grams)',
  'weight-grains': 'Weight (grains)',
  speed: 'Speed',
  distance: 'Distance',
};

/** Unit labels follow the profile; plain numbers and text have no unit. */
export function fieldUnit(type: FieldType, units: UnitSystem): string {
  if (type === 'weight-grams') return 'g';
  if (type === 'weight-grains') return 'gr';
  if (type === 'weight') return units === 'metric' ? 'g' : 'gr';
  if (type === 'speed') return units === 'metric' ? 'm/s' : 'ft/s';
  if (type === 'distance') return units === 'metric' ? 'm' : 'ft';
  return '';
}

/** Exact conversion factors keep stored dimensional values independent of the active profile. */
export function fieldFactor(type: FieldType, units: UnitSystem): number {
  if (type === 'weight-grams') return 0.06479891;
  if (type === 'weight-grains') return 1;
  if (units === 'imperial') return 1;
  return type === 'weight' ? 0.06479891 : type === 'speed' || type === 'distance' ? 0.3048 : 1;
}

/** Validate canonical values, distinguishing an absent value from numeric zero. */
export function validFieldValue(
  type: FieldType,
  value: unknown,
  options?: ListOption[],
): value is string | number {
  if (type === 'list')
    return (
      typeof value === 'string' &&
      (options ? options.some((item) => item.id === value) : value.length > 0)
    );
  if (type === 'short-text' || type === 'note')
    return typeof value === 'string' && (type !== 'short-text' || [...value].length <= 100);
  return typeof value === 'number' && Number.isFinite(value) && (type === 'number' || value >= 0);
}

/** Format for editors without mutating storage; untouched values never undergo a conversion round trip. */
export function fieldDisplay(
  value: string | number | undefined,
  type: FieldType,
  units: UnitSystem,
): string {
  if (value === undefined) return '';
  return typeof value === 'number'
    ? String(Number((value * fieldFactor(type, units)).toPrecision(12)))
    : value;
}

/** Read-only field text follows the shared precision policy; editors retain fieldDisplay precision. */
export function fieldText(
  value: string | number | undefined,
  type: FieldType,
  units: UnitSystem,
  options?: ListOption[],
): string {
  if (value === undefined) return '';
  if (type === 'list') return options?.find((item) => item.id === value)?.name ?? '';
  return typeof value === 'number'
    ? formatQuantity(value * fieldFactor(type, units), '', fieldUnit(type, units))
    : value;
}

/** Parse an optional editor value into canonical units; empty strings remove the value. */
export function parseFieldInput(
  text: string,
  type: FieldType,
  units: UnitSystem,
): string | number | undefined {
  if (!text.trim()) return undefined;
  const value =
    type === 'short-text' || type === 'note' || type === 'list'
      ? text
      : Number(text) / fieldFactor(type, units);
  if (!validFieldValue(type, value))
    throw new Error(`Enter a valid ${FIELD_TYPES[type].toLowerCase()} value.`);
  return value;
}

/** List definitions are bounded, uniquely named dictionaries with stable, non-special IDs. */
export function validListOptions(value: unknown): value is ListOption[] {
  if (!Array.isArray(value) || value.length > 1000) return false;
  return (
    value.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        /^[a-zA-Z0-9_-]{1,100}$/.test(item.id) &&
        !['__proto__', 'constructor', 'prototype'].includes(item.id) &&
        typeof item.name === 'string' &&
        item.name === item.name.trim() &&
        item.name.length > 0 &&
        item.name.length <= 100,
    ) &&
    new Set(value.map((item) => item.id)).size === value.length &&
    new Set(value.map((item) => item.name.toLowerCase())).size === value.length
  );
}
