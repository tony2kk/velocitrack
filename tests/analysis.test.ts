import { describe, expect, it } from 'vitest';
import { availableQuantities, normalizeChart } from '../src/domain/analysis';
import {
  buildAnalysisTraces,
  chartStyle,
  findShotTargets,
  pointShotIds,
} from '../src/domain/chart';
import { defaultAnalysis, defaultProfile } from '../src/domain/model';
import { projectileName, projectileWeight } from '../src/domain/projectiles';
import { columnOrder, moveColumn, visibleColumns } from '../src/domain/table';
import { series, shot } from './fixtures/synthetic';

describe('analysis quantities and grouping', () => {
  it('resets incompatible distance quantities and retains valid shot preferences', () => {
    expect(normalizeChart({ axis: 'distance', quantity: 'g1', secondary: 'g7' })).toEqual({
      axis: 'distance',
      quantity: 'velocity',
      secondary: 'velocity',
    });
    expect(normalizeChart({ axis: 'shot', quantity: 'field:mass', secondary: 'g1' }).quantity).toBe(
      'field:mass',
    );
  });
  it('offers recorded source/context quantities, retains zero and converts only known dimensions', () => {
    const session = series({
      raw: {
        weatherData: { temperature: 32, pressure: 980 },
        statistics: { ballisticCoefficientG1: 0.25 },
      },
    });
    const rows = [shot({ ballisticCoefficientG1: null, ballisticCoefficientG7: 0.2 })];
    const quantities = availableQuantities(
      rows,
      [session],
      [{ id: 'mass', name: 'Sample mass', type: 'weight', order: 0 }],
      [{ entityId: 'series', notes: '', fields: {}, values: { mass: 0 } }],
      'metric',
    );
    expect(quantities.map((q) => q.id)).not.toContain('g1');
    expect(quantities.find((q) => q.id === 'source:weatherData.temperature')?.read(rows[0]!)).toBe(
      0,
    );
    expect(quantities.find((q) => q.id === 'source:weatherData.pressure')?.read(rows[0]!)).toBe(
      980,
    );
    expect(
      quantities.find((q) => q.id === 'source:statistics.ballisticCoefficientG1')?.read(rows[0]!),
    ).toBe(0.25);
    expect(quantities.find((q) => q.id === 'field:mass')?.read(rows[0]!)).toBe(0);
    expect(
      availableQuantities([{ seriesId: 'series' }], [session], [], [], 'imperial').some(
        (q) => q.id === 'source:weatherData.pressure',
      ),
    ).toBe(true);
  });
  it('merges duplicate shot numbers into one shared dual sequence and leaves missing readings as gaps', () => {
    const sessions = [series(), series({ id: 'other', startedAt: '2026-02-01T00:00:00Z' })];
    const rows = [
      shot({ id: 'a', ballisticCoefficientG1: 0.2 }),
      shot({ id: 'b', seriesId: 'other', ballisticCoefficientG1: null }),
      shot({ id: 'c', seriesId: 'other', number: 2, ballisticCoefficientG1: 0.3 }),
      shot({ id: 'excluded', excluded: true }),
    ];
    const traces = buildAnalysisTraces(rows, sessions, 'dual', defaultAnalysis().dual, 'metric');
    expect(traces).toHaveLength(2);
    expect(traces[0]?.data.map((p) => p.value)).toEqual([
      [1, 3.048],
      [2, 3.048],
      [3, 3.048],
    ]);
    expect(traces[1]?.data.map((p) => p.value)).toEqual([
      [1, 0.2],
      [2, null],
      [3, 0.3],
    ]);
    expect(findShotTargets(traces, 'b')).toEqual([{ seriesIndex: 0, dataIndex: 1 }]);
    const compared = buildAnalysisTraces(
      rows,
      sessions,
      'compare',
      defaultAnalysis().compare,
      'imperial',
    );
    expect(compared.find((trace) => trace.id === 'other')?.data.map((p) => p.value[0])).toEqual([
      1, 2,
    ]);
  });
  it('averages interpolated measured ranges without extrapolation or a fabricated shot identity', () => {
    const rows = [
      shot({ id: 'a', distances: [0, 10], velocities: [100, 80] }),
      shot({ id: 'b', distances: [5, 15], velocities: [110, 90] }),
    ];
    const trace = buildAnalysisTraces(
      rows,
      [series()],
      'compare',
      { ...defaultAnalysis().compare, axis: 'distance' },
      'imperial',
    )[0]!;
    expect(trace.data.map((p) => p.value)).toEqual([
      [0, 100],
      [5, 100],
      [10, 90],
      [15, 90],
    ]);
    expect(trace.data.map((p) => p.contributors)).toEqual([1, 2, 2, 1]);
    expect(findShotTargets([trace], 'a')).toEqual(
      [0, 1, 2].map((dataIndex) => ({ seriesIndex: 0, dataIndex })),
    );
    expect(pointShotIds(trace, trace.data[0])).toEqual(['a']);
    expect(pointShotIds(trace, trace.data[1])).toEqual(['a', 'b']);
    expect(pointShotIds(trace, trace.data[3])).toEqual(['b']);
    const disconnected = buildAnalysisTraces(
      [rows[0]!, shot({ id: 'c', distances: [20, 30], velocities: [70, 60] })],
      [series()],
      'compare',
      { ...defaultAnalysis().compare, axis: 'distance' },
      'imperial',
    )[0]!;
    expect(disconnected.data.map((p) => p.value)).toEqual([
      [0, 100],
      [10, 80],
      [15, null],
      [20, 70],
      [30, 60],
    ]);
    expect(pointShotIds(disconnected, disconnected.data[2])).toEqual([]);
  });
  it('keeps series colors independent of selection and adds shape/dash cues after palette reuse', () => {
    const config = defaultAnalysis().compare;
    const a = buildAnalysisTraces(
      [shot()],
      [series()],
      'compare',
      config,
      'imperial',
      false,
      undefined,
      ['other', 'series'],
    );
    const b = buildAnalysisTraces(
      [shot()],
      [series({ id: 'other' }), series()],
      'compare',
      config,
      'imperial',
      false,
      undefined,
      ['other', 'series'],
    );
    expect(a[0]?.color).toBe(b.find((trace) => trace.id === 'series')?.color);
    expect(chartStyle(0).color).not.toBe(chartStyle(1).color);
    expect(chartStyle(8).color).toBe(chartStyle(0).color);
    expect(chartStyle(8).dash).not.toBe(chartStyle(0).dash);
    expect(chartStyle(0, true).color).not.toBe(chartStyle(0).color);
  });
  it('uses the recorded projectile mass unit and preserves explicit unknown units', () => {
    const names = new Map([['projectile', 'Example projectile']]);
    expect(
      projectileName(series({ raw: { projectile: { weight: 150, weightUnit: 0 } } }), names, true),
    ).toBe('Example projectile 150.0 grs');
    expect(
      projectileName(series({ raw: { projectile: { weight: 2, weightUnit: 1 } } }), names, true),
    ).toBe('Example projectile 2.00 g');
    expect(
      projectileWeight(series({ raw: { projectile: { weight: 2, weightUnit: 99 } } }))?.grains,
    ).toBeNull();
    expect(
      projectileName(series({ raw: { projectile: { weight: 150, weightUnit: 0 } } }), names, false),
    ).toBe('Example projectile');
  });
  it('retains column selection/order and leaves the caller array unchanged', () => {
    const original = ['series', 'shot', 'g1', 'velocity'];
    expect(moveColumn(original, 'velocity', 'shot')).toEqual(['series', 'velocity', 'shot', 'g1']);
    expect(original).toEqual(['series', 'shot', 'g1', 'velocity']);
    expect(visibleColumns({ ...defaultProfile(), tableColumns: [] })).toEqual([]);
  });
  it('preserves legacy choices, hidden positions and unavailable IDs when definitions change', () => {
    const available = ['series', 'g1', 'velocity', 'new'].map((id) => ({ id, label: id }));
    const legacy = { ...defaultProfile(), tableColumns: ['g1', 'series'] };
    expect(columnOrder(available, legacy)).toEqual(['g1', 'series', 'velocity', 'new']);
    const saved = { ...legacy, tableColumnOrder: ['series', 'g1', 'future', 'velocity'] };
    expect(visibleColumns(saved)).toEqual(['series', 'g1']);
    expect(columnOrder(available, saved)).toEqual(['series', 'g1', 'future', 'velocity', 'new']);
    expect(visibleColumns({ ...saved, tableColumns: [] })).toEqual([]);
    expect(
      visibleColumns({ ...defaultProfile(), showTags: true, visibleFieldIds: ['custom'] }),
    ).toContain('field:custom');
  });
});
