import type { UnitSystem } from '../domain/model';
import type { TargetMeasurement } from '../domain/targetMeasurement';
import { targetFigureLayout, drawTargetFigure } from './targetFigure';

/** Render the same immutable, local-only target figure for PDF and read-only preview. */
export async function renderTargetPhoto(
  blob: Blob,
  target: TargetMeasurement | undefined,
  units: UnitSystem,
): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 60_000_000
    )
      throw new Error('The target photo exceeds the supported image dimensions.');
    const crop = target?.reportCrop;
    if (crop && (crop.width !== image.naturalWidth || crop.height !== image.naturalHeight))
      throw new Error('Reopen the report crop; the photo dimensions have changed.');
    const figure = targetFigureLayout(image.naturalWidth, image.naturalHeight, target, units);
    const scale = 1600 / Math.max(figure.width, figure.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(figure.width * scale);
    canvas.height = Math.ceil(figure.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Target rendering is unavailable in this browser.');
    context.scale(scale, scale);
    drawTargetFigure(context, image, figure);
    return canvas.toDataURL('image/jpeg', 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}
