import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceDatabase } from '../src/storage/database';
import { createSource, importBundle, loadWorkspace, saveProfile } from '../src/storage/workspace';
import { createBackup, prepareBackup, restoreBackup } from '../src/storage/backup';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { syntheticExport } from './fixtures/synthetic';
import { defaultAnalysis } from '../src/domain/model';
import { createDistanceCurveContext } from '../src/domain/distanceCurves/context';

let database: WorkspaceDatabase;
beforeEach(() => {
  database = new WorkspaceDatabase(`atmosphere-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});

/** All weather is invented; parsing exercises the same raw-preservation path as source imports. */
function weatherBundle() {
  const data = syntheticExport();
  Object.assign(data.strings[0]!, {
    altitude: 0,
    weatherData: { temperature: 68, humidity: 50, pressure: 1013.25 },
  });
  return parseVelociRadarExport([{ name: 'invented-weather.json', text: JSON.stringify(data) }]);
}

describe('derived string atmosphere persistence', () => {
  it.each(['velociradar-export', 'caldwell'] as const)(
    'computes and replaces both attributes atomically for %s',
    async (kind) => {
      const source = createSource('Synthetic weather source', true, kind);
      const bundle = weatherBundle();
      const rawBefore = structuredClone(bundle.series[0]!.raw);
      await database.sources.add(source);
      expect(await importBundle(source.id, bundle, database)).toEqual({ series: 2, shots: 4 });
      const first = (await database.series.toArray()).find((item) => item.remoteId === 'series-a')!;
      expect(first.airDensity).toBeCloseTo(1.198877356498, 9);
      expect(first.soundSpeed).toBeGreaterThan(343);
      expect(first.raw).toEqual(rawBefore);
      await database.annotations.put({
        entityId: first.id,
        notes: 'Keep my annotation',
        fields: {},
      });
      const updated = weatherBundle();
      Object.assign(updated.series[0]!.raw.weatherData as object, { temperature: 86 });
      expect(await importBundle(source.id, updated, database)).toEqual({ series: 0, shots: 0 });
      expect((await database.series.get(first.id))!.airDensity).toBeLessThan(first.airDensity!);
      expect((await database.series.get(first.id))!.soundSpeed).toBeGreaterThan(first.soundSpeed!);
      delete updated.series[0]!.raw.altitude;
      await importBundle(source.id, updated, database);
      expect(await database.series.get(first.id)).toMatchObject({
        airDensity: null,
        soundSpeed: null,
      });
      expect((await database.annotations.get(first.id))!.notes).toBe('Keep my annotation');
      // Unseen strings are preserved, and a rejected import cannot partially replace derived values.
      await importBundle(source.id, bundle, database);
      const before = await loadWorkspace(database);
      await database.sources.update(source.id, { autoUpdateCatalogs: false });
      updated.series[1]!.projectile = { remoteId: 'unknown', name: 'Unknown synthetic projectile' };
      await expect(importBundle(source.id, updated, database)).rejects.toThrow('catalog');
      expect((await loadWorkspace(database)).series).toEqual(before.series);
    },
  );

  it('round-trips attributes and saved quantity choices, and accepts older archives', async () => {
    const source = createSource('Synthetic weather', true);
    await database.sources.add(source);
    await importBundle(source.id, weatherBundle(), database);
    await saveProfile(
      {
        tableColumns: ['airDensity', 'soundSpeed'],
        analysis: {
          ...defaultAnalysis(),
          mode: 'dual',
          dual: { axis: 'shot', quantity: 'airDensity', secondary: 'soundSpeed' },
        },
      },
      database,
    );
    const before = await loadWorkspace(database);
    const archive = await createBackup(database);
    await database.series.clear();
    await restoreBackup(await prepareBackup(archive), database);
    const after = await loadWorkspace(database);
    expect(after.series).toEqual(before.series);
    expect(after.profile).toEqual(before.profile);
    const input = createDistanceCurveContext(after.shots[0]!, 100, { series: after.series });
    expect(input.string!.airDensity).toBe(
      after.series.find((item) => item.id === input.shot.seriesId)!.airDensity,
    );
    expect(input.string!.soundSpeed).toBeGreaterThan(0);
    expect(Object.isFrozen(input.string)).toBe(true);
    const legacy = await prepareBackup(archive);
    for (const row of legacy.workspace.series) {
      delete row.airDensity;
      delete row.soundSpeed;
    }
    await restoreBackup(legacy, database);
    expect(
      (await database.series.toArray()).every(
        (row) => row.airDensity === undefined && row.soundSpeed === undefined,
      ),
    ).toBe(true);
    await importBundle(source.id, weatherBundle(), database);
    expect((await database.series.toArray()).some((row) => (row.airDensity ?? 0) > 0)).toBe(true);
  });

  it.each(['airDensity', 'soundSpeed'] as const)(
    'rejects invalid %s before restoring any records',
    async (field) => {
      const source = createSource('Synthetic validation', true);
      await database.sources.add(source);
      await importBundle(source.id, weatherBundle(), database);
      const before = await loadWorkspace(database);
      const prepared = await prepareBackup(await createBackup(database));
      for (const invalid of [-1, 0, NaN, Infinity, '1.2', {}]) {
        Object.assign(prepared.workspace.series[0]!, { [field]: invalid });
        await expect(restoreBackup(prepared, database)).rejects.toThrow('invalid records');
        expect(await loadWorkspace(database)).toEqual(before);
      }
    },
  );
});
