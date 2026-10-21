import type { CurveConditions, DistanceCurveContext } from './types';
import { STANDARD_ATMOSPHERE, type FlightAtmosphere } from './velocityCalculation';
import { recordedAtmosphere } from '../recordedAtmosphere';
import { formatValue } from '../units';

/** Read both imported estimates together; never combine a local value with a standard counterpart. */
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

/** Prefer the matching string's complete saved estimates; otherwise use the standard pair. */
export function velocityAtmosphere(input: DistanceCurveContext): FlightAtmosphere {
  return localAtmosphere(input) ?? STANDARD_ATMOSPHERE;
}

/** Describe the same selection as the solver without replacing any stored measurements/estimates. */
export function velocityConditions(input: DistanceCurveContext): CurveConditions {
  const local = localAtmosphere(input); // Saved density and sound speed used by both velocity models.
  const weather = local ? recordedAtmosphere(input.string?.raw) : null; // Reconstruct station pressure for display.
  const standardDescription =
    'Atmosphere: 15 °C, 1013.25 hPa, dry air (standard fallback; local estimates unavailable).';

  if (!local) return { atmosphere: 'standard', description: standardDescription };
  // Older/custom archives may contain the estimates without the original weather. Do not invent it.
  if (!weather)
    return {
      atmosphere: 'local',
      description: `Atmosphere: local stored estimates (${formatValue(local.density, 4)} kg/m³, sound speed ${formatValue(local.soundSpeed, 2)} m/s); temperature, pressure and humidity unavailable.`,
    };
  // Humidity requires validated weather; pressure below is the station estimate, not sea-level pressure.
  const air =
    weather.relativeHumidityPct === 0
      ? 'dry air'
      : `humid air (${formatValue(weather.relativeHumidityPct, 1)}% RH)`;
  return {
    atmosphere: 'local',
    description: `Atmosphere: ${formatValue(weather.temperatureC, 2)} °C, ${(weather.pressurePa / 100).toFixed(2)} hPa, ${air} (local; estimated station pressure).`,
  };
}
