import { calculateAtmosphere } from '../domain/atmosphere';
import type { RawRecord } from '../domain/model';
import { finiteNumber, rawPath } from '../domain/providerData';

/**
 * Derive kg/m³ and m/s from Caldwell/export weather: °F, % RH, sea-level hPa, ft.
 * Missing/invalid weather makes both optional values null without failing measurement import.
 * Raw metadata is preserved; no standard atmosphere or stale previous values are substituted.
 */
export function importedAtmosphere(raw: RawRecord): {
  airDensity: number | null;
  soundSpeed: number | null;
} {
  const temperatureF = rawPath(raw, 'weatherData.temperature');
  const relativeHumidityPct = rawPath(raw, 'weatherData.humidity');
  const seaLevelPressureHpa = rawPath(raw, 'weatherData.pressure');
  const altitudeFt = rawPath(raw, 'altitude');
  const metersPerFoot = 0.3048; // Exact international foot conversion.
  const pascalsPerHpa = 100; // Exact hectopascal conversion.
  const unavailable = { airDensity: null, soundSpeed: null };

  if (
    !finiteNumber(temperatureF) ||
    !finiteNumber(relativeHumidityPct) ||
    !finiteNumber(seaLevelPressureHpa) ||
    !finiteNumber(altitudeFt)
  )
    return unavailable;
  try {
    const atmosphere = calculateAtmosphere({
      temperatureC: ((temperatureF - 32) * 5) / 9,
      relativeHumidityPct,
      seaLevelPressurePa: seaLevelPressureHpa * pascalsPerHpa,
      altitudeM: altitudeFt * metersPerFoot,
    });
    return { airDensity: atmosphere.densityKgM3, soundSpeed: atmosphere.soundSpeedMS };
  } catch (error) {
    if (error instanceof RangeError) return unavailable;
    throw error;
  }
}
