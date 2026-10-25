import type { BackupCompatibility } from './backupVersions';

/** JSON objects are checked before migration; malformed values are left for strict validation. */
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Freeze historical defaults here: later app defaults must not change an existing migration. */
function migrateOneToTwo(workspace: Record<string, unknown>, changes: string[]): void {
  const profile = workspace.profile;
  if (!object(profile)) return;
  const defaults: [string, unknown, string][] = [
    ['theme', 'auto', 'Theme: follow system'],
    ['showProjectileWeight', false, 'Projectile weight on cards: off'],
    ['showGroupSize', false, 'Group size on cards: off'],
    ['showCaldwellNotes', true, 'Caldwell notes on cards: on'],
    ['chartHeightPercent', 100, 'Screen chart height: 100%'],
    ['reportPaperSize', 'A4', 'Report paper: A4'],
    [
      'report',
      { details: true, target: true, statistics: true, chart: true, records: true },
      'Report sections: all enabled',
    ],
    [
      'analysis',
      {
        mode: 'simple',
        simple: { axis: 'distance', quantity: 'velocity', secondary: 'g1' },
        dual: { axis: 'shot', quantity: 'velocity', secondary: 'g1' },
        compare: { axis: 'shot', quantity: 'velocity', secondary: 'g1' },
      },
      'Chart choices: default views',
    ],
  ];
  for (const [key, value, label] of defaults) {
    if (!Object.hasOwn(profile, key)) {
      profile[key] = value;
      changes.push(`Missing preference added — ${label}.`);
    }
  }
  if (object(profile.tableSort) && profile.tableSort.columnId === 'shot') {
    profile.tableSort.columnId = 'series';
    changes.push(
      'Legacy Shot sorting now uses String / Shot sorting; the saved direction is retained.',
    );
  }
  if (object(profile.analysis)) {
    let renamed = false;
    for (const mode of ['simple', 'dual', 'compare']) {
      const chart = profile.analysis[mode];
      if (!object(chart)) continue;
      for (const key of ['quantity', 'secondary']) {
        if (chart[key] === 'curve:velocity-g1-local' || chart[key] === 'curve:velocity-g7-local') {
          chart[key] = chart[key] === 'curve:velocity-g1-local' ? 'calculated:g1' : 'calculated:g7';
          renamed = true;
        }
      }
    }
    if (renamed)
      changes.push(
        'Local G1/G7 velocity choices now use the unified G1/G7 curves: local atmosphere when available, standard atmosphere otherwise.',
      );
  }
}

/** Apply ordered, lossless upgrades to decoded archive data only; never write the live database here. */
export function migrateBackup(
  workspace: Record<string, unknown>,
  compatibility: BackupCompatibility,
): void {
  if (compatibility.dataVersion === 1) migrateOneToTwo(workspace, compatibility.changes);
  if (
    compatibility.dataVersion <= 2 &&
    object(workspace.profile) &&
    !Object.hasOwn(workspace.profile, 'reportProfiles')
  ) {
    workspace.profile.reportProfiles = [];
    compatibility.changes.push(
      'This backup has no Report Builder profiles. Start with an empty template list and Quick report.',
    );
  }
  // Version 4 only adds a source kind and optional invitation flag. Version-3 values need no rewrite.
  // Future data versions append explicit migration steps. Never drop unrecognized fields to pass validation.
}
