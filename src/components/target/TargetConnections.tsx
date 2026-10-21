import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { TargetField, TargetGeometry } from '../../domain/targetMeasurement';
import { dimensionAnchor, TARGET_COLORS } from './TargetDrawing';

/** Screen-space connector from the focused field to its image dimension; never intercepts input. */
export function TargetConnections({
  canvasRef,
  panelRef,
  geometry,
  field,
}: {
  canvasRef: RefObject<SVGSVGElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  geometry?: TargetGeometry;
  field: TargetField | null;
}) {
  const overlayRef = useRef<SVGSVGElement>(null);
  const [line, setLine] = useState<{ x: number; y: number; endX: number; endY: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    const panel = panelRef.current;
    const anchor = geometry && field ? dimensionAnchor(geometry, field) : null;
    const input = field ? panel?.querySelector('[data-target-field="' + field + '"] input') : null;
    if (!overlay || !canvas || !panel || !anchor || !input) {
      setLine(null);
      return;
    }
    /** Recompute from actual DOM transforms after pan/zoom, responsive layout or scrolling. */
    function measure() {
      const matrix = canvas!.getScreenCTM?.();
      if (!matrix) {
        setLine(null);
        return;
      }
      const point = canvas!.createSVGPoint();
      point.x = anchor!.x;
      point.y = anchor!.y;
      const location = point.matrixTransform(matrix);
      const frame = canvas!.getBoundingClientRect();
      // Do not draw misleading connectors to a dimension currently outside the visible canvas.
      if (
        location.x < frame.left ||
        location.x > frame.right ||
        location.y < frame.top ||
        location.y > frame.bottom
      ) {
        setLine(null);
        return;
      }
      const root = overlay!.getBoundingClientRect();
      const box = input!.getBoundingClientRect();
      const below = box.top >= frame.bottom;
      setLine({
        x: location.x - root.left,
        y: location.y - root.top,
        endX: (below ? box.left + box.width / 2 : box.left - 8) - root.left,
        endY: (below ? box.top - 5 : box.top + box.height / 2) - root.top,
      });
    }
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(canvas);
    resize?.observe(panel);
    resize?.observe(overlay);
    const mutation = new MutationObserver(measure);
    mutation.observe(canvas, { attributes: true, attributeFilter: ['viewBox'] });
    window.addEventListener('resize', measure);
    document.addEventListener('scroll', measure, true);
    return () => {
      resize?.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('scroll', measure, true);
    };
  }, [canvasRef, panelRef, geometry, field]);
  // A short diagonal departure keeps the leader off the horizontal dimension itself.
  const path = line
    ? `M${line.x} ${line.y} l${line.endX >= line.x ? 12 : -12} -12 L${line.endX} ${line.endY}`
    : '';
  return (
    <svg ref={overlayRef} className="target-connections" aria-hidden="true">
      {line && field && (
        <g fill="none" stroke={TARGET_COLORS[field]}>
          <path className="target-connector-halo" d={path} strokeDasharray="5 4" />
          <path d={path} strokeWidth="1.5" strokeDasharray="5 4" />
          <circle cx={line.x} cy={line.y} r="4" fill={TARGET_COLORS[field]} stroke="white" />
        </g>
      )}
    </svg>
  );
}
