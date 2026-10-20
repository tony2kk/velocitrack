import { describe, expect, it } from 'vitest';
import { constrainView, imageAtClient, zoomView } from '../src/components/target/targetViewport';

describe('target image navigation', () => {
  const photo = { x: 0, y: 0, width: 1200, height: 800 };
  const bounds = { left: 20, top: 30, width: 800, height: 800 };
  it('maps through letterboxing and retains the image point under a wheel cursor', () => {
    const center = imageAtClient({ x: 420, y: 430 }, photo, bounds);
    expect(center.x).toBeCloseTo(600);
    expect(center.y).toBeCloseTo(400);
    const cursor = { x: 350, y: 300 };
    const anchor = imageAtClient(cursor, photo, bounds);
    const zoomed = zoomView(photo, 2, anchor, cursor, bounds, 1200, 800);
    const after = imageAtClient(cursor, zoomed, bounds);
    expect(after.x).toBeCloseTo(anchor.x);
    expect(after.y).toBeCloseTo(anchor.y);
    const translated = zoomView(
      zoomed,
      1,
      anchor,
      { x: cursor.x + 30, y: cursor.y },
      bounds,
      1200,
      800,
    );
    expect(translated.width).toBe(zoomed.width);
    expect(translated.x).toBeLessThan(zoomed.x);
  });
  it('bounds zoom and pan so the photo is recoverable and fit shows its complete extent', () => {
    const cursor = { x: 420, y: 430 },
      anchor = { x: 600, y: 400 };
    const maximum = zoomView(photo, 1000, anchor, cursor, bounds, 1200, 800);
    expect(maximum.width).toBe(100);
    const fit = zoomView(maximum, 0.00001, anchor, cursor, bounds, 1200, 800);
    expect(fit).toEqual(photo);
    expect(constrainView({ ...maximum, x: -1000, y: 2000 }, 1200, 800)).toMatchObject({
      x: 0,
      y: 800 - maximum.height,
    });
  });
});
