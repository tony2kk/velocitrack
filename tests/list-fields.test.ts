import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { WorkspaceDatabase } from '../src/storage/database';
import {
  saveField,
  saveListOption,
  listOptionUsage,
  removeListOption,
  saveSeriesDetails,
} from '../src/storage/customization';
import { createSource, importBundle, loadWorkspace, saveProfile } from '../src/storage/workspace';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { syntheticExport } from './fixtures/synthetic';
import { fieldText } from '../src/domain/customFields';
import { createBackup, prepareBackup, restoreBackup } from '../src/storage/backup';
import { validateBackup } from '../src/storage/backupValidation';
import { defaultAnalysis } from '../src/domain/model';
import { sortShots } from '../src/domain/table';

let database: WorkspaceDatabase;
let seriesId: string;
beforeEach(async () => {
  database = new WorkspaceDatabase(`lists-${crypto.randomUUID()}`);
  const source = createSource('Invented list source', true);
  await database.sources.add(source);
  await importBundle(
    source.id,
    parseVelociRadarExport([{ name: 'synthetic.json', text: JSON.stringify(syntheticExport()) }]),
    database,
  );
  seriesId = (await database.series.toArray())[0]!.id;
  await saveField(
    { id: 'list', name: 'Category', type: 'list', order: 0, options: [{ id: 'a', name: 'Alpha' }] },
    database,
  );
});
afterEach(async () => {
  await database.delete();
});

it('renames labels without rewriting assignments and protects options from stale field metadata saves', async () => {
  await saveSeriesDetails(seriesId, { list: 'a' }, undefined, database);
  const stale = (await database.fieldDefinitions.get('list'))!;
  await saveListOption('list', { id: 'a', name: 'Renamed' }, database);
  await saveListOption('list', { id: 'b', name: 'Beta' }, database);
  await saveField({ ...stale, name: 'Updated category' }, database);
  const field = (await database.fieldDefinitions.get('list'))!;
  expect(field.options).toHaveLength(2);
  expect(
    fieldText(
      (await database.annotations.get(seriesId))?.values?.list,
      'list',
      'metric',
      field.options,
    ),
  ).toBe('Renamed');
  await expect(saveListOption('list', { id: 'b', name: 'renamed' }, database)).rejects.toThrow(
    'unique',
  );
  await expect(
    saveSeriesDetails(seriesId, { list: 'missing' }, undefined, database),
  ).rejects.toThrow('Invalid value');
});

it('warns with persisted usage, refuses stale confirmation, and atomically clears only confirmed assignments', async () => {
  expect(await listOptionUsage('list', 'a', database)).toBe(0);
  await saveSeriesDetails(seriesId, { list: 'a' }, undefined, database);
  await expect(removeListOption('list', 'a', 0, database)).rejects.toThrow('Usage changed');
  expect(await listOptionUsage('list', 'a', database)).toBe(1);
  await removeListOption('list', 'a', 1, database);
  expect((await database.annotations.get(seriesId))?.values).toEqual({});
  expect((await database.fieldDefinitions.get('list'))?.options).toEqual([]);
  await expect(saveSeriesDetails(seriesId, { list: 'a' }, undefined, database)).rejects.toThrow();
});

it('round-trips lists and By string settings through a full backup; rejects duplicate and dangling options', async () => {
  await saveSeriesDetails(seriesId, { list: 'a' }, undefined, database);
  await saveProfile(
    {
      analysis: {
        ...defaultAnalysis(),
        mode: 'compare',
        compare: { axis: 'string', quantity: 'target:groupSize', secondary: 'g1' },
      },
    },
    database,
  );
  const prepared = await prepareBackup(await createBackup(database));
  await removeListOption('list', 'a', 1, database);
  await restoreBackup(prepared, database);
  expect((await loadWorkspace(database)).profile.analysis?.compare.axis).toBe('string');
  expect(await listOptionUsage('list', 'a', database)).toBe(1);
  const duplicate = structuredClone(prepared.workspace);
  duplicate.fieldDefinitions[0]!.options!.push({ id: 'a', name: 'Other' });
  expect(() => validateBackup(duplicate)).toThrow();
  const dangling = structuredClone(prepared.workspace);
  dangling.fieldDefinitions[0]!.options = [];
  expect(() => validateBackup(dangling)).toThrow();
});

it('sorts list columns by visible labels rather than opaque identities', async () => {
  const workspace = await loadWorkspace(database);
  const first = workspace.shots[0]!;
  const second = { ...first, id: 'second', seriesId: 'second' };
  const result = sortShots(
    [first, second],
    workspace.series,
    { columnId: 'field:list', direction: 'asc' },
    {
      quantities: [],
      annotations: [
        { entityId: first.seriesId, notes: '', fields: {}, values: { list: 'a' } },
        { entityId: 'second', notes: '', fields: {}, values: { list: 'z' } },
      ],
      tags: [],
      catalog: [],
      fields: [
        {
          id: 'list',
          name: 'List',
          type: 'list',
          order: 0,
          options: [
            { id: 'a', name: 'Zulu' },
            { id: 'z', name: 'Alpha' },
          ],
        },
      ],
    },
  );
  expect(result.map((item) => item.id)).toEqual(['second', first.id]);
});
