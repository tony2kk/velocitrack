import { describe, expect, it, vi } from 'vitest';
import {
  createDistanceCurveRegistry,
  dispatchDistanceCurve,
  distanceAxisIndex,
  MAX_CURVE_POINTS,
  supportsDistanceCurve,
} from '../src/domain/distanceCurves/registry';
import { centeredSamplesCurve } from '../src/domain/distanceCurves/template';
import { calculatedVelocityG7Curve } from '../src/domain/distanceCurves/calculatedVelocityG7';
import type {
  CustomDistanceCurve,
  DistanceCurveInput,
  DistanceSample,
} from '../src/domain/distanceCurves/types';
import {
  buildAnalysisTraces,
  findShotTargets,
  pointShotIds,
  formatPointTooltip,
} from '../src/domain/chart';
import { series, shot } from './fixtures/synthetic';

/** Create a synthetic extension independent of any provider-specific model. */
function extension(patch: Partial<CustomDistanceCurve> = {}): CustomDistanceCurve {
  return { ...centeredSamplesCurve, ...patch };
}

describe('distance curve dispatch', () => {
  it('passes detached frozen canonical samples, drops padding, and leaves source arrays unchanged', () => {
    const input = shot({ distances: [0, 0, 10, 20], velocities: [0, 100, 95, 90] });
    const before = structuredClone(input);
    const calculate = vi.fn((context: DistanceCurveInput) => {
      expect(Object.isFrozen(context)).toBe(true);
      expect(Object.isFrozen(context.samples)).toBe(true);
      expect(Object.isFrozen(context.samples[0])).toBe(true);
      expect(context.maxDistance).toBe(50);
      expect(context.samples).toEqual([
        { distance: 0, value: 100, sampleIndex: 1 },
        { distance: 10, value: 95, sampleIndex: 2 },
        { distance: 20, value: 90, sampleIndex: 3 },
      ]);
      return [
        { distance: 0, value: 0 },
        { distance: 20, value: -10 },
      ];
    });
    const registry = createDistanceCurveRegistry([extension({ calculate })]);
    const result = dispatchDistanceCurve(centeredSamplesCurve.id, input, 50, registry);
    expect(result.points).toEqual([
      { distance: 0, value: 0 },
      { distance: 20, value: -10 },
    ]);
    expect(input).toEqual(before);
  });

  it.each([
    [{ distance: 0, value: NaN }],
    [{ distance: 0, value: Infinity }],
    [{ distance: -1, value: 1 }],
    [
      { distance: 2, value: 1 },
      { distance: 1, value: 2 },
    ],
    [
      { distance: 1, value: 1 },
      { distance: 1, value: 2 },
    ],
    Array.from({ length: MAX_CURVE_POINTS + 1 }, (_, distance) => ({ distance, value: 1 })),
  ])('rejects malformed output without changing the raw record', (...points) => {
    const input = shot({ distances: [0, 10], velocities: [100, 95] });
    const registry = createDistanceCurveRegistry([
      extension({ calculate: () => points as DistanceSample[] }),
    ]);
    expect(dispatchDistanceCurve(centeredSamplesCurve.id, input, 50, registry)).toMatchObject({
      points: [],
      issue: 'invalid-output',
    });
    expect(input.velocities).toEqual([100, 95]);
  });

  it('handles unknown IDs, unavailable inputs, thrown calculations and failed availability checks', () => {
    const calculate = vi.fn(() => {
      throw new Error('private diagnostic');
    });
    const registry = createDistanceCurveRegistry([extension({ calculate })]);
    const input = shot({ distances: [0], velocities: [100] });
    expect(dispatchDistanceCurve('curve:missing', input, 50, registry).issue).toBe('unknown');
    expect(
      dispatchDistanceCurve(centeredSamplesCurve.id, { ...input, excluded: true }, 50, registry)
        .issue,
    ).toBe('unavailable');
    expect(calculate).not.toHaveBeenCalled();
    expect(dispatchDistanceCurve(centeredSamplesCurve.id, input, 50, registry)).toEqual({
      points: [],
      issue: 'failed',
    });
    const broken = createDistanceCurveRegistry([
      extension({
        available: () => {
          throw new Error('unavailable');
        },
      }),
    ]);
    expect(supportsDistanceCurve(broken.get(centeredSamplesCurve.id)!, input)).toBe(false);
  });

  it('rejects duplicate identities and inconsistent unit transforms on a shared axis', () => {
    expect(() => createDistanceCurveRegistry([centeredSamplesCurve, centeredSamplesCurve])).toThrow(
      /duplicate/,
    );
    expect(() =>
      createDistanceCurveRegistry([
        extension({ axisKey: 'velocity', displayScale: () => ({ factor: 2, offset: 0 }) }),
      ]),
    ).toThrow(/Inconsistent/);
    expect(() =>
      createDistanceCurveRegistry([extension({ displayScale: () => ({ factor: 0, offset: 0 }) })]),
    ).toThrow(/presentation/);
  });
});

