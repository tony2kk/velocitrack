import type { UnitSystem } from '../domain/model';
import {
  targetDisplay,
  targetUnit,
  type ImagePoint,
  type TargetMeasurement,
} from '../domain/targetMeasurement';

/** Layout uses print-sized points; rendering scales these together so outlines never become hairlines. */
export interface TargetFigure {
  width: number;
  height: number;
  photo: { x: number; y: number; width: number; height: number };
  source: { x: number; y: number; width: number; height: number };
  circle?: { center: ImagePoint; radius: number };
  poa?: ImagePoint;
  dimensions: {
    key: 'H' | 'V' | 'G';
    name: string;
    value: string;
    from: ImagePoint;
    to: ImagePoint;
    label: { x: number; y: number; width: number; height: number };
  }[];
}

/** Keep all callouts in a reserved rail outside the photograph, irrespective of target position or zoom. */
export function targetFigureLayout(
  width: number,
  height: number,
  target: TargetMeasurement | undefined,
  units: UnitSystem,
): TargetFigure {
  const crop = target?.reportCrop;
  const source = {
    x: crop?.x ?? 0,
    y: crop?.y ?? 0,
    width: crop?.size ?? width,
    height: crop?.size ?? height,
  };
  const factor = 260 / Math.max(source.width, source.height);
  const geometry = target?.geometry;
  const figureHeight = Math.max(source.height * factor + 16, geometry ? 190 : 0);
  const photo = {
    x: 8,
    y: (figureHeight - source.height * factor) / 2,
    width: source.width * factor,
    height: source.height * factor,
  };
  const result: TargetFigure = {
    width: photo.width + 16 + (geometry ? 128 : 0),
    height: figureHeight,
    photo,
    source,
    dimensions: [],
  };
  if (!geometry || !target) return result;
  const point = (p: ImagePoint): ImagePoint => ({
    x: photo.x + (p.x - source.x) * factor,
    y: photo.y + (p.y - source.y) * factor,
  });
  const center = point(geometry.center);
  const radius = geometry.radius * factor;
  const diagonal = radius / Math.sqrt(2);
  result.circle = { center, radius };
  const label = { x: photo.x + photo.width + 18, y: 0, width: 102, height: 42 };
  result.dimensions.push({
    key: 'G',
    name: 'Group size',
    value: `${targetDisplay(target.values.groupSize, units)} ${targetUnit(units).label}`,
    from: { x: center.x - diagonal, y: center.y + diagonal },
    to: { x: center.x + diagonal, y: center.y - diagonal },
    label: { ...label },
  });
  if (geometry.poa) {
    const poa = point(geometry.poa);
    const elbow = { x: center.x, y: poa.y };
    result.poa = poa;
    result.dimensions.push(
      {
        key: 'H',
        name: 'Horizontal',
        value: `${targetDisplay(target.values.horizontalOffset, units)} ${targetUnit(units).label}`,
        from: poa,
        to: elbow,
        label: { ...label },
      },
      {
        key: 'V',
        name: 'Vertical',
        value: `${targetDisplay(target.values.verticalOffset, units)} ${targetUnit(units).label}`,
        from: elbow,
        to: center,
        label: { ...label },
      },
    );
  }
  // Anchor order reduces crossing leaders; fixed separation prevents labels from ever overlapping.
  result.dimensions.sort((a, b) => a.from.y + a.to.y - (b.from.y + b.to.y));
  result.dimensions.forEach((dimension, index) => {
    dimension.label.y = (figureHeight - result.dimensions.length * 58 + 16) / 2 + index * 58;
  });
  return result;
}

/** Render high-contrast measurement ink and opaque callouts; the original image is never modified. */
export function drawTargetFigure(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  figure: TargetFigure,
): void {
  const { photo, source } = figure;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, figure.width, figure.height);
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    photo.x,
    photo.y,
    photo.width,
    photo.height,
  );
  /** Dark halo plus white center stays visible against black, white and colored targets. */
  function ink(path: () => void, outer = 3.5, inner = 1.5) {
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const [color, width] of [
      ['#142722', outer],
      ['#ffffff', inner],
    ] as const) {
      context.beginPath();
      path();
      context.strokeStyle = color;
      context.lineWidth = width;
      context.stroke();
    }
  }
  /** Short arrowheads identify the measured span without relying on color. */
  function arrow(from: ImagePoint, to: ImagePoint) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const length = Math.min(5, Math.hypot(to.x - from.x, to.y - from.y) / 3);
    ink(() => {
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      for (const [tip, direction] of [
        [from, angle],
        [to, angle + Math.PI],
      ] as const)
        for (const side of [-0.6, 0.6]) {
          context.moveTo(tip.x, tip.y);
          context.lineTo(
            tip.x + length * Math.cos(direction + side),
            tip.y + length * Math.sin(direction + side),
          );
        }
    });
  }
  context.save();
  context.beginPath();
  context.rect(photo.x, photo.y, photo.width, photo.height);
  context.clip();
  if (figure.circle)
    ink(() =>
      context.arc(
        figure.circle!.center.x,
        figure.circle!.center.y,
        figure.circle!.radius,
        0,
        Math.PI * 2,
      ),
    );
  for (const dimension of figure.dimensions) arrow(dimension.from, dimension.to);
  if (figure.poa)
    ink(() => {
      const p = figure.poa!;
      context.moveTo(p.x - 5, p.y);
      context.lineTo(p.x + 5, p.y);
      context.moveTo(p.x, p.y - 5);
      context.lineTo(p.x, p.y + 5);
    });
  context.restore();
  for (const dimension of figure.dimensions) {
    const { from, to, label } = dimension;
    const anchor = {
      x: Math.max(photo.x, Math.min(photo.x + photo.width, (from.x + to.x) / 2)),
      y: Math.max(photo.y, Math.min(photo.y + photo.height, (from.y + to.y) / 2)),
    };
    ink(
      () => {
        context.moveTo(anchor.x, anchor.y);
        context.lineTo(photo.x + photo.width + 8, anchor.y);
        context.lineTo(label.x, label.y + label.height / 2);
      },
      2.5,
      1,
    );
    context.fillStyle = '#142722';
    context.fillRect(label.x, label.y, label.width, label.height);
    context.fillStyle = '#ffffff';
    context.font = 'bold 10px Arial, sans-serif';
    context.fillText(`${dimension.key} · ${dimension.name}`, label.x + 8, label.y + 15);
    context.font = '11px Arial, sans-serif';
    context.fillText(dimension.value, label.x + 8, label.y + 31);
  }
}
