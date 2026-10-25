// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { monitorUpdates, type UpdateMonitor } from '../src/pwa/updates';

const monitors: UpdateMonitor[] = [];

/** Simulate browser lifecycle events without network calls or actual cache/storage mutation. */
function setup(controlled = true) {
  const active = controlled ? Object.assign(new EventTarget(), { state: 'activated' }) : null;
  const workers = Object.assign(new EventTarget(), { controller: active });
  const registration = Object.assign(new EventTarget(), {
    active,
    installing: null as (EventTarget & { state: string }) | null,
    waiting: null as (EventTarget & { state: string }) | null,
    update: vi.fn().mockResolvedValue(undefined),
  });
  vi.stubGlobal('navigator', { onLine: true, serviceWorker: workers });
  const available = vi.fn();
  const monitor = monitorUpdates(registration as unknown as ServiceWorkerRegistration, available);
  monitors.push(monitor);
  return { registration, workers, available, monitor };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
});
afterEach(() => {
  monitors.splice(0).forEach((monitor) => monitor.stop());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('application update discovery', () => {
  it('checks without reloading, polls visible tabs and checks on resume with a focus throttle', async () => {
    const test = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(test.registration.update).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('focus'));
    expect(test.registration.update).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60_000);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(test.registration.update).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(240_000);
    expect(test.registration.update).toHaveBeenCalledTimes(3);
    expect(test.available).not.toHaveBeenCalled();
  });

  it('skips hidden/offline tabs and recovers after a server failure without unhandled errors', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const test = setup();
    expect(test.registration.update).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    expect(await test.monitor.check()).toBe('offline');
    expect(test.registration.update).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    test.registration.update.mockRejectedValueOnce(new Error('Synthetic unavailable server'));
    expect(await test.monitor.check()).toBe('failed');
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(test.registration.update).toHaveBeenCalledTimes(2);
  });

  it('detects waiting/rapid external updates natively and allows Later to be overridden by a manual check', async () => {
    const test = setup();
    await vi.advanceTimersByTimeAsync(0);
    const update = Object.assign(new EventTarget(), { state: 'installing' });
    test.registration.installing = update;
    test.registration.dispatchEvent(new Event('updatefound'));
    expect(await test.monitor.check()).toBe('installing');
    update.state = 'installed';
    test.registration.waiting = update;
    test.registration.installing = null;
    update.dispatchEvent(new Event('statechange'));
    expect(test.available).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('focus'));
    expect(test.available).toHaveBeenCalledOnce();
    expect(await test.monitor.check()).toBe('available');
    expect(test.available).toHaveBeenCalledTimes(2);
    expect(test.registration.update).toHaveBeenCalledOnce();
  });

  it('does not label a first install as an update, but offers reload when another tab activates a later worker', async () => {
    const test = setup(false);
    await vi.advanceTimersByTimeAsync(0);
    const first = Object.assign(new EventTarget(), { state: 'installing' });
    test.registration.installing = first;
    test.registration.dispatchEvent(new Event('updatefound'));
    first.state = 'installed';
    first.dispatchEvent(new Event('statechange'));
    expect(test.available).not.toHaveBeenCalled();
    test.workers.controller = first;
    test.workers.dispatchEvent(new Event('controllerchange'));
    expect(test.available).not.toHaveBeenCalled();
    const later = Object.assign(new EventTarget(), { state: 'activated' });
    test.workers.controller = later;
    test.workers.dispatchEvent(new Event('controllerchange'));
    expect(test.available).toHaveBeenCalledOnce();
    expect(await test.monitor.check()).toBe('available');
  });

  it('deduplicates overlapping checks and cleans up timers/listeners even while a request is pending', async () => {
    const test = setup();
    await vi.advanceTimersByTimeAsync(0);
    let finish!: () => void;
    test.registration.update.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const first = test.monitor.check();
    const second = test.monitor.check();
    expect(test.registration.update).toHaveBeenCalledTimes(2);
    test.monitor.stop();
    test.registration.waiting = Object.assign(new EventTarget(), { state: 'installed' });
    finish();
    expect(await first).toBe('failed');
    expect(await second).toBe('failed');
    await vi.advanceTimersByTimeAsync(600_000);
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    expect(test.registration.update).toHaveBeenCalledTimes(2);
    expect(test.available).not.toHaveBeenCalled();
  });
});
