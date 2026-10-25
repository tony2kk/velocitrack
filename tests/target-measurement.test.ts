import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  calibrateTarget,
  changeTargetGeometry,
  changeTargetCalibration,
  emptyTarget,
  overrideTargetValues,
  parseTargetValue,
  targetPixels,
  targetText,
  validTargetMeasurement,
  type TargetGeometry,
  type TargetMeasurement,
} from '../src/domain/targetMeasurement';
import { WorkspaceDatabase } from '../src/storage/database';
import { saveTargetMeasurement } from '../src/storage/targetMeasurement';
import { removePhoto } from '../src/storage/attachments';
import { createSource, importBundle, loadWorkspace, saveProfile } from '../src/storage/workspace';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { createBackup, prepareBackup, restoreBackup } from '../src/storage/backup';
import { validateBackup } from '../src/storage/backupValidation';
import { availableQuantities } from '../src/domain/analysis';
import { createDistanceCurveContext } from '../src/domain/distanceCurves/context';
import { syntheticExport, shot, series } from './fixtures/synthetic';

const geometry: TargetGeometry = {
  width: 1200,
  height: 800,
  center: { x: 600, y: 350 },
  poa: { x: 500, y: 400 },
  radius: 50,
};
/** Construct a fresh invented drawing; no private target photo or measured data enters fixtures. */
function drawing(): TargetMeasurement {
  return { ...emptyTarget(), photoId: 'synthetic-photo', geometry: structuredClone(geometry) };
}

