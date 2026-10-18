import { db } from '../storage/database';
import { requestRefresh } from '../storage/workspace';

const running = new Map<string, Promise<{ series: number; shots: number }>>();
const listeners = new Set<() => void>();
let activeIds: string[] = [];

function notify() {
  activeIds = [...running.keys()];
  for (const listener of listeners) listener();
}

export const getRefreshingSources = () => activeIds;
export function subscribeToRefresh(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function refreshCaldwell(
  sourceId: string,
  credentials?: { email: string; password: string },
) {
  const existing = running.get(sourceId);
  if (existing) return existing;
  const job = (async () => {
    const { importCaldwell } = await import('./caldwell/import');
    return importCaldwell(sourceId, credentials);
  })();
  running.set(sourceId, job);
  notify();
  void job
    .finally(() => {
      running.delete(sourceId);
      notify();
    })
    .catch(() => {});
  return job;
}

export async function refreshEnabledSources() {
  await requestRefresh();
  const sources = await db.sources.toArray();
  // Sources are independent; a denied account must not prevent another source refreshing.
  for (const source of sources.filter((item) => item.enabled && item.kind === 'caldwell')) {
    try {
      await refreshCaldwell(source.id);
    } catch {
      /* The source keeps its actionable status. */
    }
  }
}
