import { describe, expect, it } from 'vitest';
import { filterDateError, filterSeries } from '../src/domain/filters';
import { EMPTY_FILTERS } from '../src/domain/model';
import { series } from './fixtures/synthetic';

describe('saved workspace filters', () => {
  it('uses OR within a list and AND across lists, with empty meaning all', () => {
    const records = [
      series({ id: 'a', sourceId: 'a' }),
      series({ id: 'b', sourceId: 'b' }),
      series({ id: 'c', sourceId: 'c' }),
      series({ id: 'd', sourceId: 'b', firearmId: 'other' }),
    ];
    expect(filterSeries(records, EMPTY_FILTERS)).toHaveLength(4);
    expect(
      filterSeries(records, {
        ...EMPTY_FILTERS,
        sourceIds: ['a', 'b'],
        firearmIds: ['firearm'],
      }).map((item) => item.id),
    ).toEqual(['a', 'b']);
  });
  it('includes both local date boundaries and excludes undated records', () => {
    const start = new Date(2026, 0, 5, 0, 0, 0).toISOString();
    const end = new Date(2026, 0, 5, 23, 59, 59, 999).toISOString();
    const records = [
      series({ id: 'start', startedAt: start }),
      series({ id: 'end', startedAt: end }),
      series({ id: 'missing', startedAt: null }),
      series({ id: 'earlier', startedAt: new Date(2026, 0, 4, 23, 59).toISOString() }),
    ];
    expect(
      filterSeries(records, {
        ...EMPTY_FILTERS,
        dateMode: 'range',
        dateFrom: '2026-01-05',
        dateTo: '2026-01-05',
      }).map((item) => item.id),
    ).toEqual(['end', 'start']);
  });
  it('reports impossible or reversed dates', () => {
    expect(
      filterDateError({ ...EMPTY_FILTERS, dateMode: 'range', dateFrom: '2026-02-30' }),
    ).toBeTruthy();
    expect(
      filterSeries([series()], {
        ...EMPTY_FILTERS,
        dateMode: 'range',
        dateFrom: '2026-02-01',
        dateTo: '2026-01-01',
      }),
    ).toEqual([]);
  });
  it('clamps relative months at the end of the shorter month', () => {
    const now = new Date(2026, 2, 31, 12);
    const records = [
      series({ id: 'included', startedAt: new Date(2026, 1, 28, 12).toISOString() }),
      series({ id: 'earlier', startedAt: new Date(2026, 1, 28, 11).toISOString() }),
      series({ id: 'future', startedAt: new Date(2026, 3, 1).toISOString() }),
    ];
    expect(
      filterSeries(records, { ...EMPTY_FILTERS, dateMode: 'months', relativeAmount: 1 }, now).map(
        (item) => item.id,
      ),
    ).toEqual(['included']);
  });
  it('recomputes relative weeks at each opening rather than freezing a saved range', () => {
    const records = [series({ startedAt: new Date(2026, 0, 10, 12).toISOString() })];
    const filters = { ...EMPTY_FILTERS, dateMode: 'weeks' as const, relativeAmount: 1 };
    expect(filterSeries(records, filters, new Date(2026, 0, 15, 12))).toHaveLength(1);
    expect(filterSeries(records, filters, new Date(2026, 0, 20, 12))).toHaveLength(0);
  });
});
