import type { DistanceCurveContext } from './types';
import type { FlightAtmosphere } from './velocityCalculation';

/** Read both imported string estimates together; missing values never select a standard fallback. */
export function localAtmosphere(input: DistanceCurveContext): FlightAtmosphere | null {
  const density = input.string?.airDensity; // Canonical kg/m³, calculated on import/reimport.
  const soundSpeed = input.string?.soundSpeed; // Canonical m/s, from the same weather inputs.

  return typeof density === 'number' &&
    Number.isFinite(density) &&
    density > 0 &&
    typeof soundSpeed === 'number' &&
    Number.isFinite(soundSpeed) &&
    soundSpeed > 0
    ? { density, soundSpeed }
    : null;
}
