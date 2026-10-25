const CHECK_INTERVAL_MS = 5 * 60_000;
const RESUME_THROTTLE_MS = 60_000;

/** Results describe update discovery only; activation always needs the user's Reload action. */
export type UpdateCheckResult = 'available' | 'current' | 'installing' | 'offline' | 'failed';

/** One page's update checks and listeners; stop releases resources without unregistering its worker. */
export interface UpdateMonitor {
  check: () => Promise<UpdateCheckResult>;
  stop: () => void;
}

/**
 * Check on registration, visible-page resume, reconnect and every five visible minutes.
 * Observe native worker state as well as Workbox so rapid/external updates still show a prompt.
 * This module never reloads, activates a worker, clears caches or touches workspace storage.
 */
export function monitorUpdates(
  registration: ServiceWorkerRegistration,
  onAvailable: () => void,
): UpdateMonitor {
  let stopped = false;
  let pending: Promise<UpdateCheckResult> | null = null;
  let lastCheck = -Infinity;
  let lastNotified: ServiceWorker | null = null;
  let installing: ServiceWorker | null = null;
  let controller = navigator.serviceWorker?.controller;
  let activatedElsewhere = false;

  /** Notify once per worker automatically; an explicit check can redisplay a dismissed prompt. */
  function notify(worker: ServiceWorker, manual = false) {
    if (stopped || (!manual && worker === lastNotified)) return;
    lastNotified = worker;
    onAvailable();
  }

  /** A first installation enables offline use but is not an update to an already running app. */
  function inspect(manual = false): boolean {
    if (registration.waiting && (registration.active || navigator.serviceWorker?.controller)) {
      notify(registration.waiting, manual);
      return true;
    }
    if (activatedElsewhere) {
      if (manual && !stopped) onAvailable();
      return true;
    }
    return false;
  }

  /** A native installed update remains detectable even if Workbox classifies it as external. */
  function onInstalled() {
    if (installing?.state === 'installed' && (registration.active || controller))
      notify(installing);
  }

  /** Follow the latest installing worker; replacing one must not accumulate listeners. */
  function onUpdateFound() {
    installing?.removeEventListener('statechange', onInstalled);
    installing = registration.installing;
    installing?.addEventListener('statechange', onInstalled);
    onInstalled();
  }

  /** Another tab can activate an update; offer this tab a reload without navigating its open form. */
  function onControllerChange() {
    const next = navigator.serviceWorker?.controller;
    if (controller && next && next !== controller) {
      activatedElsewhere = true;
      notify(next);
    }
    controller = next;
  }

  /** Serialize requests and skip a redundant download while installation is already in progress. */
  async function check(manual: boolean): Promise<UpdateCheckResult> {
    if (stopped) return 'failed';
    if (inspect(manual)) return 'available';
    if (!navigator.onLine) return 'offline';
    if (pending) return pending;
    if (registration.installing) return 'installing';
    if (!manual && Date.now() - lastCheck < RESUME_THROTTLE_MS) return 'current';
    lastCheck = Date.now();
    pending = (async (): Promise<UpdateCheckResult> => {
      try {
        // update() bypasses the main worker's HTTP cache, including Pages' normal cache lifetime.
        await registration.update();
        if (stopped) return 'failed';
        if (inspect(manual)) return 'available';
        return registration.installing ? 'installing' : 'current';
      } catch {
        // Offline/server failures leave the old app usable; the next check retries normally.
        return 'failed';
      } finally {
        pending = null;
      }
    })();
    return pending;
  }

  /** Background tabs do not poll; becoming visible triggers a throttled fresh check. */
  function resume() {
    if (document.visibilityState === 'visible') void check(false);
  }

  /** Reconnecting deserves an immediate retry, even when the last failed check was recent. */
  function reconnect() {
    lastCheck = -Infinity;
    resume();
  }

  registration.addEventListener('updatefound', onUpdateFound);
  navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
  window.addEventListener('focus', resume);
  window.addEventListener('online', reconnect);
  document.addEventListener('visibilitychange', resume);
  const interval = window.setInterval(resume, CHECK_INTERVAL_MS);
  onUpdateFound();
  resume();

  return {
    check: () => check(true),
    stop: () => {
      stopped = true;
      window.clearInterval(interval);
      registration.removeEventListener('updatefound', onUpdateFound);
      installing?.removeEventListener('statechange', onInstalled);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', resume);
    },
  };
}
