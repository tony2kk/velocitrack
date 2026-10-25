// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BackupDialog } from '../src/components/BackupDialog';
import { prepareBackup, restoreBackup } from '../src/storage/backup';
import { defaultProfile } from '../src/domain/model';
import { backupCompatibility } from '../src/storage/backupVersions';

vi.mock('../src/storage/backup', async (original) => ({
  ...(await original<typeof import('../src/storage/backup')>()),
  prepareBackup: vi.fn(),
  restoreBackup: vi.fn(),
}));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Simulate a local file; byte/schema checks are exercised by the archive integration tests. */
function chooseFile() {
  fireEvent.change(screen.getByLabelText('Choose a backup to inspect'), {
    target: { files: [{ size: 1, arrayBuffer: async () => new ArrayBuffer(1) }] },
  });
}

it('shows legacy conversion impact before enabling replacement and clears stale approval on another file', async () => {
  const compatibility = backupCompatibility({ version: 1 });
  compatibility.changes.push('Missing preference added — Report paper: A4.');
  vi.mocked(prepareBackup)
    .mockResolvedValueOnce({
      workspace: {
        sources: [],
        series: [],
        shots: [],
        catalog: [],
        annotations: [],
        fieldDefinitions: [],
        tags: [],
        attachments: [],
        profile: defaultProfile(),
      },
      photos: new Map(),
      createdAt: '2026-01-01T00:00:00Z',
      compatibility,
    })
    .mockRejectedValueOnce(
      new Error('Backup data version 9 is not supported. Nothing was restored.'),
    );
  render(<BackupDialog refreshing={false} onClose={vi.fn()} onRestored={vi.fn()} />);
  chooseFile();
  await screen.findByRole('heading', { name: 'Compatibility' });
  expect(screen.getByText(/Not recorded \(legacy backup\)/).textContent).toContain(__APP_VERSION__);
  expect(screen.getByText(/converted for this app/).textContent).toContain('1 → 2');
  expect(screen.getByText(/Report paper: A4/)).toBeTruthy();
  const button = screen.getByRole('button', {
    name: 'Replace workspace from backup',
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(button.disabled).toBe(false);
  expect(restoreBackup).not.toHaveBeenCalled();
  await waitFor(() =>
    expect((screen.getByLabelText('Choose a backup to inspect') as HTMLInputElement).disabled).toBe(
      false,
    ),
  );
  chooseFile();
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'Compatibility' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Replace workspace from backup' })).toBeNull();
  expect(restoreBackup).not.toHaveBeenCalled();
});
