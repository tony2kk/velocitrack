/** Square crop in original-image pixels; independent of target calibration and viewport zoom. */
export interface ReportCrop {
  x: number;
  y: number;
  size: number;
  width: number;
  height: number;
}

/** Keep the full square inside the original image, including after edge/corner resizing. */
export function constrainCrop(crop: ReportCrop): ReportCrop {
  const size = Math.max(1, Math.min(crop.width, crop.height, crop.size));
  return {
    ...crop,
    size,
    x: Math.max(0, Math.min(crop.width - size, crop.x)),
    y: Math.max(0, Math.min(crop.height - size, crop.y)),
  };
}

/** Start around the selected target when present, otherwise around the image center. */
export function initialReportCrop(
  width: number,
  height: number,
  center?: { x: number; y: number },
  diameter?: number,
): ReportCrop {
  const size = Math.min(width, height, diameter ? diameter * 1.6 : Math.min(width, height) * 0.6);
  return constrainCrop({
    width,
    height,
    size,
    x: (center?.x ?? width / 2) - size / 2,
    y: (center?.y ?? height / 2) - size / 2,
  });
}

/** Reject corrupt/out-of-image crops both on local save and before ZIP recovery writes anything. */
export function validReportCrop(value: unknown): value is ReportCrop {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const c = value as ReportCrop;
  return (
    [c.x, c.y, c.size, c.width, c.height].every(Number.isFinite) &&
    Number.isSafeInteger(c.width) &&
    Number.isSafeInteger(c.height) &&
    c.width > 0 &&
    c.height > 0 &&
    c.width * c.height <= 60_000_000 &&
    c.size >= 1 &&
    c.x >= 0 &&
    c.y >= 0 &&
    c.x + c.size <= c.width &&
    c.y + c.size <= c.height
  );
}
