import type { UnitSystem } from './model';
import { unitLabels, formatQuantity } from './units';
import { validReportCrop, type ReportCrop } from './reportCrop';
import { calibrationScale, validCalibration, type TargetCalibration } from './targetCalibration';

/** Target lengths are stored in mm; null means absent and signed offsets preserve zero. */
export interface TargetValues {
  horizontalOffset: number | null;
  verticalOffset: number | null;
  groupSize: number | null;
}
/** Stable keys shared by editors, manual-override markers and scalar analysis quantities. */
export type TargetField = keyof TargetValues;
/** Coordinates refer to the decoded original image, never the displayed size or zoom. */
export interface ImagePoint {
  x: number;
  y: number;
}
/** A manually placed circle; an optional POA enables the two offset dimensions. */
export interface TargetGeometry {
  width: number;
  height: number;
  center: ImagePoint;
  radius: number;
  poa: ImagePoint | null;
}
/** One active local result per string, with optional image provenance and exact editor state. */
export interface TargetMeasurement {
  /** Optional report framing; it never changes the measurement or original photo. */
  reportCrop?: ReportCrop;
  /** Known reference length, independent of the measured group and report crop. */
  calibration?: TargetCalibration;
  values: TargetValues;
  manual: TargetField[];
  photoId?: string;
  geometry?: TargetGeometry;
  mmPerPixel?: number;
}

export const TARGET_FIELDS: readonly TargetField[] = [
  'horizontalOffset',
  'verticalOffset',
  'groupSize',
];
export const TARGET_LABELS: Record<TargetField, string> = {
  horizontalOffset: 'Horizontal offset',
  verticalOffset: 'Vertical offset',
  groupSize: 'Group size',
};
export const TARGET_HINTS: Record<TargetField, string> = {
  horizontalOffset: 'Circle center relative to POA. Positive is right; negative is left.',
  verticalOffset: 'Circle center relative to POA. Positive is up; negative is down.',
  groupSize:
    'Diameter of the manually placed circle, not an automatic analysis of individual marks.',
};

/** Create independent missing values instead of treating missing measurements as zero. */
export function emptyTarget(): TargetMeasurement {
  return {
    values: { horizontalOffset: null, verticalOffset: null, groupSize: null },
    manual: [],
  };
}

/** Use one physical storage unit regardless of the profile's display preference. */
export function targetUnit(units: UnitSystem): { label: string; mm: number } {
  return { label: unitLabels[units].targetLength, mm: units === 'metric' ? 10 : 25.4 };
}

/** Round display text only; untouched inputs never write this rounded representation back. */
export function targetText(value: number | null, units: UnitSystem): string {
  return value === null ? '' : String(Number((value / targetUnit(units).mm).toFixed(4)));
}

/** Read-only target lengths use two decimal places; editable inputs keep their separate precision. */
export function targetDisplay(value: number | null, units: UnitSystem): string {
  return formatQuantity(
    value === null ? null : value / targetUnit(units).mm,
    'target',
    targetUnit(units).label,
  );
}

/** Validate a user-entered length and convert it once to canonical mm. */
export function parseTargetValue(
  text: string,
  field: TargetField,
  units: UnitSystem,
): number | null {
  const value = text.trim() === '' ? null : Number(text) * targetUnit(units).mm;
  if (value !== null && (!Number.isFinite(value) || (field === 'groupSize' && value < 0)))
    throw new Error('Enter a finite length. Group size cannot be negative.');
  return value;
}

/** Signed image dimensions: image Y increases downwards, while vertical offset increases upwards. */
export function targetPixels(geometry: TargetGeometry): TargetValues {
  return {
    groupSize: geometry.radius * 2,
    horizontalOffset: geometry.poa ? geometry.center.x - geometry.poa.x : null,
    verticalOffset: geometry.poa ? geometry.poa.y - geometry.center.y : null,
  };
}

/** Recompute dimensions represented by the drawing; standalone offsets survive circle-only edits. */
export function changeTargetGeometry(
  measurement: TargetMeasurement,
  geometry: TargetGeometry,
): TargetMeasurement {
  const next = structuredClone(measurement);
  const pixels = targetPixels(geometry);
  next.geometry = structuredClone(geometry);
  if (!next.mmPerPixel) return next;
  for (const field of TARGET_FIELDS) {
    if (pixels[field] === null) continue;
    next.values[field] = pixels[field] * next.mmPerPixel;
    next.manual = next.manual.filter((item) => item !== field);
  }
  return next;
}

/** Apply manual overrides without silently changing the photo's established scale. */
export function overrideTargetValues(
  measurement: TargetMeasurement,
  patch: Partial<TargetValues>,
): TargetMeasurement {
  const next = structuredClone(measurement);
  if (TARGET_FIELDS.some((field) => Object.hasOwn(patch, field))) removeCalibration(next);
  for (const field of TARGET_FIELDS) {
    if (!Object.hasOwn(patch, field)) continue;
    next.values[field] = patch[field] ?? null;
    next.manual = next.manual.filter((item) => item !== field);
    if (next.values[field] !== null) next.manual.push(field);
  }
  return next;
}

