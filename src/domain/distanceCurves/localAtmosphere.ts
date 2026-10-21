import type { CurveConditions, DistanceCurveContext } from './types';
import { STANDARD_ATMOSPHERE, type FlightAtmosphere } from './velocityCalculation';
import { recordedAtmosphere } from '../recordedAtmosphere';
import { formatQuantity } from '../units';

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
    'Atmosphere: 15.0 °C, 1013.25 hPa, dry air (standard fallback; local estimates unavailable).';

  if (!local) return { atmosphere: 'standard', description: standardDescription };
  // Older/custom archives may contain the estimates without the original weather. Do not invent it.
  if (!weather)
    return {
      atmosphere: 'local',
      description: `Atmosphere: local stored estimates (${formatQuantity(local.density, 'airDensity', 'kg/m³')} kg/m³, sound speed ${formatQuantity(local.soundSpeed, 'soundSpeed')} m/s); temperature, pressure and humidity unavailable.`,
    };
  // Humidity requires validated weather; pressure below is the station estimate, not sea-level pressure.
  const air =
    weather.relativeHumidityPct === 0
      ? 'dry air'
      : `humid air (${formatQuantity(weather.relativeHumidityPct, 'humidity', '%')}% RH)`;
  return {
    atmosphere: 'local',
    description: `Atmosphere: ${formatQuantity(weather.temperatureC, 'temperature', '°C')} °C, ${formatQuantity(weather.pressurePa / 100, 'pressure', 'hPa')} hPa, ${air} (local; estimated station pressure).`,
  };
}
