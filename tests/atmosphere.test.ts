import { describe, expect, it } from 'vitest';
import { calculateAtmosphere, type AtmosphereInput } from '../src/domain/atmosphere';
import { importedAtmosphere } from '../src/sources/atmosphere';

const standard = { temperatureC: 15, relativeHumidityPct: 0, stationPressurePa: 101325 };

describe('Magnus and ideal-gas atmosphere', () => {
  it('matches dry standard-air reference values and a humid reference calculation', () => {
    const dry = calculateAtmosphere(standard);
    expect(dry.densityKgM3).toBeCloseTo(1.225, 3);
    expect(dry.soundSpeedMS).toBeCloseTo(340.294, 2);
    expect(dry.pressureSource).toBe('station-measurement');
    const humid = calculateAtmosphere({ ...standard, temperatureC: 20, relativeHumidityPct: 50 });
    expect(humid.vaporPressurePa).toBeCloseTo(1166.72031155, 6);
    expect(humid.densityKgM3).toBeCloseTo(1.198877356498, 9);
    const frozen = calculateAtmosphere({ ...standard, temperatureC: 0, relativeHumidityPct: 100 });
    expect(frozen.saturationVaporPressurePa).toBe(610.94);
    expect(frozen.vaporPressurePa).toBe(610.94);
  });

  it('makes dry density proportional to pressure while dry sound speed depends only on temperature', () => {
    const dry = calculateAtmosphere(standard);
    const lowPressure = calculateAtmosphere({ ...standard, stationPressurePa: 80000 });
    expect(lowPressure.densityKgM3 / dry.densityKgM3).toBeCloseTo(80000 / 101325, 12);
    expect(lowPressure.soundSpeedMS).toBeCloseTo(dry.soundSpeedMS, 12);
    const warmer = calculateAtmosphere({ ...standard, temperatureC: 30 });
    expect(warmer.densityKgM3).toBeLessThan(dry.densityKgM3);
    expect(warmer.soundSpeedMS / dry.soundSpeedMS).toBeCloseTo(Math.sqrt(303.15 / 288.15), 12);
  });

  it('includes humidity in density and the ideal-mixture sound speed', () => {
    const dry = calculateAtmosphere({ ...standard, temperatureC: 20 });
    const humid = calculateAtmosphere({ ...standard, temperatureC: 20, relativeHumidityPct: 50 });
    expect(humid.densityKgM3).toBeLessThan(dry.densityKgM3);
    expect(humid.soundSpeedMS).toBeGreaterThan(dry.soundSpeedMS);
    // Independent mass-weighted heat-capacity form, rather than the implementation's mole fractions.
    const vaporDensity = humid.vaporPressurePa / (461.495 * 293.15);
    const vaporMassFraction = vaporDensity / humid.densityKgM3;
    const mixtureCv = ((1 - vaporMassFraction) * 287.05) / 0.4 + vaporMassFraction * 461.495 * 3;
    const mixtureR = (1 - vaporMassFraction) * 287.05 + vaporMassFraction * 461.495;
    expect(humid.soundSpeedMS ** 2).toBeCloseTo((1 + mixtureR / mixtureCv) * mixtureR * 293.15, 8);
  });

  it('estimates local pressure from sea-level weather, including elevations below sea level', () => {
    const input = {
      temperatureC: 20,
      relativeHumidityPct: 50,
      seaLevelPressurePa: 101325,
      altitudeM: 0,
    };
    const atSea = calculateAtmosphere(input);
    const direct = calculateAtmosphere({
      temperatureC: 20,
      relativeHumidityPct: 50,
      stationPressurePa: 101325,
    });
    expect(atSea.pressureSource).toBe('sea-level-estimate');
    expect(atSea.densityKgM3).toBe(direct.densityKgM3);
    expect(atSea.soundSpeedMS).toBe(direct.soundSpeedMS);
    const above = calculateAtmosphere({ ...input, altitudeM: 1000 });
    expect(above.pressurePa).toBeGreaterThan(90000);
    expect(above.pressurePa).toBeLessThan(90600);
    expect(above.densityKgM3).toBeLessThan(atSea.densityKgM3);
    expect(calculateAtmosphere({ ...input, altitudeM: -400 }).pressurePa).toBeGreaterThan(101325);
    expect(
      calculateAtmosphere({ ...input, altitudeM: 1000, seaLevelPressurePa: 100000 }).pressurePa,
    ).toBeLessThan(above.pressurePa);
  });

  it.each([
    { ...standard, temperatureC: -41 },
    { ...standard, temperatureC: 51 },
    { ...standard, relativeHumidityPct: -1 },
    { ...standard, relativeHumidityPct: 101 },
    { ...standard, stationPressurePa: 0 },
    { ...standard, stationPressurePa: Infinity },
    { ...standard, temperatureC: NaN },
    { ...standard, relativeHumidityPct: 100, stationPressurePa: 10 },
    { ...standard, altitudeM: 0 },
    { ...standard, seaLevelPressurePa: 101325, altitudeM: 0 },
    { temperatureC: 20, relativeHumidityPct: 50, altitudeM: 0 },
    { temperatureC: 20, relativeHumidityPct: 50, seaLevelPressurePa: 101325 },
    { temperatureC: 20, relativeHumidityPct: 50, seaLevelPressurePa: '101325', altitudeM: 0 },
    { temperatureC: 20, relativeHumidityPct: 50, seaLevelPressurePa: 101325, altitudeM: -501 },
    { temperatureC: 20, relativeHumidityPct: 50, seaLevelPressurePa: 101325, altitudeM: 11001 },
  ])('rejects incomplete, ambiguous or unsupported input: %j', (input) => {
    expect(() => calculateAtmosphere(input as AtmosphereInput)).toThrow(RangeError);
  });
});

