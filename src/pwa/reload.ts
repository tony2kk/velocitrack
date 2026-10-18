const UPDATE_TIMEOUT_MS = 10_000;

/**
 * Activate the waiting worker, or reload if another tab already activated it.
 * Resolve after requesting navigation; reject on a bounded timeout or activation failure.
 * Only the app shell changes: no workspace storage is cleared or migrated here.
 */
export function reloadApplication(
  serviceWorkers: ServiceWorkerContainer | undefined,
  pageUrl: string,
  reload: () => void,
): Promise<void> {
  if (!serviceWorkers) {
    reload();
    return Promise.resolve();
  }
  const container = serviceWorkers;

  return new Promise((resolve, reject) => {
    const previousController = container.controller;
    let finished = false;
    let waiting: ServiceWorker | null = null;

    /** Release both browser listeners on every outcome, including a timeout. */
    function cleanup() {
      clearTimeout(timeout);
      container.removeEventListener('controllerchange', onControllerChange);
      waiting?.removeEventListener('statechange', onWorkerStateChange);
    }

    /** Navigate once even when activation and controller-change events both arrive. */
    function complete() {
      if (finished) return;
      finished = true;
      cleanup();
      reload();
      resolve();
    }

    /** Leave the current app usable and let the UI offer a fresh retry. */
    function fail() {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('The update could not finish. Please try Reload again.'));
    }

    /** React only when a different active worker takes control of this page. */
    function onControllerChange() {
      if (container.controller && container.controller !== previousController) complete();
    }

    /** Cover first-install pages without a controller, and workers replaced during activation. */
    function onWorkerStateChange() {
      // A page opened before the first install may not receive controllerchange.
      if (waiting?.state === 'activated') complete();
      else if (waiting?.state === 'redundant') fail();
    }

    const timeout = setTimeout(fail, UPDATE_TIMEOUT_MS);
    // Listen before reading the registration: another tab may activate the update meanwhile.
    container.addEventListener('controllerchange', onControllerChange);
    void container
      .getRegistration(pageUrl)
      .then((registration) => {
        if (finished) return;
        waiting = registration?.waiting ?? null;
        if (!waiting) {
          complete();
          return;
        }
        waiting.addEventListener('statechange', onWorkerStateChange);
        onWorkerStateChange();
        if (!finished) waiting.postMessage({ type: 'SKIP_WAITING' });
      })
      .catch(fail);
  });
}
