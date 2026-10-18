import { describe, expect, it } from 'vitest';
import { chartGroupsCompatible, inspectPoints, summarizeShots } from '../src/domain/measurements';
import { shot } from './fixtures/synthetic';

describe('measurement quality', () => {
  it('removes paired zero padding, retains zero distance and preserves raw arrays', () => {
    const input = { distances: [0, 10, 0], velocities: [300, 290, 0] };
    expect(inspectPoints(input)).toEqual({
      points: [
        { distance: 0, velocity: 300, index: 0 },
        { distance: 10, velocity: 290, index: 1 },
      ],
      padding: 1,
      invalid: 0,
      unpaired: 0,
    });
    expect(input.distances).toEqual([0, 10, 0]);
  });
  it('reports invalid and unpaired samples without inventing pairs', () => {
    expect(
      inspectPoints({ distances: [-1, 1, 2, 3, 4], velocities: [10, 0, -5, NaN] }),
    ).toMatchObject({ padding: 0, invalid: 4, unpaired: 1, points: [] });
  });
});

describe('statistics', () => {
  it('uses sample SD, excludes flagged and nonpositive/missing readings', () => {
    const result = summarizeShots([
      shot({ muzzleVelocity: 10 }),
      shot({ muzzleVelocity: 14 }),
      shot({ muzzleVelocity: 100, excluded: true }),
      shot({ muzzleVelocity: 0 }),
      shot({ muzzleVelocity: null }),
    ]);
    expect(result).toMatchObject({ count: 2, mean: 12, spread: 4, incompatible: false });
    expect(result.sd).toBeCloseTo(Math.sqrt(8));
  });
  it('handles empty and single-shot groups without a misleading SD', () => {
    expect(summarizeShots([])).toMatchObject({ count: 0, mean: null, sd: null, spread: null });
    expect(summarizeShots([shot()])).toMatchObject({ count: 1, mean: 10, sd: null, spread: 0 });
  });
  it.each([{ rawUnit: 'other' }, { sourceId: 'other' }])(
    'does not aggregate incompatible sources/unit codes: %s',
    (patch) => {
      const input = [shot(), shot(patch)];
      expect(summarizeShots(input)).toMatchObject({ incompatible: true, mean: null, sd: null });
      expect(chartGroupsCompatible(input)).toBe(false);
    },
  );
  it('does not let an excluded unit group block an included comparison', () => {
    expect(chartGroupsCompatible([shot(), shot({ rawUnit: 'other', excluded: true })])).toBe(true);
  });
});
