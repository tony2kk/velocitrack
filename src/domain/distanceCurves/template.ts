import type { CustomDistanceCurve, DistanceCurveInput, DistanceSample } from './types';

/**
 * Example transformation using only samples; accept DistanceCurveContext instead when reading records.
 * Center observed values on the first measured reading, without extrapolation.
 */
export function calculateCenteredSamples(input: DistanceCurveInput): DistanceSample[] {
  const first = input.samples.find((point) => point.value !== null)?.value;
  if (first === undefined || first === null) return [];
  // A map retains the last observation at duplicate X; sorting gives the dispatch contract's order.
  return [...new Map(input.samples.map((point) => [point.distance, point]))]
    .sort(([a], [b]) => a - b)
    .map(([, point]) => ({
      distance: point.distance,
      value: point.value === null ? null : point.value - first,
    }));
}

/** Copy this definition, give it a new stable ID, and add it to customDistanceCurves.ts. */
export const centeredSamplesCurve: CustomDistanceCurve = {
  id: 'curve:centered-samples',
  label: (units) => `Measured change from first sample (${units === 'metric' ? 'm/s' : 'ft/s'})`,
  axisKey: 'centered-velocity',
  unit: (units) => (units === 'metric' ? 'm/s' : 'ft/s'),
  displayScale: (units) => ({ factor: units === 'metric' ? 0.3048 : 1, offset: 0 }),
  description: 'Observed values minus the first recorded sample. No extrapolation.',
  available: ({ samples }) => samples.some((point) => point.value !== null),
  calculate: calculateCenteredSamples,
};
