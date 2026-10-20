import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { UnitSystem } from '../../domain/model';
import {
  imagePoint,
  type ImagePoint,
  type TargetField,
  type TargetGeometry,
  type TargetMeasurement,
} from '../../domain/targetMeasurement';
import { TargetDrawing } from './TargetDrawing';

/** Select which drawing anchor to adjust, or move only the photo viewport. */
export type TargetAction = 'draw' | 'center' | 'edge' | 'poa' | 'pan';
/** Visible window in original-image coordinates; independent of physical measurement scale. */
interface View {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Immutable pointer-start geometry and viewport used to avoid incremental movement drift. */
interface Gesture {
  id: number;
  action: TargetAction;
  start: ImagePoint;
  client: ImagePoint;
  pixels: number;
  geometry?: TargetGeometry;
  view: View;
  grabbed?: boolean;
}

/** Convert client coordinates through the actual SVG viewport, including letterboxing and pan/zoom. */
function canvasPoint(svg: SVGSVGElement, client: ImagePoint, view: View): ImagePoint {
  const matrix = svg.getScreenCTM?.();
  if (matrix) {
    const point = svg.createSVGPoint();
    point.x = client.x;
    point.y = client.y;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }
  // DOM test environments do not implement SVG matrices; this is the equivalent meet transform.
  const box = svg.getBoundingClientRect();
  const scale = Math.min(
    (box.width || view.width) / view.width,
    (box.height || view.height) / view.height,
  );
  return {
    x:
      view.x + (client.x - box.left - ((box.width || view.width) - view.width * scale) / 2) / scale,
    y:
      view.y +
      (client.y - box.top - ((box.height || view.height) - view.height * scale) / 2) / scale,
  };
}

/** Draw and adjust a circle with pointer capture, two-click alternatives and bounded image coordinates. */
export function TargetCanvas({
  url,
  width,
  height,
  measurement,
  units,
  mode,
  action,
  twoClicks,
  onBegin,
  onChange,
  onEnd,
  onCancel,
  onValue,
}: {
  url: string;
  width: number;
  height: number;
  measurement: TargetMeasurement;
  units: UnitSystem;
  mode: 'group' | 'offset';
  action: TargetAction;
  twoClicks: boolean;
  onBegin: () => void;
  onChange: (geometry: TargetGeometry) => void;
  onEnd: () => void;
  onCancel: () => void;
  onValue: (field: TargetField, text: string) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<ImagePoint | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, width, height });
  const [screenSize, setScreenSize] = useState({ width: 900, height: 550 });
  const zoom = width / view.width;
  const pixelSize = Math.max(view.width / screenSize.width, view.height / screenSize.height);
  // Keep handles and dimension fields in screen pixels, including letterboxed or resized photos.
  useEffect(() => {
    const element = svg.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0)
        setScreenSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // A tool change cancels an unfinished two-click placement but keeps the zoomed photo location.
  useEffect(() => {
    setPending(null);
  }, [mode, action, twoClicks]);

  /** View changes never change measurement geometry, calibration or manual overrides. */
  function zoomBy(factor: number) {
    const nextZoom = Math.max(1, Math.min(12, zoom * factor));
    const w = width / nextZoom,
      h = height / nextZoom;
    const center =
      factor > 1 && action !== 'pan' && measurement.geometry
        ? measurement.geometry.center
        : { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    setView({
      x: center.x - w / 2,
      y: center.y - h / 2,
      width: w,
      height: h,
    });
  }
  /** Build or move geometry from the original gesture snapshot, avoiding cumulative rounding/drift. */
  function geometryAt(g: Gesture, point: ImagePoint): TargetGeometry | undefined {
    const p = imagePoint(point, width, height);
    const initial = g.geometry;
    if (g.action === 'draw') {
      return {
        width,
        height,
        center: mode === 'group' ? g.start : p,
        poa: mode === 'offset' ? g.start : null,
        radius:
          mode === 'group'
            ? Math.max(1, Math.hypot(p.x - g.start.x, p.y - g.start.y))
            : (initial?.radius ?? Math.min(width, height) * 0.1),
      };
    }
    if (!initial) return undefined;
    if (g.action === 'edge')
      return {
        ...initial,
        radius: Math.max(1, Math.hypot(p.x - initial.center.x, p.y - initial.center.y)),
      };
    if (g.action === 'center' || g.action === 'poa') {
      const key = g.action === 'center' ? 'center' : 'poa';
      const anchor = initial[key];
      const next =
        g.grabbed && anchor
          ? imagePoint(
              { x: anchor.x + point.x - g.start.x, y: anchor.y + point.y - g.start.y },
              width,
              height,
            )
          : p;
      return { ...initial, [key]: next };
    }
    return initial;
  }
  /** Capture the pointer so releasing outside the image completes the same gesture. */
  function start(event: ReactPointerEvent<SVGSVGElement>) {
    if (
      event.button !== 0 ||
      gesture.current ||
      (event.target as Element).closest('[data-control]')
    )
      return;
    const point = imagePoint(
      canvasPoint(event.currentTarget, { x: event.clientX, y: event.clientY }, view),
      width,
      height,
    );
    const hit = (event.target as Element).getAttribute('data-handle') as TargetAction | null;
    const selected = action === 'pan' ? 'pan' : (hit ?? action);
    if (twoClicks && selected !== 'pan') {
      if (selected === 'draw' && !pending) {
        setPending(point);
        return;
      }
      const g: Gesture = {
        id: event.pointerId,
        action: selected,
        start: pending ?? point,
        client: point,
        pixels: 1,
        geometry: measurement.geometry,
        view,
      };
      const next = geometryAt(g, point);
      setPending(null);
      if (next) {
        onBegin();
        onChange(next);
        onEnd();
      }
      return;
    }
    setPending(null);
    const matrix = event.currentTarget.getScreenCTM?.();
    gesture.current = {
      id: event.pointerId,
      action: selected,
      start: point,
      client: { x: event.clientX, y: event.clientY },
      pixels: matrix ? 1 / matrix.a : pixelSize,
      geometry: measurement.geometry ? structuredClone(measurement.geometry) : undefined,
      view,
      grabbed: !!hit,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (selected !== 'pan') {
      onBegin();
      setEditing(true);
      const next = geometryAt(gesture.current, point);
      if (next) onChange(next);
    }
  }
  /** Move only the viewport in pan mode; every other gesture updates an unsaved local draft. */
  function move(event: ReactPointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (g.action === 'pan') {
      setView({
        ...g.view,
        x: g.view.x - (event.clientX - g.client.x) * g.pixels,
        y: g.view.y - (event.clientY - g.client.y) * g.pixels,
      });
      return;
    }
    const next = geometryAt(
      g,
      canvasPoint(event.currentTarget, { x: event.clientX, y: event.clientY }, view),
    );
    if (next) onChange(next);
  }
  /** Commit one undo step for the complete gesture, including its release coordinate. */
  function end(event: ReactPointerEvent<SVGSVGElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    move(event);
    const changed = gesture.current.action !== 'pan';
    gesture.current = null;
    setEditing(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (changed) onEnd();
  }
  /** Cancel interrupted touch/pointer sequences instead of saving half-finished geometry. */
  function cancel() {
    if (gesture.current?.action !== 'pan') onCancel();
    gesture.current = null;
    setEditing(false);
    setPending(null);
  }
  /** Clickable and keyboard nudge controls are alternatives to dragging small handles. */
  function nudge(dx: number, dy: number) {
    const g = measurement.geometry;
    if (action === 'pan') {
      setView({ ...view, x: view.x + (dx * view.width) / 20, y: view.y + (dy * view.height) / 20 });
      return;
    }
    if (!g || action === 'draw') return;
    const next = structuredClone(g);
    if (action === 'edge')
      next.radius = Math.min(Math.hypot(width, height), Math.max(1, next.radius + dx - dy));
    else {
      const key = action === 'poa' ? 'poa' : 'center';
      const p = next[key];
      if (!p) return;
      next[key] = imagePoint({ x: p.x + dx, y: p.y + dy }, width, height);
    }
    onBegin();
    onChange(next);
    onEnd();
  }
  return (
    <div className="target-canvas-area">
      <div className="target-view-controls">
        <button
          type="button"
          title="Zoom in without changing measurement values."
          disabled={editing}
          onClick={() => zoomBy(1.5)}
        >
          Zoom +
        </button>
        <button type="button" title="Zoom out." disabled={editing} onClick={() => zoomBy(1 / 1.5)}>
          Zoom −
        </button>
        <button
          type="button"
          title="Show the complete photo."
          onClick={() => setView({ x: 0, y: 0, width, height })}
        >
          Fit image
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <div className="target-nudge" aria-label="Fine adjustments">
          <button
            type="button"
            title="Move selected handle left by one image pixel, or pan left."
            onClick={() => nudge(-1, 0)}
          >
            ←
          </button>
          <button
            type="button"
            title="Move selected handle up by one image pixel, or pan up."
            onClick={() => nudge(0, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            title="Move selected handle down by one image pixel, or pan down."
            onClick={() => nudge(0, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            title="Move selected handle right by one image pixel, or pan right."
            onClick={() => nudge(1, 0)}
          >
            →
          </button>
        </div>
      </div>
      <svg
        ref={svg}
        className={`target-canvas ${action === 'pan' ? 'target-pan' : ''}`}
        tabIndex={0}
        aria-label="Target photo measurement canvas"
        role="group"
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={cancel}
        onLostPointerCapture={() => {
          if (gesture.current) cancel();
        }}
        onKeyDown={(event) => {
          if ((event.target as Element).closest('[data-control]')) return;
          if (event.key === 'Escape' && (gesture.current || pending)) {
            event.preventDefault();
            event.stopPropagation();
            cancel();
          }
          const directions: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          };
          const direction = directions[event.key];
          if (direction) {
            event.preventDefault();
            nudge(
              direction[0] * (event.shiftKey ? 10 : 1),
              direction[1] * (event.shiftKey ? 10 : 1),
            );
          }
        }}
      >
        <image href={url} width={width} height={height} />
        <TargetDrawing
          measurement={measurement}
          units={units}
          pixelSize={pixelSize}
          bounds={view}
          editing={editing}
          onValue={onValue}
        />
        {pending && (
          <circle
            cx={pending.x}
            cy={pending.y}
            r={pixelSize * 7}
            fill="#e69a22"
            pointerEvents="none"
          />
        )}
      </svg>
      <p className="muted target-canvas-help" aria-live="polite">
        {pending
          ? 'Choose the second point. Escape cancels.'
          : action === 'pan'
            ? 'Drag to pan, or use the arrow buttons.'
            : action === 'draw'
              ? mode === 'offset'
                ? 'Start at POA; finish at the circle center. Then adjust the circle edge.'
                : 'Start at the circle center; finish at its edge.'
              : `Place or drag the ${action === 'poa' ? 'POA' : action === 'edge' ? 'circle edge' : 'circle center'}. Arrow keys adjust by one image pixel; Shift moves ten.`}
      </p>
    </div>
  );
}
