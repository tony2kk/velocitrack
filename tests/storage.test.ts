import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceDatabase } from '../src/storage/database';
import {
  createSource,
  importBundle,
  loadWorkspace,
  recordImportFailure,
  removeCatalogItem,
  removeSource,
  requestRefresh,
  saveCatalogItem,
  saveProfile,
} from '../src/storage/workspace';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { syntheticExport } from './fixtures/synthetic';
import { defaultProfile, EMPTY_FILTERS, entityId, type Profile } from '../src/domain/model';

let database: WorkspaceDatabase;
const bundle = () =>
  parseVelociRadarExport([
    { name: 'synthetic.fixture.json', text: JSON.stringify(syntheticExport()) },
  ]);
beforeEach(() => {
  database = new WorkspaceDatabase(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});

describe('local transactions', () => {
  it('counts only new identities while still updating existing measurements', async () => {
    const source = createSource('New records', true);
    await database.sources.add(source);
    expect(await importBundle(source.id, bundle(), database)).toEqual({ series: 2, shots: 4 });
    expect(await importBundle(source.id, bundle(), database)).toEqual({ series: 0, shots: 0 });
    const update = bundle();
    update.shots[0]!.muzzleVelocity = 999;
    expect(await importBundle(source.id, update, database)).toEqual({ series: 0, shots: 0 });
    expect(
      (await database.shots.get(entityId(source.id, 'series-a', 'shot-a')))?.muzzleVelocity,
    ).toBe(999);
    update.shots.push({ ...update.shots[0]!, remoteId: 'new-shot' });
    expect(await importBundle(source.id, update, database)).toEqual({ series: 0, shots: 1 });
    expect(await importBundle(source.id, { series: [], shots: [] }, database)).toEqual({
      series: 0,
      shots: 0,
    });
  });

  it('does not count the same identities twice during concurrent imports', async () => {
    const source = createSource('Concurrent', true);
    await database.sources.add(source);
    const results = await Promise.all([
      importBundle(source.id, bundle(), database),
      importBundle(source.id, bundle(), database),
    ]);
    expect(results.reduce((sum, result) => sum + result.series, 0)).toBe(2);
    expect(results.reduce((sum, result) => sum + result.shots, 0)).toBe(4);
  });

  it('defaults legacy profiles without resetting preferences and persists display choices across reopen', async () => {
    const legacy: Partial<Profile> = {
      ...defaultProfile(),
      nickname: 'Legacy',
      rememberSignIn: true,
    };
    delete legacy.unitSystem;
    delete legacy.shotDetail;
    // Model the stored shape created by older releases, before the new preference fields existed.
    await database.profiles.put(legacy as Profile);
    expect((await loadWorkspace(database)).profile).toMatchObject({
      unitSystem: 'imperial',
      shotDetail: 'muzzleVelocity',
      nickname: 'Legacy',
      rememberSignIn: true,
    });
    await saveProfile({ unitSystem: 'metric', shotDetail: 'g7' }, database);
    const name = database.name;
    database.close();
    database = new WorkspaceDatabase(name);
    expect((await loadWorkspace(database)).profile).toMatchObject({
      unitSystem: 'metric',
      shotDetail: 'g7',
      nickname: 'Legacy',
      rememberSignIn: true,
    });
  });
  it('does not mark an online source as awaiting files or import into a different bound account', async () => {
    const source = { ...createSource('Cloud', true, 'caldwell'), accountId: 'synthetic-owner' };
    await database.sources.add(source);
    await requestRefresh(database);
    expect((await database.sources.get(source.id))?.status).toBe('needs-setup');
    await expect(
      importBundle(source.id, bundle(), database, 'different-synthetic-owner'),
    ).rejects.toThrow('account changed');
    expect(await database.series.count()).toBe(0);
    await importBundle(source.id, bundle(), database, 'synthetic-owner');
    expect(await database.shots.count()).toBe(4);
  });
  it('refreshes idempotently and keeps local annotations and absent records', async () => {
    const source = createSource('Synthetic source', true);
    await database.sources.add(source);
    await importBundle(source.id, bundle(), database);
    const id = entityId(source.id, 'series-a');
    await database.annotations.put({
      entityId: id,
      notes: 'Local only',
      fields: { condition: { type: 'text', value: 'Synthetic note' } },
    });
    await importBundle(source.id, bundle(), database);
    await importBundle(source.id, { series: [], shots: [] }, database);
    expect(await database.series.count()).toBe(2);
    expect(await database.shots.count()).toBe(4);
    expect(await database.catalog.count()).toBe(3);
    expect((await database.annotations.get(id))?.notes).toBe('Local only');
  });
  it('rolls back the entire import on a missing catalog entry and retains previous success', async () => {
    const source = createSource('Synthetic source', true);
    await database.sources.add(source);
    await importBundle(source.id, bundle(), database);
    const before = await loadWorkspace(database);
    await database.sources.update(source.id, { autoUpdateCatalogs: false });
    const next = bundle();
    next.series[0]!.name = 'Must not be saved';
    next.series[1]!.projectile = { remoteId: 'new-projectile', name: 'Missing sample' };
    await expect(importBundle(source.id, next, database)).rejects.toThrow(
      'Value "Missing sample" is not in the projectiles catalog.',
    );
    await recordImportFailure(source.id, 'Expected synthetic failure', database);
    const after = await loadWorkspace(database);
    expect(after.series).toEqual(before.series);
    expect(after.shots).toEqual(before.shots);
    expect(after.catalog).toEqual(before.catalog);
    expect(after.sources[0]?.lastSuccessAt).toBe(before.sources[0]?.lastSuccessAt);
    expect(after.sources[0]?.status).toBe('error');
  });
  it('allows manual catalog repair and preserves manual renames on refresh', async () => {
    const source = createSource('Synthetic source', false);
    await database.sources.add(source);
    await saveCatalogItem('firearm', 'Sample firearm A', undefined, database);
    await saveCatalogItem('firearm', 'Sample firearm B', undefined, database);
    await saveCatalogItem('projectile', 'Sample projectile A', undefined, database);
    await importBundle(source.id, bundle(), database);
    const item = (await database.catalog.where('kind').equals('projectile').first())!;
    await saveCatalogItem(item.kind, 'My local name', item.id, database);
    await database.sources.update(source.id, { autoUpdateCatalogs: true });
    await importBundle(source.id, bundle(), database);
    expect((await database.catalog.get(item.id))?.name).toBe('My local name');
    await expect(removeCatalogItem(item, database)).rejects.toThrow('used by imported series');
  });
  it('isolates matching provider IDs between sources and refreshes all enabled sources', async () => {
    const a = createSource('A', true);
    const b = createSource('B', true);
    const c = { ...createSource('C', true), enabled: false, status: 'ready' as const };
    await database.sources.bulkAdd([a, b, c]);
    await importBundle(a.id, bundle(), database);
    await importBundle(b.id, bundle(), database);
    await saveProfile({ filters: { ...EMPTY_FILTERS, sourceIds: [a.id] } }, database);
    await requestRefresh(database);
    expect(await database.series.count()).toBe(4);
    expect(await database.catalog.count()).toBe(6);
    expect((await database.sources.get(a.id))?.status).toBe('needs-files');
    expect((await database.sources.get(b.id))?.status).toBe('needs-files');
    expect((await database.sources.get(c.id))?.status).toBe('ready');
  });
  it('persists profile and filters across database reopen without one patch erasing another', async () => {
    await Promise.all([
      saveProfile({ nickname: 'Synthetic nickname' }, database),
      saveProfile(
        { filters: { ...EMPTY_FILTERS, dateMode: 'weeks', relativeAmount: 6 } },
        database,
      ),
    ]);
    const name = database.name;
    database.close();
    database = new WorkspaceDatabase(name);
    expect((await loadWorkspace(database)).profile).toMatchObject({
      nickname: 'Synthetic nickname',
      filters: { dateMode: 'weeks', relativeAmount: 6 },
    });
  });
  it('removes only the selected source and its data, retaining catalog names', async () => {
    const a = createSource('A', true);
    const b = createSource('B', true);
    await database.sources.bulkAdd([a, b]);
    await importBundle(a.id, bundle(), database);
    await importBundle(b.id, bundle(), database);
    await removeSource(a.id, database);
    expect(await database.shots.count()).toBe(4);
    expect(await database.series.count()).toBe(2);
    expect(await database.catalog.count()).toBe(6);
    expect(
      (await database.catalog.toArray()).some((item) =>
        item.links.some((link) => link.sourceId === a.id),
      ),
    ).toBe(false);
  });
});
