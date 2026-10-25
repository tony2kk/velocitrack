import type { ImagePoint } from './targetMeasurement';
import type { UnitSystem } from './model';

/** Independent reference segment in original-image pixels; lengthMm is null only in an unsaved draft. */
export interface TargetCalibration {
  width: number;
  height: number;
  start: ImagePoint;
  end: ImagePoint;
  lengthMm: number | null;
}

/** A new reference spans the middle third of the photo and awaits a known physical length. */
export function initialCalibration(width: number, height: number): TargetCalibration {
  return {
    width,
    height,
    start: { x: width / 3, y: height / 2 },
    end: { x: (width * 2) / 3, y: height / 2 },
    lengthMm: null,
  };
}

/** Derive a uniform image scale; subpixel/degenerate references and unknown lengths cannot calibrate. */
export function calibrationScale(reference: TargetCalibration): number | null {
  const pixels = Math.hypot(
    reference.end.x - reference.start.x,
    reference.end.y - reference.start.y,
  );
  const scale = reference.lengthMm === null ? NaN : reference.lengthMm / pixels;
  return pixels >= 1 && Number.isFinite(scale) && scale > 0 ? scale : null;
}

/** Validate original-image ownership geometry before accepting saved or restored reference data. */
export function validCalibration(value: unknown): value is TargetCalibration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const c = value as TargetCalibration;
  return (
    Number.isSafeInteger(c.width) &&
    Number.isSafeInteger(c.height) &&
    c.width > 0 &&
    c.height > 0 &&
    c.width * c.height <= 60_000_000 &&
    [c.start, c.end].every(
      (p) =>
        p &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= 0 &&
        p.y >= 0 &&
        p.x <= c.width &&
        p.y <= c.height,
    ) &&
    typeof c.lengthMm === 'number' &&
    calibrationScale(c) !== null
  );
}

/** Printable ruler geometry; minor divisions have no labels and the full span never exceeds 30% of the image window. */
export interface TargetScaleBar {
  pixels: number;
  divisions: number;
  label: string;
}

/** Choose a readable cm/in interval, capped by both the known reference and the visible image width. */
export function targetScaleBar(
  reference: TargetCalibration,
  visibleWidth: number,
  units: UnitSystem,
): TargetScaleBar | null {
  const scale = calibrationScale(reference);
  if (!scale || !Number.isFinite(visibleWidth) || visibleWidth <= 0) return null;
  const unitMm = units === 'metric' ? 10 : 25.4;
  const limit = Math.min(reference.lengthMm!, visibleWidth * 0.3 * scale) / unitMm;
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const power = 10 ** Math.floor(Math.log10(limit));
  const mantissa = limit / power;
  const value =
    units === 'imperial' && limit < 1
      ? 2 ** Math.floor(Math.log2(limit))
      : (mantissa >= 5 ? 5 : mantissa >= 2 ? 2 : 1) * power;
  const divisions = units === 'imperial' ? (value >= 5 ? 5 : 4) : value / power === 2 ? 4 : 5;
  return {
    pixels: (value * unitMm) / scale,
    divisions,
    label: `${Number(value.toPrecision(4))} ${units === 'metric' ? 'cm' : 'in'}`,
  };
}
