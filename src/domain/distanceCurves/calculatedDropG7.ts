import type { CustomDistanceCurve, DistanceCurveContext, DistanceSample } from './types';
import { calculatedFlight, predictionInputs } from './velocityCalculation';

/** Compute first-order drop using the shot's own G7 BC and the existing standard-atmosphere speed path. */
export function calculateG7Drop(input: DistanceCurveContext): readonly DistanceSample[] {
  const model = 'g7'; // Only the matching coefficient/reference family is used.
  const includeDrop = true; // Integrate gravitational drop alongside speed at every internal step.
  const points = calculatedFlight(input.shot, model, input.maxDistance, includeDrop); // ft, ft/s, mm.

  return points.map(({ distance, drop }) => ({ distance, value: drop }));
}

/** Check the same supported muzzle velocity and G7 coefficient bounds as the standard-atmosphere solver. */
function hasG7Inputs(input: DistanceCurveContext): boolean {
  const model = 'g7'; // No fallback to G1 or downrange samples.

  return !!predictionInputs(input.shot, model);
}

/** Keep presentation metadata and conversion constants together for this independent catalog entry. */
function defineG7DropCurve(): CustomDistanceCurve {
  const id = 'curve:drop-g7'; // Stable local profile/backup identity.
  const name = 'Calculated drop (G7)';
  const description =
    "Theoretical drop below the horizontal muzzle axis, positive downward. G7 with the shot's muzzle velocity and matching BC. Atmosphere: 15.0 °C, 1013.25 hPa, dry air, no wind. Constant BC and small-deflection gravity approximation; no sight zero or local weather correction. Dashed curves are estimates, not measured impact offsets.";
  const tooltipNote =
    'Positive downward from the horizontal muzzle axis; small-deflection estimate.';
  const unavailableReason = 'missing or unsupported muzzle velocity / BC.';
  const axisKey = 'drop'; // Canonical mm, separate from speed and measured target offsets.
  const model = 'g7'; // Retain the matching BC in shot and contributor tooltips.
  const millimetersPerCentimeter = 10; // Metric display conversion.
  const millimetersPerInch = 25.4; // Imperial display conversion, exact.

  return {
    id,
    label: (units) => `${name} (${units === 'metric' ? 'cm' : 'in'})`,
    description,
    tooltipNote,
    unavailableReason,
    axisKey,
    unit: (units) => (units === 'metric' ? 'cm' : 'in'),
    model,
    displayScale: (units) => ({
      factor: 1 / (units === 'metric' ? millimetersPerCentimeter : millimetersPerInch),
      offset: 0,
    }),
    usesForecast: true,
    available: hasG7Inputs,
    calculate: calculateG7Drop,
  };
}

export const calculatedDropG7Curve = defineG7DropCurve();
