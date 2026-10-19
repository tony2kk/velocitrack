import { describe, expect, it } from 'vitest';
import {
  calculatedVelocity,
  dragCoefficient,
  MAX_FORECAST_DISTANCE,
  predictionInputs,
} from '../src/domain/calculatedVelocity';
import {
  buildAnalysisTraces,
  findShotTargets,
  formatPointTooltip,
  pointShotIds,
} from '../src/domain/chart';
import { defaultAnalysis } from '../src/domain/model';
import { distanceQuantities, normalizeChart } from '../src/domain/analysis';
import { series, shot } from './fixtures/synthetic';

describe('calculated velocity', () => {
  it.each([
    ['g1', 0.5, 100, 836.3292489615599],
    ['g1', 0.5, 300, 717.4189366069031],
    ['g1', 0.5, 1000, 390.6600472252526],
    ['g7', 0.25, 100, 836.5913844753118],
    ['g7', 0.25, 300, 716.9725266477253],
    ['g7', 0.25, 1000, 373.41411238409785],
  ] as const)(
    'matches independent exact piecewise-drag integration for %s at %s BC / %s m',
    (model, bc, distance, expected) => {
      // Reference integrates 1/[v*(A+B*v)] analytically in each Cd table interval, then bisects distance.
      const input = shot({
        muzzleVelocity: 900 / 0.3048,
        ballisticCoefficientG1: bc,
        ballisticCoefficientG7: bc,
      });
      const result = calculatedVelocity(input, model, distance / 0.3048);
      expect(Math.abs(result.at(-1)!.velocity * 0.3048 - expected)).toBeLessThan(0.002);
    },
  );
  it('interpolates the published transonic tables and rejects unsupported Mach', () => {
    expect(dragCoefficient('g1', 1)).toBe(0.4805);
    expect(dragCoefficient('g7', 1)).toBe(0.3803);
    expect(dragCoefficient('g7', 1.0125)).toBeCloseTo((0.3803 + 0.4015) / 2, 12);
    expect(dragCoefficient('g1', 5.01)).toBeNull();
  });
  it('requires the matching coefficient and bounded positive inputs, without borrowing from other fields', () => {
    const input = shot({ muzzleVelocity: 1000, ballisticCoefficientG1: 0.3 });
    expect(predictionInputs(input, 'g7')).toBeNull();
    expect(calculatedVelocity(input, 'g7')).toEqual([]);
    expect(calculatedVelocity(input, 'g1', MAX_FORECAST_DISTANCE + 1)).toEqual([]);
    expect(calculatedVelocity({ ...input, muzzleVelocity: null }, 'g1')).toEqual([]);
    expect(calculatedVelocity({ ...input, ballisticCoefficientG1: -1 }, 'g1')).toEqual([]);
    expect(calculatedVelocity({ ...input, muzzleVelocity: 100000 }, 'g1')).toEqual([]);
  });
  it.each(['g1', 'g7'] as const)(
    'matches an independent exact low-Mach solution for %s and leaves source samples unchanged',
    (model) => {
      const input = shot({
        muzzleVelocity: 10 / 0.3048,
        ballisticCoefficientG1: 0.5,
        ballisticCoefficientG7: 0.5,
        distances: [5, 10],
        velocities: [30, 28],
      });
      const original = structuredClone(input);
      const result = calculatedVelocity(input, model, 100 / 0.3048);
      // On Mach 0..0.05 Cd=A+B*v. Solve dv/dx=-K*v*(A+B*v) analytically, independently of RK4.
      const A = model === 'g1' ? 0.2629 : 0.1198;
      const B = ((model === 'g1' ? 0.2558 : 0.1197) - A) / (0.05 * 340.294);
      const K = (1.225 * Math.PI) / ((8 * 0.5 * 0.45359237) / 0.0254 ** 2);
      const exp = Math.exp(-K * A * 100);
      const exact = (A * 10 * exp) / (A + B * 10 * (1 - exp));
      expect(result.at(-1)!.velocity * 0.3048).toBeCloseTo(exact, 8);
      expect(result[0]).toEqual({ distance: 0, velocity: input.muzzleVelocity });
      expect(
        result.every((point, index) => index === 0 || point.velocity < result[index - 1]!.velocity),
      ).toBe(true);
      expect(input).toEqual(original);
    },
  );
  it('plots measured and predicted values on one distance scale with separate identities and model tooltips', () => {
    const input = shot({
      muzzleVelocity: 1000,
      ballisticCoefficientG1: 0.3,
      distances: [10, 20],
      velocities: [995, 990],
    });
    const settings = {
      ...defaultAnalysis().dual,
      axis: 'distance' as const,
      quantity: 'velocity',
      secondary: 'calculated:g1',
      forecastDistance: 100,
    };
    const traces = buildAnalysisTraces([input], [series()], 'dual', settings, 'metric');
    expect(traces).toHaveLength(2);
    expect(traces[0]!.data[0]!.value[0]).toBe(3.048);
    expect(traces[1]!.data[0]!.value).toEqual([0, 304.8]);
    expect(traces[1]!.data.at(-1)!.value[0]).toBeCloseTo(30.48);
    expect(traces[1]!.dash).toBe('dashed');
    expect(formatPointTooltip(traces[1]!.data[1]!)).toContain('G1 model');
    expect(formatPointTooltip(traces[1]!.data[1]!)).not.toContain('Sample');
    expect(findShotTargets(traces, input.id)).toHaveLength(2);
  });
  it('averages predictions with exact contributors, bounds work, and keeps missing models unavailable', () => {
    const rows = Array.from({ length: 102 }, (_, i) =>
      shot({
        id: String(i),
        muzzleVelocity: 1000 + i,
        ballisticCoefficientG7: i === 0 ? null : 0.2,
      }),
    );
    const settings = {
      ...defaultAnalysis().compare,
      axis: 'distance' as const,
      quantity: 'calculated:g7',
      forecastDistance: 100,
    };
    const trace = buildAnalysisTraces(rows, [series()], 'compare', settings, 'imperial')[0]!;
    expect(trace.data[0]!.contributors).toBe(100);
    expect(pointShotIds(trace, trace.data[0])).toHaveLength(100);
    expect(pointShotIds(trace, trace.data[0])).not.toContain('0');
    expect(pointShotIds(trace, trace.data[0])).not.toContain('101');
    expect(distanceQuantities([rows[0]!], 'imperial')).toEqual([]);
    expect(normalizeChart({ ...settings, axis: 'shot' }).quantity).toBe('velocity');
  });
});
