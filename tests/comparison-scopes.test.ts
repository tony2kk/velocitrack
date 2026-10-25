import { expect, it } from 'vitest';
import { availableQuantities, distanceQuantities, normalizeChart } from '../src/domain/analysis';
import { buildAnalysisTraces, formatPointTooltip, pointShotIds } from '../src/domain/chart';
import { series, shot } from './fixtures/synthetic';
import { emptyTarget } from '../src/domain/targetMeasurement';

it('compares one string value without requiring shots or repeating it per shot', () => {
  const parents = [series({ id: 'a' }), series({ id: 'b' })];
  const annotations = parents.map((item, index) => ({
    entityId: item.id,
    notes: '',
    fields: {},
    target: {
      ...emptyTarget(),
      values: { horizontalOffset: null, verticalOffset: null, groupSize: (index + 1) * 10 },
    },
  }));
  const quantities = availableQuantities(
    parents.map((item) => ({ seriesId: item.id })),
    parents,
    [{ id: 'list', name: 'List', type: 'list', order: 0, options: [] }],
    annotations,
    'metric',
  );
  const group = quantities.find((item) => item.id === 'target:groupSize')!;
  expect(group.scope).toBe('string');
  expect(quantities.some((item) => item.id === 'field:list')).toBe(false);
  const traces = buildAnalysisTraces(
    [],
    parents,
    'compare',
    { axis: 'string', quantity: group.id, secondary: 'g1' },
    'metric',
    false,
    quantities,
  );
  expect(traces.map((trace) => trace.data.map((point) => point.value))).toEqual([
    [[1, 1]],
    [[2, 2]],
  ]);
  expect(pointShotIds(traces[0]!, traces[0]!.data[0])).toEqual([]);
  expect(formatPointTooltip(traces[0]!.data[0]!)).toContain('String measurement');
  expect(normalizeChart({ axis: 'shot', quantity: group.id, secondary: 'g1' }, true).quantity).toBe(
    'velocity',
  );
});

it('offers individual measured traces only in comparison distance menus and colors them by string', () => {
  const rows = [
    shot({ id: 'a1', seriesId: 'a', distances: [0, 10], velocities: [0, 100] }),
    shot({ id: 'a2', seriesId: 'a', distances: [0, 10], velocities: [200, 190] }),
    shot({ id: 'b1', seriesId: 'b', distances: [0, 10], velocities: [300, 290] }),
  ];
  const parents = [series({ id: 'a' }), series({ id: 'b' })];
  expect(distanceQuantities(rows, 'metric').some((q) => q.id === 'velocity-detail')).toBe(false);
  expect(
    distanceQuantities(rows, 'metric', { series: parents }, true).some(
      (q) => q.id === 'velocity-detail',
    ),
  ).toBe(true);
  const settings = { axis: 'distance' as const, quantity: 'velocity-detail', secondary: 'g1' };
  const traces = buildAnalysisTraces(rows, parents, 'compare', settings, 'metric');
  expect(traces).toHaveLength(3);
  expect(traces[0]!.color).toBe(traces[1]!.color);
  expect(traces[0]!.color).not.toBe(traces[2]!.color);
  expect(traces[0]!.data).toHaveLength(1);
  expect(traces[1]!.data[0]!.value).toEqual([0, 60.96]);
  expect(pointShotIds(traces[1]!, traces[1]!.data[0])).toEqual(['a2']);
  expect(
    buildAnalysisTraces(rows, parents, 'compare', { ...settings, quantity: 'velocity' }, 'metric'),
  ).toHaveLength(2);
});
