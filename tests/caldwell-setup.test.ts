import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/storage/database';
import { createSource, saveProfile } from '../src/storage/workspace';
import { loadLocalConnection, prepareCaldwellSource } from '../src/sources/caldwell/setup';

const settings = { projectId: 'synthetic-project', apiKey: 'synthetic-key-for-tests-only' };
beforeEach(async () => {
  await db.open();
});
afterEach(async () => {
  await db.delete();
  vi.unstubAllGlobals();
});

describe('automatic local Caldwell setup', () => {
  it('prepares a new source and shares settings through the local profile without changing preferences', async () => {
    await saveProfile({ nickname: 'Synthetic profile', rememberSignIn: false });
    const source = createSource('First', true, 'caldwell');
    await db.sources.add(source);
    const load = vi.fn().mockResolvedValue(settings);
    const ready = await prepareCaldwellSource(source.id, db, load);
    expect(ready).toMatchObject({ connection: settings, status: 'needs-sign-in' });
    expect(ready.accountId).toBeUndefined();
    expect(await db.profiles.get('local')).toMatchObject({
      nickname: 'Synthetic profile',
      rememberSignIn: false,
      caldwellConnection: settings,
    });
    const second = createSource('Second', true, 'caldwell');
    await db.sources.add(second);
    expect((await prepareCaldwellSource(second.id, db, load)).connection).toEqual(settings);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing browser setup without downloading configuration again', async () => {
    await db.sources.add({ ...createSource('Existing', true, 'caldwell'), connection: settings });
    const source = createSource('New', true, 'caldwell');
    await db.sources.add(source);
    const load = vi.fn();
    expect((await prepareCaldwellSource(source.id, db, load)).connection).toEqual(settings);
    expect(load).not.toHaveBeenCalled();
  });

  it('never replaces an already configured account source', async () => {
    const source = {
      ...createSource('Existing', true, 'caldwell'),
      connection: settings,
      accountId: 'synthetic-owner',
    };
    await db.sources.add(source);
    await saveProfile({ caldwellConnection: { ...settings, projectId: 'another-project' } });
    const load = vi.fn();
    expect(await prepareCaldwellSource(source.id, db, load)).toEqual(source);
    expect(load).not.toHaveBeenCalled();
  });

  it('does not resurrect a source deleted while configuration was loading', async () => {
    const source = createSource('Temporary', true, 'caldwell');
    await db.sources.add(source);
    const load = async () => {
      await db.sources.delete(source.id);
      return settings;
    };
    await expect(prepareCaldwellSource(source.id, db, load)).rejects.toThrow('no longer exists');
    expect(await db.sources.count()).toBe(0);
    expect(await db.profiles.count()).toBe(0);
  });

  it('keeps existing source state intact when setup cannot load', async () => {
    const source = createSource('Unavailable', true, 'caldwell');
    await db.sources.add(source);
    await expect(
      prepareCaldwellSource(source.id, db, async () => {
        throw new Error('Synthetic failure');
      }),
    ).rejects.toThrow();
    expect(await db.sources.get(source.id)).toEqual(source);
    expect(await db.profiles.count()).toBe(0);
  });

  it('fetches same-origin settings without credentials and discards unrelated fields', async () => {
    vi.stubGlobal('location', { hostname: '127.0.0.1' });
    const fetchSettings = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...settings,
          password: 'synthetic-discarded-value',
          endpoint: 'https://example.invalid',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchSettings);
    expect(await loadLocalConnection()).toEqual(settings);
    expect(fetchSettings).toHaveBeenCalledWith(
      expect.stringContaining('local-caldwell-settings'),
      expect.objectContaining({
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        mode: 'same-origin',
      }),
    );
  });

  it('does not request local configuration from a public host', async () => {
    vi.stubGlobal('location', { hostname: 'example.test' });
    const fetchSettings = vi.fn();
    vi.stubGlobal('fetch', fetchSettings);
    await expect(loadLocalConnection()).rejects.toThrow('unavailable in this installation');
    expect(fetchSettings).not.toHaveBeenCalled();
  });

  it('reports a safe setup error instead of an HTTP response body', async () => {
    vi.stubGlobal('location', { hostname: 'localhost' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('synthetic internal details', { status: 503 })),
    );
    await expect(loadLocalConnection()).rejects.toThrow('unavailable in this installation');
  });
});
