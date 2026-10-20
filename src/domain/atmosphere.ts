/**
 * Ideal-gas moist-air density and sound speed with Magnus vapor pressure over liquid water.
 * Inputs are explicit SI quantities; sea-level pressure is never used as station pressure.
 * See docs/ATMOSPHERE.md for equations, references and the pressure-estimation assumptions.
 */
export type AtmosphereInput = {
  readonly temperatureC: number;
  readonly relativeHumidityPct: number;
} & (
  | {
      readonly stationPressurePa: number;
      readonly seaLevelPressurePa?: never;
      readonly altitudeM?: never;
    }
  | {
      readonly stationPressurePa?: never;
      readonly seaLevelPressurePa: number;
      readonly altitudeM: number;
    }
);

/** Intermediate pressures make the estimate auditable; density is always canonical kg/m³. */
export interface AtmosphereResult {
  readonly pressurePa: number;
  readonly pressureSource: 'station-measurement' | 'sea-level-estimate';
  readonly saturationVaporPressurePa: number;
  readonly vaporPressurePa: number;
  readonly densityKgM3: number;
  /** Ideal-mixture sound speed with constant heat capacities, in m/s. */
  readonly soundSpeedMS: number;
}

/**
 * Calculate ambient properties from a complete supported input, throwing RangeError otherwise.
 * Sea-level reduction uses a dry-column hypsometric estimate with an assumed lapse rate.
 * No standard-pressure fallback, real-gas correction or motion-dependent effects are used.
 */
export function calculateAtmosphere(input: AtmosphereInput): AtmosphereResult {
  const dryAirGasConstant = 287.05; // J/(kg·K), specific gas constant for dry air.
  const vaporGasConstant = 461.495; // J/(kg·K), specific gas constant for water vapor.
  const kelvinOffset = 273.15; // Convert Celsius to kelvin.
  const magnusPressurePa = 610.94; // Saturation vapor pressure at 0 °C, Pa.
  const magnusExponent = 17.625; // Dimensionless Alduchov–Eskridge water coefficient.
  const magnusTemperatureC = 243.04; // °C, Alduchov–Eskridge water coefficient.
  const gravity = 9.80665; // m/s², conventional constant gravity for the pressure estimate.
  const lapseRate = 0.0065; // K/m, assumed temperature decrease with elevation.
  const dryAirCvOverR = 2.5; // Ideal diatomic molar Cv/R, corresponding to gamma = 1.4.
  const vaporCvOverR = 3; // Ideal nonlinear triatomic molar Cv/R, gamma = 4/3.
  const temperatureC = input.temperatureC;
  const humidityPct = input.relativeHumidityPct;
  const temperatureK = temperatureC + kelvinOffset;
  const hasStationPressure = input.stationPressurePa !== undefined;
  const hasSeaLevelPressure = input.seaLevelPressurePa !== undefined;
  const suppliedPressurePa = hasStationPressure
    ? input.stationPressurePa
    : input.seaLevelPressurePa;
  let pressurePa: number; // Local total pressure, measured or estimated, Pa.
  let meanLayerTemperatureK: number; // Dry-column mean from sea level to the station.

  if (!Number.isFinite(temperatureC) || temperatureC < -40 || temperatureC > 50)
    throw new RangeError('temperatureC must be between -40 and 50');
  if (!Number.isFinite(humidityPct) || humidityPct < 0 || humidityPct > 100)
    throw new RangeError('relativeHumidityPct must be between 0 and 100');
  if (
    hasStationPressure === hasSeaLevelPressure ||
    (hasStationPressure && input.altitudeM !== undefined)
  )
    throw new RangeError('Provide station pressure, or sea-level pressure with altitude');
  if (!Number.isFinite(suppliedPressurePa) || suppliedPressurePa! <= 0)
    throw new RangeError('Pressure must be positive and finite in Pa');

  if (hasStationPressure) {
    pressurePa = input.stationPressurePa!;
  } else {
    if (!Number.isFinite(input.altitudeM) || input.altitudeM! < -500 || input.altitudeM! > 11000)
      throw new RangeError('altitudeM must be between -500 and 11000');
    // The actual vertical temperature/humidity profile is unavailable; this is an estimate.
    meanLayerTemperatureK = temperatureK + (lapseRate * input.altitudeM!) / 2;
    pressurePa =
      input.seaLevelPressurePa! *
      Math.exp((-gravity * input.altitudeM!) / (dryAirGasConstant * meanLayerTemperatureK));
  }
  if (!Number.isFinite(pressurePa) || pressurePa <= 0)
    throw new RangeError('Pressure must be positive and finite in Pa');

  const saturationVaporPressurePa =
    magnusPressurePa *
    Math.exp((magnusExponent * temperatureC) / (magnusTemperatureC + temperatureC));
  const vaporPressurePa = (humidityPct / 100) * saturationVaporPressurePa;
  if (vaporPressurePa >= pressurePa)
    throw new RangeError('Water-vapor partial pressure must be below total pressure');
  // Sum the dry-air and water-vapor partial densities in kg/m³.
  const densityKgM3 =
    (pressurePa - vaporPressurePa) / (dryAirGasConstant * temperatureK) +
    vaporPressurePa / (vaporGasConstant * temperatureK);
  if (!Number.isFinite(densityKgM3) || densityKgM3 <= 0)
    throw new RangeError('Air density must be positive and finite');
  const vaporMoleFraction = vaporPressurePa / pressurePa; // Mole fraction, not mass fraction.
  const heatCapacityRatio =
    1 + 1 / ((1 - vaporMoleFraction) * dryAirCvOverR + vaporMoleFraction * vaporCvOverR);
  const soundSpeedMS = Math.sqrt((heatCapacityRatio * pressurePa) / densityKgM3);
  if (!Number.isFinite(soundSpeedMS) || soundSpeedMS <= 0)
    throw new RangeError('Sound speed must be positive and finite');

  return {
    pressurePa,
    pressureSource: hasStationPressure ? 'station-measurement' : 'sea-level-estimate',
    saturationVaporPressurePa,
    vaporPressurePa,
    densityKgM3,
    soundSpeedMS,
  };
}