describe('manual image measurement', () => {
  it('calibrates from any nonzero dimension with right/up signs and preserves zero offsets', () => {
    for (const field of ['horizontalOffset', 'verticalOffset', 'groupSize'] as const) {
      const value = calibrateTarget(drawing(), field, field === 'verticalOffset' ? 50 : 100);
      expect(value.mmPerPixel).toBe(1);
      expect(value.values).toEqual({ horizontalOffset: 100, verticalOffset: 50, groupSize: 100 });
      const aligned = changeTargetGeometry(value, { ...geometry, center: { ...geometry.poa! } });
      expect(aligned.values).toEqual({ horizontalOffset: 0, verticalOffset: 0, groupSize: 100 });
    }
    const lowerLeft = { ...geometry, center: { x: 400, y: 450 } };
    expect(targetPixels(lowerLeft)).toEqual({
      horizontalOffset: -100,
      verticalOffset: -50,
      groupSize: 100,
    });
    expect(
      calibrateTarget({ ...drawing(), geometry: lowerLeft }, 'horizontalOffset', -25).mmPerPixel,
    ).toBe(0.25);
  });
  it('rejects zero dimensions, missing geometry and signs that disagree with the drawing', () => {
    expect(() => calibrateTarget(emptyTarget(), 'groupSize', 10)).toThrow(/nonzero/);
    expect(() => calibrateTarget(drawing(), 'groupSize', 0)).toThrow(/nonzero/);
    expect(() => calibrateTarget(drawing(), 'verticalOffset', -10)).toThrow(/sign/);
    expect(() =>
      calibrateTarget(
        { ...drawing(), geometry: { ...geometry, poa: { ...geometry.center } } },
        'horizontalOffset',
        10,
      ),
    ).toThrow(/nonzero/);
  });
  it('keeps manual overrides until geometry changes, using the established scale without drift', () => {
    const calibrated = calibrateTarget(drawing(), 'groupSize', 25.4);
    const before = structuredClone(calibrated);
    const manual = overrideTargetValues(calibrated, { groupSize: 999, horizontalOffset: 0 });
    expect(manual.mmPerPixel).toBe(calibrated.mmPerPixel);
    expect(manual.manual).toEqual(['horizontalOffset', 'groupSize']);
    const changed = changeTargetGeometry(manual, { ...geometry, radius: 100 });
    expect(changed.values).toEqual({
      groupSize: 50.8,
      horizontalOffset: 25.4,
      verticalOffset: 12.7,
    });
    expect(changed.manual).toEqual([]);
    expect(calibrated).toEqual(before);
  });
  it('preserves independently entered offsets when editing only a circle', () => {
    const manual = overrideTargetValues(calibrateTarget(drawing(), 'groupSize', 100), {
      horizontalOffset: -9,
      verticalOffset: 0,
    });
    const changed = changeTargetGeometry(manual, { ...geometry, poa: null, radius: 75 });
    expect(changed.values).toEqual({ horizontalOffset: -9, verticalOffset: 0, groupSize: 150 });
    expect(changed.manual).toEqual(['horizontalOffset', 'verticalOffset']);
  });
  it('converts cm/in without changing canonical precision and distinguishes empty from zero', () => {
    expect(parseTargetValue('1', 'groupSize', 'imperial')).toBe(25.4);
    expect(targetText(25.4, 'metric')).toBe('2.54');
    expect(parseTargetValue('', 'horizontalOffset', 'metric')).toBeNull();
    expect(parseTargetValue('0', 'horizontalOffset', 'metric')).toBe(0);
    expect(parseTargetValue('-2', 'verticalOffset', 'metric')).toBe(-20);
    expect(() => parseTargetValue('-1', 'groupSize', 'metric')).toThrow();
    expect(() => parseTargetValue('Infinity', 'horizontalOffset', 'metric')).toThrow();
    expect(() => parseTargetValue('abc', 'groupSize', 'metric')).toThrow();
  });
  it('rejects corrupt geometry, nonfinite values and inconsistent provenance', () => {
    expect(validTargetMeasurement(emptyTarget())).toBe(true);
    expect(validTargetMeasurement(calibrateTarget(drawing(), 'groupSize', 20))).toBe(true);
    for (const value of [
      { ...drawing(), mmPerPixel: -1 },
      { ...drawing(), geometry: { ...geometry, radius: Infinity } },
      { ...drawing(), geometry: { ...geometry, center: { x: -1, y: 50 } } },
      { ...drawing(), geometry: { ...geometry, width: 1000000 } },
      { ...emptyTarget(), mmPerPixel: 1 },
      { ...drawing(), photoId: undefined },
      { ...emptyTarget(), manual: ['groupSize'] },
      { ...emptyTarget(), values: { ...emptyTarget().values, groupSize: -1 } },
    ])
      expect(validTargetMeasurement(value)).toBe(false);
  });
  it('exposes string values in display units and the complete readonly custom-function context', () => {
    const annotation = {
      entityId: series().id,
      notes: '',
      fields: {},
      target: calibrateTarget(drawing(), 'groupSize', 25.4),
    };
    const quantities = availableQuantities([shot()], [series()], [], [annotation], 'metric');
    expect(quantities.find((q) => q.id === 'target:groupSize')?.read(shot())).toBe(2.54);
    expect(quantities.find((q) => q.id === 'target:verticalOffset')?.read(shot())).toBe(1.27);
    const context = createDistanceCurveContext(shot(), 100, {
      series: [series()],
      annotations: [annotation],
    });
    expect(context.stringAnnotation?.target).toEqual(annotation.target);
    expect(Object.isFrozen(context.stringAnnotation?.target?.geometry)).toBe(true);
  });
});

