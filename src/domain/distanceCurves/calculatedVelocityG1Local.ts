import type { CustomDistanceCurve, DistanceCurveContext, DistanceSample } from './types';
import { calculatedVelocity, predictionInputs } from './velocityCalculation';
import { localAtmosphere } from './localAtmosphere';

/** Experimental G1 prediction using only the matching string's imported atmosphere estimates. */
export function calculateG1LocalVelocity(input: DistanceCurveContext): readonly DistanceSample[] {
  const model = 'g1'; // Keep the original G1 BC and reference drag table paired.
  const atmosphere = localAtmosphere(input); // kg/m³ and m/s; no weather or standard fallback.
  const points = atmosphere
    ? calculatedVelocity(input.shot, model, input.maxDistance, atmosphere)
    : []; // Canonical ft and ft/s; preserve the original muzzle anchor and distance origin.

  return points.map(({ distance, velocity }) => ({ distance, value: velocity }));
}

/** Require local density/sound speed and a supported muzzle velocity / matching BC. */
function hasG1LocalInputs(input: DistanceCurveContext): boolean {
  const model = 'g1'; // Availability uses the same local Mach domain as calculation.
  const atmosphere = localAtmosphere(input); // Missing either estimate makes this variant unavailable.

  return !!atmosphere && !!predictionInputs(input.shot, model, atmosphere);
}

/** Keep the experimental variant's identity, assumptions and display units together. */
function defineG1LocalCurve(): CustomDistanceCurve {
  const id = 'curve:velocity-g1-local'; // Separate profile/backup ID; the standard curve is unchanged.
  const name = 'Calculated velocity (G1, local)';
  const description =
    "Experimental local-atmosphere prediction from muzzle velocity and the matching Caldwell BC. Uses the string's imported air density and sound speed, held constant along the path. Constant BC, straight path, still air; no gravity or radar/muzzle distance-offset correction. Dashed curves include extrapolation. Field agreement has not been verified.";
  const tooltipNote =
    'Uses imported string air density and sound speed; no distance-offset correction.';
  const unavailableReason =
    'missing or unsupported muzzle velocity / BC / string air density or sound speed. Refresh or reimport strings with complete weather data.';
  const axisKey = 'velocity'; // Share canonical ft/s and retained viewport with recorded/standard speed.
  const model = 'g1'; // Tooltip coefficient comes from the shot's matching G1 field.
  const atmosphere = 'local'; // Explicit provenance prevents a misleading standard-atmosphere tooltip.
  const metricFactor = 0.3048; // ft/s to m/s; apply once in the renderer.

  return {
    id,
    label: (units) => `${name} (${units === 'metric' ? 'm/s' : 'ft/s'})`,
    description,
    tooltipNote,
    unavailableReason,
    axisKey,
    model,
    atmosphere,
    displayScale: (units) => ({ factor: units === 'metric' ? metricFactor : 1, offset: 0 }),
    usesForecast: true,
    available: hasG1LocalInputs,
    calculate: calculateG1LocalVelocity,
  };
}

export const calculatedVelocityG1LocalCurve = defineG1LocalCurve();
