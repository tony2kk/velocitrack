import { afterEach, describe, expect, it, vi } from 'vitest';
import { reloadApplication } from '../src/pwa/reload';

const pageUrl = 'https://example.test/velocitrack/';

function setup() {
  const events = new EventTarget();
  const waiting = Object.assign(new EventTarget(), { state: 'installed', postMessage: vi.fn() });
  const registration = { waiting };
  const serviceWorkers = Object.assign(events, {
    controller: {},
    getRegistration: vi.fn().mockResolvedValue(registration),
  });
  const reload = vi.fn();
  const removeListener = vi.spyOn(serviceWorkers, 'removeEventListener');
  const start = () =>
    reloadApplication(serviceWorkers as unknown as ServiceWorkerContainer, pageUrl, reload);
  const activate = () => {
    serviceWorkers.controller = {};
    serviceWorkers.dispatchEvent(new Event('controllerchange'));
  };
  return { waiting, serviceWorkers, reload, removeListener, start, activate };
}

afterEach(() => vi.useRealTimers());

describe('application update reload', () => {
  it('activates a waiting update and reloads once without relying on Workbox event metadata', async () => {
    const test = setup();
    const update = test.start();
    await Promise.resolve();
    expect(test.serviceWorkers.getRegistration).toHaveBeenCalledWith(pageUrl);
    expect(test.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(test.reload).not.toHaveBeenCalled();
    test.activate();
    await update;
    test.activate();
    expect(test.reload).toHaveBeenCalledTimes(1);
    expect(test.removeListener).toHaveBeenCalled();
  });

  it('reloads a stale prompt when another tab has already activated the update', async () => {
    const test = setup();
    test.serviceWorkers.getRegistration.mockResolvedValue({ waiting: null });
    await test.start();
    expect(test.reload).toHaveBeenCalledTimes(1);
    expect(test.waiting.postMessage).not.toHaveBeenCalled();
  });

  it('reloads after activation even when the page has no controllerchange event', async () => {
    const test = setup();
    const update = test.start();
    await Promise.resolve();
    test.waiting.state = 'activated';
    test.waiting.dispatchEvent(new Event('statechange'));
    await update;
    expect(test.reload).toHaveBeenCalledTimes(1);
  });

  it('reports a worker replaced during activation without reloading old assets', async () => {
    const test = setup();
    const update = test.start();
    await Promise.resolve();
    test.waiting.state = 'redundant';
    test.waiting.dispatchEvent(new Event('statechange'));
    await expect(update).rejects.toThrow('Please try Reload again');
    expect(test.reload).not.toHaveBeenCalled();
  });

  it('handles activation while the registration lookup is still pending', async () => {
    const test = setup();
    let finishLookup!: (registration: { waiting: typeof test.waiting }) => void;
    test.serviceWorkers.getRegistration.mockReturnValue(
      new Promise((resolve) => (finishLookup = resolve)),
    );
    const update = test.start();
    test.activate();
    await update;
    finishLookup({ waiting: test.waiting });
    await Promise.resolve();
    expect(test.reload).toHaveBeenCalledTimes(1);
    expect(test.waiting.postMessage).not.toHaveBeenCalled();
  });

  it('rejects an unresponsive worker and removes listeners so a late event cannot reload', async () => {
    vi.useFakeTimers();
    const test = setup();
    const result = expect(test.start()).rejects.toThrow('Please try Reload again');
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    test.activate();
    expect(test.reload).not.toHaveBeenCalled();
    expect(test.removeListener).toHaveBeenCalled();
  });

  it('reports registration errors and allows the next attempt to succeed', async () => {
    const test = setup();
    test.serviceWorkers.getRegistration.mockRejectedValueOnce(
      new Error('Synthetic browser failure'),
    );
    await expect(test.start()).rejects.toThrow('Please try Reload again');
    expect(test.reload).not.toHaveBeenCalled();
    test.serviceWorkers.getRegistration.mockResolvedValue({ waiting: null });
    await test.start();
    expect(test.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads normally when the registration or service-worker API is unavailable', async () => {
    const test = setup();
    test.serviceWorkers.getRegistration.mockResolvedValue(undefined);
    await test.start();
    await reloadApplication(undefined, pageUrl, test.reload);
    expect(test.reload).toHaveBeenCalledTimes(2);
  });
});
