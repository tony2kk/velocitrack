const UPDATE_TIMEOUT_MS = 10_000;

/** Activate the waiting worker, or reload if another tab already activated it. */
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

    function cleanup() {
      clearTimeout(timeout);
      container.removeEventListener('controllerchange', onControllerChange);
      waiting?.removeEventListener('statechange', onWorkerStateChange);
    }

    function complete() {
      if (finished) return;
      finished = true;
      cleanup();
      reload();
      resolve();
    }

    function fail() {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('The update could not finish. Please try Reload again.'));
    }

    function onControllerChange() {
      if (container.controller && container.controller !== previousController) complete();
    }

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
