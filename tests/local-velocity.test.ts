import { describe, expect, it } from 'vitest';
import {
  calculatedVelocity,
  predictionInputs,
  STANDARD_ATMOSPHERE,
} from '../src/domain/distanceCurves/velocityCalculation';
import {
  dispatchDistanceCurve,
  distanceCurveRegistry,
} from '../src/domain/distanceCurves/registry';
import { distanceQuantities } from '../src/domain/analysis';
import { buildAnalysisTraces, formatPointTooltip } from '../src/domain/chart';
import { defaultAnalysis } from '../src/domain/model';
import { series, shot } from './fixtures/synthetic';

describe('experimental local-atmosphere velocity', () => {
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
      `curve:velocity-${model}-local`,
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
    ).toEqual(standard);
    // Distance metadata has no established unit/sign convention yet; neither variant applies it.
    const baseline = dispatchDistanceCurve(
      `curve:velocity-${model}-local`,
      input,
      100,
      distanceCurveRegistry,
      data,
    );
    data.series[0]!.raw.distanceToChronograph = 17;
    expect(
      dispatchDistanceCurve(
        `curve:velocity-${model}-local`,
        input,
        100,
        distanceCurveRegistry,
        data,
      ),
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
        `curve:velocity-${model}-local`,
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

  it('rejects missing, invalid or unrelated atmosphere without silently using standard conditions', () => {
    const input = shot({
      muzzleVelocity: 1000,
      ballisticCoefficientG1: 0.3,
      ballisticCoefficientG7: 0.2,
    });
    for (const id of ['curve:velocity-g1-local', 'curve:velocity-g7-local']) {
      expect(dispatchDistanceCurve(id, input, 100).issue).toBe('unavailable');
      for (const field of ['airDensity', 'soundSpeed'] as const) {
        for (const value of [undefined, null, 0, -1, NaN, Infinity]) {
          const data = { series: [series({ airDensity: 1.1, soundSpeed: 345, [field]: value })] };
          expect(dispatchDistanceCurve(id, input, 100, distanceCurveRegistry, data).issue).toBe(
            'unavailable',
          );
        }
      }
      const unrelated = {
        series: [series({ sourceId: 'another-source', airDensity: 1.1, soundSpeed: 345 })],
      };
      expect(dispatchDistanceCurve(id, input, 100, distanceCurveRegistry, unrelated).issue).toBe(
        'unavailable',
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
        secondary: `curve:velocity-${model}-local`,
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
      expect(tooltip).toContain('local atmosphere (experimental)');
      expect(tooltip).toContain(`BC ${model === 'g1' ? '0.3' : '0.2'}`);
      expect(tooltip).not.toContain('standard atmosphere');
    },
  );

  it('compares each string using its own weather and omits shots without local inputs', () => {
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
      quantity: 'curve:velocity-g1-local',
      forecastDistance: 100,
    };
    const traces = buildAnalysisTraces(rows, parents, 'compare', settings, 'imperial');
    const byId = new Map(traces.map((trace) => [trace.id, trace]));
    expect(byId.get('missing')!.data).toEqual([]);
    expect(byId.get('series')!.data.at(-1)!.value[1]).toBeGreaterThan(
      byId.get('dense')!.data.at(-1)!.value[1]!,
    );
    for (const id of ['series', 'dense']) {
      expect(formatPointTooltip(byId.get(id)!.data[0]!)).toContain(
        'local atmosphere (experimental)',
      );
      expect(byId.get(id)!.data[0]!.contributors).toBe(1);
    }
  });
});
