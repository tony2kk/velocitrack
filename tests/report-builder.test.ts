import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { WorkspaceDatabase } from '../src/storage/database';
import { saveReportProfile, deleteReportProfile } from '../src/storage/reportProfiles';
import { loadWorkspace, saveProfile } from '../src/storage/workspace';
import {
  newReportProfile,
  newReportView,
  reorderReportViews,
  validateReportProfiles,
  type ReportProfile,
} from '../src/domain/reportProfiles';
import { defaultProfile } from '../src/domain/model';
import {
  automaticReportDistance,
  planReportViews,
  prepareReportChart,
} from '../src/reports/builder';
import { reportDocument, reportFilename } from '../src/reports/content';
import { measurementChartOption, chartAxes } from '../src/charts/options';
import { createBackup, prepareBackup, restoreBackup } from '../src/storage/backup';
import { rewriteBackup } from './fixtures/backupArchive';
import type { ReportInput } from '../src/reports/types';
import { series, shot } from './fixtures/synthetic';
import { emptyTarget } from '../src/domain/targetMeasurement';

const database = new WorkspaceDatabase('report-builder-tests');
beforeEach(async () => {
  await database.open();
});
afterEach(async () => {
  await database.delete();
});

/** A detached template and invented two-string workspace, independent of actual browser data. */
function fixture(): ReportInput & { template: ReportProfile } {
  const template = { ...newReportProfile(), name: 'Range overview' };
  const perString = newReportView('simple', 'velocities');
  if (perString.mode !== 'info') perString.grouping = 'per-string';
  const compare = newReportView('compare', 'groups');
  if (compare.mode !== 'info')
    compare.settings = { axis: 'string', quantity: 'target:groupSize', secondary: 'velocity' };
  template.views = [perString, compare, newReportView('info', 'info')];
  return {
    template,
    profile: { ...defaultProfile(), unitSystem: 'metric' },
    series: [
      series({ id: 'a', name: 'Synthetic Alpha' }),
      series({ id: 'b', name: 'Synthetic Bravo' }),
    ],
    shots: [
      shot({ id: 'shot-a', seriesId: 'a', distances: [10, 30, 0], velocities: [1000, 990, 0] }),
      shot({ id: 'shot-b', seriesId: 'b', distances: [5, 60], velocities: [1100, 1080] }),
    ],
    annotations: ['a', 'b'].map((id, index) => ({
      entityId: id,
      notes: '',
      fields: {},
      target: {
        ...emptyTarget(),
        values: { horizontalOffset: null, verticalOffset: null, groupSize: 40 + index * 5 },
      },
    })),
    fields: [],
    tags: [],
    attachments: [],
    catalog: [],
    colorOrder: ['b', 'a'],
    createdAt: '2026-01-01T12:00:00Z',
    version: 'test',
    revision: 'synthetic',
  };
}

it('adds, edits and deletes profiles atomically without replacing unrelated preferences', async () => {
  const first = fixture().template;
  const second = { ...newReportProfile(), name: 'Other report' };
  await Promise.all([
    saveReportProfile(first, database),
    saveReportProfile(second, database),
    saveProfile({ nickname: 'Local preference' }, database),
  ]);
  await saveProfile({ selectedReportProfileId: first.id }, database);
  await saveReportProfile({ ...first, name: 'Renamed report' }, database);
  let profile = (await loadWorkspace(database)).profile;
  expect(profile.reportProfiles).toHaveLength(2);
  expect(profile.nickname).toBe('Local preference');
  expect(profile.selectedReportProfileId).toBe(first.id);
  await deleteReportProfile(first.id, database);
  profile = (await loadWorkspace(database)).profile;
  expect(profile.selectedReportProfileId).toBeUndefined();
  expect(profile.reportProfiles).toEqual([second]);
  await expect(saveProfile({ selectedReportProfileId: first.id }, database)).rejects.toThrow(
    'no longer exists',
  );
});

