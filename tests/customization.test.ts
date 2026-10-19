import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceDatabase } from '../src/storage/database';
import {
  createSource,
  importBundle,
  loadWorkspace,
  removeSource,
  saveProfile,
} from '../src/storage/workspace';
import {
  saveField,
  moveField,
  removeField,
  saveTag,
  removeTag,
  saveSeriesDetails,
} from '../src/storage/customization';
import { fieldDisplay, fieldUnit, parseFieldInput } from '../src/domain/customFields';
import { filterSeries } from '../src/domain/filters';
import { EMPTY_FILTERS, type FieldType } from '../src/domain/model';
import { syntheticExport } from './fixtures/synthetic';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { addPhoto, MAX_PHOTO_BYTES } from '../src/storage/attachments';

let database: WorkspaceDatabase;
beforeEach(() => {
  database = new WorkspaceDatabase(`custom-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
  vi.unstubAllGlobals();
});
/** Populate only invented local measurements. */
async function seed() {
  const source = createSource('Invented source', true);
  await database.sources.add(source);
  const bundle = parseVelociRadarExport([
    { name: 'example.json', text: JSON.stringify(syntheticExport()) },
  ]);
  await importBundle(source.id, bundle, database);
  return { source, bundle, series: (await database.series.toArray())[0]! };
}

describe('custom field values and units', () => {
  it('keeps fixed weight units across profile changes and preserves populated values when units change', async () => {
    const { series } = await seed();
    for (const units of ['metric', 'imperial'] as const) {
      expect(parseFieldInput('2', 'weight-grams', units)).toBeCloseTo(2 / 0.06479891);
      expect(fieldDisplay(2 / 0.06479891, 'weight-grams', units)).toBe('2');
      expect(fieldUnit('weight-grams', units)).toBe('g');
      expect(parseFieldInput('150', 'weight-grains', units)).toBe(150);
      expect(fieldUnit('weight-grains', units)).toBe('gr');
    }
    await saveField({ id: 'mass', name: 'Mass', type: 'weight', order: 0 }, database);
    await saveSeriesDetails(series.id, { mass: 42.123456789123 }, undefined, database);
    await saveField(
      { id: 'mass', name: 'Mass', type: 'weight-grams', order: 0, showInNavigator: true },
      database,
    );
    expect((await database.annotations.get(series.id))?.values?.mass).toBe(42.123456789123);
    await saveProfile({ tableSort: { columnId: 'field:mass', direction: 'desc' } }, database);
    await removeField('mass', database);
    expect((await loadWorkspace(database)).profile.tableSort).toBeUndefined();
  });
  it('rejects reserved field identities before they can affect annotation dictionaries', async () => {
    await expect(
      saveField({ id: '__proto__', name: 'Invalid', type: 'number', order: 0 }, database),
    ).rejects.toThrow('identity');
    expect(await database.fieldDefinitions.count()).toBe(0);
  });
  it.each<[FieldType, string, number]>([
    ['weight', '0.06479891', 1],
    ['speed', '0.3048', 1],
    ['distance', '0.3048', 1],
    ['number', '0', 0],
  ])('converts %s to canonical units and preserves zero', (type, text, expected) => {
    expect(parseFieldInput(text, type, 'metric')).toBeCloseTo(expected, 12);
    expect(fieldDisplay(expected, type, 'metric')).toBe(text);
    expect(parseFieldInput('', type, 'metric')).toBeUndefined();
  });
  it('validates short text, finite numbers and nonnegative dimensions', () => {
    expect(parseFieldInput('x'.repeat(100), 'short-text', 'imperial')).toHaveLength(100);
    expect(() => parseFieldInput('x'.repeat(101), 'short-text', 'imperial')).toThrow();
    expect(parseFieldInput('first\nsecond', 'note', 'metric')).toBe('first\nsecond');
    expect(parseFieldInput('-2.5', 'number', 'metric')).toBe(-2.5);
    expect(() => parseFieldInput('Infinity', 'number', 'imperial')).toThrow();
    expect(() => parseFieldInput('-1', 'weight', 'imperial')).toThrow();
  });
  it('preserves details through refresh and rename, rejects populated type changes and removes values atomically', async () => {
    const { source, bundle, series } = await seed();
    await saveField({ id: 'mass', name: 'Mass', type: 'weight', order: 0 }, database);
    await saveField({ id: 'note', name: 'Note', type: 'note', order: 1 }, database);
    await saveSeriesDetails(
      series.id,
      { mass: 42.123456789123, note: 'line one\nline two' },
      undefined,
      database,
    );
    await saveField({ id: 'mass', name: 'Sample mass', type: 'weight', order: 0 }, database);
    await expect(
      saveField({ id: 'mass', name: 'Sample mass', type: 'number', order: 0 }, database),
    ).rejects.toThrow('cannot change type');
    await importBundle(source.id, bundle, database);
    await saveSeriesDetails(series.id, { note: 'Updated' }, undefined, database);
    expect((await database.annotations.get(series.id))?.values).toEqual({
      mass: 42.123456789123,
      note: 'Updated',
    });
    await moveField('note', -1, database);
    expect((await loadWorkspace(database)).fieldDefinitions.map((field) => field.id)).toEqual([
      'note',
      'mass',
    ]);
    await saveProfile({ visibleFieldIds: ['mass', 'note'] }, database);
    await removeField('mass', database);
    expect((await database.annotations.get(series.id))?.values).toEqual({ note: 'Updated' });
    expect((await loadWorkspace(database)).profile.visibleFieldIds).toEqual(['note']);
  });
  it('combines tag alternatives with other filters and cleans assignments/filter on deletion', async () => {
    const { series } = await seed();
    await saveTag({ id: 'a', name: 'Indoor', color: '#123456' }, database);
    await saveTag({ id: 'b', name: 'Outdoor', color: '#abcdef' }, database);
    await expect(saveTag({ id: 'c', name: 'indoor', color: '#123456' }, database)).rejects.toThrow(
      'already exists',
    );
    await saveSeriesDetails(series.id, {}, ['a'], database);
    const workspace = await loadWorkspace(database);
    expect(
      filterSeries(
        workspace.series,
        { ...EMPTY_FILTERS, tagIds: ['a', 'b'] },
        new Date(),
        workspace.annotations,
      ),
    ).toHaveLength(1);
    expect(
      filterSeries(
        workspace.series,
        { ...EMPTY_FILTERS, tagIds: ['a'], sourceIds: ['absent'] },
        new Date(),
        workspace.annotations,
      ),
    ).toHaveLength(0);
    await saveProfile({ filters: { ...EMPTY_FILTERS, tagIds: ['a', 'b'] } }, database);
    await removeTag('a', database);
    expect((await database.annotations.get(series.id))?.tagIds).toEqual([]);
    expect((await loadWorkspace(database)).profile.filters.tagIds).toEqual(['b']);
    expect(await database.shots.count()).toBe(4);
  });
  it('rejects deleted definitions and series without recreating orphan annotations', async () => {
    const { series, source } = await seed();
    await expect(saveSeriesDetails(series.id, { absent: 1 }, undefined, database)).rejects.toThrow(
      'removed',
    );
    expect(await database.annotations.count()).toBe(0);
    await removeSource(source.id, database);
    await expect(saveSeriesDetails(series.id, {}, [], database)).rejects.toThrow(
      'no longer exists',
    );
  });
  it('migrates a populated v1 database without losing legacy notes or measurements', async () => {
    const name = database.name;
    const old = new Dexie(name);
    old.version(1).stores({
      sources: 'id',
      catalog: 'id, kind',
      series: 'id, sourceId, firearmId, projectileId',
      shots: 'id, sourceId, seriesId',
      profiles: 'id',
      annotations: 'entityId',
    });
    await old.table('annotations').put({
      entityId: 'legacy',
      notes: 'Keep me',
      fields: { old: { type: 'text', value: 'Original' } },
    });
    old.close();
    expect((await loadWorkspace(database)).annotations[0]?.notes).toBe('Keep me');
    expect(await database.tags.count()).toBe(0);
  });
  it('stores photo bytes, rejects unsupported/oversized images and cleans photos on source removal', async () => {
    const { source, series } = await seed();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 1, height: 1, close: vi.fn() }),
    );
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    await addPhoto(series.id, new File([bytes], 'invented.png', { type: 'image/png' }), database);
    expect(await database.attachments.count()).toBe(1);
    expect(await database.attachmentContents.count()).toBe(1);
    await expect(
      addPhoto(series.id, new File(['<svg/>'], 'bad.svg', { type: 'image/png' }), database),
    ).rejects.toThrow('Only JPEG');
    await expect(
      addPhoto(series.id, new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'large.png'), database),
    ).rejects.toThrow('20 MiB');
    await removeSource(source.id, database);
    expect(await database.attachments.count()).toBe(0);
    expect(await database.attachmentContents.count()).toBe(0);
  });
});
