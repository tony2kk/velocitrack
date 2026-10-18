import { describe, expect, it, vi } from 'vitest';
import { readAccount, readPages, type CloudDocument } from '../src/sources/caldwell/read';
import { parseConnectionSettings } from '../src/sources/caldwell/configuration';
import { connectionError } from '../src/sources/caldwell/errors';
import { syntheticExport } from './fixtures/synthetic';

describe('Caldwell read-only boundary', () => {
  it('reads only the signed-in owner path and takes identity from document paths', async () => {
    const fixture = syntheticExport();
    const read = vi.fn(async (path: string[]): Promise<CloudDocument[]> =>
      path.length === 3
        ? fixture.strings.map((row) => ({
            id: row._documentId,
            data: { ...row, _documentId: 'untrusted-field' },
          }))
        : fixture.shots
            .filter((row) => row._stringId === path[3])
            .map((row) => ({
              id: row._documentId,
              data: { ...row, _stringId: 'untrusted-field' },
            })),
    );
    const bundle = await readAccount('synthetic-owner', read);
    expect(read.mock.calls.map(([path]) => path)).toEqual([
      ['Users', 'synthetic-owner', 'Strings'],
      ['Users', 'synthetic-owner', 'Strings', 'series-a', 'Shots'],
      ['Users', 'synthetic-owner', 'Strings', 'series-b', 'Shots'],
    ]);
    expect(bundle.series.map((item) => item.remoteId)).toEqual(['series-a', 'series-b']);
    expect(bundle.shots).toHaveLength(4);
    expect(bundle.shots[0]?.seriesRemoteId).toBe('series-a');
  });

  it('rejects a path-like account ID before any request and stops on denied reads', async () => {
    const read = vi.fn().mockRejectedValue({ code: 'permission-denied' });
    await expect(readAccount('other/path', read)).rejects.toThrow('signed-in account');
    expect(read).not.toHaveBeenCalled();
    await expect(readAccount('synthetic-owner', read)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('paginates to completion and rejects excess records instead of silently truncating', async () => {
    const rows = Array.from({ length: 205 }, (_, index) => ({
      id: `synthetic-${String(index).padStart(3, '0')}`,
      data: {},
    }));
    const read = vi.fn(async (after: string | undefined, size: number) => {
      const start = after ? rows.findIndex((row) => row.id === after) + 1 : 0;
      return rows.slice(start, start + size);
    });
    expect(await readPages(read, 205)).toEqual(rows);
    expect(read).toHaveBeenCalledTimes(2);
    await expect(readPages(read, 204)).rejects.toThrow('exceeds');
    expect(await readPages(async () => [], 0)).toEqual([]);
    await expect(readPages(async () => rows.slice(0, 1), 0)).rejects.toThrow('exceeds');
  });

  it('stops repeated pages and does not return a partial result after a late failure', async () => {
    const page = Array.from({ length: 200 }, (_, index) => ({
      id: `synthetic-${index}`,
      data: {},
    }));
    await expect(readPages(async () => page, 1_000)).rejects.toThrow('changed during pagination');
    const read = vi.fn().mockResolvedValueOnce(page).mockRejectedValueOnce({ code: 'unavailable' });
    await expect(readPages(read, 1_000)).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('keeps only connection identifiers, excluding credentials and custom endpoints', () => {
    const settings = {
      projectId: 'synthetic-project',
      apiKey: 'synthetic-key-for-unit-tests',
      endpoint: 'https://example.invalid',
      password: 'invented-test-value',
    };
    expect(parseConnectionSettings(JSON.stringify(settings))).toEqual({
      projectId: settings.projectId,
      apiKey: settings.apiKey,
    });
    expect(() => parseConnectionSettings('{')).toThrow('JSON object');
    expect(() =>
      parseConnectionSettings(JSON.stringify({ ...settings, projectId: '../outside' })),
    ).toThrow('project ID');
  });

  it('reports safe errors without provider messages or URLs', () => {
    const failure = connectionError({
      code: 'permission-denied',
      message: 'synthetic private response',
    });
    expect(failure.category).toBe('access');
    expect(failure.message).not.toContain('synthetic private response');
    expect(connectionError({ code: 'auth/invalid-credential' }).category).toBe('sign-in');
    expect(connectionError(new Error('synthetic private response')).message).not.toContain(
      'synthetic private response',
    );
  });
});
