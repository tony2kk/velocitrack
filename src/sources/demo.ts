import { defaultProfile, type DataSource } from '../domain/model';
import type { ReportProfile } from '../domain/reportProfiles';
import { reportName } from '../domain/reportProfiles';
import { db } from '../storage/database';
import { loadWorkspace, removeSource, type Workspace } from '../storage/workspace';
import { validateBackup } from '../storage/backupValidation';
import { removeField, removeTag } from '../storage/customization';
import { deleteReportProfile } from '../storage/reportProfiles';
import { photoMime } from '../storage/attachments';

/** A curated, opt-in public sample. No source connections or user profile can be included. */
export interface DemoPackage extends Omit<Workspace, 'sources' | 'profile'> {
  format: 'velocitrack-demo';
  version: 1;
  date: string;
  reportProfiles: ReportProfile[];
  assets: Record<string, string>;
}

/** Construct a non-connected source; the fixed sample is already current after installation. */
function demoSource(id: string, name: string): DataSource {
  return {
    id,
    name,
    kind: 'demo',
    enabled: true,
    autoUpdateCatalogs: false,
    createdAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
    status: 'ready',
  };
}

/** Reuse the workspace validator for relationships, with a deliberately invented empty profile. */
export function validateDemo(value: unknown): asserts value is DemoPackage {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid demo package.');
  const p = value as DemoPackage;
  const allowed = [
    'format',
    'version',
    'date',
    'assets',
    'reportProfiles',
    'series',
    'shots',
    'catalog',
    'annotations',
    'fieldDefinitions',
    'tags',
    'attachments',
  ];
  if (Object.keys(p).some((key) => !allowed.includes(key)) || !Array.isArray(p.reportProfiles))
    throw new Error('The demo must not contain profile or connection settings.');
  const { format, version, date, assets, reportProfiles, ...records } = p;
  if (
    format !== 'velocitrack-demo' ||
    version !== 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !assets ||
    typeof assets !== 'object' ||
    Array.isArray(assets)
  )
    throw new Error('Unsupported demo package.');
  validateBackup({
    ...records,
    sources: [demoSource('demo', 'Demo data')],
    profile: { ...defaultProfile(), reportProfiles },
  });
  if (
    p.series.length > 100 ||
    p.shots.length > 10000 ||
    p.attachments.length > 100 ||
    Object.keys(assets).length !== p.attachments.length ||
    p.attachments.some(
      (a) => !Object.hasOwn(assets, a.id) || !/^[a-z0-9-]+\.(?:jpg|png|webp)$/.test(assets[a.id]!),
    )
  )
    throw new Error('Invalid demo photo references.');
}

/** Bound downloads before parsing; public sample requests never carry sign-in credentials. */
async function download(path: string, limit: number): Promise<Uint8Array> {
  const response = await fetch(`${import.meta.env.BASE_URL}demo/${path}`, {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok || !response.body)
    throw new Error('Demo data could not be downloaded. Check your connection and try again.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('The demo download exceeds its size limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/** Fetch each shared photo once, before opening the atomic database transaction. */
export async function addDemoSource(name = 'Demo data'): Promise<void> {
  const operation = async () => {
    const sample: unknown = JSON.parse(
      new TextDecoder().decode(await download('sample.json', 5_000_000)),
    );
    validateDemo(sample);
    const photos = new Map<string, Blob>();
    for (const path of new Set(Object.values(sample.assets))) {
      const bytes = await download(path, 20_000_000);
      const mime = photoMime(bytes);
      if (!mime) throw new Error('The demo contains an unsupported photo.');
      photos.set(path, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }));
    }
    await installDemo(sample, photos, name);
  };
  // Share the same restore/import boundary as connected and file imports.
  if (navigator.locks)
    await navigator.locks.request('velocitrack-workspace-import', { mode: 'shared' }, operation);
  else await operation();
}

/** Rewrite only complete identities (including field references), never substrings of notes. */
function remap<T>(value: T, identities: Map<string, string>): T {
  if (typeof value === 'string')
    return (identities.get(value) ??
      (value.startsWith('field:') && identities.has(value.slice(6))
        ? `field:${identities.get(value.slice(6))}`
        : value)) as T;
  if (Array.isArray(value)) return value.map((item) => remap(item, identities)) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        identities.get(key) ?? key,
        remap(item, identities),
      ]),
    ) as T;
  return value;
}

/** Reserve a distinct name instead of merging an existing user's definition or catalog. */
function uniqueName(name: string, names: Set<string>): string {
  let candidate = name;
  let n = 1;
  while (names.has(reportName(candidate).toLowerCase()))
    candidate = `${name.slice(0, 75)} (Demo${n++ === 1 ? '' : ` ${n - 1}`})`;
  names.add(reportName(candidate).toLowerCase());
  return candidate;
}

