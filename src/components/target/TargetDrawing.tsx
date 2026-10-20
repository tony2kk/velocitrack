import { useId } from 'react';
import type { UnitSystem } from '../../domain/model';
import type { TargetField, TargetMeasurement } from '../../domain/targetMeasurement';
import { TargetValueInput } from '../TargetValueInput';

/** SVG geometry uses original pixels; dimension inputs keep a readable size at every zoom level. */
export function TargetDrawing({
  measurement,
  units,
  pixelSize,
  bounds,
  editing,
  onValue,
}: {
  measurement: TargetMeasurement;
  units: UnitSystem;
  pixelSize: number;
  bounds: { x: number; y: number; width: number; height: number };
  editing: boolean;
  onValue: (field: TargetField, text: string) => void;
}) {
  const arrowId = useId().replaceAll(':', '');
  const g = measurement.geometry;
  if (!g) return null;
  const diagonal = g.radius / Math.sqrt(2);
  const handle = pixelSize * 6;
  const boxWidth = pixelSize * 150;
  const boxHeight = pixelSize * 62;
  /** Clamp only the label to the viewport; its underlying measurement stays at the original location. */
  function dimension(field: TargetField, x: number, y: number) {
    return (
      <foreignObject
        data-control="true"
        x={Math.max(bounds.x, Math.min(bounds.x + bounds.width - boxWidth, x))}
        y={Math.max(bounds.y, Math.min(bounds.y + bounds.height - boxHeight, y))}
        width={boxWidth}
        height={boxHeight}
        key={field}
      >
        <div
          className="target-dimension"
          style={{ fontSize: pixelSize * 12, padding: pixelSize * 4, borderRadius: pixelSize * 4 }}
        >
          <TargetValueInput
            field={field}
            value={measurement.values[field]}
            units={units}
            manual={measurement.manual.includes(field)}
            compact
            onCommit={onValue}
          />
        </div>
      </foreignObject>
    );
  }
  return (
    <g className="target-drawing">
      <defs>
        <marker
          id={arrowId}
          markerWidth="7"
          markerHeight="7"
          refX="3.5"
          refY="3.5"
          orient="auto-start-reverse"
        >
          <path d="M 7 0 L 0 3.5 L 7 7" fill="none" stroke="currentColor" />
        </marker>
      </defs>
      {g.poa && (
        <path
          className="target-rectangle"
          vectorEffect="non-scaling-stroke"
          d={`M${g.poa.x} ${g.poa.y} H${g.center.x} V${g.center.y} H${g.poa.x} Z`}
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
            d={`M${g.poa.x - handle * 1.5} ${g.poa.y} h${handle * 3} M${g.poa.x} ${g.poa.y - handle * 1.5} v${handle * 3}`}
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
        <>
          <g className="target-dimension-lines" pointerEvents="none" strokeWidth={pixelSize * 1.2}>
            <line
              x1={g.center.x - diagonal}
              y1={g.center.y + diagonal}
              x2={g.center.x + diagonal}
              y2={g.center.y - diagonal}
              markerStart={`url(#${arrowId})`}
              markerEnd={`url(#${arrowId})`}
            />
            {g.poa && (
              <>
                <line
                  x1={g.poa.x}
                  y1={g.poa.y}
                  x2={g.center.x}
                  y2={g.poa.y}
                  markerStart={`url(#${arrowId})`}
                  markerEnd={`url(#${arrowId})`}
                />
                <line
                  x1={g.poa.x}
                  y1={g.poa.y}
                  x2={g.poa.x}
                  y2={g.center.y}
                  markerStart={`url(#${arrowId})`}
                  markerEnd={`url(#${arrowId})`}
                />
              </>
            )}
          </g>
          {dimension('groupSize', g.center.x + diagonal + pixelSize * 12, g.center.y - diagonal)}
          {g.poa && (
            <>
              {dimension(
                'horizontalOffset',
                (g.poa.x + g.center.x) / 2 - boxWidth / 2,
                g.poa.y + pixelSize * 14,
              )}
              {dimension(
                'verticalOffset',
                g.poa.x - boxWidth - pixelSize * 14,
                (g.poa.y + g.center.y) / 2 - boxHeight / 2,
              )}
            </>
          )}
        </>
      )}
    </g>
  );
}
