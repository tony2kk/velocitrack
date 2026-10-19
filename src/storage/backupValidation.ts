import type { Workspace } from './workspace';
import { entityId } from '../domain/model';
import { FIELD_TYPES, validFieldValue } from '../domain/customFields';

/** Reject malformed archives before a write transaction begins. */
function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new Error('The backup contains invalid records or broken references.');
}
/** Recognize JSON dictionaries without accepting arrays or null. */
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** Strings may be empty only where the domain explicitly allows it. */
function string(value: unknown, empty = false): value is string {
  return typeof value === 'string' && (empty || value.length > 0);
}
/** All numeric measurements must be finite; missing optional readings use null. */
function number(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
/** Validate string lists and reject duplicate identities. */
function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => string(item)) &&
    new Set(value).size === value.length
  );
}
/** Check table shape and primary-key uniqueness before checking relational references. */
function table(value: unknown, key = 'id'): asserts value is Record<string, unknown>[] {
  requireValid(Array.isArray(value) && value.every((item) => object(item) && string(item[key])));
  requireValid(new Set(value.map((item) => item[key])).size === value.length);
}
/** Unknown top-level properties are rejected so hidden settings cannot be restored accidentally. */
function keys(value: Record<string, unknown>, allowed: string[]) {
  requireValid(Object.keys(value).every((key) => allowed.includes(key)));
}

