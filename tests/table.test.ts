import { describe, expect, it } from 'vitest';
import { sortShots } from '../src/domain/table';
import { availableQuantities } from '../src/domain/analysis';
import { buildAnalysisTraces } from '../src/domain/chart';
import { defaultAnalysis } from '../src/domain/model';
import { series, shot } from './fixtures/synthetic';

const sessions = [series({ name: 'String 10' }), series({ id: 'other', name: 'String 2' })];
const rows = [
  shot({ id: 'a', number: 3, ballisticCoefficientG1: 0.3 }),
  shot({ id: 'b', number: 1, ballisticCoefficientG1: 0.2 }),
  shot({ id: 'c', seriesId: 'other', number: 2, ballisticCoefficientG1: null }),
  shot({ id: 'd', seriesId: 'other', number: 1, ballisticCoefficientG1: 0.2 }),
];
const context = {
  quantities: availableQuantities(rows, sessions, [], [], 'imperial'),
  annotations: [],
  tags: [],
  catalog: [],
};

describe('table order shared with chart', () => {
  it('sorts mixed supported timestamp forms chronologically and leaves invalid dates last', () => {
    const timed = [
      shot({ id: 'a', raw: { timestamp: '2026-01-03T00:00:00Z' } }),
      shot({ id: 'b', raw: { timestamp: String(Date.parse('2026-01-01T00:00:00Z') / 1000) } }),
      shot({ id: 'c', raw: { timestamp: Date.parse('2026-01-02T00:00:00Z') } }),
      shot({ id: 'd', raw: { timestamp: 'unavailable' } }),
    ];
    expect(
      sortShots(timed, sessions, { columnId: 'timestamp', direction: 'asc' }, context).map(
        (s) => s.id,
      ),
    ).toEqual(['b', 'c', 'a', 'd']);
  });
  it('defaults to natural string names then shot numbers, without mutating input', () => {
    expect(sortShots(rows, sessions, undefined, context).map((s) => s.id)).toEqual([
      'd',
      'c',
      'b',
      'a',
    ]);
    expect(rows.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it.each(['asc', 'desc'] as const)(
    'sorts numeric values %s, keeps missing last and resolves ties by string/shot',
    (direction) => {
      const sorted = sortShots(rows, sessions, { columnId: 'g1', direction }, context);
      expect(sorted.map((s) => s.id)).toEqual(
        direction === 'asc' ? ['d', 'b', 'a', 'c'] : ['a', 'd', 'b', 'c'],
      );
      for (const kind of ['simple', 'dual', 'compare'] as const) {
        const traces = buildAnalysisTraces(
          sorted,
          sessions,
          kind,
          { ...defaultAnalysis()[kind], axis: 'shot' },
          'imperial',
        );
        for (const trace of traces) {
          const ids = new Set(trace.data.map((point) => point.shotId));
          expect(trace.data.map((point) => point.shotId)).toEqual(
            sorted.filter((s) => ids.has(s.id)).map((s) => s.id),
          );
          expect(trace.data.map((point) => point.value[0])).toEqual(
            trace.data.map((_, i) => i + 1),
          );
        }
      }
    },
  );
  it('sorts inherited text/numeric fields and tags as actual values', () => {
    const annotations = [
      {
        entityId: 'series',
        notes: '',
        fields: {},
        values: { text: 'Batch 10', mass: 20 },
        tagIds: ['a'],
      },
      {
        entityId: 'other',
        notes: '',
        fields: {},
        values: { text: 'Batch 2', mass: 3 },
        tagIds: ['b'],
      },
    ];
    const tags = [
      { id: 'a', name: 'Zebra', color: '#123456' },
      { id: 'b', name: 'Apple', color: '#123456' },
    ];
    for (const columnId of ['field:text', 'field:mass', 'tags'])
      expect(
        sortShots(
          rows,
          sessions,
          { columnId, direction: 'asc' },
          { ...context, annotations, tags },
        ).map((s) => s.id),
      ).toEqual(['d', 'c', 'b', 'a']);
  });
});