it('enforces normalized unique names and keeps a rejected draft out of storage', async () => {
  await saveReportProfile({ ...newReportProfile(), name: '  Range   Report  ' }, database);
  for (const name of ['range report', 'ＲＡＮＧＥ ＲＥＰＯＲＴ', ' ', 'Quick report']) {
    await expect(saveReportProfile({ ...newReportProfile(), name }, database)).rejects.toThrow();
  }
  expect((await loadWorkspace(database)).profile.reportProfiles!.map((item) => item.name)).toEqual([
    'Range Report',
  ]);
});

it('round-trips ordered templates and the Tools selection and migrates data version two without them', async () => {
  const report = fixture().template;
  await saveReportProfile(report, database);
  await saveProfile({ selectedReportProfileId: report.id }, database);
  const bytes = await createBackup(database);
  await deleteReportProfile(report.id, database);
  await restoreBackup(await prepareBackup(bytes), database);
  expect((await loadWorkspace(database)).profile).toMatchObject({
    reportProfiles: [report],
    selectedReportProfileId: report.id,
  });
  const older = await rewriteBackup(bytes, (manifest, data) => {
    manifest.dataVersion = 2;
    manifest.appVersion = '0.21.0';
    const profile = data.profile as Record<string, unknown>;
    delete profile.reportProfiles;
    delete profile.selectedReportProfileId;
  });
  const prepared = await prepareBackup(older);
  expect(prepared.compatibility).toMatchObject({ dataVersion: 2, targetDataVersion: 3 });
  expect(prepared.compatibility.changes.join(' ')).toContain('no Report Builder profiles');
  await restoreBackup(prepared, database);
  expect((await loadWorkspace(database)).profile.reportProfiles).toEqual([]);
});

it('rejects malformed report contracts, duplicate view IDs and broken selected-profile references', () => {
  const template = fixture().template;
  expect(() => validateReportProfiles([template], 'missing')).toThrow();
  expect(() => validateReportProfiles(null)).toThrow();
  expect(() =>
    validateReportProfiles([{ ...template, views: [template.views[0], template.views[0]] }]),
  ).toThrow();
  expect(() => validateReportProfiles([{ ...template, unknownField: true }])).toThrow();
  expect(() =>
    validateReportProfiles([
      { ...template, views: [{ ...newReportView('compare'), grouping: 'per-string' }] },
    ]),
  ).toThrow();
  for (const forecastDistance of [0, -1, NaN, Infinity, 999999]) {
    expect(() =>
      validateReportProfiles([
        {
          ...template,
          views: [
            {
              id: 'bad',
              mode: 'simple',
              grouping: 'combined',
              settings: {
                axis: 'distance',
                quantity: 'velocity',
                secondary: 'g1',
                forecastDistance,
              },
            },
          ],
        },
      ]),
    ).toThrow();
  }
  expect(() => validateReportProfiles([{ ...template, views: [] }])).not.toThrow();
});

it('retains missing template quantity IDs in backups and explains their availability before restore', async () => {
  const report = fixture().template;
  const view = report.views[0]!;
  if (view.mode === 'info') throw new Error('Expected chart');
  view.settings.quantity = 'curve:removed';
  view.settings.secondary = 'field:removed';
  await saveReportProfile(report, database);
  const backup = await prepareBackup(await createBackup(database));
  expect(backup.compatibility.notices.join(' ')).toContain('curve:removed');
  expect(backup.compatibility.notices.join(' ')).toContain('field:removed');
  await restoreBackup(backup, database);
  expect((await loadWorkspace(database)).profile.reportProfiles).toEqual([report]);
});

it('expands only Simple/Dual views, preserves order and selection, and does not touch the screen profile', () => {
  const input = fixture();
  const before = structuredClone(input);
  const plans = planReportViews(input);
  expect(plans.map((plan) => [plan.view.id, plan.input.series.map((series) => series.id)])).toEqual(
    [
      ['velocities', ['a']],
      ['velocities', ['b']],
      ['groups', ['a', 'b']],
      ['info', ['a', 'b']],
    ],
  );
  expect(plans[0]!.input.shots.map((shot) => shot.id)).toEqual(['shot-a']);
  expect(plans[1]!.input.shots.map((shot) => shot.id)).toEqual(['shot-b']);
  input.template.views = reorderReportViews(input.template.views, 'groups', 0);
  expect(planReportViews(input)[0]!.view.id).toBe('groups');
  input.template.views = before.template.views;
  expect(input).toEqual(before);
});

