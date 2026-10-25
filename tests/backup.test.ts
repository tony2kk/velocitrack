import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { WorkspaceDatabase } from '../src/storage/database';
import { createBackup, prepareBackup, restoreBackup } from '../src/storage/backup';
import { createSource, importBundle, loadWorkspace, saveProfile } from '../src/storage/workspace';
import { saveField, saveSeriesDetails, saveTag } from '../src/storage/customization';
import { syntheticExport } from './fixtures/synthetic';
import { defaultAnalysis } from '../src/domain/model';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { columnOrder, visibleColumns } from '../src/domain/table';
import { dispatchDistanceCurve } from '../src/domain/distanceCurves/registry';
import { defaultReportSettings } from '../src/domain/model';
import { emptyTarget } from '../src/domain/targetMeasurement';

let database: WorkspaceDatabase;
beforeEach(() => {
  database = new WorkspaceDatabase(`backup-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});
/** Build a complete invented workspace with a small raster-signature fixture. */
async function seed() {
  const source = createSource('Invented backup source', true);
  await database.sources.add(source);
  await importBundle(
    source.id,
    parseVelociRadarExport([{ name: 'invented.json', text: JSON.stringify(syntheticExport()) }]),
    database,
  );
  const series = (await database.series.toArray())[0]!;
  await saveField(
    { id: 'weight', name: 'Mass', type: 'weight-grams', order: 0, showInNavigator: true },
    database,
  );
  await saveTag({ id: 'tag', name: 'Example', color: '#123456' }, database);
  await saveSeriesDetails(series.id, { weight: 0 }, ['tag'], database);
  await saveProfile(
    {
      unitSystem: 'metric',
      report: { ...defaultReportSettings(), chart: false },
      visibleFieldIds: ['weight'],
      showTags: true,
      theme: 'dark',
      chartHeightPercent: 175,
      reportPaperSize: 'LETTER',
      showProjectileWeight: true,
      tableColumns: ['g1', 'velocity', 'field:weight'],
      tableColumnOrder: ['g1', 'g7', 'velocity', 'field:weight'],
      tableSort: { columnId: 'field:weight', direction: 'desc' },
      analysis: {
        ...defaultAnalysis(),
        mode: 'dual',
        dual: {
          axis: 'distance',
          quantity: 'velocity',
          secondary: 'calculated:g1',
          forecastDistance: 500,
        },
        compare: {
          axis: 'distance',
          quantity: 'curve:centered-samples',
          secondary: 'velocity',
        },
      },
    },
    database,
  );
  const blob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], {
    type: 'image/png',
  });
  await database.attachments.add({
    id: 'invented-photo',
    seriesId: series.id,
    name: 'target.png',
    caption: 'Synthetic',
    mime: 'image/png',
    size: blob.size,
    createdAt: new Date().toISOString(),
  });
  await database.attachmentContents.add({ id: 'invented-photo', blob });
  await database.annotations.update(series.id, {
    target: {
      ...emptyTarget(),
      photoId: 'invented-photo',
      reportCrop: { x: 10, y: 20, size: 200, width: 800, height: 600 },
    },
  });
}

describe('structured ZIP backup and atomic restore', () => {
  it('validates chart height and accepts older profiles without the new preference', async () => {
    await seed();
    const archive = await createBackup(database);
    const prepared = await prepareBackup(archive);
    for (const value of [69, 201, 100.5, Number.NaN]) {
      prepared.workspace.profile.chartHeightPercent = value;
      await expect(restoreBackup(prepared, database)).rejects.toThrow('invalid records');
      await expect(saveProfile({ chartHeightPercent: value }, database)).rejects.toThrow(
        'Chart height',
      );
    }
    delete prepared.workspace.profile.chartHeightPercent;
    delete prepared.workspace.profile.reportPaperSize;
    await restoreBackup(prepared, database);
    expect((await loadWorkspace(database)).profile.chartHeightPercent).toBe(100);
    expect((await loadWorkspace(database)).profile.reportPaperSize).toBe('A4');
    Object.assign(prepared.workspace.profile, { reportPaperSize: 'A3' });
    await expect(restoreBackup(prepared, database)).rejects.toThrow('invalid records');
    for (const value of [70, 200]) {
      await saveProfile({ chartHeightPercent: value }, database);
      await restoreBackup(await prepareBackup(await createBackup(database)), database);
      expect((await loadWorkspace(database)).profile.chartHeightPercent).toBe(value);
    }
  });
  it('round-trips raw measurements, typed values, tags, profile and photo bytes', async () => {
    await seed();
    const before = await loadWorkspace(database);
    const archive = await createBackup(database);
    expect(Object.keys(unzipSync(archive))).toContain('attachments/invented-photo.png');
    const prepared = await prepareBackup(archive);
    await database.shots.clear();
    await saveProfile({ nickname: 'Replace this' }, database);
    await restoreBackup(prepared, database);
    const after = await loadWorkspace(database);
    expect(after.shots).toEqual(before.shots);
    expect(after.series).toEqual(before.series);
    expect(after.annotations).toEqual(before.annotations);
    expect(after.profile).toEqual(before.profile);
    expect(after.tags).toEqual(before.tags);
    expect(after.fieldDefinitions).toEqual(before.fieldDefinitions);
    const bytes = await (await database.attachmentContents.get(
      'invented-photo',
    ))!.blob.arrayBuffer();
    expect(new Uint8Array(bytes)).toEqual(prepared.photos.get('invented-photo'));
    expect(after.sources[0]?.status).toBe('needs-files');
  });
  it('rejects corruption, missing photos, path traversal and unknown versions before changing data', async () => {
    await seed();
    const before = await loadWorkspace(database);
    const archive = await createBackup(database);
    const corrupt = unzipSync(archive);
    corrupt['data/shots.json'] = strToU8('[]');
    await expect(prepareBackup(zipSync(corrupt))).rejects.toThrow('corrupt');
    const missing = unzipSync(archive);
    delete missing['attachments/invented-photo.png'];
    await expect(prepareBackup(zipSync(missing))).rejects.toThrow();
    await expect(prepareBackup(zipSync({ '../outside.json': strToU8('{}') }))).rejects.toThrow(
      'ZIP entry',
    );
    await expect(
      prepareBackup(
        zipSync({ 'manifest.json': strToU8('{"format":"velocitrack-workspace","version":999}') }),
      ),
    ).rejects.toThrow('not supported');
    expect(await loadWorkspace(database)).toEqual(before);
  });
  it('restores new column order and drop choices, and accepts older profiles without a complete order', async () => {
    await seed();
    await saveProfile(
      {
        analysis: {
          ...defaultAnalysis(),
          mode: 'dual',
          dual: {
            axis: 'distance',
            quantity: 'curve:drop-g1',
            secondary: 'curve:drop-g7',
            forecastDistance: 100,
          },
        },
      },
      database,
    );
    const archive = await createBackup(database);
    const before = await loadWorkspace(database);
    await restoreBackup(await prepareBackup(archive), database);
    const after = await loadWorkspace(database);
    expect(after.profile.tableColumnOrder).toEqual(['g1', 'g7', 'velocity', 'field:weight']);
    expect(visibleColumns(after.profile)).toEqual(['g1', 'velocity', 'field:weight']);
    for (const id of ['curve:drop-g1', 'curve:drop-g7']) {
      expect(dispatchDistanceCurve(id, after.shots[0]!, 100)).toEqual(
        dispatchDistanceCurve(id, before.shots[0]!, 100),
      );
    }
    expect(after.profile.analysis).toEqual(before.profile.analysis);
    const older = await prepareBackup(archive);
    delete older.workspace.profile.tableColumnOrder;
    await restoreBackup(older, database);
    const legacy = (await loadWorkspace(database)).profile;
    expect(visibleColumns(legacy)).toEqual(['g1', 'velocity', 'field:weight']);
    expect(columnOrder([{ id: 'g7', label: 'G7' }], legacy)).toEqual([
      'g1',
      'velocity',
      'field:weight',
      'g7',
    ]);
  });
  it.each([['field:missing'], ['g1', 'g1'], ['invalid/name']])(
    'rejects malformed or dangling column order before replacing the workspace: %s',
    async (...ids) => {
      await seed();
      const before = await loadWorkspace(database);
      const prepared = await prepareBackup(await createBackup(database));
      prepared.workspace.profile.tableColumnOrder = ids;
      await expect(restoreBackup(prepared, database)).rejects.toThrow('invalid records');
      expect(await loadWorkspace(database)).toEqual(before);
    },
  );
  it('rejects invalid references and typed values even after archive validation', async () => {
    await seed();
    const archive = await createBackup(database);
    const prepared = await prepareBackup(archive);
    prepared.workspace.annotations[0]!.values = { weight: 'not a number' };
    await expect(restoreBackup(prepared, database)).rejects.toThrow('invalid records');
    const next = await prepareBackup(archive);
    next.workspace.shots[0]!.seriesId = 'missing';
    await expect(restoreBackup(next, database)).rejects.toThrow('invalid records');
    const identity = await prepareBackup(archive);
    identity.workspace.shots[0]!.remoteId = 'changed-identity';
    await expect(restoreBackup(identity, database)).rejects.toThrow('invalid records');
    const badSort = await prepareBackup(archive);
    badSort.workspace.profile.tableSort = { columnId: 'shot', direction: 'asc' };
    await expect(restoreBackup(badSort, database)).rejects.toThrow('invalid records');
    const badForecast = await prepareBackup(archive);
    badForecast.workspace.profile.analysis!.dual.forecastDistance = -1;
    await expect(restoreBackup(badForecast, database)).rejects.toThrow('invalid records');
    const badInvalidation = await prepareBackup(archive);
    Object.assign(badInvalidation.workspace.annotations[0]!, { invalid: true });
    await expect(restoreBackup(badInvalidation, database)).rejects.toThrow('invalid records');
    const badVisibility = await prepareBackup(archive);
    Object.assign(badVisibility.workspace.fieldDefinitions[0]!, { showInNavigator: 'yes' });
    await expect(restoreBackup(badVisibility, database)).rejects.toThrow('invalid records');
    expect(await database.shots.count()).toBe(4);
  });
  it('rolls back all cleared tables when a late photo write fails', async () => {
    await seed();
    const prepared = await prepareBackup(await createBackup(database));
    await saveProfile({ nickname: 'Must survive' }, database);
    const before = await loadWorkspace(database);
    const fail = () => {
      throw new Error('Simulated quota failure');
    };
    database.attachmentContents.hook('creating', fail);
    await expect(restoreBackup(prepared, database)).rejects.toThrow('quota');
    database.attachmentContents.hook('creating').unsubscribe(fail);
    expect(await loadWorkspace(database)).toEqual(before);
    expect(await database.attachmentContents.count()).toBe(1);
  });
  it('supports an empty workspace and never includes SDK session storage', async () => {
    const entries = unzipSync(await createBackup(database));
    expect(
      Object.keys(entries).every((path) => path === 'manifest.json' || path.startsWith('data/')),
    ).toBe(true);
    const prepared = await prepareBackup(zipSync(entries));
    await restoreBackup(prepared, database);
    expect(await database.series.count()).toBe(0);
  });
});
