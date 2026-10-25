// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpdateNotice } from '../src/components/UpdateNotice';
import { reloadApplication } from '../src/pwa/reload';

const state = vi.hoisted(() => ({
  registration: undefined as ServiceWorkerRegistration | undefined,
  check: vi.fn(),
  stop: vi.fn(),
  available: undefined as (() => void) | undefined,
}));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: ({
    onRegisteredSW,
  }: {
    onRegisteredSW: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
  }) => {
    const needRefresh = useState(false);
    useState(() => {
      queueMicrotask(() => onRegisteredSW('/sw.js', state.registration));
    });
    return { needRefresh };
  },
}));
vi.mock('../src/pwa/updates', () => ({
  monitorUpdates: (_registration: unknown, available: () => void) => {
    state.available = available;
    return { check: state.check, stop: state.stop };
  },
}));
vi.mock('../src/pwa/reload', () => ({ reloadApplication: vi.fn().mockResolvedValue(undefined) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.available = undefined;
});

describe('footer update controls', () => {
  it('reports a failed check, retries and explicitly offers Reload without activating on discovery', async () => {
    state.registration = {} as ServiceWorkerRegistration;
    state.check.mockResolvedValueOnce('failed').mockImplementationOnce(async () => {
      state.available?.();
      return 'available';
    });
    render(<UpdateNotice />);
    await waitFor(() => expect(state.available).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Check for application updates' }));
    await screen.findByText(/Could not check for updates/);
    fireEvent.click(screen.getByRole('button', { name: 'Check for application updates' }));
    await screen.findByRole('button', { name: 'Reload' });
    expect(reloadApplication).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull();
    expect(reloadApplication).not.toHaveBeenCalled();
  });
  it('shows a no-update result instead of silently finishing a manual check', async () => {
    state.registration = {} as ServiceWorkerRegistration;
    state.check.mockResolvedValue('current');
    render(<UpdateNotice />);
    await waitFor(() => expect(state.available).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Check for application updates' }));
    await screen.findByText('No new version found.');
    cleanup();
    expect(state.stop).toHaveBeenCalledOnce();
  });
});