/** Clear reference provenance after an explicit manual edit, retaining an existing group's legacy scale. */
function removeCalibration(measurement: TargetMeasurement): void {
  delete measurement.calibration;
  if (!measurement.geometry) {
    delete measurement.mmPerPixel;
    if (!measurement.reportCrop) delete measurement.photoId;
  }
}

/** Apply an independent reference and recalculate represented dimensions without moving the group. */
export function changeTargetCalibration(
  measurement: TargetMeasurement,
  calibration: TargetCalibration,
): TargetMeasurement {
  if (
    Math.hypot(calibration.end.x - calibration.start.x, calibration.end.y - calibration.start.y) < 1
  )
    return measurement;
  const next = structuredClone(measurement);
  next.calibration = structuredClone(calibration);
  const scale = calibrationScale(calibration);
  if (scale === null) return next;
  next.mmPerPixel = scale;
  return next.geometry ? changeTargetGeometry(next, next.geometry) : next;
}

/** Establish a uniform photo scale from a known nonzero dimension, then recompute represented values. */
export function calibrateTarget(
  measurement: TargetMeasurement,
  field: TargetField,
  millimeters: number | null,
): TargetMeasurement {
  const geometry = measurement.geometry;
  const pixels = geometry ? targetPixels(geometry)[field] : null;
  if (!geometry || pixels === null || pixels === 0 || millimeters === null || millimeters === 0)
    throw new Error('Use a nonzero known dimension of the drawing to calibrate this photo.');
  if (!Number.isFinite(millimeters) || Math.sign(millimeters) !== Math.sign(pixels))
    throw new Error('The sign must match the drawing: H is positive right and V positive up.');
  const scale = millimeters / pixels;
  if (!Number.isFinite(scale) || scale <= 0)
    throw new Error('This dimension cannot define a valid photo scale.');
  const next = { ...measurement, mmPerPixel: scale };
  delete next.calibration;
  return changeTargetGeometry(next, geometry);
}

/** Keep editable anchor points on the original image; the enclosing circle may extend outside it. */
export function imagePoint(point: ImagePoint, width: number, height: number): ImagePoint {
  return { x: Math.max(0, Math.min(width, point.x)), y: Math.max(0, Math.min(height, point.y)) };
}

/** Validate local writes and restored archives using the same finite, bounded geometry contract. */
export function validTargetMeasurement(value: unknown): value is TargetMeasurement {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const target = value as TargetMeasurement;
  if (
    !target.values ||
    typeof target.values !== 'object' ||
    Array.isArray(target.values) ||
    !TARGET_FIELDS.every(
      (field) =>
        target.values[field] === null ||
        (typeof target.values[field] === 'number' &&
          Number.isFinite(target.values[field]) &&
          (field !== 'groupSize' || target.values[field] >= 0)),
    ) ||
    !Array.isArray(target.manual) ||
    target.manual.some(
      (field) => !TARGET_FIELDS.includes(field) || target.values[field] === null,
    ) ||
    new Set(target.manual).size !== target.manual.length
  )
    return false;
  if (target.photoId !== undefined && (typeof target.photoId !== 'string' || !target.photoId))
    return false;
  if (target.reportCrop !== undefined && (!target.photoId || !validReportCrop(target.reportCrop)))
    return false;
  if (
    target.mmPerPixel !== undefined &&
    (!Number.isFinite(target.mmPerPixel) || target.mmPerPixel <= 0)
  )
    return false;
  if (target.calibration !== undefined) {
    const c = target.calibration;
    if (!target.photoId || !validCalibration(c) || target.mmPerPixel === undefined) return false;
    const scale = calibrationScale(c)!;
    if (Math.abs(target.mmPerPixel / scale - 1) > 1e-10) return false;
    for (const frame of [target.geometry, target.reportCrop])
      if (frame && (frame.width !== c.width || frame.height !== c.height)) return false;
  }
  if (!target.geometry)
    return (
      target.geometry === undefined &&
      (target.mmPerPixel === undefined || !!target.calibration) &&
      (target.photoId === undefined || !!target.reportCrop || !!target.calibration)
    );
  const g = target.geometry;
  if (
    target.reportCrop &&
    (target.reportCrop.width !== g.width || target.reportCrop.height !== g.height)
  )
    return false;
  if (
    !target.photoId ||
    !Number.isSafeInteger(g.width) ||
    !Number.isSafeInteger(g.height) ||
    g.width <= 0 ||
    g.height <= 0 ||
    g.width * g.height > 60_000_000 ||
    !Number.isFinite(g.radius) ||
    g.radius <= 0 ||
    g.radius > Math.hypot(g.width, g.height)
  )
    return false;
  /** Both POA and center are image anchors; radius is validated independently above. */
  function point(p: unknown): p is ImagePoint {
    const candidate = p as ImagePoint | null;
    return (
      !!candidate &&
      Number.isFinite(candidate.x) &&
      Number.isFinite(candidate.y) &&
      candidate.x >= 0 &&
      candidate.x <= g.width &&
      candidate.y >= 0 &&
      candidate.y <= g.height
    );
  }
  return point(g.center) && (g.poa === null || point(g.poa));
}
