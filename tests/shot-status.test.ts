import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceDatabase } from '../src/storage/database';
import { setShotInvalid } from '../src/storage/shots';
import { createSource, importBundle, loadWorkspace, removeSource } from '../src/storage/workspace';
import { createBackup, prepareBackup, restoreBackup } from '../src/storage/backup';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { syntheticExport } from './fixtures/synthetic';

let database: WorkspaceDatabase;
beforeEach(() => {
  database = new WorkspaceDatabase(`shot-status-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});

describe('persistent local invalidation', () => {
  it('preserves originals and annotations through reimport and backup, and supports undo and source cleanup', async () => {
    const source = createSource('Invented status source', true);
    await database.sources.put(source);
    const bundle = parseVelociRadarExport([
      { name: 'example.json', text: JSON.stringify(syntheticExport()) },
    ]);
    await importBundle(source.id, bundle, database);
    const original = (await database.shots.toArray())[0]!;
    const annotation = {
      entityId: original.id,
      notes: 'Keep this note',
      fields: { legacy: { type: 'text' as const, value: 'Keep this value' } },
    };
    await database.annotations.put(annotation);
    await setShotInvalid(original.id, true, database);
    await importBundle(source.id, bundle, database);
    expect(await database.shots.get(original.id)).toEqual(original);
    expect(await database.annotations.get(original.id)).toEqual({ ...annotation, invalid: true });
    const archive = await prepareBackup(await createBackup(database));
    await setShotInvalid(original.id, false, database);
    await restoreBackup(archive, database);
    expect(
      (await loadWorkspace(database)).annotations.find((item) => item.entityId === original.id)
        ?.invalid,
    ).toBe(true);
    await setShotInvalid(original.id, false, database);
    expect(await database.annotations.get(original.id)).toEqual({ ...annotation, invalid: false });
    await removeSource(source.id, database);
    expect(await database.annotations.get(original.id)).toBeUndefined();
    await expect(setShotInvalid(original.id, true, database)).rejects.toThrow('no longer exists');
    expect(await database.annotations.count()).toBe(0);
  });
});
