import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/storage/database';
import { createSource, importBundle, loadWorkspace, saveProfile } from '../src/storage/workspace';
import { parseVelociRadarRecords } from '../src/sources/velociradar';
import { syntheticExport } from './fixtures/synthetic';
import { importCaldwell } from '../src/sources/caldwell/import';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null },
  read: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mocks.signIn,
  signOut: mocks.signOut,
}));
vi.mock('../src/sources/caldwell/session', () => ({
  getSession: async () => ({ auth: mocks.auth, database: {} }),
}));
vi.mock('../src/sources/caldwell/read', () => ({
  createCollectionReader: () => vi.fn(),
  readAccount: mocks.read,
}));

const bundle = () => {
  const fixture = syntheticExport();
  return parseVelociRadarRecords(fixture.strings, fixture.shots);
};
beforeEach(async () => {
  await db.open();
  await saveProfile({
    caldwellConnection: {
      projectId: 'synthetic-project',
      apiKey: 'synthetic-key-for-tests-only',
    },
  });
  mocks.auth.currentUser = { uid: 'synthetic-owner' };
  mocks.read.mockReset().mockResolvedValue(bundle());
  mocks.signIn.mockReset();
  mocks.signOut.mockReset();
});
afterEach(async () => {
  await db.delete();
});

describe('Caldwell import orchestration', () => {
  it('binds the source to the signed-in owner and refreshes without duplicate measurements', async () => {
    const source = createSource('Synthetic online source', true, 'caldwell');
    await db.sources.add(source);
    await importCaldwell(source.id);
    await importCaldwell(source.id);
    expect((await db.sources.get(source.id))?.accountId).toBe('synthetic-owner');
    expect(await db.shots.count()).toBe(4);
    expect(await db.series.count()).toBe(2);
    expect(mocks.read).toHaveBeenCalledWith('synthetic-owner', expect.any(Function));
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('requests sign-in without reading data when no session exists', async () => {
    const source = createSource('Synthetic source', true, 'caldwell');
    await db.sources.add(source);
    mocks.auth.currentUser = null;
    await expect(importCaldwell(source.id)).rejects.toThrow('Sign in to refresh');
    expect((await db.sources.get(source.id))?.status).toBe('needs-sign-in');
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('refuses to mix another account into an existing source before reading any measurements', async () => {
    const source = {
      ...createSource('Synthetic source', true, 'caldwell'),
      accountId: 'different-synthetic-owner',
    };
    await db.sources.add(source);
    await expect(importCaldwell(source.id)).rejects.toThrow('different account');
    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
    expect((await db.sources.get(source.id))?.accountId).toBe('different-synthetic-owner');
  });

  it('keeps the previous import and last-success date after a network failure', async () => {
    const source = createSource('Synthetic source', true, 'caldwell');
    await db.sources.add(source);
    await importBundle(source.id, bundle());
    const before = await loadWorkspace();
    mocks.read.mockRejectedValue({
      code: 'unavailable',
      message: 'synthetic response that must not be saved',
    });
    await expect(importCaldwell(source.id)).rejects.toThrow('could not be reached');
    const after = await loadWorkspace();
    expect(after.series).toEqual(before.series);
    expect(after.shots).toEqual(before.shots);
    expect(after.sources[0]?.lastSuccessAt).toBe(before.sources[0]?.lastSuccessAt);
    expect(after.sources[0]?.error).not.toContain('synthetic response');
  });

  it('does not commit a fetched bundle if the session changes while downloading', async () => {
    const source = createSource('Synthetic source', true, 'caldwell');
    await db.sources.add(source);
    mocks.read.mockImplementation(async () => {
      mocks.auth.currentUser = null;
      return bundle();
    });
    await expect(importCaldwell(source.id)).rejects.toThrow('session changed');
    expect(await db.series.count()).toBe(0);
    expect(await db.catalog.count()).toBe(0);
  });

  it('rolls back the cloud import when automatic catalogs are disabled and a name is missing', async () => {
    const source = createSource('Synthetic source', false, 'caldwell');
    await db.sources.add(source);
    await expect(importCaldwell(source.id)).rejects.toThrow('not in the firearms catalog');
    expect(await db.shots.count()).toBe(0);
    expect(await db.catalog.count()).toBe(0);
  });
});
