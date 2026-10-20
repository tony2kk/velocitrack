import { db } from './database';
import { TARGET_FIELDS } from '../domain/targetMeasurement';

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

/** Inspect raster signatures; SVG/HTML and arbitrary attachments are deliberately unsupported. */
export function photoMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value))
    return 'image/png';
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  return null;
}

/** Validate size, signature and browser decoding before atomically attaching original bytes. */
export async function addPhoto(seriesId: string, file: File, database = db) {
  if (!file.size || file.size > MAX_PHOTO_BYTES)
    throw new Error('Choose a JPEG, PNG or WebP image up to 20 MiB.');
  const mime = photoMime(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!mime) throw new Error('Only JPEG, PNG and WebP photographs are supported.');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('This image could not be decoded.');
  });
  const pixels = bitmap.width * bitmap.height;
  bitmap.close();
  if (pixels > 60_000_000) throw new Error('Choose an image with at most 60 megapixels.');
  const id = crypto.randomUUID();
  await database.transaction(
    'rw',
    [database.series, database.attachments, database.attachmentContents],
    async () => {
      if (!(await database.series.get(seriesId))) throw new Error('This series no longer exists.');
      await database.attachments.add({
        id,
        seriesId,
        name: file.name,
        caption: '',
        mime,
        size: file.size,
        createdAt: new Date().toISOString(),
      });
      await database.attachmentContents.add({ id, blob: file.slice(0, file.size, mime) });
    },
  );
}

/** Delete photo bytes/provenance together while preserving the string's last confirmed numeric values. */
export async function removePhoto(id: string, database = db) {
  await database.transaction(
    'rw',
    [database.attachments, database.attachmentContents, database.annotations],
    async () => {
      const photo = await database.attachments.get(id);
      const annotation = photo ? await database.annotations.get(photo.seriesId) : undefined;
      if (annotation?.target?.photoId === id) {
        const values = annotation.target.values;
        await database.annotations.put({
          ...annotation,
          target: { values, manual: TARGET_FIELDS.filter((field) => values[field] !== null) },
        });
      }
      await database.attachments.delete(id);
      await database.attachmentContents.delete(id);
    },
  );
}
