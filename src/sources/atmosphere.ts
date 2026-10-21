import { recordedAtmosphere } from '../domain/recordedAtmosphere';
import type { RawRecord } from '../domain/model';

/**
 * Derive kg/m³ and m/s from Caldwell/export weather: °F, % RH, sea-level hPa, ft.
 * Missing/invalid weather makes both optional values null without failing measurement import.
 * Raw metadata is preserved; no standard atmosphere or stale previous values are substituted.
 */
export function importedAtmosphere(raw: RawRecord): {
  airDensity: number | null;
  soundSpeed: number | null;
} {
  const atmosphere = recordedAtmosphere(raw); // Shared source-unit validation and pressure reduction.

  return {
    airDensity: atmosphere?.densityKgM3 ?? null,
    soundSpeed: atmosphere?.soundSpeedMS ?? null,
  };
}
