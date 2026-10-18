import { describe, expect, it } from 'vitest';
import { buildChartTraces, findShotTargets, formatPointTooltip } from '../src/domain/chart';
import { series, shot } from './fixtures/synthetic';

describe('chart identities and sample details', () => {
  it('preserves sample positions past padding, zero distance and original precision', () => {
    const traces = buildChartTraces(
      [shot({ distances: [0, 0, 10.123456], velocities: [0, 300, 295.123456] })],
      [series()],
      'distance',
    );
    expect(traces[0]?.data.map((point) => point.sampleIndex)).toEqual([1, 2]);
    const text = formatPointTooltip(traces[0]!.data[1]!);
    expect(text).toContain('Sample 3');
    expect(text).toContain('Distance: 10.123456 ft');
    expect(text).toContain('Velocity: 295.123456 ft/s');
  });

  it('distinguishes duplicate display numbers across series in both chart modes', () => {
    const shots = [
      shot({ id: 'one', distances: [0], velocities: [10] }),
      shot({ id: 'two', seriesId: 'other', distances: [0], velocities: [20] }),
    ];
    const groups = [series(), series({ id: 'other' })];
    expect(findShotTargets(buildChartTraces(shots, groups, 'distance'), 'two')).toEqual([
      { seriesIndex: 1, dataIndex: undefined },
    ]);
    expect(findShotTargets(buildChartTraces(shots, groups, 'shot'), 'two')).toEqual([
      { seriesIndex: 1, dataIndex: 0 },
    ]);
  });

  it('does not create highlights for excluded, invalid or unrendered shots', () => {
    const records = [
      shot({ id: 'excluded', excluded: true }),
      shot({ id: 'invalid', muzzleVelocity: null }),
    ];
    const traces = buildChartTraces(records, [series()], 'shot');
    expect(traces[0]?.data).toEqual([]);
    expect(findShotTargets(traces, 'excluded')).toEqual([]);
    expect(findShotTargets(traces, 'invalid')).toEqual([]);
    const many = Array.from({ length: 101 }, (_, index) =>
      shot({ id: String(index), distances: [0], velocities: [10] }),
    );
    expect(findShotTargets(buildChartTraces(many, [series()], 'distance'), '100')).toEqual([]);
  });
});
