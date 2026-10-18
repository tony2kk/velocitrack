import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createSource } from '../src/storage/workspace';
import { forgetSession, getSession } from '../src/sources/caldwell/session';

describe('Firebase SDK session lifecycle', () => {
  it('initializes the real modular SDK once per source without a login or network read', async () => {
    const source = {
      ...createSource('Synthetic source', true, 'caldwell'),
      connection: { projectId: 'synthetic-project', apiKey: 'synthetic-key-for-unit-tests' },
    };
    try {
      const [first, second] = await Promise.all([
        getSession(source, false),
        getSession(source, false),
      ]);
      expect(first).toBe(second);
      expect(first.auth.currentUser).toBeNull();
      expect(first.auth.app).toBe(first.app);
      expect(first.database.app).toBe(first.app);
      await forgetSession(source, false);
      const fresh = await getSession(source, false);
      expect(fresh).not.toBe(first);
      expect(fresh.auth.currentUser).toBeNull();
    } finally {
      await forgetSession(source, false);
    }
  });

  it('requires local connection settings before initializing an account', async () => {
    await expect(
      getSession(createSource('Synthetic source', true, 'caldwell'), false),
    ).rejects.toThrow('connection settings');
  });
});
