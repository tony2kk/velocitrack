import { db } from '../storage/database';
import { importBundle, requestRefresh } from '../storage/workspace';
import { readExportFiles } from './velociradar';
import { importMessage, type ImportCounts } from './feedback';

// Job deduplication is per tab; database transactions still protect writes across tabs.
const running = new Map<string, Promise<ImportCounts>>();
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
function runSourceImport(sourceId: string, load: () => Promise<ImportCounts>) {
  const existing = running.get(sourceId);
  if (existing) return existing;
  // Deferring work ensures the progress snapshot exists even if loading fails immediately.
  // Hold a shared origin-wide lock through download and commit so restore cannot race an import.
  const job = Promise.resolve().then(() =>
    typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('velocitrack-workspace-import', { mode: 'shared' }, load)
      : load(),
  );
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
  const completed: { name: string; counts: ImportCounts }[] = [];
  // Sources are independent; a denied account must not prevent another source refreshing.
  for (const source of sources.filter((item) => item.enabled && item.kind === 'caldwell')) {
    try {
      const counts = await refreshCaldwell(source.id);
      completed.push({ name: source.name, counts });
    } catch {
      /* The source keeps its actionable status. */
    }
  }
  // Read after completion so the caller can request only outstanding sign-in/file/error actions.
  const updated = await db.sources.toArray();
  const needsAttention = updated.some((source) => source.enabled && source.status !== 'ready');
  if (completed.length) {
    // One batch result prevents a later unchanged source from hiding earlier new imports.
    const total = completed.reduce(
      (sum, item) => ({
        series: sum.series + item.counts.series,
        shots: sum.shots + item.counts.shots,
      }),
      { series: 0, shots: 0 },
    );
    const message = importMessage(
      completed.length === 1 ? completed[0]!.name : 'Refreshed sources',
      total,
    );
    onMessage?.(`${message}${needsAttention ? ' Some sources still need attention.' : ''}`);
  }
  return needsAttention;
}
