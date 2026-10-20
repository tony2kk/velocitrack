import { describe, expect, it, vi } from 'vitest';
import { createDistanceCurveContext } from '../src/domain/distanceCurves/context';
import {
  createDistanceCurveRegistry,
  dispatchDistanceCurve,
  supportsDistanceCurve,
} from '../src/domain/distanceCurves/registry';
import type { DistanceCurveContext, DistanceCurveData } from '../src/domain/distanceCurves/types';
import { buildAnalysisTraces } from '../src/domain/chart';
import { contextCurve } from './fixtures/contextCurve';
import { series, shot } from './fixtures/synthetic';

/** Fresh synthetic records include arbitrary nested metadata and separate local annotations. */
function records(): DistanceCurveData {
  return {
    series: [series({ raw: { sampleGroup: 'enabled', details: { labels: ['recorded'] } } })],
    annotations: [
      {
        entityId: 'series',
        notes: 'Local string note',
        fields: {},
        values: { score: 7 },
        tagIds: ['tag'],
      },
      {
        entityId: 'shot',
        notes: 'Local shot note',
        fields: { checked: { type: 'boolean', value: false } },
      },
      { entityId: 'unrelated', notes: 'Not part of the context', fields: {} },
    ],
    fields: [{ id: 'score', name: 'Review score', type: 'number', order: 0 }],
    tags: [
      { id: 'tag', name: 'Reviewed', color: '#123456' },
      { id: 'other', name: 'Unassigned', color: '#654321' },
    ],
  };
}

describe('full distance-function context', () => {
  it('preserves every normalized and raw attribute while detaching nested records and annotations', () => {
    const input = shot({
      distances: [0, 0, 10],
      velocities: [0, 100, 95],
      raw: { reviewed: true, nested: { values: [0, false, null, ''] } },
    });
    const data = records();
    const before = structuredClone({ input, data });
    const context = createDistanceCurveContext(input, 50, data);
    expect(context.shot).toEqual(input);
    expect(context.string).toEqual(data.series[0]);
    expect(context.shotAnnotation).toEqual(data.annotations![1]);
    expect(context.stringAnnotation).toEqual(data.annotations![0]);
    expect(context.fields).toEqual(data.fields);
    expect(context.tags.map((tag) => tag.id)).toEqual(['tag']);
    expect(context.samples).toEqual([
      { distance: 0, value: 100, sampleIndex: 1 },
      { distance: 10, value: 95, sampleIndex: 2 },
    ]);
    expect(context.shot.distances).toEqual([0, 0, 10]);
    expect(context.shot).not.toBe(input);
    expect(context.string?.raw).not.toBe(data.series[0]!.raw);
    expect(Reflect.set(context.shot, 'number', 999)).toBe(false);
    expect(Reflect.set(context.shot.distances, '0', 999)).toBe(false);
    expect(Reflect.set(context.shot.raw.nested as object, 'values', [])).toBe(false);
    expect(Reflect.set(context.string!.raw.details as object, 'labels', [])).toBe(false);
    expect(Reflect.set(context.stringAnnotation!.values!, 'score', 999)).toBe(false);
    expect(Reflect.set(context.fields[0]!, 'name', 'Changed')).toBe(false);
    expect({ input, data }).toEqual(before);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(data.series[0]!.raw)).toBe(false);
  });

  it('uses source-scoped identity and represents absent strings and annotations explicitly', () => {
    const input = shot();
    const data = records();
    const wrongSource = series({ sourceId: 'other', name: 'Wrong source' });
    const absent = createDistanceCurveContext(input, 50, { ...data, series: [wrongSource] });
    expect(absent.string).toBeNull();
    expect(absent.stringAnnotation).toBeNull();
    const present = createDistanceCurveContext(input, 50, {
      ...data,
      series: [wrongSource, ...data.series],
    });
    expect(present.string).toEqual(data.series[0]);
    const withoutWorkspace = createDistanceCurveContext(input, 50);
    expect(withoutWorkspace).toMatchObject({
      shot: input,
      string: null,
      shotAnnotation: null,
      stringAnnotation: null,
      fields: [],
      tags: [],
    });
  });

  it('passes the full context to availability and calculation, with fresh copies for each callback', () => {
    const seen: DistanceCurveContext[] = [];
    const available = vi.fn((input: DistanceCurveContext) => {
      seen.push(input);
      return contextCurve.available(input);
    });
    const calculate = vi.fn((input: DistanceCurveContext) => {
      seen.push(input);
      return contextCurve.calculate(input);
    });
    const registry = createDistanceCurveRegistry([{ ...contextCurve, available, calculate }]);
    const input = shot({ raw: { reviewed: true } });
    const data = records();
    expect(supportsDistanceCurve(registry.get(contextCurve.id)!, input)).toBe(false);
    expect(dispatchDistanceCurve(contextCurve.id, input, 50, registry, data).points).toEqual([
      { distance: 0, value: 7 },
      { distance: 10, value: 7 },
    ]);
    expect(seen.at(-1)?.maxDistance).toBe(50);
    expect(seen.at(-2)?.maxDistance).toBe(1000);
    expect(seen.at(-1)?.string).toEqual(seen.at(-2)?.string);
    expect(seen.at(-1)?.string).not.toBe(seen.at(-2)?.string);
    expect(calculate).toHaveBeenCalledTimes(1);
  });

  it.each(['simple', 'dual', 'compare'] as const)(
    'joins each shot to its own string in %s traces',
    (kind) => {
      const data = records();
      const second = series({ id: 'second', raw: { sampleGroup: 'enabled' } });
      const sessions = [...data.series, second];
      const annotations = [
        ...data.annotations!,
        { entityId: second.id, notes: '', fields: {}, values: { score: 13 } },
      ];
      const rows = [
        shot({ raw: { reviewed: true }, distances: [0, 10], velocities: [100, 95] }),
        shot({
          id: 'second-shot',
          seriesId: second.id,
          raw: { reviewed: true },
          distances: [0, 10],
          velocities: [100, 95],
        }),
      ];
      const traces = buildAnalysisTraces(
        rows,
        sessions,
        kind,
        { axis: 'distance', quantity: contextCurve.id, secondary: 'velocity' },
        'metric',
        false,
        undefined,
        undefined,
        createDistanceCurveRegistry([contextCurve]),
        { ...data, annotations },
      ).filter((trace) => trace.data[0]?.quantity === contextCurve.id);
      expect(traces).toHaveLength(2);
      const values = traces.map((trace) => trace.data.map((point) => point.value[1]));
      expect(values).toContainEqual([7, 7]);
      expect(values).toContainEqual([13, 13]);
      expect(traces.every((trace) => trace.data.at(-1)?.value[0] === 3.048)).toBe(true);
    },
  );

  it('contains failed mutation attempts without exposing diagnostics or changing originals', () => {
    const data = records();
    const input = shot({ raw: { reviewed: true } });
    const registry = createDistanceCurveRegistry([
      {
        ...contextCurve,
        calculate: (context) => {
          Object.assign(context.string!.raw, { sampleGroup: 'changed' });
          throw new Error('Private diagnostic must not appear');
        },
      },
    ]);
    expect(dispatchDistanceCurve(contextCurve.id, input, 50, registry, data)).toEqual({
      points: [],
      issue: 'failed',
    });
    expect(data.series[0]!.raw.sampleGroup).toBe('enabled');
  });
});
