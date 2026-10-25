import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceDatabase } from '../src/storage/database';
import { createSource, importBundle, loadWorkspace, saveProfile } from '../src/storage/workspace';
import { syntheticExport } from './fixtures/synthetic';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { installDemo, removeDemoSource, validateDemo, type DemoPackage } from '../src/sources/demo';
import { createBackup, prepareBackup, restoreBackup } from '../src/storage/backup';
import { validateBackup } from '../src/storage/backupValidation';

let database: WorkspaceDatabase;
let seed: WorkspaceDatabase;
let sample: DemoPackage;
beforeEach(async () => {
  database = new WorkspaceDatabase(`demo-test-${crypto.randomUUID()}`);
  seed = new WorkspaceDatabase(`demo-seed-${crypto.randomUUID()}`);
  await seed.sources.add({ ...createSource('Invented', true), id: 'demo' });
  await importBundle(
    'demo',
    parseVelociRadarExport([{ name: 'invented.json', text: JSON.stringify(syntheticExport()) }]),
    seed,
  );
  await seed.fieldDefinitions.add({ id: 'field-a', name: 'Observation', type: 'number', order: 0 });
  await seed.tags.add({ id: 'tag-a', name: 'Practice', color: '#123456' });
  const string = (await seed.series.toArray())[0]!;
  await seed.annotations.put({
    entityId: string.id,
    notes: 'Invented note',
    fields: {},
    values: { 'field-a': 7 },
    tagIds: ['tag-a'],
  });
  const workspace = await loadWorkspace(seed);
  const records = {
    catalog: workspace.catalog,
    series: workspace.series,
    shots: workspace.shots,
    annotations: workspace.annotations,
    fieldDefinitions: workspace.fieldDefinitions,
    tags: workspace.tags,
    attachments: workspace.attachments,
  };
  sample = {
    ...records,
    format: 'velocitrack-demo',
    version: 1,
    date: '2026-01-01',
    assets: {},
    reportProfiles: [
      {
        id: 'report-a',
        name: 'Practice report',
        sections: { details: true, target: false, statistics: true, records: true },
        views: [
          {
            id: 'view-a',
            mode: 'compare',
            grouping: 'combined',
            settings: { axis: 'string', quantity: 'field:field-a', secondary: 'g1' },
          },
        ],
      },
    ],
  };
});
afterEach(async () => {
  await database.delete();
  await seed.delete();
});