describe('generic distance traces', () => {
  it('uses a separate axis for a different canonical meaning, converts once and preserves identity', () => {
    const registry = createDistanceCurveRegistry([calculatedVelocityG7Curve, centeredSamplesCurve]);
    const input = shot({ distances: [0, 10, 20], velocities: [100, 95, 90] });
    const traces = buildAnalysisTraces(
      [input],
      [series()],
      'dual',
      {
        axis: 'distance',
        quantity: 'velocity',
        secondary: centeredSamplesCurve.id,
      },
      'metric',
      false,
      undefined,
      undefined,
      registry,
    );
    expect(traces.map((trace) => trace.yAxisIndex)).toEqual([0, 1]);
    expect(traces[1]!.data.map((point) => point.value)).toEqual([
      [0, 0],
      [3.048, -1.524],
      [6.096, -3.048],
    ]);
    expect(formatPointTooltip(traces[1]!.data[0]!)).toContain(
      'Measured change from first sample (m/s): 0.0',
    );
    expect(traces[1]!.data[1]!.quantityUnit).toBe('m/s');
    expect(formatPointTooltip(traces[1]!.data[1]!)).toContain(
      'Measured change from first sample (m/s): -1.5',
    );
    expect(formatPointTooltip(traces[1]!.data[0]!)).not.toContain('G1 model');
    expect(findShotTargets(traces, input.id)).toHaveLength(2);
    expect(distanceAxisIndex('velocity', 'calculated:g7', registry)).toBe(0);
    expect(distanceAxisIndex('velocity', centeredSamplesCurve.id, registry)).toBe(1);
  });

  it('does not interpolate through null gaps and links contributors on every remaining segment', () => {
    const definition = extension({
      calculate: () => [
        { distance: 0, value: 0 },
        { distance: 5, value: -5 },
        { distance: 10, value: null },
        { distance: 15, value: -15 },
        { distance: 20, value: -20 },
      ],
    });
    const registry = createDistanceCurveRegistry([definition]);
    const input = shot({ distances: [0], velocities: [100] });
    const [trace] = buildAnalysisTraces(
      [input],
      [series()],
      'compare',
      {
        axis: 'distance',
        quantity: definition.id,
        secondary: 'velocity',
      },
      'imperial',
      false,
      undefined,
      undefined,
      registry,
    );
    expect(trace!.data.map((point) => point.value)).toEqual([
      [0, 0],
      [5, -5],
      [10, null],
      [15, -15],
      [20, -20],
    ]);
    expect(pointShotIds(trace!, trace!.data[2])).toEqual([]);
    expect(pointShotIds(trace!, trace!.data[3])).toEqual([input.id]);
    expect(findShotTargets([trace!], input.id).map((target) => target.dataIndex)).toEqual([
      0, 1, 3, 4,
    ]);
  });

  it('bounds callbacks before running them and reports calculation failures instead of breaking traces', () => {
    const calculate = vi.fn(() => {
      throw new Error('private diagnostic');
    });
    const registry = createDistanceCurveRegistry([extension({ calculate })]);
    const inputs = Array.from({ length: 105 }, (_, i) =>
      shot({ id: String(i), distances: [0], velocities: [100] }),
    );
    const traces = buildAnalysisTraces(
      inputs,
      [series()],
      'compare',
      {
        axis: 'distance',
        quantity: centeredSamplesCurve.id,
        secondary: 'velocity',
      },
      'imperial',
      false,
      undefined,
      undefined,
      registry,
    );
    expect(calculate).toHaveBeenCalledTimes(100);
    expect(traces[0]!.data).toEqual([]);
    expect(traces[0]!.issue).toContain('100 curve(s) could not be calculated');
    expect(traces[0]!.issue).not.toContain('private diagnostic');
  });
});
