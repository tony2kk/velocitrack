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
function inspectFile(file: string, content: string) {
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
