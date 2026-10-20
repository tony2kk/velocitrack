/** A finite, increasing range in the axis's canonical units. */
export type AxisRange = [number, number];

/** Session-only ranges keep the slider's domain separate from its visible window. */
export interface AxisViewport {
  extent: AxisRange;
  window: AxisRange;
}

/** Canonical-to-display mapping; the offset also supports temperature axes. */
export interface DisplayScale {
  factor: number;
  offset: number;
}

export type ViewportMemory = Map<string, AxisViewport>;

/** Fit finite plotted values; pad Y and constant values without inventing missing samples. */
export function fitRange(values: (number | null)[], horizontal = false): AxisRange | null {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  if (!Number.isFinite(low)) return null;
  if (horizontal) low = Math.min(0, low);
  const padding = low === high ? Math.max(Math.abs(low) * 0.05, 0.01) : (high - low) * 0.05;
  return horizontal && low !== high ? [low, high] : [low - padding, high + padding];
}

/** Expand the navigable domain as data arrives, retaining the exact visible numerical range. */
export function retainViewport(
  memory: ViewportMemory,
  key: string,
  fitted: AxisRange | null,
  reset = false,
): AxisViewport {
  const old = reset ? undefined : memory.get(key);
  if (!fitted) {
    if (old) return old;
    if (reset) memory.delete(key);
    // Missing data must not establish a remembered 0–1 scale for later real measurements.
    return { extent: [0, 1], window: [0, 1] };
  }
  const next: AxisViewport = old
    ? {
        extent: [Math.min(old.extent[0], fitted[0]), Math.max(old.extent[1], fitted[1])],
        window: [...old.window],
      }
    : { extent: [...fitted], window: [...fitted] };
  memory.set(key, next);
  return next;
}

/** Read the visible window as slider percentages over its retained domain. */
export function zoomPercent(view: AxisViewport): AxisRange {
  const span = view.extent[1] - view.extent[0];
  return view.window.map((value) => ((value - view.extent[0]) / span) * 100) as AxisRange;
}

/** Keep a second axis's window while sharing the primary axis's vertical slider gesture. */
export function alignExtent(view: AxisViewport, percent: AxisRange): void {
  const fraction = (percent[1] - percent[0]) / 100;
  if (fraction <= 0) return;
  const span = (view.window[1] - view.window[0]) / fraction;
  const low = view.window[0] - (percent[0] / 100) * span;
  view.extent = [low, low + span];
}

/** Apply a completed gesture to canonical bounds; malformed/zero-width events are ignored. */
export function applyZoom(view: AxisViewport, start: unknown, end: unknown): boolean {
  if (
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end > 100 ||
    start >= end
  )
    return false;
  const span = view.extent[1] - view.extent[0];
  view.window = [view.extent[0] + (span * start) / 100, view.extent[0] + (span * end) / 100];
  return true;
}

/** Move the right edge from the distance field; crossing the left edge starts again at zero. */
export function setRightEdge(view: AxisViewport, end: number): void {
  view.window = [view.window[0] < end ? view.window[0] : 0, end];
  view.extent = [Math.min(view.extent[0], view.window[0]), Math.max(view.extent[1], end)];
}

/** Convert a range for display without mutating the stored canonical viewport. */
export function displayRange(range: AxisRange, scale: DisplayScale): AxisRange {
  return range.map((value) => value * scale.factor + scale.offset) as AxisRange;
}
