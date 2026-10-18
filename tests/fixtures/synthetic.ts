import type { Series, Shot } from '../../src/domain/model';

/** Invented from scratch. These records have never represented a real person or measurement. */
export function syntheticExport() {
  return {
    strings: [
      {
        _documentId: 'series-a',
        name: 'Morning session',
        startTimestamp: 1767225600,
        firearm: { id: 'firearm-a', name: 'Sample firearm A' },
        projectile: { id: 'projectile-a', name: 'Sample projectile A' },
      },
      {
        _documentId: 'series-b',
        name: 'Afternoon session',
        startTimestamp: 1767312000,
        firearm: { id: 'firearm-b', name: 'Sample firearm B' },
        projectile: { id: 'projectile-a', name: 'Sample projectile A' },
      },
    ],
    shots: [
      {
        _documentId: 'shot-a',
        _stringId: 'series-a',
        number: 1,
        muzzleVelocity: 310,
        unit: 9,
        ballisticCoefficientG1: 0.111,
        ballisticCoefficientG7: 0.055,
        distances: [0, 10, 20, 0],
        velocities: [310, 300, 292, 0],
        exclude: false,
      },
      {
        _documentId: 'shot-b',
        _stringId: 'series-a',
        number: 2,
        muzzleVelocity: 314,
        unit: 9,
        ballisticCoefficientG1: 0.112,
        ballisticCoefficientG7: 0.056,
        distances: [0, 10, 20],
        velocities: [314, 305, 297],
        exclude: false,
      },
      {
        _documentId: 'shot-c',
        _stringId: 'series-b',
        number: 1,
        muzzleVelocity: 308,
        unit: 9,
        ballisticCoefficientG1: 0.11,
        ballisticCoefficientG7: 0.054,
        distances: [0, 10, 20],
        velocities: [308, 298, 290],
        exclude: false,
      },
      {
        _documentId: 'shot-d',
        _stringId: 'series-b',
        number: 2,
        muzzleVelocity: 390,
        unit: 9,
        ballisticCoefficientG1: 0.1,
        ballisticCoefficientG7: 0.05,
        distances: [0, 10],
        velocities: [390, 375],
        exclude: true,
      },
    ],
  };
}

export const shot = (patch: Partial<Shot> = {}): Shot => ({
  id: 'shot',
  sourceId: 'source',
  seriesId: 'series',
  remoteId: 'shot',
  number: 1,
  muzzleVelocity: 10,
  ballisticCoefficientG1: null,
  ballisticCoefficientG7: null,
  distances: [],
  velocities: [],
  excluded: false,
  rawUnit: '9',
  raw: {},
  ...patch,
});
export const series = (patch: Partial<Series> = {}): Series => ({
  id: 'series',
  sourceId: 'source',
  remoteId: 'series',
  name: 'Synthetic series',
  startedAt: '2026-01-01T12:00:00.000Z',
  firearmId: 'firearm',
  projectileId: 'projectile',
  raw: {},
  ...patch,
});
