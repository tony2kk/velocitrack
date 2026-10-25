import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import {
  createBackup,
  MAX_BACKUP_BYTES,
  prepareBackup,
  restoreBackup,
  type PreparedBackup,
} from '../storage/backup';
import { db } from '../storage/database';

/** Offer download and a validated replacement preview; never restore merely on file selection. */
export function BackupDialog({
  refreshing,
  onClose,
  onRestored,
}: {
  refreshing: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [prepared, setPrepared] = useState<PreparedBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [storage, setStorage] = useState<StorageEstimate>();
  useEffect(() => {
    void navigator.storage
      ?.estimate()
      .then(setStorage)
      .catch(() => {});
  }, []);
  /** Report errors while leaving the current workspace available after any failed operation. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'The operation failed. Check available storage.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Backup / Restore"
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <p>
        Save a ZIP containing your measurements, catalogs, profile, custom fields, tags and original
        photos. Passwords and authentication tokens are not included.
      </p>
      <p className="muted">
        Backups contain private workspace data and are not encrypted. Keep them somewhere safe.
        Maximum archive and expanded size: 256 MiB. Close other workspace tabs before restoring.
      </p>
      {storage && (
        <p className="notice">
          Browser storage: approximately {((storage.usage ?? 0) / 1024 / 1024).toFixed(1)} MiB used
          of {((storage.quota ?? 0) / 1024 / 1024).toFixed(0)} MiB available quota.
        </p>
      )}
      <button
        className="primary"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const bytes = await createBackup();
            const url = URL.createObjectURL(
              new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = `velocitrack-${new Date().toISOString().slice(0, 10)}.zip`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            setStatus('Backup download requested. Keep the ZIP before replacing any data.');
          })
        }
      >
        Download backup ZIP
      </button>
      <label className={`file-picker ${busy ? 'disabled' : ''}`}>
        Choose a backup to inspect
        <input
          type="file"
          accept=".zip,application/zip"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            setPrepared(null);
            setConfirmed(false);
            if (file)
              void run(async () => {
                if (file.size > MAX_BACKUP_BYTES) throw new Error('Choose a ZIP up to 256 MiB.');
                setPrepared(await prepareBackup(new Uint8Array(await file.arrayBuffer())));
              });
          }}
        />
      </label>
      {prepared && (
        <section className="restore-preview">
          <h3>Verified backup · {new Date(prepared.createdAt).toLocaleString('en-GB')}</h3>
          <p>
            {prepared.workspace.sources.length} sources · {prepared.workspace.series.length} series
            · {prepared.workspace.shots.length} shots · {prepared.workspace.fieldDefinitions.length}{' '}
            custom fields · {prepared.workspace.tags.length} tags ·{' '}
            {prepared.workspace.attachments.length} photos
          </p>
          <div className="notice" aria-label="Backup compatibility">
            <h4>Compatibility</h4>
            <p>
              Backup app: {prepared.compatibility.appVersion ?? 'Not recorded (legacy backup)'}
              {' · '}Current app: {prepared.compatibility.currentAppVersion}
            </p>
            <p>
              Archive format: {prepared.compatibility.formatVersion}
              {' · '}Data version: {prepared.compatibility.dataVersion}
              {prepared.compatibility.dataVersion !== prepared.compatibility.targetDataVersion
                ? ` → ${prepared.compatibility.targetDataVersion} (converted for this app)`
                : ' (compatible)'}
            </p>
            {prepared.compatibility.notices.map((notice) => (
              <p key={notice}>{notice}</p>
            ))}
            {prepared.compatibility.changes.length > 0 && (
              <>
                <h4>Changes during restore</h4>
                <ul>
                  {prepared.compatibility.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <p>
            This replaces the entire local workspace. It does not merge data or change Caldwell
            cloud data. Connected sources will need sign-in again.
          </p>
          <label className="check-field">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I have kept a backup of the current workspace and want to replace it.
          </label>
          <button
            className="danger-button"
            disabled={!confirmed || busy || refreshing}
            onClick={() =>
              void run(async () => {
                if (!navigator.locks)
                  throw new Error('Restore requires a browser supporting Web Locks.');
                await navigator.locks.request(
                  'velocitrack-workspace-import',
                  { mode: 'exclusive', ifAvailable: true },
                  async (lock) => {
                    if (!lock)
                      throw new Error(
                        'An import is running in another tab. Wait for it to finish.',
                      );
                    const sources = await db.sources.toArray();
                    const { forgetSession } = await import('../sources/caldwell/session');
                    for (const source of sources.filter(
                      (source) => source.kind === 'caldwell' && source.connection,
                    ))
                      await forgetSession(source, true);
                    await restoreBackup(prepared);
                  },
                );
                onRestored();
              })
            }
          >
            Replace workspace from backup
          </button>
        </section>
      )}
      {refreshing && <p className="notice">Wait for refresh to finish before restoring.</p>}
      {busy && <p role="status">Processing local archive…</p>}
      {status && <p role="status">{status}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </Modal>
  );
}
