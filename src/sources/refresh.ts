import { db } from '../storage/database';
import { importBundle, requestRefresh } from '../storage/workspace';
import { readExportFiles } from './velociradar';

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

/** Share one import per source and release its busy state on both success and failure. */
function runSourceImport(sourceId: string, load: () => Promise<{ series: number; shots: number }>) {
  const existing = running.get(sourceId);
  if (existing) return existing;
  // Deferring work ensures the progress snapshot exists even if loading fails immediately.
  const job = Promise.resolve().then(load);
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

/** Track local parsing and atomic import through the same progress UI as online downloads. */
export function refreshFiles(sourceId: string, files: File[]) {
  return runSourceImport(sourceId, async () =>
    importBundle(sourceId, await readExportFiles(files)),
  );
}

/** Load the cloud adapter on demand and reuse any in-flight request for this source. */
export function refreshCaldwell(
  sourceId: string,
  credentials?: { email: string; password: string },
) {
  return runSourceImport(sourceId, async () => {
    const { importCaldwell } = await import('./caldwell/import');
    return importCaldwell(sourceId, credentials);
  });
}

/** Refresh all enabled sources regardless of view filters, continuing after individual failures. */
export async function refreshEnabledSources(onMessage?: (message: string) => void) {
  await requestRefresh();
  const sources = await db.sources.toArray();
  // Sources are independent; a denied account must not prevent another source refreshing.
  for (const source of sources.filter((item) => item.enabled && item.kind === 'caldwell')) {
    try {
      const counts = await refreshCaldwell(source.id);
      onMessage?.(`${source.name}: ${counts.series} series and ${counts.shots} shots imported.`);
    } catch {
      /* The source keeps its actionable status. */
    }
  }
  // Read after completion so the caller can request only outstanding sign-in/file/error actions.
  const updated = await db.sources.toArray();
  return updated.some((source) => source.enabled && source.status !== 'ready');
}