/** Install all records and photo bytes together; preserve every existing preference and record. */
export async function installDemo(
  sample: DemoPackage,
  photos: Map<string, Blob>,
  name = 'Demo data',
  database = db,
): Promise<void> {
  validateDemo(sample);
  if (!name.trim() || name.trim().length > 80)
    throw new Error('Enter a source name of 1–80 characters.');
  for (const attachment of sample.attachments) {
    const blob = photos.get(sample.assets[attachment.id]!);
    if (!blob || blob.size !== attachment.size || blob.type !== attachment.mime)
      throw new Error('A demo photo is missing or incomplete. Nothing was imported.');
  }
  await database.transaction('rw', database.tables, async () => {
    const current = await loadWorkspace(database);
    if (current.sources.some((s) => s.kind === 'demo'))
      throw new Error('Demo data is already installed. Remove its source before starting again.');
    const source = demoSource(crypto.randomUUID(), name.trim());
    const prefix = `demo-${source.id}-`;
    const identities = new Map<string, string>([['demo', source.id]]);
    for (const group of [
      sample.catalog,
      sample.fieldDefinitions,
      sample.tags,
      sample.attachments,
      sample.reportProfiles,
    ])
      for (const item of group) identities.set(item.id, prefix + item.id);
    for (const field of sample.fieldDefinitions)
      for (const option of field.options ?? []) identities.set(option.id, prefix + option.id);
    for (const item of [...sample.series, ...sample.shots])
      identities.set(
        item.id,
        JSON.stringify(
          (JSON.parse(item.id) as string[]).map((p) => (p === 'demo' ? source.id : p)),
        ),
      );
    const copy = remap(sample, identities);
    for (const [items, existing] of [
      [copy.fieldDefinitions, current.fieldDefinitions],
      [copy.tags, current.tags],
      [copy.reportProfiles, current.profile.reportProfiles ?? []],
    ] as const) {
      const names = new Set(existing.map((item) => reportName(item.name).toLowerCase()));
      for (const item of items) item.name = uniqueName(item.name, names);
    }
    for (const kind of ['firearm', 'projectile'] as const) {
      const names = new Set(
        current.catalog.filter((c) => c.kind === kind).map((c) => reportName(c.name).toLowerCase()),
      );
      for (const item of copy.catalog.filter((c) => c.kind === kind))
        item.name = uniqueName(item.name, names);
    }
    const lastOrder = Math.max(-1, ...current.fieldDefinitions.map((f) => f.order));
    copy.fieldDefinitions.forEach((f, i) => {
      f.order = lastOrder + i + 1;
    });
    const next: Workspace = {
      sources: [...current.sources, source],
      catalog: [...current.catalog, ...copy.catalog],
      series: [...current.series, ...copy.series],
      shots: [...current.shots, ...copy.shots],
      annotations: [...current.annotations, ...copy.annotations],
      fieldDefinitions: [...current.fieldDefinitions, ...copy.fieldDefinitions],
      tags: [...current.tags, ...copy.tags],
      attachments: [...current.attachments, ...copy.attachments],
      profile: {
        ...current.profile,
        reportProfiles: [...(current.profile.reportProfiles ?? []), ...copy.reportProfiles],
      },
    };
    validateBackup(next);
    await database.sources.add(source);
    for (const table of [
      'catalog',
      'series',
      'shots',
      'annotations',
      'fieldDefinitions',
      'tags',
      'attachments',
    ] as const)
      await database.table(table).bulkAdd(copy[table]);
    await database.attachmentContents.bulkAdd(
      sample.attachments.map((a) => ({
        id: identities.get(a.id)!,
        blob: photos.get(sample.assets[a.id]!)!,
      })),
    );
    await database.profiles.put(next.profile);
  });
}

/** Removal choices affect only definitions introduced by this demo, never unrelated user data. */
export interface KeepDemoDefinitions {
  fields: boolean;
  tags: boolean;
  reports: boolean;
}

/** Remove the sample atomically; retain definitions reused by remaining records or reports. */
export async function removeDemoSource(
  sourceId: string,
  keep: KeepDemoDefinitions,
  database = db,
): Promise<number> {
  return database.transaction('rw', database.tables, async () => {
    if ((await database.sources.get(sourceId))?.kind !== 'demo')
      throw new Error('Demo source not found.');
    const prefix = `demo-${sourceId}-`;
    await removeSource(sourceId, database);
    let retained = 0;
    let current = await loadWorkspace(database);
    if (!keep.reports)
      for (const report of current.profile.reportProfiles ?? [])
        if (report.id.startsWith(prefix)) await deleteReportProfile(report.id, database);
    current = await loadWorkspace(database);
    if (!keep.fields)
      for (const field of current.fieldDefinitions.filter((f) => f.id.startsWith(prefix))) {
        const used =
          current.annotations.some((a) => Object.hasOwn(a.values ?? {}, field.id)) ||
          (current.profile.reportProfiles ?? []).some((r) =>
            r.views.some(
              (v) =>
                v.mode !== 'info' &&
                [v.settings.quantity, v.settings.secondary].includes(`field:${field.id}`),
            ),
          );
        if (used) retained++;
        else await removeField(field.id, database);
      }
    if (!keep.tags)
      for (const tag of current.tags.filter((t) => t.id.startsWith(prefix))) {
        if (current.annotations.some((a) => a.tagIds?.includes(tag.id))) retained++;
        else await removeTag(tag.id, database);
      }
    const deletedCatalog: string[] = [];
    for (const item of current.catalog.filter((c) => c.id.startsWith(prefix))) {
      if (
        !current.series.some((s) => s.firearmId === item.id || s.projectileId === item.id) &&
        !item.links.length
      ) {
        await database.catalog.delete(item.id);
        deletedCatalog.push(item.id);
      }
    }
    await database.profiles.toCollection().modify((p) => {
      p.filters.firearmIds = p.filters.firearmIds.filter((id) => !deletedCatalog.includes(id));
      p.filters.projectileIds = p.filters.projectileIds.filter(
        (id) => !deletedCatalog.includes(id),
      );
    });
    return retained;
  });
}
