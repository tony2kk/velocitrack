import type { Shot, UnitSystem } from '../model';
import type { DisplayScale } from '../chartViewport';
import { inspectPoints } from '../measurements';
import {
  DEFAULT_FORECAST_DISTANCE,
  MAX_FORECAST_DISTANCE,
  type DragModel,
} from '../calculatedVelocity';
import { customDistanceCurves } from './customDistanceCurves';
import type { CustomDistanceCurve, DistanceCurveData, DistanceSample } from './types';
import { createDistanceCurveContext } from './context';

export const MAX_CURVE_POINTS = 5000;
export const MAX_DERIVED_SHOTS = 100;

/** UI metadata and a private adapter from stored records to canonical curve output. */
export interface DistanceCurve {
  readonly id: string;
  readonly label: (units: UnitSystem) => string;
  readonly axisKey: string;
  readonly displayScale: (units: UnitSystem) => DisplayScale;
  readonly description: string;
  readonly unavailableReason?: string;
  readonly derived: boolean;
  readonly usesForecast: boolean;
  readonly model?: DragModel;
  readonly available: (shot: Shot, data?: DistanceCurveData) => boolean;
  readonly calculate: (
    shot: Shot,
    maxDistance: number,
    data?: DistanceCurveData,
  ) => readonly DistanceSample[];
}

/** Dispatch failures are categories, never arbitrary exception text containing imported data. */
export interface CurveResult {
  points: readonly DistanceSample[];
  issue?: 'unavailable' | 'unknown' | 'failed' | 'invalid-output';
}

/** Readonly registry shared by menus, normalization, axes, tooltips and the trace dispatcher. */
export interface DistanceCurveRegistry {
  readonly definitions: readonly DistanceCurve[];
  readonly get: (id: string) => DistanceCurve | undefined;
}

/** Preserve the existing canonical ft/s velocity axis and conversion. */
function velocityScale(units: UnitSystem): DisplayScale {
  return { factor: units === 'metric' ? 0.3048 : 1, offset: 0 };
}

/** Recorded measurements are the only built-in; every calculated quantity comes from the catalog. */
function builtInCurves(): DistanceCurve[] {
  return [
    {
      id: 'velocity',
      label: (units) => `Velocity (${units === 'metric' ? 'm/s' : 'ft/s'})`,
      axisKey: 'velocity',
      displayScale: velocityScale,
      description: 'Recorded distance/velocity samples.',
      derived: false,
      usesForecast: false,
      available: (shot) => inspectPoints(shot).points.length > 0,
      calculate: (shot) =>
        inspectPoints(shot).points.map((point) => ({
          distance: point.distance,
          value: point.velocity,
          sampleIndex: point.index,
        })),
    },
  ];
}

/** Build-time registration rejects conflicting identities and inconsistent canonical axis scales. */
export function createDistanceCurveRegistry(
  custom: readonly CustomDistanceCurve[],
): DistanceCurveRegistry {
  const definitions: DistanceCurve[] = builtInCurves();
  const ids = new Set(definitions.map((definition) => definition.id));
  for (const definition of custom) {
    if (
      (!/^curve:[a-zA-Z0-9_-]+$/.test(definition.id) &&
        definition.id !== 'calculated:g1' &&
        definition.id !== 'calculated:g7') ||
      definition.id.length > 200 ||
      ids.has(definition.id)
    )
      throw new Error(`Invalid or duplicate distance curve ID: ${definition.id}`);
    ids.add(definition.id);
    definitions.push({
      ...definition,
      derived: true,
      usesForecast: definition.usesForecast ?? false,
      available: (shot, data) =>
        definition.available(createDistanceCurveContext(shot, DEFAULT_FORECAST_DISTANCE, data)),
      calculate: (shot, maxDistance, data) =>
        definition.calculate(createDistanceCurveContext(shot, maxDistance, data)),
    });
  }
  for (const units of ['imperial', 'metric'] as const) {
    const scales = new Map<string, DisplayScale>();
    for (const definition of definitions) {
      const scale = definition.displayScale(units);
      if (
        !definition.axisKey.trim() ||
        !definition.label(units).trim() ||
        !definition.description.trim() ||
        !Number.isFinite(scale.factor) ||
        scale.factor <= 0 ||
        !Number.isFinite(scale.offset)
      )
        throw new Error(`Invalid distance curve presentation: ${definition.id}`);
      const previous = scales.get(definition.axisKey);
      if (previous && (previous.factor !== scale.factor || previous.offset !== scale.offset))
        throw new Error(`Inconsistent distance curve axis: ${definition.axisKey}`);
      scales.set(definition.axisKey, scale);
    }
  }
  return Object.freeze({
    definitions: Object.freeze(definitions.map((definition) => Object.freeze(definition))),
    get: (id: string) => definitions.find((definition) => definition.id === id),
  });
}

export const distanceCurveRegistry = createDistanceCurveRegistry(customDistanceCurves);

/** Availability is input-only and exception-safe, so a broken optional function cannot crash menus. */
export function supportsDistanceCurve(
  curve: DistanceCurve,
  shot: Shot,
  data?: DistanceCurveData,
): boolean {
  try {
    return !shot.excluded && curve.available(shot, data);
  } catch {
    return false;
  }
}

/** Dispatch once per eligible record, validate extension output and retain null/zero/negative Y. */
export function dispatchDistanceCurve(
  id: string,
  shot: Shot,
  maxDistance = DEFAULT_FORECAST_DISTANCE,
  registry = distanceCurveRegistry,
  data?: DistanceCurveData,
): CurveResult {
  const curve = registry.get(id);
  if (!curve) return { points: [], issue: 'unknown' };
  if (!supportsDistanceCurve(curve, shot, data)) return { points: [], issue: 'unavailable' };
  if (!Number.isFinite(maxDistance) || maxDistance <= 0 || maxDistance > MAX_FORECAST_DISTANCE)
    return { points: [], issue: 'invalid-output' };
  try {
    const points = curve.calculate(shot, maxDistance, data);
    // Original measurements retain their historical order/size. Extension output has a strict contract.
    if (
      curve.derived &&
      (!Array.isArray(points) ||
        points.length > MAX_CURVE_POINTS ||
        points.some(
          (point, index) =>
            !point ||
            !Number.isFinite(point.distance) ||
            point.distance < 0 ||
            (point.value !== null && !Number.isFinite(point.value)) ||
            (index > 0 && point.distance <= points[index - 1]!.distance),
        ))
    )
      return { points: [], issue: 'invalid-output' };
    return { points: points.map((point) => ({ ...point })) };
  } catch {
    return { points: [], issue: 'failed' };
  }
}

/** Bind the second distance axis only when the selected canonical dimensions differ. */
export function distanceAxisIndex(
  primary: string,
  secondary: string,
  registry = distanceCurveRegistry,
): number {
  return registry.get(primary)?.axisKey === registry.get(secondary)?.axisKey ? 0 : 1;
}