describe('opt-in demo source', () => {
  it('imports independent records and templates without changing user preferences or merging definitions', async () => {
    await database.fieldDefinitions.add({
      id: 'existing',
      name: 'Observation',
      type: 'number',
      order: 4,
    });
    await saveProfile(
      { nickname: 'Local reader', unitSystem: 'metric', demoHintDismissed: true },
      database,
    );
    const before = (await loadWorkspace(database)).profile;
    await installDemo(sample, new Map(), 'Demo data', database);
    const after = await loadWorkspace(database);
    expect(after.series).toHaveLength(sample.series.length);
    expect(after.shots).toHaveLength(sample.shots.length);
    expect({ ...after.profile, reportProfiles: [] }).toEqual(before);
    expect(after.fieldDefinitions.map((f) => f.name)).toEqual([
      'Observation',
      'Observation (Demo)',
    ]);
    expect(after.fieldDefinitions[1]!.order).toBe(5);
    expect(after.profile.reportProfiles![0]!.views[0]).toMatchObject({
      settings: { quantity: `field:${after.fieldDefinitions[1]!.id}` },
    });
    validateBackup(after);
    await expect(installDemo(sample, new Map(), 'Again', database)).rejects.toThrow(
      'already installed',
    );
    expect(await database.sources.count()).toBe(1);
  });

  it('rejects profile and connection payloads and incomplete photos without partial imports', async () => {
    expect(() => validateDemo({ ...sample, profile: { nickname: 'not allowed' } })).toThrow();
    expect(() => validateDemo({ ...sample, sources: [] })).toThrow();
    const incomplete = structuredClone(sample);
    incomplete.attachments = [
      {
        id: 'photo-a',
        seriesId: sample.series[0]!.id,
        name: 'Invented.png',
        caption: '',
        mime: 'image/png',
        size: 12,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];
    incomplete.assets = { 'photo-a': 'invented.png' };
    await expect(installDemo(incomplete, new Map(), 'Demo', database)).rejects.toThrow(
      'incomplete',
    );
    expect(await database.sources.count()).toBe(0);
    expect(() =>
      validateDemo({ ...incomplete, assets: { 'photo-a': '../private.png' } }),
    ).toThrow();
  });

  it('rolls back the entire installation when a database write fails', async () => {
    database.shots.hook('creating', () => {
      throw new Error('Storage unavailable');
    });
    await expect(installDemo(sample, new Map(), 'Demo', database)).rejects.toThrow(
      'Storage unavailable',
    );
    expect(await database.sources.count()).toBe(0);
    expect(await database.series.count()).toBe(0);
    expect(await database.catalog.count()).toBe(0);
  });

  it('round-trips demo ownership and first-run dismissal through versioned backup', async () => {
    await installDemo(sample, new Map(), 'Demo', database);
    await saveProfile({ demoHintDismissed: true }, database);
    const before = await loadWorkspace(database);
    const prepared = await prepareBackup(await createBackup(database));
    await restoreBackup(prepared, database);
    expect(await loadWorkspace(database)).toEqual(before);
    const malformed = structuredClone(before);
    malformed.sources[0]!.accountId = 'invented-account';
    expect(() => validateBackup(malformed)).toThrow();
  });

  it('removes sample data and unused catalogs while retaining requested definitions', async () => {
    await installDemo(sample, new Map(), 'Demo', database);
    const source = (await database.sources.toArray())[0]!;
    await removeDemoSource(source.id, { fields: true, tags: true, reports: true }, database);
    const after = await loadWorkspace(database);
    expect(after.series).toHaveLength(0);
    expect(after.shots).toHaveLength(0);
    expect(after.catalog).toHaveLength(0);
    expect(after.annotations).toHaveLength(0);
    expect(after.fieldDefinitions).toHaveLength(1);
    expect(after.tags).toHaveLength(1);
    expect(after.profile.reportProfiles).toHaveLength(1);
    validateBackup(after);
  });

  it('protects reused definitions and preserves unrelated records when removal opts out of keeping extras', async () => {
    await installDemo(sample, new Map(), 'Demo', database);
    const before = await loadWorkspace(database);
    const own = createSource('My own files', true);
    await database.sources.add(own);
    await importBundle(
      own.id,
      parseVelociRadarExport([{ name: 'own.json', text: JSON.stringify(syntheticExport()) }]),
      database,
    );
    const other = (await database.series.where('sourceId').equals(own.id).toArray())[0]!;
    await database.annotations.put({
      entityId: other.id,
      notes: '',
      fields: {},
      values: { [before.fieldDefinitions[0]!.id]: 0 },
      tagIds: [before.tags[0]!.id],
    });
    const retained = await removeDemoSource(
      before.sources[0]!.id,
      { fields: false, tags: false, reports: false },
      database,
    );
    expect(retained).toBe(2);
    const after = await loadWorkspace(database);
    expect(after.sources.map((s) => s.id)).toEqual([own.id]);
    expect(after.fieldDefinitions).toHaveLength(1);
    expect(after.tags).toHaveLength(1);
    expect(after.profile.reportProfiles).toHaveLength(0);
    validateBackup(after);
  });

  it('deletes all optional sample definitions when none are reused', async () => {
    await installDemo(sample, new Map(), 'Demo', database);
    const source = (await database.sources.toArray())[0]!;
    await removeDemoSource(source.id, { fields: false, tags: false, reports: false }, database);
    expect(await database.fieldDefinitions.count()).toBe(0);
    expect(await database.tags.count()).toBe(0);
    expect((await loadWorkspace(database)).profile.reportProfiles).toHaveLength(0);
  });
});
