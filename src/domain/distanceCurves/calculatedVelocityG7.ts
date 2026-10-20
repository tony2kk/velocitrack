import type { CustomDistanceCurve, DistanceCurveContext, DistanceSample } from './types';
import { calculatedVelocity, predictionInputs } from './velocityCalculation';

/** Adapt the existing G7 calculation to the same canonical point contract as every custom curve. */
export function calculateG7Velocity(input: DistanceCurveContext): readonly DistanceSample[] {
  const model = 'g7'; // Existing reference family; no substitution from another coefficient.
  const points = calculatedVelocity(input.shot, model, input.maxDistance); // ft and ft/s.

  return points.map(({ distance, velocity }) => ({ distance, value: velocity }));
}

/** Check only the existing supported G7 inputs before offering this quantity. */
function hasG7Inputs(input: DistanceCurveContext): boolean {
  const model = 'g7'; // Uses the shot's original G7 coefficient.

  return !!predictionInputs(input.shot, model);
}

/** Keep editable names, descriptions, units and identity together at the start of the definition. */
function defineG7Curve(): CustomDistanceCurve {
  const id = 'calculated:g7'; // Preserve existing local preferences and backup IDs.
  const name = 'Calculated velocity (G7)';
  const description =
    'Model prediction from muzzle velocity and the matching Caldwell BC. Standard atmosphere: 15 °C, 1013.25 hPa, dry air, no wind. Constant BC and straight path; no gravity or weather correction. Dashed curves include extrapolation and are estimates, not measured readings.';
  const unavailableReason = 'missing or unsupported muzzle velocity / BC.';
  const axisKey = 'velocity'; // Canonical output shares the recorded ft/s axis.
  const model = 'g7'; // Existing tooltip/contributor metadata.
  const metricFactor = 0.3048; // ft/s to m/s; applied only by the renderer.

  return {
    id,
    label: (units) => `${name} (${units === 'metric' ? 'm/s' : 'ft/s'})`,
    description,
    unavailableReason,
    axisKey,
    model,
    displayScale: (units) => ({ factor: units === 'metric' ? metricFactor : 1, offset: 0 }),
    usesForecast: true,
    available: hasG7Inputs,
    calculate: calculateG7Velocity,
  };
}

export const calculatedVelocityG7Curve = defineG7Curve();
