import { describe, expect, it } from 'vitest';
import {
  calculatedFlight,
  calculatedVelocity,
  MAX_FORECAST_DISTANCE,
} from '../src/domain/distanceCurves/velocityCalculation';
import { calculatedDropG1Curve } from '../src/domain/distanceCurves/calculatedDropG1';
import { calculatedDropG7Curve } from '../src/domain/distanceCurves/calculatedDropG7';
import {
  createDistanceCurveRegistry,
  dispatchDistanceCurve,
  distanceAxisIndex,
  distanceCurveRegistry,
} from '../src/domain/distanceCurves/registry';
import { buildAnalysisTraces, formatPointTooltip, pointShotIds } from '../src/domain/chart';
import { defaultAnalysis } from '../src/domain/model';
import { distanceQuantities, normalizeChart } from '../src/domain/analysis';
import { series, shot } from './fixtures/synthetic';

describe('calculated drop catalog and chart integration', () => {
  it.each([
    ['g1', calculatedDropG1Curve],
    ['g7', calculatedDropG7Curve],
  ] as const)(
    'uses the unchanged %s speed path and matching BC without mutating source records',
    (model, curve) => {
      const input = shot({
        muzzleVelocity: 900 / 0.3048,
        ballisticCoefficientG1: 0.5,
        ballisticCoefficientG7: 0.25,
        raw: { untouched: 'synthetic' },
      });
      const original = structuredClone(input);
      const points = calculatedFlight(input, model, MAX_FORECAST_DISTANCE, true);
      expect(points.map(({ distance, velocity }) => ({ distance, velocity }))).toEqual(
        calculatedVelocity(input, model, MAX_FORECAST_DISTANCE),
      );
      expect(points).toHaveLength(201);
      expect(points[0]!.drop).toBe(0);
      expect(
        points.every(
          (point, index) =>
            Number.isFinite(point.drop) && (index === 0 || point.drop > points[index - 1]!.drop),
        ),
      ).toBe(true);
      const result = dispatchDistanceCurve(curve.id, input, 100);
      expect(result.issue).toBeUndefined();
      expect(result.points[0]).toEqual({ distance: 0, value: 0 });
      const unavailable = {
        ...input,
        [model === 'g1' ? 'ballisticCoefficientG1' : 'ballisticCoefficientG7']: null,
      };
      expect(dispatchDistanceCurve(curve.id, unavailable, 100).issue).toBe('unavailable');
      expect(dispatchDistanceCurve(curve.id, input, Infinity).issue).toBe('invalid-output');
      expect(calculatedFlight({ ...input, muzzleVelocity: NaN }, model, 100, true)).toEqual([]);
      expect(input).toEqual(original);
      const one = createDistanceCurveRegistry([curve]);
      expect(one.get(curve.id)).toBeDefined();
      expect(distanceCurveRegistry.get(curve.id)?.usesForecast).toBe(true);
    },
  );
  it('converts drop to cm/in, keeps speed on a separate axis and preserves tooltip/shot identity', () => {
    const input = shot({
      muzzleVelocity: 1000,
      ballisticCoefficientG1: 0.3,
      ballisticCoefficientG7: 0.2,
    });
    const settings = {
      ...defaultAnalysis().dual,
      axis: 'distance' as const,
      quantity: 'calculated:g1',
      secondary: 'curve:drop-g1',
      forecastDistance: 100,
    };
    const metric = buildAnalysisTraces([input], [series()], 'dual', settings, 'metric');
    const imperial = buildAnalysisTraces([input], [series()], 'dual', settings, 'imperial');
    expect(metric.map((trace) => trace.yAxisIndex)).toEqual([0, 1]);
    expect(metric[1]!.data.at(-1)!.value[1]! / imperial[1]!.data.at(-1)!.value[1]!).toBeCloseTo(
      2.54,
      12,
    );
    expect(metric[1]!.data.at(-1)!.value[0]).toBeCloseTo(30.48);
    expect(imperial[1]!.data.at(-1)!.value[0]).toBeCloseTo(100);
    expect(metric[1]!.data[0]!.value).toEqual([0, 0]);
    expect(metric[1]!.dash).toBe('dashed');
    const tooltip = formatPointTooltip(metric[1]!.data[1]!);
    expect(tooltip).toContain('Calculated drop (G1) (cm)');
    expect(tooltip).toContain('BC 0.3');
    expect(tooltip).toContain('Positive downward from the horizontal muzzle axis');
    expect(pointShotIds(metric[1]!, metric[1]!.data[1])).toEqual([input.id]);
    expect(distanceAxisIndex('curve:drop-g1', 'curve:drop-g7')).toBe(0);
    expect(distanceQuantities([input], 'metric').map((q) => q.id)).toContain('curve:drop-g7');
    expect(normalizeChart({ ...settings, axis: 'shot', quantity: 'curve:drop-g1' }).quantity).toBe(
      'velocity',
    );
  });
  it('averages supported shots, preserves contributor identity and bounds work in comparison mode', () => {
    const rows = Array.from({ length: 102 }, (_, index) =>
      shot({
        id: `synthetic-${index}`,
        muzzleVelocity: 1000 + index,
        ballisticCoefficientG7: index === 0 ? null : 0.2,
      }),
    );
    const settings = {
      ...defaultAnalysis().compare,
      axis: 'distance' as const,
      quantity: 'curve:drop-g7',
      forecastDistance: 100,
    };
    const trace = buildAnalysisTraces(rows, [series()], 'compare', settings, 'imperial')[0]!;
    expect(trace.data[0]!.contributors).toBe(100);
    expect(pointShotIds(trace, trace.data[0])).toHaveLength(100);
    expect(pointShotIds(trace, trace.data[0])).not.toContain('synthetic-0');
    expect(pointShotIds(trace, trace.data[0])).not.toContain('synthetic-101');
    expect(formatPointTooltip(trace.data[1]!)).toContain('Positive downward');
  });
});
