import { calculateAtmosphere, type AtmosphereResult } from './atmosphere';
import { finiteNumber, rawPath } from './providerData';

/** Validated source weather and its estimated station conditions, in explicit SI units. */
export interface RecordedAtmosphere extends AtmosphereResult {
  readonly temperatureC: number;
  readonly relativeHumidityPct: number;
}

/** Read supported Caldwell/export units once for import and the calculation's weather description. */
export function recordedAtmosphere(raw: unknown): RecordedAtmosphere | null {
  const temperatureF = rawPath(raw, 'weatherData.temperature'); // Source °F.
  const relativeHumidityPct = rawPath(raw, 'weatherData.humidity'); // Source % RH.
  const seaLevelPressureHpa = rawPath(raw, 'weatherData.pressure'); // Sea-level hPa, not station pressure.
  const altitudeFt = rawPath(raw, 'altitude'); // Source feet above sea level.
  const metersPerFoot = 0.3048; // Exact international foot conversion.
  const pascalsPerHpa = 100; // Exact hectopascal conversion.

  if (
    !finiteNumber(temperatureF) ||
    !finiteNumber(relativeHumidityPct) ||
    !finiteNumber(seaLevelPressureHpa) ||
    !finiteNumber(altitudeFt)
  )
    return null;
  const temperatureC = ((temperatureF - 32) * 5) / 9; // Conversion requires validated numeric source data.
  try {
    return {
      ...calculateAtmosphere({
        temperatureC,
        relativeHumidityPct,
        seaLevelPressurePa: seaLevelPressureHpa * pascalsPerHpa,
        altitudeM: altitudeFt * metersPerFoot,
      }),
      temperatureC,
      relativeHumidityPct,
    };
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}
