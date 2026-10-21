import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefObject,
} from 'react';
import {
  imagePoint,
  type ImagePoint,
  type TargetField,
  type TargetGeometry,
  type TargetMeasurement,
} from '../../domain/targetMeasurement';
import { TargetDrawing } from './TargetDrawing';
import { constrainCrop, type ReportCrop } from '../../domain/reportCrop';
import {
  constrainView,
  imageAtClient,
  zoomView,
  type CanvasBounds,
  type TargetView,
} from './targetViewport';

/** Parent toolbar commands operate only on the photo viewport. */
export interface TargetCanvasHandle {
  zoom: (factor: number) => void;
  fit: () => void;
}
/** The selected handle remains keyboard-adjustable after a pointer gesture. */
type Handle = 'center' | 'edge' | 'poa' | 'crop-move' | 'crop-resize';
/** A single-pointer edit or pan uses an immutable starting snapshot to avoid movement drift. */
interface Gesture {
  id: number;
  action: Handle | 'draw' | 'pan';
  start: ImagePoint;
  client: ImagePoint;
  geometry?: TargetGeometry;
  crop?: ReportCrop;
  view: TargetView;
  grabbed: boolean;
}
/** Two touch pointers navigate from a fixed anchor without editing measurement geometry. */
interface Pinch {
  view: TargetView;
  distance: number;
  anchor: ImagePoint;
}

