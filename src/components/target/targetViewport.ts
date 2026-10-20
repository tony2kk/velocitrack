import type { ImagePoint } from '../../domain/targetMeasurement';

/** Visible window in original-image pixels, independent of measurement geometry and calibration. */
export interface TargetView {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Screen rectangle used for the SVG's centered, aspect-preserving image transform. */
export interface CanvasBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Map screen pixels through SVG meet/letterboxing, including the current pan and zoom. */
export function imageAtClient(
  point: ImagePoint,
  view: TargetView,
  bounds: CanvasBounds,
): ImagePoint {
  const scale = Math.min(bounds.width / view.width, bounds.height / view.height);
  return {
    x: view.x + (point.x - bounds.left - (bounds.width - view.width * scale) / 2) / scale,
    y: view.y + (point.y - bounds.top - (bounds.height - view.height * scale) / 2) / scale,
  };
}

/** Keep the navigable window within the original photo; fitting always returns to its full extent. */
export function constrainView(view: TargetView, width: number, height: number): TargetView {
  return {
    ...view,
    x: Math.max(0, Math.min(width - view.width, view.x)),
    y: Math.max(0, Math.min(height - view.height, view.y)),
  };
}

/** Zoom around a fixed image anchor while following the cursor or the moving two-finger midpoint. */
export function zoomView(
  view: TargetView,
  factor: number,
  anchor: ImagePoint,
  client: ImagePoint,
  bounds: CanvasBounds,
  width: number,
  height: number,
): TargetView {
  const zoom = Math.max(1, Math.min(12, (width / view.width) * factor));
  const next = { x: 0, y: 0, width: width / zoom, height: height / zoom };
  const offset = imageAtClient(client, next, bounds);
  return constrainView({ ...next, x: anchor.x - offset.x, y: anchor.y - offset.y }, width, height);
}