it('derives forecast per chart from valid samples in canonical feet, preserves explicit horizons and units', () => {
  const input = fixture();
  const plans = planReportViews(input);
  expect(plans.slice(0, 2).map((plan) => automaticReportDistance(plan.input))).toEqual([30, 60]);
  const view = plans[0]!.view;
  if (view.mode === 'info') throw new Error('Expected chart');
  view.settings.quantity = 'calculated:g1';
  plans[0]!.input.shots[0]!.muzzleVelocity = 1010;
  plans[0]!.input.shots[0]!.ballisticCoefficientG1 = 0.2;
  const automatic = prepareReportChart(plans[0]!);
  expect(automatic.presentation.settings.forecastDistance).toBe(30);
  expect(automatic.presentation.traces[0]!.data.at(-1)!.value[0]).toBeCloseTo(30 * 0.3048);
  view.settings.forecastDistance = 100;
  expect(prepareReportChart(plans[0]!).presentation.traces[0]!.data.at(-1)!.value[0]).toBeCloseTo(
    30.48,
  );
  input.shots[0]!.excluded = true;
  expect(automaticReportDistance(input)).toBe(60);
});

it('uses shared colors, bars, axes and unavailable-data notices without replacing saved quantities', () => {
  const plan = planReportViews(fixture())[2]!;
  const prepared = prepareReportChart(plan);
  expect(prepared.message).toBeUndefined();
  expect(prepared.legend[0]!.color).not.toBe(prepared.legend[1]!.color);
  expect(prepared.presentation.traces.map((trace) => trace.color)).toEqual(
    prepared.legend.map((item) => item.color),
  );
  const axes = chartAxes(prepared.presentation);
  expect(axes.fittedY[0]!.range![0]).toBeCloseTo(0);
  const option = measurementChartOption(prepared.presentation) as { series: { type: string }[] };
  expect(option.series.every((series) => series.type === 'bar')).toBe(true);
  if (plan.view.mode === 'info') throw new Error('Expected chart');
  plan.view.settings.quantity = 'field:deleted';
  expect(prepareReportChart(plan).message).toContain('Unavailable quantity: field:deleted');
  expect(plan.view.settings.quantity).toBe('field:deleted');
  plan.view.settings.quantity = 'target:groupSize';
  plan.input.annotations = [];
  expect(prepareReportChart(plan).message).toContain('No usable data');
});

it('composes ordered chart/info sections after one introduction, with chart pages fitted independently', () => {
  const input = fixture();
  input.template.sections = { details: false, statistics: false, target: false, records: true };
  input.views = [
    { title: '1. Chart A', mode: 'chart', seriesIds: ['a'], message: 'No measured data' },
    { title: '2. String info', mode: 'info', seriesIds: ['a', 'b'] },
    { title: '3. Chart B', mode: 'chart', seriesIds: ['a', 'b'], message: 'No data' },
  ];
  const document = reportDocument(input);
  const content = document.content as unknown as Record<string, unknown>[];
  expect(document.pageOrientation).toBe('landscape');
  expect(content.filter((item) => item.text === input.template.name)).toHaveLength(1);
  expect(
    content
      .filter((item) => item.style === 'heading')
      .map((item) => [item.text, item.pageOrientation]),
  ).toEqual([
    ['1. Chart A', 'landscape'],
    ['2. String info', 'portrait'],
    ['3. Chart B', 'landscape'],
    ['Shot records', 'landscape'],
  ]);
  expect(content.filter((item) => item.text === 'Synthetic Alpha')).toHaveLength(1);
  expect(content.filter((item) => item.text === 'Synthetic Bravo')).toHaveLength(1);
  expect(reportFilename(input)).toContain('Range-overview');
  input.template.views = [];
  input.views = [];
  expect(reportDocument(input).pageOrientation).toBe('landscape'); // Records only.
});