/** Draw with one pointer; navigate with Ctrl-drag, Ctrl-wheel, the hand tool or two fingers. */
export function TargetCanvas({
  ref,
  canvasRef,
  url,
  width,
  height,
  measurement,
  mode,
  pan,
  activeField,
  onBegin,
  onChange,
  onEnd,
  onCancel,
  onZoom,
  cropMode = false,
  onCropChange,
}: {
  ref: Ref<TargetCanvasHandle>;
  canvasRef: RefObject<SVGSVGElement | null>;
  url: string;
  width: number;
  height: number;
  measurement: TargetMeasurement;
  mode: 'group' | 'offset';
  pan: boolean;
  activeField: TargetField | null;
  onBegin: () => void;
  onChange: (geometry: TargetGeometry) => void;
  onEnd: () => void;
  onCancel: () => void;
  onZoom: (zoom: number) => void;
  cropMode?: boolean;
  onCropChange?: (crop: ReportCrop) => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const contacts = useRef(new Map<number, ImagePoint>());
  const pinch = useRef<Pinch | null>(null);
  const navigatingTouch = useRef(false);
  const selected = useRef<Handle | null>(null);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<TargetView>({ x: 0, y: 0, width, height });
  const latestView = useRef(view);
  const [screenSize, setScreenSize] = useState({ width, height });
  const pixelSize = Math.max(view.width / screenSize.width, view.height / screenSize.height);

  /** React rendering may trail input events; navigation always reads the latest window. */
  function updateView(next: TargetView) {
    latestView.current = next;
    setView(next);
  }
  /** Use original dimensions as a deterministic fallback in DOM-only tests. */
  function bounds(): CanvasBounds {
    const box = canvasRef.current?.getBoundingClientRect();
    return {
      left: box?.left ?? 0,
      top: box?.top ?? 0,
      width: box?.width || width,
      height: box?.height || height,
    };
  }
  /** Toolbar zoom focuses the active crop/circle; pointer zoom preserves the cursor anchor. */
  function zoom(factor: number) {
    if (gesture.current || navigatingTouch.current) return;
    const current = latestView.current;
    const box = bounds();
    const client = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const anchor =
      factor > 1 && cropMode && measurement.reportCrop && !pan
        ? {
            x: measurement.reportCrop.x + measurement.reportCrop.size / 2,
            y: measurement.reportCrop.y + measurement.reportCrop.size / 2,
          }
        : factor > 1 && measurement.geometry && !pan
          ? measurement.geometry.center
          : imageAtClient(client, current, box);
    updateView(zoomView(current, factor, anchor, client, box, width, height));
  }
  useImperativeHandle(ref, () => ({
    zoom,
    fit: () => {
      if (!gesture.current && !navigatingTouch.current) updateView({ x: 0, y: 0, width, height });
    },
  }));
  useEffect(() => {
    onZoom(width / view.width);
  }, [onZoom, view.width, width]);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0)
        setScreenSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canvasRef]);
  // A non-passive listener consumes Ctrl-wheel only inside the canvas, preventing browser-page zoom.
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      if (gesture.current || navigatingTouch.current) return;
      const box = element.getBoundingClientRect();
      const rectangle = {
        left: box.left,
        top: box.top,
        width: box.width || width,
        height: box.height || height,
      };
      const client = { x: event.clientX, y: event.clientY };
      const current = latestView.current;
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rectangle.height : 1);
      const factor = Math.exp(-Math.max(-600, Math.min(600, delta)) * 0.002);
      updateView(
        zoomView(
          current,
          factor,
          imageAtClient(client, current, rectangle),
          client,
          rectangle,
          width,
          height,
        ),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [canvasRef, width, height]);

  /** Build from the pointer-start snapshot, preserving the initial grab offset on existing handles. */
  function geometryAt(g: Gesture, point: ImagePoint): TargetGeometry | undefined {
    const p = imagePoint(point, width, height);
    const initial = g.geometry;
    if (g.action === 'draw')
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
    if (!initial) return undefined;
    if (g.action === 'edge')
      return {
        ...initial,
        radius: Math.max(1, Math.hypot(p.x - initial.center.x, p.y - initial.center.y)),
      };
    if (g.action === 'center' || g.action === 'poa') {
      const key = g.action;
      const anchor = initial[key];
      const next =
        g.grabbed && anchor
          ? imagePoint(
              {
                x: anchor.x + point.x - g.start.x,
                y: anchor.y + point.y - g.start.y,
              },
              width,
              height,
            )
          : p;
      return { ...initial, [key]: next };
    }
    return initial;
  }
  /** A fixed square uses the original grab point; resize anchors the top-left corner. */
  function applyGesture(g: Gesture, point: ImagePoint) {
    if (g.crop && (g.action === 'crop-move' || g.action === 'crop-resize')) {
      const dx = point.x - g.start.x;
      const dy = point.y - g.start.y;
      onCropChange?.(
        constrainCrop(
          g.action === 'crop-move'
            ? { ...g.crop, x: g.crop.x + dx, y: g.crop.y + dy }
            : {
                ...g.crop,
                size: Math.min(
                  g.crop.width - g.crop.x,
                  g.crop.height - g.crop.y,
                  g.crop.size + Math.max(dx, dy),
                ),
              },
        ),
      );
    } else {
      const next = geometryAt(g, point);
      if (next) onChange(next);
    }
  }
  /** The second finger rolls back any provisional single-finger edit before navigation begins. */
  function beginPinch() {
    if (gesture.current && gesture.current.action !== 'pan') onCancel();
    gesture.current = null;
    setEditing(false);
    navigatingTouch.current = true;
    const [a, b] = [...contacts.current.values()];
    const current = latestView.current;
    if (!a || !b) return;
    pinch.current = {
      view: current,
      distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      anchor: imageAtClient({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, current, bounds()),
    };
  }
  /** Capture every participating pointer, including a second touch, until release or cancellation. */
  function start(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const client = { x: event.clientX, y: event.clientY };
    if (event.pointerType === 'touch') {
      if (contacts.current.size >= 2) return;
      contacts.current.set(event.pointerId, client);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (contacts.current.size === 2) {
        beginPinch();
        return;
      }
      if (navigatingTouch.current) return;
    }
    if (gesture.current) return;
    const current = latestView.current;
    const point = imageAtClient(client, current, bounds());
    const hit = (event.target as Element).getAttribute('data-handle') as Handle | null;
    const action =
      event.ctrlKey || pan
        ? 'pan'
        : cropMode
          ? hit?.startsWith('crop-')
            ? hit
            : 'pan'
          : (hit ?? 'draw');
    if (action !== 'pan' && (point.x < 0 || point.x > width || point.y < 0 || point.y > height))
      return;
    selected.current = hit;
    gesture.current = {
      id: event.pointerId,
      action,
      start: point,
      client,
      view: current,
      geometry: measurement.geometry ? structuredClone(measurement.geometry) : undefined,
      crop: measurement.reportCrop ? { ...measurement.reportCrop } : undefined,
      grabbed: !!hit,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.focus();
    if (action !== 'pan') {
      onBegin();
      setEditing(true);
      applyGesture(gesture.current, point);
    }
  }
  /** Two fingers pan and zoom together; one pointer changes only its selected geometry or view. */
  function move(event: ReactPointerEvent<SVGSVGElement>) {
    const client = { x: event.clientX, y: event.clientY };
    if (contacts.current.has(event.pointerId)) contacts.current.set(event.pointerId, client);
    if (navigatingTouch.current) {
      const [a, b] = [...contacts.current.values()];
      const initial = pinch.current;
      if (a && b && initial)
        updateView(
          zoomView(
            initial.view,
            Math.hypot(b.x - a.x, b.y - a.y) / initial.distance,
            initial.anchor,
            { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
            bounds(),
            width,
            height,
          ),
        );
      return;
    }
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const point = imageAtClient(client, g.view, bounds());
    if (g.action === 'pan') {
      updateView(
        constrainView(
          { ...g.view, x: g.view.x + g.start.x - point.x, y: g.view.y + g.start.y - point.y },
          width,
          height,
        ),
      );
    } else {
      applyGesture(g, point);
    }
  }
  /** End a drawing once; after two-finger navigation, ignore the remaining finger until both lift. */
  function end(event: ReactPointerEvent<SVGSVGElement>, cancelled = false) {
    const tracked =
      gesture.current?.id === event.pointerId || contacts.current.has(event.pointerId);
    if (!tracked) return;
    if (!cancelled) move(event);
    if (gesture.current?.id === event.pointerId) {
      const changed = gesture.current.action !== 'pan';
      gesture.current = null;
      setEditing(false);
      if (changed) {
        if (cancelled) onCancel();
        else onEnd();
      }
    }
    contacts.current.delete(event.pointerId);
    pinch.current = null;
    if (!contacts.current.size) navigatingTouch.current = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  /** Keyboard adjustments retain a precise alternative to dragging small image handles. */
  function nudge(dx: number, dy: number, navigate: boolean) {
    const current = latestView.current;
    if (gesture.current || navigatingTouch.current) return;
    if (navigate || pan) {
      updateView(
        constrainView(
          {
            ...current,
            x: current.x + (dx * current.width) / 20,
            y: current.y + (dy * current.height) / 20,
          },
          width,
          height,
        ),
      );
      return;
    }
    const handle = selected.current;
    const crop = measurement.reportCrop;
    if (cropMode && crop && handle?.startsWith('crop-')) {
      onBegin();
      onCropChange?.(
        constrainCrop(
          handle === 'crop-resize'
            ? {
                ...crop,
                size: Math.min(crop.width - crop.x, crop.height - crop.y, crop.size + dx - dy),
              }
            : { ...crop, x: crop.x + dx, y: crop.y + dy },
        ),
      );
      onEnd();
      return;
    }
    const g = measurement.geometry;
    if (!g || !handle || handle === 'crop-move' || handle === 'crop-resize') return;
    const next = structuredClone(g);
    if (handle === 'edge')
      next.radius = Math.min(Math.hypot(width, height), Math.max(1, next.radius + dx - dy));
    else {
      const p = next[handle];
      if (!p) return;
      next[handle] = imagePoint({ x: p.x + dx, y: p.y + dy }, width, height);
    }
    onBegin();
    onChange(next);
    onEnd();
  }
  return (
    <div className="target-canvas-area">
      <svg
        ref={canvasRef}
        className={'target-canvas' + (pan ? ' target-pan' : '')}
        tabIndex={0}
        aria-label="Target photo measurement canvas"
        role="group"
        viewBox={[view.x, view.y, view.width, view.height].join(' ')}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={(event) => end(event)}
        onPointerCancel={(event) => end(event, true)}
        onLostPointerCapture={(event) => end(event, true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && (gesture.current || navigatingTouch.current)) {
            event.preventDefault();
            event.stopPropagation();
            if (gesture.current?.action !== 'pan' && gesture.current) onCancel();
            gesture.current = null;
            pinch.current = null;
            contacts.current.clear();
            navigatingTouch.current = false;
            setEditing(false);
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
              event.ctrlKey,
            );
          }
        }}
      >
        <image href={url} width={width} height={height} />
        <g pointerEvents={cropMode ? 'none' : undefined}>
          <TargetDrawing
            measurement={measurement}
            pixelSize={pixelSize}
            editing={editing}
            activeField={activeField}
          />
        </g>
        {measurement.reportCrop &&
          (() => {
            const c = measurement.reportCrop;
            return (
              <g pointerEvents={cropMode ? 'auto' : 'none'}>
                <rect
                  x={c.x}
                  y={c.y}
                  width={c.size}
                  height={c.size}
                  fill="none"
                  stroke="#263e35"
                  strokeWidth={4 * pixelSize}
                  pointerEvents="none"
                />
                <rect
                  x={c.x}
                  y={c.y}
                  width={c.size}
                  height={c.size}
                  fill={cropMode ? '#ffffff15' : 'none'}
                  stroke="#ffffff"
                  strokeWidth={2 * pixelSize}
                  strokeDasharray={`${8 * pixelSize} ${4 * pixelSize}`}
                  data-handle="crop-move"
                  style={{ cursor: 'move' }}
                />
                {cropMode && (
                  <rect
                    x={c.x + c.size - 9 * pixelSize}
                    y={c.y + c.size - 9 * pixelSize}
                    width={18 * pixelSize}
                    height={18 * pixelSize}
                    fill="#08796e"
                    stroke="white"
                    strokeWidth={2 * pixelSize}
                    data-handle="crop-resize"
                    style={{ cursor: 'nwse-resize' }}
                  />
                )}
                <text
                  x={c.x + 7 * pixelSize}
                  y={c.y + 20 * pixelSize}
                  fontSize={13 * pixelSize}
                  fill="white"
                  stroke="#263c35"
                  strokeWidth={3 * pixelSize}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  Report crop
                </text>
              </g>
            );
          })()}
      </svg>
      <p className="muted target-canvas-help">
        {cropMode && !pan
          ? 'Drag the report square to move; drag the bottom-right corner to resize. Arrow keys fine-tune the selected handle.'
          : pan
            ? 'Drag to pan.'
            : mode === 'offset'
              ? 'Drag from POA to group center; drag the circle edge to resize.'
              : 'Drag from group center to circle edge.'}{' '}
        Ctrl + drag to pan · Ctrl + wheel to zoom · Two fingers to pan or pinch.
      </p>
    </div>
  );
}
