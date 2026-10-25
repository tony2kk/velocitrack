import { describe, expect, it } from 'vitest';
import {
  calibrationScale,
  initialCalibration,
  targetScaleBar,
  validCalibration,
  type TargetCalibration,
} from '../src/domain/targetCalibration';
import {
  calibrateTarget,
  changeTargetCalibration,
  changeTargetGeometry,
  emptyTarget,
  overrideTargetValues,
  validTargetMeasurement,
} from '../src/domain/targetMeasurement';

const reference: TargetCalibration = {
  width: 1200,
  height: 800,
  start: { x: 100, y: 300 },
  end: { x: 400, y: 700 },
  lengthMm: 50,
};
const geometry = {
  width: 1200,
  height: 800,
  center: { x: 550, y: 350 },
  poa: { x: 500, y: 400 },
  radius: 75,
};

describe('independent target reference', () => {
  it('derives physical lengths from a diagonal reference without moving the group', () => {
    expect(calibrationScale(reference)).toBe(0.1);
    const target = changeTargetCalibration(
      { ...emptyTarget(), photoId: 'synthetic', geometry },
      reference,
    );
    expect(target.geometry).toEqual(geometry);
    expect(target.values).toEqual({ groupSize: 15, horizontalOffset: 5, verticalOffset: 5 });
    const changed = changeTargetGeometry(target, {
      ...geometry,
      radius: 100,
      center: { x: 450, y: 450 },
    });
    expect(changed.values).toEqual({ groupSize: 20, horizontalOffset: -5, verticalOffset: -5 });
    expect(changed.calibration).toEqual(reference);
    const resized = changeTargetCalibration(target, { ...reference, lengthMm: 100 });
    expect(resized.values.groupSize).toBe(30);
    expect(target.values.groupSize).toBe(15);
  });
  it('allows saving a complete reference before drawing a group, but never an incomplete one', () => {
    const draft = changeTargetCalibration(
      { ...emptyTarget(), photoId: 'synthetic' },
      initialCalibration(1200, 800),
    );
    expect(validTargetMeasurement(draft)).toBe(false);
    const saved = changeTargetCalibration(draft, reference);
    expect(validTargetMeasurement(saved)).toBe(true);
    expect(saved.values).toEqual(emptyTarget().values);
    expect(changeTargetGeometry(saved, geometry).values.groupSize).toBe(15);
    expect(overrideTargetValues(saved, {})).toEqual(saved);
    const manual = overrideTargetValues(saved, { groupSize: 30 });
    expect(manual.calibration).toBeUndefined();
    expect(manual.photoId).toBeUndefined();
    expect(validTargetMeasurement(manual)).toBe(true);
  });
  it('clears reference calibration after manual H, V or group edits, retaining legacy drawing behavior', () => {
    const target = changeTargetCalibration(
      { ...emptyTarget(), photoId: 'synthetic', geometry },
      reference,
    );
    for (const field of ['groupSize', 'horizontalOffset', 'verticalOffset'] as const) {
      expect(calibrateTarget(target, field, 10).calibration).toBeUndefined();
      expect(overrideTargetValues(target, { [field]: 0 }).calibration).toBeUndefined();
    }
    expect(target.calibration).toEqual(reference);
  });
  it('rejects invalid references, inconsistent scales and mismatched image frames', () => {
    for (const patch of [
      { lengthMm: 0 },
      { lengthMm: Infinity },
      { lengthMm: null },
      { start: reference.end },
      { start: { x: -1, y: 0 } },
      { width: 1e9 },
    ]) {
      expect(validCalibration({ ...reference, ...patch })).toBe(false);
    }
    const target = changeTargetCalibration(
      { ...emptyTarget(), photoId: 'synthetic', geometry },
      reference,
    );
    expect(validTargetMeasurement({ ...target, mmPerPixel: 1 })).toBe(false);
    expect(validTargetMeasurement({ ...target, photoId: undefined })).toBe(false);
    expect(validTargetMeasurement({ ...target, geometry: { ...geometry, width: 999 } })).toBe(
      false,
    );
    expect(
      validTargetMeasurement({
        ...target,
        reportCrop: { x: 0, y: 0, size: 100, width: 1000, height: 800 },
      }),
    ).toBe(false);
    expect(changeTargetCalibration(target, { ...reference, end: reference.start })).toBe(target);
  });
  it('keeps a correctly scaled ruler within 30% through zoom, using cm and inch subdivisions', () => {
    const metric = { ...reference, end: { x: 350, y: 300 } }; // 5 cm / 250 px
    expect(targetScaleBar(metric, 1200, 'metric')).toEqual({
      pixels: 250,
      divisions: 5,
      label: '5 cm',
    });
    const inches = { ...metric, lengthMm: 127 }; // 5 in / 250 px
    expect(targetScaleBar(inches, 1200, 'imperial')).toEqual({
      pixels: 250,
      divisions: 5,
      label: '5 in',
    });
    for (const units of ['metric', 'imperial'] as const) {
      for (const width of [1200, 600, 100, 10]) {
        const ruler = targetScaleBar(inches, width, units)!;
        expect(ruler.pixels).toBeLessThanOrEqual(width * 0.3);
        expect(ruler.pixels).toBeGreaterThan(0);
        expect(
          (parseFloat(ruler.label) * (units === 'metric' ? 10 : 25.4)) / ruler.pixels,
        ).toBeCloseTo(calibrationScale(inches)!, 3);
      }
    }
    expect(targetScaleBar(initialCalibration(1200, 800), 1200, 'metric')).toBeNull();
  });
});
