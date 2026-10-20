import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculatedFlight } from '../src/domain/distanceCurves/velocityCalculation';
import { shot } from './fixtures/synthetic';

// Constant reference drag gives closed-form solutions independent of the numerical integrator.
const reference = vi.hoisted(() => ({ cd: 0 }));
vi.mock('../src/domain/dragTables', () => ({
  DRAG_TABLES: {
    get g1() {
      return [
        [0, reference.cd],
        [5, reference.cd],
      ];
    },
    get g7() {
      return [
        [0, reference.cd],
        [5, reference.cd],
      ];
    },
  },
}));
beforeEach(() => {
  reference.cd = 0;
});

describe('drop integration against independent analytic solutions', () => {
  it.each(['g1', 'g7'] as const)('matches vacuum drop for %s at every output distance', (model) => {
    const speed = 300;
    const points = calculatedFlight(
      shot({
        muzzleVelocity: speed / 0.3048,
        ballisticCoefficientG1: 0.2,
        ballisticCoefficientG7: 0.2,
      }),
      model,
      100 / 0.3048,
      true,
    );
    expect(points).toHaveLength(201);
    for (const point of points) {
      const time = (point.distance * 0.3048) / speed;
      expect(point.drop).toBeCloseTo(0.5 * 9.80665 * time ** 2 * 1000, 8);
    }
  });
  it.each(['g1', 'g7'] as const)(
    'includes the vertical drag effect in %s small-deflection drop',
    (model) => {
      reference.cd = 0.3;
      const speed = 900;
      const bc = 0.2;
      const distance = 1000;
      const k = (1.225 * Math.PI * reference.cd) / ((8 * bc * 0.45359237) / 0.0254 ** 2);
      // v(x)=v0*exp(-kx), hence D(x)=g/v0² * [(exp(2kx)-1)/(4k²)-x/(2k)].
      const expected =
        (9.80665 / speed ** 2) *
        (Math.expm1(2 * k * distance) / (4 * k ** 2) - distance / (2 * k)) *
        1000;
      const points = calculatedFlight(
        shot({
          muzzleVelocity: speed / 0.3048,
          ballisticCoefficientG1: bc,
          ballisticCoefficientG7: bc,
        }),
        model,
        distance / 0.3048,
        true,
      );
      expect(Math.abs(points.at(-1)!.drop - expected)).toBeLessThan(0.002);
      // Using 1/2*g*t² with drag-slowed horizontal flight would wrongly omit vertical drag.
      const time = Math.expm1(k * distance) / (k * speed);
      expect(points.at(-1)!.drop).toBeLessThan(0.5 * 9.80665 * time ** 2 * 1000);
    },
  );
});
