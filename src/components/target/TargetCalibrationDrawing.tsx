import type { UnitSystem } from '../../domain/model';
import { targetScaleBar, type TargetCalibration } from '../../domain/targetCalibration';
import type { TargetView } from './targetViewport';

/** A high-contrast reference arrow with independent, generous endpoint hit areas. */
export function TargetCalibrationDrawing({
  reference,
  pixelSize,
}: {
  reference: TargetCalibration;
  pixelSize: number;
}) {
  const { start, end } = reference;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = 10 * pixelSize;
  const wing = 5 * pixelSize;
  const arrows = [start, end]
    .map((point, index) => {
      const direction = index === 0 ? 1 : -1;
      const x = point.x + direction * Math.cos(angle) * head;
      const y = point.y + direction * Math.sin(angle) * head;
      return `M ${x - Math.sin(angle) * wing} ${y + Math.cos(angle) * wing} L ${point.x} ${point.y} L ${x + Math.sin(angle) * wing} ${y - Math.cos(angle) * wing}`;
    })
    .join(' ');
  return (
    <g aria-label="Reference length arrow">
      <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[
          { color: '#fff', width: 6 },
          { color: '#174b68', width: 3 },
        ].map(({ color, width }) => (
          <g key={color} stroke={color} strokeWidth={width * pixelSize}>
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
            <path d={arrows} />
          </g>
        ))}
      </g>
      {(['start', 'end'] as const).map((key, index) => (
        <g key={key}>
          <circle
            cx={reference[key].x}
            cy={reference[key].y}
            r={5 * pixelSize}
            fill="#174b68"
            stroke="white"
            strokeWidth={2 * pixelSize}
            pointerEvents="none"
          />
          <text
            x={reference[key].x}
            y={reference[key].y - 16 * pixelSize}
            textAnchor="middle"
            fontSize={13 * pixelSize}
            fontWeight="bold"
            fill="#174b68"
            stroke="white"
            strokeWidth={3 * pixelSize}
            paintOrder="stroke"
            pointerEvents="none"
          >
            {index === 0 ? 'A' : 'B'}
          </text>
          <circle
            cx={reference[key].x}
            cy={reference[key].y}
            r={14 * pixelSize}
            fill="transparent"
            data-handle={`calibration-${key}`}
            style={{ cursor: 'move' }}
          >
            <title>Move reference endpoint {index === 0 ? 'A' : 'B'}</title>
          </circle>
        </g>
      ))}
    </g>
  );
}

/** Keep a physical ruler at the visible photo's lower-right corner, independent of zoom and group position. */
export function TargetRuler({
  reference,
  view,
  pixelSize,
  units,
}: {
  reference: TargetCalibration;
  view: TargetView;
  pixelSize: number;
  units: UnitSystem;
}) {
  const ruler = targetScaleBar(reference, view.width, units);
  if (!ruler) return null;
  const right = view.x + view.width - 18 * pixelSize;
  const bottom = view.y + view.height - 17 * pixelSize;
  const left = right - ruler.pixels;
  const boxWidth = Math.max(ruler.pixels, 64 * pixelSize) + 16 * pixelSize;
  return (
    <g pointerEvents="none" role="img" aria-label={`Image scale: ${ruler.label}`}>
      <rect
        x={right + 8 * pixelSize - boxWidth}
        y={bottom - 34 * pixelSize}
        width={boxWidth}
        height={44 * pixelSize}
        rx={5 * pixelSize}
        fill="#172c27"
        fillOpacity={0.9}
      />
      <g fill="none" stroke="white" strokeWidth={2 * pixelSize}>
        <line x1={left} y1={bottom} x2={right} y2={bottom} />
        {Array.from({ length: ruler.divisions + 1 }, (_, index) => {
          const x = left + (ruler.pixels * index) / ruler.divisions;
          return (
            <line
              key={index}
              x1={x}
              x2={x}
              y1={bottom}
              y2={bottom - (index === 0 || index === ruler.divisions ? 10 : 5) * pixelSize}
            />
          );
        })}
      </g>
      <text
        x={right}
        y={bottom - 18 * pixelSize}
        textAnchor="end"
        fill="white"
        fontSize={12 * pixelSize}
      >
        {ruler.label}
      </text>
    </g>
  );
}
