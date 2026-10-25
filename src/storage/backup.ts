import { strFromU8, strToU8, unzipSync, zip, type Zippable } from 'fflate';
import { db } from './database';
import { loadWorkspace, type Workspace } from './workspace';
import { validateBackup } from './backupValidation';
import { photoMime } from './attachments';
import type { Attachment } from '../domain/model';
import {
  BACKUP_DATA_VERSION,
  BACKUP_FORMAT_VERSION,
  backupCompatibility,
  type BackupCompatibility,
} from './backupVersions';
import { migrateBackup } from './backupMigrations';
import { distanceCurveRegistry } from '../domain/distanceCurves/registry';

export const MAX_BACKUP_BYTES = 256 * 1024 * 1024;
const TABLE_NAMES = [
  'sources',
  'catalog',
  'series',
  'shots',
  'annotations',
  'fieldDefinitions',
  'tags',
  'attachments',
] as const;
/** Validated archive contents are held locally until explicit replacement confirmation. */
export interface PreparedBackup {
  workspace: Workspace;
  photos: Map<string, Uint8Array>;
  createdAt: string;
  compatibility: BackupCompatibility;
}

/** Stable paths use attachment IDs, never user-controlled filenames or filesystem paths. */
function photoPath(photo: Attachment): string {
  return `attachments/${photo.id}.${photo.mime === 'image/jpeg' ? 'jpg' : photo.mime === 'image/png' ? 'png' : 'webp'}`;
}
/** Content hashes detect corrupt entries independently of ZIP CRC behavior. */
async function digest(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
}
/** Capture all local tables and photos in one consistent read transaction; SDK tokens are never read. */
export async function createBackup(database = db): Promise<Uint8Array> {
  const snapshot = await database.transaction('r', database.tables, async () => ({
    workspace: await loadWorkspace(database),
    contents: await database.attachmentContents.toArray(),
  }));
  validateBackup(snapshot.workspace);
  const entries: Record<string, Uint8Array> = {};
  for (const name of TABLE_NAMES)
    entries[`data/${name}.json`] = strToU8(JSON.stringify(snapshot.workspace[name], null, 2));
  entries['data/profile.json'] = strToU8(JSON.stringify(snapshot.workspace.profile, null, 2));
  let total = Object.values(entries).reduce((sum, value) => sum + value.length, 0);
  const blobs = new Map(snapshot.contents.map((item) => [item.id, item.blob]));
  for (const photo of snapshot.workspace.attachments) {
    const blob = blobs.get(photo.id);
    if (!blob || blob.size !== photo.size)
      throw new Error('A photo is missing or damaged. Backup was not created.');
    total += blob.size;
    if (total > MAX_BACKUP_BYTES)
      throw new Error('This workspace exceeds the 256 MiB backup limit.');
    entries[photoPath(photo)] = new Uint8Array(await blob.arrayBuffer());
  }
  if (total > MAX_BACKUP_BYTES) throw new Error('This workspace exceeds the 256 MiB backup limit.');
  const files = await Promise.all(
    Object.entries(entries).map(async ([path, bytes]) => ({
      path,
      size: bytes.length,
      sha256: await digest(bytes),
    })),
  );
  if (files.length + 1 > 10000)
    throw new Error('This workspace exceeds the 10,000 backup-entry limit.');
  entries['manifest.json'] = strToU8(
    JSON.stringify(
      {
        format: 'velocitrack-workspace',
        version: BACKUP_FORMAT_VERSION,
        dataVersion: BACKUP_DATA_VERSION,
        appVersion: __APP_VERSION__,
        appRevision: __BUILD_REVISION__,
        createdAt: new Date().toISOString(),
        files,
      },
      null,
      2,
    ),
  );
  if (entries['manifest.json'].length > 2 * 1024 * 1024)
    throw new Error('The backup manifest exceeds 2 MiB.');
  if (total + entries['manifest.json'].length > MAX_BACKUP_BYTES)
    throw new Error('This workspace exceeds the 256 MiB backup limit.');
  const archive: Zippable = {};
  for (const [path, bytes] of Object.entries(entries)) archive[path] = [bytes, { level: 0 }];
  // Photos are already compressed. Stored entries keep backup creation predictable on mobile.
  const output = await new Promise<Uint8Array>((resolve, reject) =>
    zip(archive, (error, bytes) => (error ? reject(error) : resolve(bytes))),
  );
  if (output.length > MAX_BACKUP_BYTES)
    throw new Error('The ZIP exceeds the 256 MiB backup limit.');
  return output;
}

