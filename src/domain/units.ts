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

/** Round presentation values only, avoiding binary conversion noise without altering stored data. */
export function formatValue(value: number | null, digits = 6): string {
  return value === null || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-GB', { maximumFractionDigits: digits, useGrouping: false });
}
