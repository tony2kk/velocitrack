import {
  emptyTarget,
  overrideTargetValues,
  validTargetMeasurement,
  type TargetMeasurement,
  type TargetValues,
} from '../domain/targetMeasurement';
import { db } from './database';

/** Save one complete result atomically, preserving unrelated annotations and validating photo ownership. */
export async function saveTargetMeasurement(
  seriesId: string,
  measurement: TargetMeasurement,
  database = db,
) {
  if (!validTargetMeasurement(measurement)) throw new Error('The target measurement is invalid.');
  await database.transaction(
    'rw',
    [database.series, database.annotations, database.attachments],
    async () => {
      if (!(await database.series.get(seriesId))) throw new Error('This series no longer exists.');
      if (
        measurement.photoId &&
        (await database.attachments.get(measurement.photoId))?.seriesId !== seriesId
      )
        throw new Error('This photo no longer belongs to the series. Reopen the editor.');
      const annotation = (await database.annotations.get(seriesId)) ?? {
        entityId: seriesId,
        notes: '',
        fields: {},
      };
      await database.annotations.put({ ...annotation, target: structuredClone(measurement) });
    },
  );
}

/** Merge touched manual values with the latest drawing inside one transaction, preserving other edits. */
export async function saveTargetValues(
  seriesId: string,
  patch: Partial<TargetValues>,
  database = db,
) {
  await database.transaction(
    'rw',
    [database.series, database.annotations, database.attachments],
    async () => {
      const current = (await database.annotations.get(seriesId))?.target ?? emptyTarget();
      await saveTargetMeasurement(seriesId, overrideTargetValues(current, patch), database);
    },
  );
}
