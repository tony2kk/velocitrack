import { describe, expect, it } from 'vitest';
import {
  calculatedVelocity,
  predictionInputs,
  STANDARD_ATMOSPHERE,
} from '../src/domain/distanceCurves/velocityCalculation';
import {
  dispatchDistanceCurve,
  distanceCurveRegistry,
  describeCurveConditions,
} from '../src/domain/distanceCurves/registry';
import { distanceQuantities, normalizeChart } from '../src/domain/analysis';
import { buildAnalysisTraces, formatPointTooltip } from '../src/domain/chart';
import { defaultAnalysis } from '../src/domain/model';
import { series, shot } from './fixtures/synthetic';
import { importedAtmosphere } from '../src/sources/atmosphere';

describe('automatic velocity atmosphere', () => {
  it('maps historical local selections without duplicate traces or lost forecast settings', () => {
    const settings = {
      axis: 'distance' as const,
      quantity: 'calculated:g1',
      secondary: 'curve:velocity-g1-local',
      forecastDistance: 81,
    };
    expect(normalizeChart(settings)).toEqual({ ...settings, secondary: 'calculated:g1' });
    expect(normalizeChart({ ...settings, quantity: 'curve:velocity-g7-local' })).toMatchObject({
      quantity: 'calculated:g7',
      secondary: 'calculated:g1',
      forecastDistance: 81,
    });
    expect(
      distanceCurveRegistry.definitions
        .filter((curve) => curve.axisKey === 'velocity')
        .map((curve) => curve.id),
    ).toEqual(['velocity', 'calculated:g1', 'calculated:g7']);
  });

  it('describes estimated station pressure and humidity in notices and tooltips', () => {
    const raw = {
      altitude: 2000,
      weatherData: { temperature: 68, humidity: 50, pressure: 1013.25 },
    };
    const parent = series({ raw, ...importedAtmosphere(raw) });
    const input = shot({ muzzleVelocity: 1000, ballisticCoefficientG1: 0.3 });
    const data = { series: [parent] };
    const curve = distanceCurveRegistry.get('calculated:g1')!;
    const descriptions = describeCurveConditions(curve, [input], data);
    const expectedPressure =
      1013.25 * Math.exp((-9.80665 * 609.6) / (287.05 * (293.15 + (0.0065 * 609.6) / 2)));
    expect(descriptions).toEqual([
      `Atmosphere: 20.0 °C, ${expectedPressure.toFixed(2)} hPa, humid air (50% RH) (local; estimated station pressure).`,
    ]);
    const settings = {
      axis: 'distance' as const,
      quantity: curve.id,
      secondary: 'velocity',
      forecastDistance: 100,
    };
    const traces = buildAnalysisTraces([input], [parent], 'simple', settings, 'imperial');
    expect(formatPointTooltip(traces[0]!.data[0]!)).toContain(descriptions[0]);
    // Numerical output must still use the saved canonical pair, without a display-unit conversion.
    expect(traces[0]!.data.at(-1)!.value[1]).toBe(
      calculatedVelocity(input, 'g1', 100, {
        density: parent.airDensity!,
        soundSpeed: parent.soundSpeed!,
      }).at(-1)!.velocity,
    );
    const dryRaw = {
      altitude: 0,
      weatherData: { temperature: 59, humidity: 0, pressure: 1013.25 },
    };
    expect(
      describeCurveConditions(curve, [input], {
        series: [series({ raw: dryRaw, ...importedAtmosphere(dryRaw) })],
      })[0],
    ).toContain('dry air (local;');
  });

  it('summarizes only eligible plotted strings and respects the first 100 eligible shots', () => {
    const curve = distanceCurveRegistry.get('calculated:g1')!;
    const inputs = Array.from({ length: 100 }, (_, i) =>
      shot({ id: String(i), muzzleVelocity: 1000, ballisticCoefficientG1: 0.3 }),
    );
    const local = shot({
      id: 'local',
      seriesId: 'local',
      muzzleVelocity: 1000,
      ballisticCoefficientG1: 0.3,
    });
    const data = { series: [series(), series({ id: 'local', airDensity: 1.1, soundSpeed: 345 })] };
    expect(describeCurveConditions(curve, [...inputs, local], data)).toHaveLength(1);
    expect(describeCurveConditions(curve, [...inputs.slice(0, 99), local], data)).toHaveLength(2);
    expect(
      describeCurveConditions(curve, [{ ...local, excluded: true }, ...inputs], data)[0],
    ).toContain('standard fallback');
    expect(describeCurveConditions(curve, [shot()], data)).toEqual([]);
  });

  it.each(['g1', 'g7'] as const)('leaves %s drop under its stated standard conditions', (model) => {
    const input = shot({
      muzzleVelocity: 1000,
      ballisticCoefficientG1: 0.3,
      ballisticCoefficientG7: 0.2,
    });
    const baseline = dispatchDistanceCurve(`curve:drop-${model}`, input, 100);
    expect(
      dispatchDistanceCurve(`curve:drop-${model}`, input, 100, distanceCurveRegistry, {
        series: [series({ airDensity: 0.9, soundSpeed: 360 })],
      }),
    ).toEqual(baseline);
  });
  it.each(['g1', 'g7'] as const)('preserves standard %s results and source data', (model) => {
    const input = shot({
      muzzleVelocity: 1800,
      ballisticCoefficientG1: 0.3,
      ballisticCoefficientG7: 0.2,
    });
    const data = { series: [series({ airDensity: 1.225, soundSpeed: 340.294 })] };
    const before = structuredClone({ input, data });
    const standard = dispatchDistanceCurve(`calculated:${model}`, input, 100);
    const local = dispatchDistanceCurve(
      `calculated:${model}`,
      input,
      100,
      distanceCurveRegistry,
      data,
    );
    expect(local).toEqual(standard);
    expect(local.points[0]!.distance).toBe(0);
    expect(local.points[0]!.value).toBeCloseTo(input.muzzleVelocity!, 10);
    expect({ input, data }).toEqual(before);
    data.series[0]!.airDensity = 0.95;
    expect(
      dispatchDistanceCurve(`calculated:${model}`, input, 100, distanceCurveRegistry, data),
    ).not.toEqual(standard);
    // VelociRadar uses physical muzzle/radar alignment; even unexpected raw offsets cannot shift curves.
    const baseline = dispatchDistanceCurve(
      `calculated:${model}`,
      input,
      100,
      distanceCurveRegistry,
      data,
    );
    data.series[0]!.raw.distanceToChronograph = 17;
    expect(
      dispatchDistanceCurve(`calculated:${model}`, input, 100, distanceCurveRegistry, data),
    ).toEqual(baseline);
  });

  it.each(['g1', 'g7'] as const)(
    'matches independent low-Mach integration for local %s conditions',
    (model) => {
      const atmosphere = { density: 1.08, soundSpeed: 325 };
      const speed = 10;
      const input = shot({
        muzzleVelocity: speed / 0.3048,
        ballisticCoefficientG1: 0.5,
        ballisticCoefficientG7: 0.5,
      });
      const data = {
        series: [series({ airDensity: atmosphere.density, soundSpeed: atmosphere.soundSpeed })],
      };
      const result = dispatchDistanceCurve(
        `calculated:${model}`,
        input,
        100 / 0.3048,
        distanceCurveRegistry,
        data,
      );
      // Cd=A+B*v over the first reference interval. Integrate analytically, independently of RK4.
      const a = model === 'g1' ? 0.2629 : 0.1198;
      const b = ((model === 'g1' ? 0.2558 : 0.1197) - a) / (0.05 * atmosphere.soundSpeed);
      const k = (atmosphere.density * Math.PI) / ((8 * 0.5 * 0.45359237) / 0.0254 ** 2);
      const decay = Math.exp(-k * a * 100);
      const expected = (a * speed * decay) / (a + b * speed * (1 - decay));
      expect(result.issue).toBeUndefined();
      expect(result.points.at(-1)!.value! * 0.3048).toBeCloseTo(expected, 8);
    },
  );

  it.each(['g1', 'g7'] as const)(
    'uses density and local sound speed independently for %s',
    (model) => {
      const input = shot({
        muzzleVelocity: 350 / 0.3048,
        ballisticCoefficientG1: 0.3,
        ballisticCoefficientG7: 0.2,
      });
      const standard = calculatedVelocity(input, model, 300);
      const thin = calculatedVelocity(input, model, 300, { ...STANDARD_ATMOSPHERE, density: 0.9 });
      const warm = calculatedVelocity(input, model, 300, {
        ...STANDARD_ATMOSPHERE,
        soundSpeed: 360,
      });
      expect(thin.at(-1)!.velocity).toBeGreaterThan(standard.at(-1)!.velocity);
      expect(Math.abs(warm.at(-1)!.velocity - standard.at(-1)!.velocity)).toBeGreaterThan(0.1);
      for (const points of [thin, warm]) {
        expect(points).toHaveLength(201);
        expect(
          points.every(
            (point, i) =>
              Number.isFinite(point.velocity) &&
              point.velocity > 0 &&
              (i === 0 || point.velocity < points[i - 1]!.velocity),
          ),
        ).toBe(true);
      }
      // Input acceptance must use the same sound speed as integration, rather than clamp valid local Mach.
      const fast = { ...input, muzzleVelocity: 1600 / 0.3048 };
      expect(predictionInputs(fast, model, { density: 1.1, soundSpeed: 300 })).toBeNull();
      expect(predictionInputs(fast, model, { density: 1.1, soundSpeed: 400 })).not.toBeNull();
    },
  );

  it('falls back to the complete standard pair for missing, invalid or unrelated atmosphere', () => {
    const input = shot({
      muzzleVelocity: 1000,
      ballisticCoefficientG1: 0.3,
      ballisticCoefficientG7: 0.2,
    });
    for (const id of ['calculated:g1', 'calculated:g7']) {
      const standard = dispatchDistanceCurve(id, input, 100);
      expect(standard.issue).toBeUndefined();
      for (const field of ['airDensity', 'soundSpeed'] as const) {
        for (const value of [undefined, null, 0, -1, NaN, Infinity]) {
          const data = { series: [series({ airDensity: 1.1, soundSpeed: 345, [field]: value })] };
          expect(dispatchDistanceCurve(id, input, 100, distanceCurveRegistry, data)).toEqual(
            standard,
          );
        }
      }
      const unrelated = {
        series: [series({ sourceId: 'another-source', airDensity: 1.1, soundSpeed: 345 })],
      };
      expect(dispatchDistanceCurve(id, input, 100, distanceCurveRegistry, unrelated)).toEqual(
        standard,
      );
    }
    expect(distanceQuantities([input], 'metric').map((choice) => choice.id)).not.toContain(
      'curve:velocity-g1-local',
    );
    expect(calculatedVelocity(input, 'g1', 100, { density: NaN, soundSpeed: 340 })).toEqual([]);
    expect(calculatedVelocity(input, 'g7', 100, { density: 1.2, soundSpeed: 0 })).toEqual([]);
  });

  it.each(['g1', 'g7'] as const)(
    'keeps local %s metadata, units and matching BC on a shared axis',
    (model) => {
      const input = shot({
        muzzleVelocity: 1000,
        ballisticCoefficientG1: 0.3,
        ballisticCoefficientG7: 0.2,
        distances: [10, 20],
        velocities: [990, 980],
      });
      const parent = series({ airDensity: 1.1, soundSpeed: 345 });
      const settings = {
        ...defaultAnalysis().dual,
        axis: 'distance' as const,
        quantity: 'velocity',
        secondary: `calculated:${model}`,
        forecastDistance: 100,
      };
      const imperial = buildAnalysisTraces([input], [parent], 'dual', settings, 'imperial');
      const metric = buildAnalysisTraces([input], [parent], 'dual', settings, 'metric');
      expect(metric.map((trace) => trace.yAxisIndex)).toEqual([0, 0]);
      expect(metric[1]!.data.at(-1)!.value[0]).toBeCloseTo(
        imperial[1]!.data.at(-1)!.value[0] * 0.3048,
        10,
      );
      expect(metric[1]!.data.at(-1)!.value[1]).toBeCloseTo(
        imperial[1]!.data.at(-1)!.value[1]! * 0.3048,
        10,
      );
      const tooltip = formatPointTooltip(metric[1]!.data[0]!);
      expect(tooltip).toContain('local atmosphere');
      expect(tooltip).toContain(`BC ${model === 'g1' ? '0.3' : '0.2'}`);
      expect(tooltip).not.toContain('standard atmosphere');
    },
  );

  it('compares each string using its own weather with standard fallback for missing inputs', () => {
    const parents = [
      series({ airDensity: 1.1, soundSpeed: 345 }),
      series({ id: 'dense', airDensity: 1.3, soundSpeed: 320 }),
      series({ id: 'missing' }),
    ];
    const rows = parents.map((parent, i) =>
      shot({
        id: `shot-${i}`,
        seriesId: parent.id,
        muzzleVelocity: 1500,
        ballisticCoefficientG1: 0.3,
      }),
    );
    const settings = {
      ...defaultAnalysis().compare,
      axis: 'distance' as const,
      quantity: 'calculated:g1',
      forecastDistance: 100,
    };
    const traces = buildAnalysisTraces(rows, parents, 'compare', settings, 'imperial');
    const byId = new Map(traces.map((trace) => [trace.id, trace]));
    expect(byId.get('missing')!.data).toHaveLength(201);
    expect(formatPointTooltip(byId.get('missing')!.data[0]!)).toContain('standard fallback');
    expect(byId.get('series')!.data.at(-1)!.value[1]).toBeGreaterThan(
      byId.get('dense')!.data.at(-1)!.value[1]!,
    );
    for (const id of ['series', 'dense']) {
      expect(formatPointTooltip(byId.get(id)!.data[0]!)).toContain('local atmosphere');
      expect(byId.get(id)!.data[0]!.contributors).toBe(1);
    }
  });
});