describe('provider weather adapter', () => {
  it('converts confirmed source units and leaves all original fields unchanged', () => {
    const raw = {
      altitude: 1000 / 0.3048,
      weatherData: { temperature: 68, humidity: 50, pressure: 1013.25, windSpeed: 100 },
    };
    const before = structuredClone(raw);
    const expected = calculateAtmosphere({
      temperatureC: 20,
      relativeHumidityPct: 50,
      seaLevelPressurePa: 101325,
      altitudeM: 1000,
    });
    expect(importedAtmosphere(raw)).toEqual({
      airDensity: expected.densityKgM3,
      soundSpeed: expected.soundSpeedMS,
    });
    expect(raw).toEqual(before);
    expect(
      importedAtmosphere({ ...raw, weatherData: { ...raw.weatherData, windSpeed: 0 } }),
    ).toEqual(importedAtmosphere(raw));
    expect(
      importedAtmosphere({
        altitude: 0,
        weatherData: { temperature: 32, humidity: 0, pressure: 1013.25 },
      }).airDensity,
    ).toBeGreaterThan(0);
  });

  it.each(['altitude', 'temperature', 'humidity', 'pressure'])(
    'leaves both values empty for absent or nonnumeric %s instead of assuming a standard value',
    (field) => {
      for (const invalid of [undefined, null, '', '0', false, NaN, Infinity]) {
        const raw = {
          altitude: 0,
          weatherData: { temperature: 68, humidity: 50, pressure: 1013.25 },
        };
        Object.assign(field === 'altitude' ? raw : raw.weatherData, { [field]: invalid });
        expect(importedAtmosphere(raw)).toEqual({ airDensity: null, soundSpeed: null });
      }
    },
  );

  it('treats out-of-range weather as unavailable rather than failing the import', () => {
    expect(
      importedAtmosphere({
        altitude: 0,
        weatherData: { temperature: 200, humidity: 50, pressure: 1013.25 },
      }),
    ).toEqual({ airDensity: null, soundSpeed: null });
    expect(importedAtmosphere({ airDensity: 1.2, soundSpeed: 340 })).toEqual({
      airDensity: null,
      soundSpeed: null,
    });
  });
});
