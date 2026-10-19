import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/storage/database';
import { createSource, saveProfile } from '../src/storage/workspace';
import { EMPTY_FILTERS } from '../src/domain/model';
import {
  getRefreshingSources,
  refreshCaldwell,
  refreshEnabledSources,
  subscribeToRefresh,
} from '../src/sources/refresh';

const { importOnline } = vi.hoisted(() => ({ importOnline: vi.fn() }));
vi.mock('../src/sources/caldwell/import', () => ({ importCaldwell: importOnline }));
beforeEach(async () => {
  await db.open();
  importOnline.mockReset();
});
afterEach(async () => {
  await db.delete();
  vi.unstubAllGlobals();
});

describe('refresh coordination', () => {
  it('holds an origin-wide shared lock until the import finishes', async () => {
    let locked = false;
    const request = vi.fn(
      async (_name: string, options: { mode: string }, callback: () => Promise<unknown>) => {
        expect(options.mode).toBe('shared');
        locked = true;
        try {
          return await callback();
        } finally {
          locked = false;
        }
      },
    );
    vi.stubGlobal('navigator', { locks: { request } });
    importOnline.mockImplementation(async () => {
      expect(locked).toBe(true);
      return { series: 0, shots: 0 };
    });
    await refreshCaldwell('synthetic-lock-source');
    expect(locked).toBe(false);
    expect(request).toHaveBeenCalledOnce();
  });
  it('combines new records across the batch instead of showing the last unchanged result', async () => {
    await db.sources.bulkAdd([
      { ...createSource('New records', true, 'caldwell'), id: 'a' },
      { ...createSource('Unchanged', true, 'caldwell'), id: 'b' },
    ]);
    importOnline.mockImplementation(async (id: string) => {
      await db.sources.update(id, { status: 'ready' });
      return { series: 0, shots: id === 'a' ? 1 : 0 };
    });
    const message = vi.fn();
    expect(await refreshEnabledSources(message)).toBe(false);
    expect(message).toHaveBeenCalledExactlyOnceWith('Refreshed sources: 1 new shot imported.');
  });
  it('refreshes all enabled types regardless of filters and continues after one account fails', async () => {
    const file = { ...createSource('File', true), status: 'ready' as const };
    const first = createSource('First account', true, 'caldwell');
    const second = createSource('Second account', true, 'caldwell');
    const disabled = { ...createSource('Disabled', true, 'caldwell'), enabled: false };
    await db.sources.bulkAdd([file, first, second, disabled]);
    await saveProfile({ filters: { ...EMPTY_FILTERS, sourceIds: [file.id] } });
    importOnline
      .mockRejectedValueOnce(new Error('Synthetic unavailable source'))
      .mockResolvedValueOnce({ series: 2, shots: 4 });
    await refreshEnabledSources();
    expect(importOnline.mock.calls.map(([id]) => id).sort()).toEqual([first.id, second.id].sort());
    expect((await db.sources.get(file.id))?.status).toBe('needs-files');
    expect(getRefreshingSources()).toEqual([]);
  });

  it('shares one in-flight refresh per source and clears progress after completion', async () => {
    let finish!: (counts: { series: number; shots: number }) => void;
    importOnline.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const first = refreshCaldwell('synthetic-source');
    const duplicate = refreshCaldwell('synthetic-source');
    expect(duplicate).toBe(first);
    expect(getRefreshingSources()).toEqual(['synthetic-source']);
    await vi.waitFor(() => expect(importOnline).toHaveBeenCalledOnce());
    finish({ series: 2, shots: 4 });
    await first;
    expect(importOnline).toHaveBeenCalledTimes(1);
    expect(getRefreshingSources()).toEqual([]);
  });

  it('clears progress after failure and publishes the next source while the batch continues', async () => {
    const first = { ...createSource('First', true, 'caldwell'), id: 'a' };
    const second = { ...createSource('Second', true, 'caldwell'), id: 'b' };
    await db.sources.bulkAdd([first, second]);
    const progress: string[][] = [];
    const unsubscribe = subscribeToRefresh(() => progress.push(getRefreshingSources()));
    importOnline
      .mockRejectedValueOnce(new Error('Synthetic failure'))
      .mockImplementationOnce(async () => {
        await db.sources.update('b', { status: 'ready' });
        return { series: 1, shots: 2 };
      });
    const message = vi.fn();
    try {
      expect(await refreshEnabledSources(message)).toBe(true);
      expect(progress).toEqual([['a'], [], ['b'], []]);
      expect(message).toHaveBeenCalledWith(
        'Second: 1 new series and 2 new shots imported. Some sources still need attention.',
      );
    } finally {
      unsubscribe();
    }
  });
});
