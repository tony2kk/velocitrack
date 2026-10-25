import {
  defaultProfile,
  entityId,
  type CatalogItem,
  type CatalogKind,
  type DataSource,
  type Profile,
  type Series,
  type Shot,
  type SourceKind,
} from '../domain/model';
import type { ImportBundle, ImportedReference } from '../sources/velociradar';
import { importedAtmosphere } from '../sources/atmosphere';
import { db, type WorkspaceDatabase } from './database';
import { validateReportProfiles } from '../domain/reportProfiles';

/** Read a consistent snapshot so the UI never mixes tables from different import transactions. */
export async function loadWorkspace(database = db) {
  return database.transaction('r', database.tables, async () => ({
    sources: await database.sources.toArray(),
    catalog: await database.catalog.toArray(),
    series: await database.series.toArray(),
    shots: await database.shots.toArray(),
    annotations: await database.annotations.toArray(),
    fieldDefinitions: await database.fieldDefinitions.orderBy('order').toArray(),
    tags: await database.tags.toArray(),
    attachments: await database.attachments.toArray(),
    // Add defaults for older profiles without resetting their data, filters or consent.
    profile: { ...defaultProfile(), ...(await database.profiles.get('local')) },
  }));
}

export type Workspace = Awaited<ReturnType<typeof loadWorkspace>>;

/** Merge top-level preferences atomically; callers provide complete nested filter objects. */
export async function saveProfile(patch: Partial<Omit<Profile, 'id'>>, database = db) {
  if (
    patch.reportPaperSize !== undefined &&
    patch.reportPaperSize !== 'A4' &&
    patch.reportPaperSize !== 'LETTER'
  )
    throw new Error('Report paper size must be A4 or Letter.');
  if (
    patch.chartHeightPercent !== undefined &&
    (!Number.isInteger(patch.chartHeightPercent) ||
      patch.chartHeightPercent < 70 ||
      patch.chartHeightPercent > 200)
  )
    throw new Error('Chart height must be a whole percentage between 70 and 200.');
  await database.transaction('rw', database.profiles, async () => {
    const current = { ...defaultProfile(), ...(await database.profiles.get('local')) };
    const next = { ...current, ...patch, id: 'local' as const };
    validateReportProfiles(
      next.reportProfiles === undefined ? [] : next.reportProfiles,
      next.selectedReportProfileId,
    );
    await database.profiles.put(next);
  });
}

/** Create an unsaved source with the setup state appropriate to its immutable adapter type. */
export function createSource(
  name: string,
  autoUpdateCatalogs: boolean,
  kind: SourceKind = 'velociradar-export',
): DataSource {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    kind,
    enabled: true,
    autoUpdateCatalogs,
    createdAt: new Date().toISOString(),
    status: kind === 'caldwell' ? 'needs-setup' : 'needs-files',
  };
}

/** Resolve or create a reference inside the caller's import transaction, honoring catalog policy. */
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

/**
 * Commit a validated source bundle and its catalog changes atomically.
 * Upserts preserve records absent from this download and never replace local annotations.
 * Connected imports recheck account binding inside the write transaction.
 * Return counts of newly inserted identities; updates to existing records are not new imports.
 */
export async function importBundle(
  sourceId: string,
  bundle: ImportBundle,
  database = db,
  expectedAccountId?: string,
) {
  const now = new Date().toISOString();
  return database.transaction(
    'rw',
    [database.sources, database.catalog, database.series, database.shots],
    async () => {
      const source = await database.sources.get(sourceId);
      if (!source) throw new Error('This source no longer exists.');
      if (
        expectedAccountId &&
        (source.kind !== 'caldwell' || source.accountId !== expectedAccountId)
      )
        throw new Error('The source account changed during refresh. Nothing was imported.');
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
          ...importedAtmosphere(imported.raw),
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
      const shots: Shot[] = bundle.shots.map((shot) => ({
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
      }));
      // Count identities before upserting, in the same transaction so concurrent imports cannot double-count.
      const existingSeries = await database.series.bulkGet(series.map((item) => item.id));
      const existingShots = await database.shots.bulkGet(shots.map((item) => item.id));
      await database.series.bulkPut(series);
      await database.shots.bulkPut(shots);
      await database.sources.update(sourceId, {
        status: 'ready',
        error: undefined,
        lastAttemptAt: now,
        lastSuccessAt: now,
      });
      return {
        series: existingSeries.filter((item) => item === undefined).length,
        shots: existingShots.filter((item) => item === undefined).length,
      };
    },
  );
}

/** Record an unsuccessful attempt without losing previous data or the last successful timestamp. */
export async function recordImportFailure(sourceId: string, message: string, database = db) {
  await database.sources.update(sourceId, {
    status: 'error',
    error: message,
    lastAttemptAt: new Date().toISOString(),
  });
}

/** Mark enabled file sources awaiting user-selected files; browsers cannot silently reread them. */
export async function requestRefresh(database = db) {
  await database.transaction('rw', database.sources, async () => {
    await database.sources
      .filter((source) => source.enabled && source.kind === 'velociradar-export')
      .modify({ status: 'needs-files', error: undefined });
  });
}

/** Save a unique manual name and relinquish source-managed naming so refresh cannot overwrite it. */
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

/** Remove an unused catalog entry while checking references in the same transaction. */
export async function removeCatalogItem(item: CatalogItem, database = db) {
  await database.transaction('rw', [database.catalog, database.series], async () => {
    const field = item.kind === 'firearm' ? 'firearmId' : 'projectileId';
    if (await database.series.where(field).equals(item.id).count())
      throw new Error('This entry is used by imported series and cannot be removed.');
    await database.catalog.delete(item.id);
  });
}

/** Delete a source's data and annotations atomically; retain catalog names and clear its filter. */
export async function removeSource(sourceId: string, database = db) {
  await database.transaction('rw', database.tables, async () => {
    const series = await database.series.where('sourceId').equals(sourceId).primaryKeys();
    const shots = await database.shots.where('sourceId').equals(sourceId).primaryKeys();
    const attachments = await database.attachments.where('seriesId').anyOf(series).primaryKeys();
    await database.attachmentContents.bulkDelete(attachments);
    await database.attachments.bulkDelete(attachments);
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
