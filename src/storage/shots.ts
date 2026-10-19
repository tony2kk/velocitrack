import { db } from './database';

/** Persist reversible local invalidation without deleting measurements or replacing other annotations. */
export async function setShotInvalid(id: string, invalid: boolean, database = db): Promise<void> {
  await database.transaction('rw', [database.shots, database.annotations], async () => {
    if (!(await database.shots.get(id))) throw new Error('This shot no longer exists.');
    const annotation = (await database.annotations.get(id)) ?? {
      entityId: id,
      notes: '',
      fields: {},
    };
    await database.annotations.put({ ...annotation, invalid });
  });
}
