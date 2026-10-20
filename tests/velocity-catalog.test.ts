import { describe, expect, it } from 'vitest';
import { calculatedVelocity } from '../src/domain/calculatedVelocity';
import { calculatedVelocityG1Curve } from '../src/domain/distanceCurves/calculatedVelocityG1';
import { calculatedVelocityG7Curve } from '../src/domain/distanceCurves/calculatedVelocityG7';
import {
  createDistanceCurveRegistry,
  dispatchDistanceCurve,
  distanceCurveRegistry,
} from '../src/domain/distanceCurves/registry';
import { centeredSamplesCurve } from '../src/domain/distanceCurves/template';
import { series, shot } from './fixtures/synthetic';

describe('calculated quantities in the custom catalog', () => {
  it('allows each existing model to be registered or omitted independently of the built-in measurement', () => {
    const empty = createDistanceCurveRegistry([]);
    const one = createDistanceCurveRegistry([calculatedVelocityG7Curve]);
    expect(empty.get('velocity')).toBeDefined();
    expect(empty.get('calculated:g1')).toBeUndefined();
    expect(empty.get('calculated:g7')).toBeUndefined();
    expect(one.get('calculated:g1')).toBeUndefined();
    expect(one.get('calculated:g7')?.usesForecast).toBe(true);
    expect(dispatchDistanceCurve('calculated:g1', shot(), 50, empty).issue).toBe('unknown');
    expect(distanceCurveRegistry.get('calculated:g1')?.model).toBe('g1');
    expect(distanceCurveRegistry.get('calculated:g7')?.model).toBe('g7');
  });

  it.each([
    ['g1', calculatedVelocityG1Curve],
    ['g7', calculatedVelocityG7Curve],
  ] as const)(
    'preserves the existing %s output through the full readonly custom-context path',
    (model, definition) => {
      const input = shot({
        muzzleVelocity: 1000,
        ballisticCoefficientG1: 0.3,
        ballisticCoefficientG7: 0.2,
        raw: { note: 'Synthetic catalog regression' },
      });
      const before = structuredClone(input);
      const registry = createDistanceCurveRegistry([definition]);
      const expected = calculatedVelocity(input, model, 50).map(({ distance, velocity }) => ({
        distance,
        value: velocity,
      }));
      expect(
        dispatchDistanceCurve(definition.id, input, 50, registry, { series: [series()] }),
      ).toEqual({
        points: expected,
      });
      expect(input).toEqual(before);
      expect(registry.get(definition.id)?.axisKey).toBe('velocity');
    },
  );

  it('keeps legacy IDs unique and rejects invented calculated families', () => {
    expect(() =>
      createDistanceCurveRegistry([calculatedVelocityG1Curve, calculatedVelocityG1Curve]),
    ).toThrow(/duplicate/);
    expect(() =>
      createDistanceCurveRegistry([{ ...centeredSamplesCurve, id: 'calculated:other' as never }]),
    ).toThrow(/Invalid/);
  });
});