let database: WorkspaceDatabase;
beforeEach(() => {
  database = new WorkspaceDatabase(`target-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});

/** Seed an invented workspace through the normal importer, with minimal raster-signature bytes. */
async function seed() {
  const source = createSource('Synthetic target source', true);
  await database.sources.add(source);
  const bundle = parseVelociRadarExport([
    { name: 'synthetic.json', text: JSON.stringify(syntheticExport()) },
  ]);
  await importBundle(source.id, bundle, database);
  const item = (await database.series.toArray())[0]!;
  const blob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
  await database.attachments.put({
    id: 'synthetic-photo',
    seriesId: item.id,
    name: 'synthetic.png',
    caption: '',
    mime: 'image/png',
    size: blob.size,
    createdAt: '2026-01-01T00:00:00Z',
  });
  await database.attachmentContents.put({ id: 'synthetic-photo', blob });
  await database.annotations.put({ entityId: item.id, notes: 'Keep this note', fields: {} });
  return { item, source, bundle };
}

describe('target persistence and portability', () => {
  it('preserves reference scale and note display preference through reimport, ZIP recovery and photo deletion', async () => {
    const { item, source, bundle } = await seed();
    const measurement = changeTargetCalibration(drawing(), {
      width: 1200,
      height: 800,
      start: { x: 200, y: 400 },
      end: { x: 600, y: 400 },
      lengthMm: 50,
    });
    await saveTargetMeasurement(item.id, measurement, database);
    await saveProfile({ showCaldwellNotes: false }, database);
    await importBundle(source.id, bundle, database);
    const prepared = await prepareBackup(await createBackup(database));
    await database.annotations.clear();
    await restoreBackup(prepared, database);
    expect((await database.annotations.get(item.id))?.target).toEqual(measurement);
    expect((await loadWorkspace(database)).profile.showCaldwellNotes).toBe(false);
    const corrupt = await loadWorkspace(database);
    corrupt.annotations[0]!.target!.calibration!.lengthMm = 0;
    expect(() => validateBackup(corrupt)).toThrow();
    await removePhoto('synthetic-photo', database);
    const target = (await database.annotations.get(item.id))!.target!;
    expect(target.calibration).toBeUndefined();
    expect(target.mmPerPixel).toBeUndefined();
    expect(target.values).toEqual(measurement.values);
    expect(validTargetMeasurement(target)).toBe(true);
  });
  it('saves one active result, preserves annotations and survives reimport and a ZIP round trip', async () => {
    const { item, source, bundle } = await seed();
    const measurement = calibrateTarget(drawing(), 'groupSize', 12.3456789);
    await saveTargetMeasurement(item.id, measurement, database);
    await saveProfile({ showGroupSize: true }, database);
    await importBundle(source.id, bundle, database);
    expect((await database.annotations.get(item.id))?.notes).toBe('Keep this note');
    const prepared = await prepareBackup(await createBackup(database));
    await database.annotations.clear();
    await restoreBackup(prepared, database);
    expect((await database.annotations.get(item.id))?.target).toEqual(measurement);
    expect((await database.annotations.get(item.id))?.target?.geometry).toEqual(geometry);
    expect((await loadWorkspace(database)).profile.showGroupSize).toBe(true);
  });
  it('rejects missing or foreign photo references before changing the previous result', async () => {
    const { item } = await seed();
    await saveTargetMeasurement(item.id, emptyTarget(), database);
    await expect(
      saveTargetMeasurement(item.id, { ...drawing(), photoId: 'missing' }, database),
    ).rejects.toThrow(/photo/);
    await database.attachments.update('synthetic-photo', { seriesId: 'another-string' });
    await expect(saveTargetMeasurement(item.id, drawing(), database)).rejects.toThrow(/photo/);
    expect((await database.annotations.get(item.id))?.target).toEqual(emptyTarget());
  });
  it('keeps numeric results after removing the photo and drops drawing provenance atomically', async () => {
    const { item } = await seed();
    const measurement = calibrateTarget(drawing(), 'groupSize', 40);
    await saveTargetMeasurement(item.id, measurement, database);
    await removePhoto('synthetic-photo', database);
    const target = (await database.annotations.get(item.id))!.target!;
    expect(target.values).toEqual(measurement.values);
    expect(target.photoId).toBeUndefined();
    expect(target.geometry).toBeUndefined();
    expect(validTargetMeasurement(target)).toBe(true);
    expect(await database.attachmentContents.count()).toBe(0);
    validateBackup(await loadWorkspace(database));
  });
  it('rejects malformed/restored targets and targets attached to shots instead of strings', async () => {
    const { item } = await seed();
    await saveTargetMeasurement(item.id, drawing(), database);
    const workspace = await loadWorkspace(database);
    const invalid = structuredClone(workspace);
    invalid.annotations[0]!.target!.geometry!.radius = -1;
    expect(() => validateBackup(invalid)).toThrow();
    const foreign = structuredClone(workspace);
    foreign.annotations[0]!.entityId = workspace.shots[0]!.id;
    expect(() => validateBackup(foreign)).toThrow();
    const missing = structuredClone(workspace);
    missing.attachments = [];
    expect(() => validateBackup(missing)).toThrow();
  });
});
