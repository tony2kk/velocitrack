import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const guard = resolve('scripts/check-public.mjs');
const settings = { projectId: 'synthetic-project', apiKey: `AIza${'0'.repeat(35)}` };
let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'velocitrack-public-check-'));
  execFileSync('git', ['init', '--quiet'], { cwd: directory });
});
afterEach(() => {
  // Delete only the isolated temporary repository created by this test.
  if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}velocitrack-public-check-`))
    throw new Error('Unexpected test directory');
  rmSync(directory, { recursive: true, force: true });
});

/** Run the actual publication guard against an isolated repository with invented content. */
function inspectFile(file: string, content: string | Buffer) {
  const destination = join(directory, file);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
  return spawnSync(process.execPath, [guard], { cwd: directory, encoding: 'utf8' });
}

describe('public source configuration boundary', () => {
  it('allows only the standard two-field Caldwell metadata file', () => {
    expect(inspectFile('public/sources/caldwell.json', JSON.stringify(settings)).status).toBe(0);
  });

  it('continues to block client keys in other files', () => {
    const result = inspectFile('public/another-source.json', JSON.stringify(settings));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Google client key');
    expect(result.stderr).not.toContain(settings.apiKey);
  });

  it.each(['password', 'token', 'email', 'accountId'])('rejects an extra %s field', (field) => {
    const result = inspectFile(
      'public/sources/caldwell.json',
      JSON.stringify({ ...settings, [field]: 'synthetic-private-value' }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('invalid public source configuration');
    expect(result.stderr).not.toContain('synthetic-private-value');
  });

  it.each(['not JSON', '[]', '{}', JSON.stringify({ ...settings, apiKey: 'not-a-client-key' })])(
    'rejects incomplete or invalid public metadata',
    (content) => {
      expect(inspectFile('public/sources/caldwell.json', content).status).toBe(1);
    },
  );
});

describe('authorized public demo boundary', () => {
  const invented = { format: 'velocitrack-demo', version: 1, series: [] };

  it('accepts only the reviewed asset paths', () => {
    expect(inspectFile('public/demo/sample.json', JSON.stringify(invented)).status).toBe(0);
    expect(inspectFile('public/demo/another.json', JSON.stringify(invented)).status).toBe(1);
  });

  it.each([
    'profile',
    'sources',
    'accountId',
    'cityName',
    'mac',
    'sunriseTimeInUnix',
    'sunsetTimeInUnix',
  ])('blocks %s at the data boundary', (key) => {
    const content = { ...invented, series: [{ raw: { [key]: 'synthetic-private-value' } }] };
    const result = inspectFile('public/demo/sample.json', JSON.stringify(content));
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain('synthetic-private-value');
  });

  it('finds the excluded location even in accented free text', () => {
    const content = { ...invented, series: [{ raw: { notes: 'Šternberk' } }] };
    const result = inspectFile('public/demo/sample.json', JSON.stringify(content));
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain('Šternberk');
  });

  it('rejects photo metadata beyond the exact orientation-only tag', () => {
    // An invented JPEG header is enough to exercise metadata inspection before image decoding.
    const orientation = Buffer.from(
      '45786966000049492a0008000000010012010300010000000600000000000000',
      'hex',
    );
    const segment = Buffer.alloc(4);
    segment[0] = 0xff;
    segment[1] = 0xe1;
    segment.writeUInt16BE(orientation.length + 2, 2);
    const image = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      segment,
      orientation,
      Buffer.from([0xff, 0xda, 0, 2]),
    ]);
    expect(inspectFile('public/demo/target-session.jpg', image).status).toBe(0);
    const changed = Buffer.from(image);
    changed[20] = 9;
    expect(inspectFile('public/demo/target-session.jpg', changed).status).toBe(1);
  });
});