/** Validate the complete version-one backup contract, including all references and typed field values. */
export function validateBackup(value: unknown): asserts value is Workspace {
  requireValid(object(value));
  keys(value, [
    'sources',
    'catalog',
    'series',
    'shots',
    'profile',
    'annotations',
    'fieldDefinitions',
    'tags',
    'attachments',
  ]);
  for (const name of [
    'sources',
    'catalog',
    'series',
    'shots',
    'fieldDefinitions',
    'tags',
    'attachments',
  ])
    table(value[name]);
  table(value.annotations, 'entityId');
  const w = value as unknown as Workspace;
  const sources = new Set(w.sources.map((item) => item.id));
  const series = new Map(w.series.map((item) => [item.id, item]));
  const shots = new Set(w.shots.map((item) => item.id));
  const catalogs = new Map(w.catalog.map((item) => [item.id, item]));
  const definitions = new Map(w.fieldDefinitions.map((item) => [item.id, item]));
  const tags = new Set(w.tags.map((item) => item.id));
  for (const source of w.sources) {
    keys(source as unknown as Record<string, unknown>, [
      'id',
      'name',
      'kind',
      'enabled',
      'autoUpdateCatalogs',
      'createdAt',
      'lastAttemptAt',
      'lastSuccessAt',
      'status',
      'error',
      'connection',
      'accountId',
    ]);
    requireValid(
      string(source.name) &&
        ['caldwell', 'velociradar-export'].includes(source.kind) &&
        typeof source.enabled === 'boolean' &&
        typeof source.autoUpdateCatalogs === 'boolean' &&
        string(source.createdAt),
    );
    requireValid(
      ['ready', 'needs-files', 'needs-sign-in', 'needs-setup', 'error'].includes(source.status),
    );
    for (const entry of [
      source.lastAttemptAt,
      source.lastSuccessAt,
      source.error,
      source.accountId,
    ])
      requireValid(entry === undefined || string(entry, true));
    if (source.connection !== undefined) {
      requireValid(object(source.connection));
      keys(source.connection, ['projectId', 'apiKey']);
      requireValid(string(source.connection.projectId) && string(source.connection.apiKey));
    }
  }
  for (const item of w.catalog) {
    requireValid(
      ['firearm', 'projectile'].includes(item.kind) &&
        string(item.name) &&
        Array.isArray(item.links),
    );
    requireValid(
      item.links.every(
        (link) => object(link) && sources.has(link.sourceId) && string(link.remoteId),
      ),
    );
    requireValid(item.managedBySourceId === undefined || sources.has(item.managedBySourceId));
  }
  for (const item of w.series)
    requireValid(
      item.id === entityId(item.sourceId, item.remoteId) &&
        sources.has(item.sourceId) &&
        string(item.remoteId) &&
        string(item.name) &&
        (item.startedAt === null ||
          (string(item.startedAt) && Number.isFinite(Date.parse(item.startedAt)))) &&
        catalogs.get(item.firearmId)?.kind === 'firearm' &&
        catalogs.get(item.projectileId)?.kind === 'projectile' &&
        object(item.raw),
    );
  for (const item of w.shots) {
    requireValid(
      item.id ===
        entityId(item.sourceId, series.get(item.seriesId)?.remoteId ?? '', item.remoteId) &&
        series.get(item.seriesId)?.sourceId === item.sourceId &&
        sources.has(item.sourceId) &&
        string(item.remoteId) &&
        number(item.number) &&
        typeof item.excluded === 'boolean' &&
        string(item.rawUnit) &&
        object(item.raw),
    );
    for (const entry of [
      item.muzzleVelocity,
      item.ballisticCoefficientG1,
      item.ballisticCoefficientG7,
    ])
      requireValid(entry === null || number(entry));
    requireValid(
      Array.isArray(item.distances) &&
        item.distances.every(number) &&
        Array.isArray(item.velocities) &&
        item.velocities.every(number),
    );
  }
  for (const field of w.fieldDefinitions)
    requireValid(
      /^[a-zA-Z0-9_-]+$/.test(field.id) &&
        !['__proto__', 'constructor', 'prototype'].includes(field.id) &&
        string(field.name) &&
        field.name === field.name.trim() &&
        field.name.trim().length > 0 &&
        field.name.length <= 100 &&
        Object.hasOwn(FIELD_TYPES, field.type) &&
        Number.isSafeInteger(field.order) &&
        field.order >= 0,
    );
  requireValid(
    new Set(w.fieldDefinitions.map((field) => field.name.toLowerCase())).size ===
      w.fieldDefinitions.length,
  );
  for (const tag of w.tags)
    requireValid(
      string(tag.name) &&
        tag.name.trim().length > 0 &&
        tag.name.length <= 100 &&
        /^#[0-9a-f]{6}$/i.test(tag.color),
    );
  requireValid(new Set(w.tags.map((tag) => tag.name.toLowerCase())).size === w.tags.length);
  for (const item of w.annotations) {
    requireValid(
      (series.has(item.entityId) || shots.has(item.entityId)) &&
        string(item.notes, true) &&
        object(item.fields),
    );
    for (const legacy of Object.values(item.fields)) {
      requireValid(object(legacy));
      requireValid(
        (['text', 'date', 'choice'].includes(legacy.type as string) &&
          string(legacy.value, true)) ||
          (legacy.type === 'number' && number(legacy.value)) ||
          (legacy.type === 'boolean' && typeof legacy.value === 'boolean'),
      );
    }
    if (item.values !== undefined) {
      requireValid(object(item.values));
      for (const [id, entry] of Object.entries(item.values)) {
        const field = definitions.get(id);
        requireValid(field && validFieldValue(field.type, entry));
      }
    }
    requireValid(
      item.tagIds === undefined ||
        (strings(item.tagIds) && item.tagIds.every((id) => tags.has(id))),
    );
  }
  for (const photo of w.attachments)
    requireValid(
      /^[a-zA-Z0-9-]+$/.test(photo.id) &&
        series.has(photo.seriesId) &&
        string(photo.name) &&
        string(photo.caption, true) &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(photo.mime) &&
        Number.isSafeInteger(photo.size) &&
        photo.size > 0 &&
        photo.size <= 20 * 1024 * 1024 &&
        string(photo.createdAt),
    );
  const p = w.profile;
  requireValid(object(p));
  keys(p, [
    'id',
    'nickname',
    'rememberSignIn',
    'refreshOnStart',
    'unitSystem',
    'shotDetail',
    'filters',
    'caldwellConnection',
    'visibleFieldIds',
    'showTags',
    'analysis',
    'theme',
    'showProjectileWeight',
    'tableColumns',
    'infoSeriesId',
  ]);
  requireValid(
    p.id === 'local' &&
      string(p.nickname, true) &&
      typeof p.rememberSignIn === 'boolean' &&
      typeof p.refreshOnStart === 'boolean' &&
      ['metric', 'imperial'].includes(p.unitSystem) &&
      ['muzzleVelocity', 'g1', 'g7'].includes(p.shotDetail),
  );
  requireValid(
    p.visibleFieldIds === undefined ||
      (strings(p.visibleFieldIds) && p.visibleFieldIds.every((id) => definitions.has(id))),
  );
  requireValid(p.showTags === undefined || typeof p.showTags === 'boolean');
  requireValid(p.showProjectileWeight === undefined || typeof p.showProjectileWeight === 'boolean');
  requireValid(p.theme === undefined || ['auto', 'light', 'dark'].includes(p.theme));
  requireValid(p.infoSeriesId === undefined || string(p.infoSeriesId));
  if (p.tableColumns !== undefined)
    requireValid(
      strings(p.tableColumns) &&
        p.tableColumns.every(
          (id) =>
            id.length <= 200 &&
            /^[a-zA-Z0-9_.:-]+$/.test(id) &&
            (!id.startsWith('field:') || definitions.has(id.slice(6))),
        ),
    );
  if (p.analysis !== undefined) {
    requireValid(object(p.analysis));
    keys(p.analysis, ['mode', 'simple', 'dual', 'compare']);
    requireValid(['simple', 'dual', 'compare', 'info'].includes(p.analysis.mode));
    for (const mode of ['simple', 'dual', 'compare'] as const) {
      const settings = p.analysis[mode];
      requireValid(object(settings));
      keys(settings, ['axis', 'quantity', 'secondary']);
      requireValid(['distance', 'shot'].includes(settings.axis));
      for (const id of [settings.quantity, settings.secondary])
        requireValid(
          string(id) &&
            id.length <= 200 &&
            /^[a-zA-Z0-9_.:-]+$/.test(id) &&
            (!id.startsWith('field:') || definitions.has(id.slice(6))),
        );
    }
  }
  if (p.caldwellConnection !== undefined) {
    requireValid(object(p.caldwellConnection));
    keys(p.caldwellConnection, ['projectId', 'apiKey']);
    requireValid(string(p.caldwellConnection.projectId) && string(p.caldwellConnection.apiKey));
  }
  const f = p.filters;
  requireValid(object(f));
  requireValid(
    strings(f.sourceIds) &&
      f.sourceIds.every((id) => sources.has(id)) &&
      strings(f.firearmIds) &&
      f.firearmIds.every((id) => catalogs.get(id)?.kind === 'firearm') &&
      strings(f.projectileIds) &&
      f.projectileIds.every((id) => catalogs.get(id)?.kind === 'projectile'),
  );
  requireValid(
    f.tagIds === undefined || (strings(f.tagIds) && f.tagIds.every((id) => tags.has(id))),
  );
  requireValid(
    ['all', 'range', 'weeks', 'months'].includes(f.dateMode) &&
      string(f.dateFrom, true) &&
      string(f.dateTo, true) &&
      number(f.relativeAmount),
  );
}
