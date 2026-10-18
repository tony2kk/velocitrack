import { db } from '../storage/database';
import { requestRefresh } from '../storage/workspace';

// Job deduplication is per tab; database transactions still protect writes across tabs.
const running = new Map<string, Promise<{ series: number; shots: number }>>();
const listeners = new Set<() => void>();
let activeIds: string[] = [];

/** Replace the snapshot only when jobs change, as required by React's external-store subscription. */
function notify() {
  activeIds = [...running.keys()];
  for (const listener of listeners) listener();
}

/** Return a stable snapshot between notifications to avoid unnecessary render loops. */
export const getRefreshingSources = () => activeIds;
/** Subscribe to source progress; the returned cleanup releases the component's listener. */
export function subscribeToRefresh(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Share one cloud import per source and release its busy state on both success and failure. */
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
  // The caller owns the original rejection; the cleanup chain must not create an unhandled one.
  void job
    .finally(() => {
      running.delete(sourceId);
      notify();
    })
    .catch(() => {});
  return job;
}

/** Refresh all enabled sources regardless of view filters, continuing after individual failures. */
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
