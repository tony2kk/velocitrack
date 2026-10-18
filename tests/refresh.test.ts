import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/storage/database';
import { createSource, saveProfile } from '../src/storage/workspace';
import { EMPTY_FILTERS } from '../src/domain/model';
import {
  getRefreshingSources,
  refreshCaldwell,
  refreshEnabledSources,
} from '../src/sources/refresh';

const { importOnline } = vi.hoisted(() => ({ importOnline: vi.fn() }));
vi.mock('../src/sources/caldwell/import', () => ({ importCaldwell: importOnline }));
beforeEach(async () => {
  await db.open();
  importOnline.mockReset();
});
afterEach(async () => {
  await db.delete();
});

describe('refresh coordination', () => {
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
    finish({ series: 2, shots: 4 });
    await first;
    expect(importOnline).toHaveBeenCalledTimes(1);
    expect(getRefreshingSources()).toEqual([]);
  });
});
