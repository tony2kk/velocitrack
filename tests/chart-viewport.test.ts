import { describe, expect, it } from 'vitest';
import {
  alignExtent,
  applyZoom,
  displayRange,
  fitRange,
  retainViewport,
  setRightEdge,
  zoomPercent,
} from '../src/domain/chartViewport';

describe('axis viewport ranges', () => {
  it('preserves a view while its navigable domain grows, then explicitly fits current data', () => {
    const memory = new Map();
    const axis = retainViewport(memory, 'distance', [0, 100]);
    applyZoom(axis, 20, 80);
    const next = retainViewport(memory, 'distance', [0, 200]);
    expect(next).toEqual({ extent: [0, 200], window: [20, 80] });
    expect(zoomPercent(next)).toEqual([10, 40]);
    expect(retainViewport(memory, 'distance', [10, 30], true).window).toEqual([10, 30]);
  });
  it('aligns separate vertical axes without changing their visible values', () => {
    const view = { extent: [0, 1] as [number, number], window: [0.2, 0.4] as [number, number] };
    alignExtent(view, [25, 75]);
    expect(view.extent[0]).toBeCloseTo(0.1);
    expect(view.extent[1]).toBeCloseTo(0.5);
    expect(view.window).toEqual([0.2, 0.4]);
    expect(applyZoom(view, NaN, 80)).toBe(false);
    expect(applyZoom(view, 50, 50)).toBe(false);
  });
  it('handles missing and constant data, crossed left edges and affine unit conversion', () => {
    expect(fitRange([null, NaN, Infinity])).toBeNull();
    const fixed = fitRange([0, 0])!;
    expect(fixed[0]).toBeLessThan(0);
    expect(fixed[1]).toBeGreaterThan(0);
    const view = { extent: [0, 100] as [number, number], window: [40, 80] as [number, number] };
    setRightEdge(view, 20);
    expect(view.window).toEqual([0, 20]);
    expect(displayRange([32, 212], { factor: 5 / 9, offset: (-32 * 5) / 9 })).toEqual([0, 100]);
  });
});
