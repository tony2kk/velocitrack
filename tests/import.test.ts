import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { parseVelociRadarExport } from '../src/sources/velociradar';
import { syntheticExport } from './fixtures/synthetic';

const parse = (value: unknown) =>
  parseVelociRadarExport([{ name: 'synthetic.fixture.json', text: JSON.stringify(value) }]);

describe('VelociRadar file adapter', () => {
  it('accepts JSON and CSV content in text files without accepting arbitrary prose', () => {
    const fixture = syntheticExport();
    expect(
      parseVelociRadarExport([{ name: 'sample.txt', text: '\uFEFF  ' + JSON.stringify(fixture) }])
        .shots,
    ).toHaveLength(4);
    expect(
      parseVelociRadarExport([
        {
          name: 'strings.txt',
          text: Papa.unparse(
            fixture.strings.map((row) => ({
              ...row,
              firearm: JSON.stringify(row.firearm),
              projectile: JSON.stringify(row.projectile),
            })),
          ),
        },
        {
          name: 'shots.txt',
          text: Papa.unparse(
            fixture.shots.map((row) => ({
              ...row,
              distances: JSON.stringify(row.distances),
              velocities: JSON.stringify(row.velocities),
            })),
          ),
        },
      ]).shots,
    ).toHaveLength(4);
    expect(() =>
      parseVelociRadarExport([{ name: 'sample.txt', text: 'This is not an export.' }]),
    ).toThrow();
  });
  it('reads combined JSON with stable identities, Unix seconds and raw records', () => {
    const fixture = syntheticExport();
    const result = parse(fixture);
    expect(result.series).toHaveLength(2);
    expect(result.shots).toHaveLength(4);
    expect(result.series[0]).toMatchObject({
      remoteId: 'series-a',
      startedAt: '2026-01-01T00:00:00.000Z',
      firearm: { remoteId: 'firearm-a' },
    });
    expect(result.shots[0]).toMatchObject({
      rawUnit: '9',
      distances: [0, 10, 20, 0],
      velocities: [310, 300, 292, 0],
      raw: fixture.shots[0],
    });
  });
  it('reads a JSON pair in either order and UTF-8 BOM', () => {
    const fixture = syntheticExport();
    const result = parseVelociRadarExport([
      { name: 'shots.json', text: '\uFEFF' + JSON.stringify(fixture.shots) },
      { name: 'strings.json', text: JSON.stringify(fixture.strings) },
    ]);
    expect(result.shots).toHaveLength(4);
  });
  it('reads CSV with JSON cells, embedded commas/newlines and Python booleans', () => {
    const fixture = syntheticExport();
    fixture.strings[0]!.name = 'Synthetic, "quoted"\nsession';
    const encode = (rows: object[]) =>
      '\uFEFF' +
      Papa.unparse(
        rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              typeof value === 'object'
                ? JSON.stringify(value)
                : typeof value === 'boolean'
                  ? value
                    ? 'True'
                    : 'False'
                  : value,
            ]),
          ),
        ),
      );
    const result = parseVelociRadarExport([
      { name: 'strings.csv', text: encode(fixture.strings) },
      { name: 'shots.csv', text: encode(fixture.shots) },
    ]);
    expect(result.series[0]!.name).toBe(fixture.strings[0]!.name);
    expect(result.shots[3]!.excluded).toBe(true);
    expect(result.shots[0]!.distances).toEqual([0, 10, 20, 0]);
  });
  it('preserves unequal arrays for an explicit quality report', () => {
    const fixture = syntheticExport();
    fixture.shots[0]!.velocities.pop();
    expect(parse(fixture).shots[0]!.distances).toHaveLength(4);
    expect(parse(fixture).shots[0]!.velocities).toHaveLength(3);
  });
  it('rejects duplicate records and orphan shots', () => {
    const fixture = syntheticExport();
    fixture.shots.push(fixture.shots[0]!);
    expect(() => parse(fixture)).toThrow('Duplicate shot IDs');
    fixture.shots.pop();
    fixture.shots[0]!._stringId = 'missing';
    expect(() => parse(fixture)).toThrow('missing from the strings export');
    fixture.shots = [];
    fixture.strings.push(fixture.strings[0]!);
    expect(() => parse(fixture)).toThrow('Duplicate series IDs');
  });
  it('rejects malformed numeric values rather than converting them to zero', () => {
    const fixture = syntheticExport();
    expect(() =>
      parse({ ...fixture, shots: [{ ...fixture.shots[0], muzzleVelocity: 'broken' }] }),
    ).toThrow('invalid number');
    expect(() =>
      parse({ ...fixture, shots: [{ ...fixture.shots[0], velocities: [300, null] }] }),
    ).toThrow('empty value');
    expect(() => parse({ ...fixture, shots: [{ ...fixture.shots[0], exclude: 'maybe' }] })).toThrow(
      'true or false',
    );
  });
  it('requires both arrays and rejects unsupported files', () => {
    expect(() => parse({ strings: [] })).toThrow('strings[] and shots[]');
    expect(() =>
      parseVelociRadarExport([{ name: 'points.csv', text: 'distance,velocity\n0,300' }]),
    ).toThrow('points export is not needed');
    expect(() => parseVelociRadarExport([{ name: 'export.exe', text: '' }])).toThrow('JSON or CSV');
    expect(parse({ strings: [], shots: [] })).toEqual({ series: [], shots: [] });
  });
  it('rejects oversized point arrays before writing anything', () => {
    const fixture = syntheticExport();
    expect(() =>
      parse({ ...fixture, shots: [{ ...fixture.shots[0], distances: Array(5001).fill(0) }] }),
    ).toThrow('at most 5000 points');
  });
});
