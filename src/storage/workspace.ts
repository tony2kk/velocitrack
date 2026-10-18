import {
  defaultProfile,
  entityId,
  type CatalogItem,
  type CatalogKind,
  type DataSource,
  type Profile,
  type Series,
} from '../domain/model';
import type { ImportBundle, ImportedReference } from '../sources/velociradar';
import { db, type WorkspaceDatabase } from './database';

export async function loadWorkspace(database = db) {
  return database.transaction('r', database.tables, async () => ({
    sources: await database.sources.toArray(),
    catalog: await database.catalog.toArray(),
    series: await database.series.toArray(),
    shots: await database.shots.toArray(),
    profile: (await database.profiles.get('local')) ?? defaultProfile(),
  }));
}

export type Workspace = Awaited<ReturnType<typeof loadWorkspace>>;

export async function saveProfile(patch: Partial<Omit<Profile, 'id'>>, database = db) {
  await database.transaction('rw', database.profiles, async () => {
    const current = (await database.profiles.get('local')) ?? defaultProfile();
    await database.profiles.put({ ...current, ...patch, id: 'local' });
  });
}

export function createSource(name: string, autoUpdateCatalogs: boolean): DataSource {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    kind: 'velociradar-export',
    enabled: true,
    autoUpdateCatalogs,
    createdAt: new Date().toISOString(),
    status: 'needs-files',
  };
}

async function resolveCatalog(
  reference: ImportedReference,
  kind: CatalogKind,
  source: DataSource,
  items: CatalogItem[],
  database: WorkspaceDatabase,
): Promise<string> {
  let item = items.find(
    (candidate) =>
      candidate.kind === kind &&
      candidate.links.some(
        (link) => link.sourceId === source.id && link.remoteId === reference.remoteId,
      ),
  );
  if (!item) {
    // Only an unlinked, manually created entry can match by name. Cross-source mapping is explicit future work.
    const matches = items.filter(
      (candidate) =>
        candidate.kind === kind &&
        !candidate.links.length &&
        candidate.name.toLocaleLowerCase() === reference.name.toLocaleLowerCase(),
    );
    if (matches.length === 1) item = matches[0];
  }
  if (!item) {
    if (!source.autoUpdateCatalogs)
      throw new Error(
        `Value "${reference.name}" is not in the ${kind === 'firearm' ? 'firearms' : 'projectiles'} catalog.`,
      );
    item = {
      id: crypto.randomUUID(),
      kind,
      name: reference.name,
      links: [],
      managedBySourceId: source.id,
    };
    items.push(item);
  }
  if (
    !item.links.some((link) => link.sourceId === source.id && link.remoteId === reference.remoteId)
  )
    item.links.push({ sourceId: source.id, remoteId: reference.remoteId });
  if (source.autoUpdateCatalogs && item.managedBySourceId === source.id) item.name = reference.name;
  await database.catalog.put(item);
  return item.id;
}

/** The complete source import succeeds or rolls back, including catalog changes. */
export async function importBundle(sourceId: string, bundle: ImportBundle, database = db) {
  const now = new Date().toISOString();
  await database.transaction(
    'rw',
    [database.sources, database.catalog, database.series, database.shots],
    async () => {
      const source = await database.sources.get(sourceId);
      if (!source) throw new Error('This source no longer exists.');
      const catalog = await database.catalog.toArray();
      const series: Series[] = [];
      for (const imported of bundle.series) {
        series.push({
          id: entityId(sourceId, imported.remoteId),
          sourceId,
          remoteId: imported.remoteId,
          name: imported.name,
          startedAt: imported.startedAt,
          raw: imported.raw,
          firearmId: await resolveCatalog(imported.firearm, 'firearm', source, catalog, database),
          projectileId: await resolveCatalog(
            imported.projectile,
            'projectile',
            source,
            catalog,
            database,
          ),
        });
      }
      await database.series.bulkPut(series);
      await database.shots.bulkPut(
        bundle.shots.map((shot) => ({
          id: entityId(sourceId, shot.seriesRemoteId, shot.remoteId),
          sourceId,
          seriesId: entityId(sourceId, shot.seriesRemoteId),
          remoteId: shot.remoteId,
          number: shot.number,
          muzzleVelocity: shot.muzzleVelocity,
          ballisticCoefficientG1: shot.ballisticCoefficientG1,
          ballisticCoefficientG7: shot.ballisticCoefficientG7,
          distances: shot.distances,
          velocities: shot.velocities,
          excluded: shot.excluded,
          rawUnit: shot.rawUnit,
          raw: shot.raw,
        })),
      );
      await database.sources.update(sourceId, {
        status: 'ready',
        error: undefined,
        lastAttemptAt: now,
        lastSuccessAt: now,
      });
    },
  );
  return { series: bundle.series.length, shots: bundle.shots.length };
}

export async function recordImportFailure(sourceId: string, message: string, database = db) {
  await database.sources.update(sourceId, {
    status: 'error',
    error: message,
    lastAttemptAt: new Date().toISOString(),
  });
}

export async function requestRefresh(database = db) {
  await database.transaction('rw', database.sources, async () => {
    await database.sources
      .filter((source) => source.enabled)
      .modify({ status: 'needs-files', error: undefined });
  });
}

export async function saveCatalogItem(kind: CatalogKind, name: string, id?: string, database = db) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 120) throw new Error('Enter a name of 1–120 characters.');
  await database.transaction('rw', database.catalog, async () => {
    const existing = id ? await database.catalog.get(id) : undefined;
    if (id && !existing) throw new Error('This catalog entry no longer exists.');
    const duplicates = await database.catalog.where('kind').equals(kind).toArray();
    if (
      duplicates.some(
        (item) => item.id !== id && item.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
      )
    )
      throw new Error('This name already exists in the catalog.');
    await database.catalog.put({
      id: id ?? crypto.randomUUID(),
      kind,
      name: trimmed,
      links: existing?.links ?? [],
    });
  });
}

export async function removeCatalogItem(item: CatalogItem, database = db) {
  await database.transaction('rw', [database.catalog, database.series], async () => {
    const field = item.kind === 'firearm' ? 'firearmId' : 'projectileId';
    if (await database.series.where(field).equals(item.id).count())
      throw new Error('This entry is used by imported series and cannot be removed.');
    await database.catalog.delete(item.id);
  });
}

export async function removeSource(sourceId: string, database = db) {
  await database.transaction('rw', database.tables, async () => {
    const series = await database.series.where('sourceId').equals(sourceId).primaryKeys();
    const shots = await database.shots.where('sourceId').equals(sourceId).primaryKeys();
    await database.annotations.bulkDelete([...series, ...shots]);
    await database.shots.where('sourceId').equals(sourceId).delete();
    await database.series.where('sourceId').equals(sourceId).delete();
    await database.sources.delete(sourceId);
    await database.catalog.toCollection().modify((item) => {
      item.links = item.links.filter((link) => link.sourceId !== sourceId);
      if (item.managedBySourceId === sourceId) delete item.managedBySourceId;
    });
    const profile = await database.profiles.get('local');
    if (profile)
      await database.profiles.put({
        ...profile,
        filters: {
          ...profile.filters,
          sourceIds: profile.filters.sourceIds.filter((id) => id !== sourceId),
        },
      });
  });
}
