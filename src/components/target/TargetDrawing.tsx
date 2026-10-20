import { useId } from 'react';
import type {
  ImagePoint,
  TargetField,
  TargetGeometry,
  TargetMeasurement,
} from '../../domain/targetMeasurement';

/** Match each dimension arrow, focus connector and fixed-panel marker without floating text boxes. */
export const TARGET_COLORS: Record<TargetField, string> = {
  horizontalOffset: '#397bdb',
  verticalOffset: '#d79a16',
  groupSize: '#009f86',
};
/** Connect a fixed field to the corresponding dimension, rather than to an arbitrary circle point. */
export function dimensionAnchor(geometry: TargetGeometry, field: TargetField): ImagePoint | null {
  const { center, radius, poa } = geometry;
  if (field === 'groupSize')
    return { x: center.x + radius / Math.sqrt(2), y: center.y - radius / Math.sqrt(2) };
  if (!poa) return null;
  return field === 'horizontalOffset'
    ? { x: (poa.x + center.x) / 2, y: poa.y }
    : { x: poa.x, y: (poa.y + center.y) / 2 };
}

/** Render geometry and dimension arrows only; numeric inputs belong to the fixed side panel. */
export function TargetDrawing({
  measurement,
  pixelSize,
  editing,
  activeField,
}: {
  measurement: TargetMeasurement;
  pixelSize: number;
  editing: boolean;
  activeField: TargetField | null;
}) {
  const arrowId = useId().replaceAll(':', '');
  const g = measurement.geometry;
  if (!g) return null;
  const diagonal = g.radius / Math.sqrt(2);
  const handle = pixelSize * 6;
  /** Each dimension gets its own marker color and a stronger line when its field is focused. */
  function dimension(field: TargetField, from: ImagePoint, to: ImagePoint) {
    const marker = arrowId + field;
    return (
      <g color={TARGET_COLORS[field]}>
        <defs>
          <marker
            id={marker}
            markerWidth="7"
            markerHeight="7"
            refX="3.5"
            refY="3.5"
            orient="auto-start-reverse"
          >
            <path d="M 7 0 L 0 3.5 L 7 7" fill="none" stroke="currentColor" />
          </marker>
        </defs>
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          strokeWidth={pixelSize * (activeField === field ? 2 : 1.2)}
          markerStart={'url(#' + marker + ')'}
          markerEnd={'url(#' + marker + ')'}
        />
      </g>
    );
  }
  return (
    <g className="target-drawing">
      {g.poa && (
        <path
          className="target-rectangle"
          vectorEffect="non-scaling-stroke"
          d={
            'M' +
            g.poa.x +
            ' ' +
            g.poa.y +
            ' H' +
            g.center.x +
            ' V' +
            g.center.y +
            ' H' +
            g.poa.x +
            ' Z'
          }
        />
      )}
      <circle
        cx={g.center.x}
        cy={g.center.y}
        r={g.radius}
        className="target-circle"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        data-handle="edge"
        cx={g.center.x}
        cy={g.center.y}
        r={g.radius}
        className="target-hit-ring"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        data-handle="center"
        cx={g.center.x}
        cy={g.center.y}
        r={handle * 2.5}
        className="target-hit"
      />
      <circle
        data-handle="center"
        cx={g.center.x}
        cy={g.center.y}
        r={handle}
        className="target-handle"
        vectorEffect="non-scaling-stroke"
      />
      {g.poa && (
        <>
          <circle
            data-handle="poa"
            cx={g.poa.x}
            cy={g.poa.y}
            r={handle * 2.5}
            className="target-hit"
          />
          <path
            data-handle="poa"
            className="target-poa"
            vectorEffect="non-scaling-stroke"
            d={
              'M' +
              (g.poa.x - handle * 1.5) +
              ' ' +
              g.poa.y +
              ' h' +
              handle * 3 +
              ' M' +
              g.poa.x +
              ' ' +
              (g.poa.y - handle * 1.5) +
              ' v' +
              handle * 3
            }
          />
          <text
            x={g.poa.x + handle * 2}
            y={g.poa.y - handle * 2}
            fontSize={pixelSize * 12}
            className="target-poa-label"
          >
            POA
          </text>
        </>
      )}
      {!editing && (
        <g className="target-dimension-lines" pointerEvents="none" stroke="currentColor">
          {dimension(
            'groupSize',
            { x: g.center.x - diagonal, y: g.center.y + diagonal },
            { x: g.center.x + diagonal, y: g.center.y - diagonal },
          )}
          {g.poa && (
            <>
              {dimension('horizontalOffset', g.poa, { x: g.center.x, y: g.poa.y })}
              {dimension('verticalOffset', g.poa, { x: g.poa.x, y: g.center.y })}
            </>
          )}
        </g>
      )}
    </g>
  );
}
