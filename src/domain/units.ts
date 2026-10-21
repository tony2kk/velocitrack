import type { UnitSystem } from './model';

export type MeasurementKind = 'velocity' | 'distance' | 'temperature';

/** Display labels share one definition across preferences, axes, tables and point details. */
export const unitLabels = {
  imperial: { velocity: 'ft/s', distance: 'ft', temperature: '°F', targetLength: 'in' },
  metric: { velocity: 'm/s', distance: 'm', temperature: '°C', targetLength: 'cm' },
} as const;

/**
 * Convert the supported adapters' ft/s, ft and °F values only at the presentation boundary.
 * The international foot is exactly 0.3048 m. Missing/invalid values never become zero.
 */
export function displayValue(
  value: number | null,
  kind: MeasurementKind,
  units: UnitSystem,
): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (units === 'imperial') return value;
  return kind === 'temperature' ? ((value - 32) * 5) / 9 : value * 0.3048;
}

/** Compact editable text, without fixed trailing zeroes; readonly measurements use formatQuantity. */
export function formatValue(value: number | null, digits = 6): string {
  return value === null || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-GB', { maximumFractionDigits: digits, useGrouping: false });
}

/** Fixed presentation precision; keep trailing zeroes and suppress a rounded negative zero. */
export function formatFixed(value: number | null, digits: number): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString('en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  });
}

/** One display policy for scalar tables, chart ticks/tooltips, cards and PDF; never use for storage. */
export function quantityDigits(id = '', unit = ''): number {
  if (id === 'g1' || id === 'g7' || /ballisticCoefficientG[17]$/.test(id)) return 3;
  if (id === 'count' || id.endsWith('totalShots') || ['%', '°'].includes(unit)) return 0;
  if (
    id === 'velocity' ||
    id === 'soundSpeed' ||
    id.startsWith('calculated:') ||
    ['m/s', 'ft/s', 'm', 'ft', '°C', '°F', 'gr', 'grs'].includes(unit)
  )
    return 1;
  if (unit === 'kg/m³') return 3;
  if (unit === 'lb/ft³') return 5;
  if (unit === 'in' && id === 'source:projectile.diameter') return 3;
  return 2;
}

/** Inputs are already converted to their display units; formatting cannot alter the underlying value. */
export function formatQuantity(value: number | null, id = '', unit = ''): string {
  return formatFixed(value, quantityDigits(id, unit));
}