/** Validate bounded ZIP entries, manifest hashes, domain records and photo signatures before restore. */
export async function prepareBackup(bytes: Uint8Array): Promise<PreparedBackup> {
  if (!bytes.length || bytes.length > MAX_BACKUP_BYTES)
    throw new Error('Choose a VelociTrack ZIP up to 256 MiB.');
  let total = 0;
  const seen = new Set<string>();
  const entries = unzipSync(bytes, {
    filter: (file) => {
      total += file.originalSize;
      if (
        !Number.isSafeInteger(file.originalSize) ||
        file.originalSize < 0 ||
        total > MAX_BACKUP_BYTES ||
        seen.has(file.name) ||
        seen.size >= 10000 ||
        !/^(manifest\.json|data\/[a-zA-Z]+\.json|attachments\/[a-zA-Z0-9-]+\.(jpg|png|webp))$/.test(
          file.name,
        )
      )
        throw new Error('Invalid, duplicate or oversized ZIP entry.');
      seen.add(file.name);
      return true;
    },
  });
  if (Object.values(entries).reduce((sum, entry) => sum + entry.length, 0) > MAX_BACKUP_BYTES)
    throw new Error('Expanded backup is too large.');
  const manifestBytes = entries['manifest.json'];
  if (!manifestBytes || manifestBytes.length > 2 * 1024 * 1024)
    throw new Error('Missing or oversized backup manifest.');
  const manifest = JSON.parse(strFromU8(manifestBytes)) as Record<string, unknown> | null;
  if (!manifest || manifest.format !== 'velocitrack-workspace')
    throw new Error('This backup format is not supported.');
  const compatibility = backupCompatibility(manifest);
  if (
    typeof manifest.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(manifest.createdAt)) ||
    !Array.isArray(manifest.files)
  )
    throw new Error('This backup format or version is not supported.');
  const listed = new Set<string>();
  for (const file of manifest.files) {
    if (
      !file ||
      typeof file.path !== 'string' ||
      file.path === 'manifest.json' ||
      listed.has(file.path) ||
      !Object.hasOwn(entries, file.path)
    )
      throw new Error('Invalid backup file list.');
    listed.add(file.path);
    const entry = entries[file.path]!;
    if (entry.length !== file.size || (await digest(entry)) !== file.sha256)
      throw new Error('A backup file is missing or corrupt.');
  }
  if (listed.size + 1 !== Object.keys(entries).length)
    throw new Error('The archive contains unlisted files.');
  const value: Record<string, unknown> = {};
  for (const name of [...TABLE_NAMES, 'profile']) {
    const data = entries[`data/${name}.json`];
    if (!data) throw new Error(`Missing ${name} data.`);
    value[name] = JSON.parse(strFromU8(data));
  }
  migrateBackup(value, compatibility);
  try {
    validateBackup(value);
  } catch {
    throw new Error(
      `The backup contains invalid records, unsupported fields or broken references. Nothing was restored. If it was created by a newer app, update VelociTrack first. Backup app: ${compatibility.appVersion ?? 'not recorded'}; current app: ${__APP_VERSION__}.`,
    );
  }
  const unavailable = new Set<string>();
  const charts = [
    ...(['simple', 'dual', 'compare'] as const).map((mode) => value.profile.analysis?.[mode]),
    ...(value.profile.reportProfiles ?? []).flatMap((report) =>
      report.views.flatMap((view) => (view.mode === 'info' ? [] : [view.settings])),
    ),
  ];
  for (const chart of charts) {
    for (const id of [chart?.quantity, chart?.secondary]) {
      if (
        id &&
        ((/^(curve:|calculated:)/.test(id) && !distanceCurveRegistry.get(id)) ||
          (id.startsWith('field:') &&
            !value.fieldDefinitions.some((field) => `field:${field.id}` === id)))
      )
        unavailable.add(id);
    }
  }
  if (unavailable.size)
    compatibility.notices.push(
      `Unavailable chart functions or fields: ${[...unavailable].join(', ')}. Their saved IDs are retained in charts and Report Builder, but this app cannot display them; choose an available quantity after restoring.`,
    );
  const expected = new Set([
    'manifest.json',
    ...[...TABLE_NAMES, 'profile'].map((name) => `data/${name}.json`),
    ...value.attachments.map(photoPath),
  ]);
  if (
    expected.size !== Object.keys(entries).length ||
    Object.keys(entries).some((path) => !expected.has(path))
  )
    throw new Error('Unexpected backup files.');
  const photos = new Map<string, Uint8Array>();
  for (const photo of value.attachments) {
    const content = entries[photoPath(photo)];
    if (!content || content.length !== photo.size || photoMime(content) !== photo.mime)
      throw new Error('A photo is missing or invalid.');
    photos.set(photo.id, content);
  }
  return { workspace: value, photos, createdAt: manifest.createdAt, compatibility };
}

/** Replace every application table in one transaction; quota/write failures roll back the whole workspace. */
export async function restoreBackup(prepared: PreparedBackup, database = db) {
  validateBackup(prepared.workspace);
  const w = prepared.workspace;
  const contents = w.attachments.map((photo) => {
    const bytes = prepared.photos.get(photo.id);
    if (!bytes || bytes.length !== photo.size || photoMime(bytes) !== photo.mime)
      throw new Error('Missing or invalid photo content.');
    return { id: photo.id, blob: new Blob([new Uint8Array(bytes)], { type: photo.mime }) };
  });
  await database.transaction('rw', database.tables, async () => {
    for (const table of database.tables) await table.clear();
    await database.sources.bulkPut(
      w.sources.map((source) => ({
        ...source,
        status: source.kind === 'caldwell' ? 'needs-sign-in' : 'needs-files',
        error: undefined,
      })),
    );
    await database.catalog.bulkPut(w.catalog);
    await database.series.bulkPut(w.series);
    await database.shots.bulkPut(w.shots);
    await database.annotations.bulkPut(w.annotations);
    await database.fieldDefinitions.bulkPut(w.fieldDefinitions);
    await database.tags.bulkPut(w.tags);
    await database.attachments.bulkPut(w.attachments);
    await database.attachmentContents.bulkPut(contents);
    await database.profiles.put(w.profile);
  });
}
