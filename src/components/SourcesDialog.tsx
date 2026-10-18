import {
  lazy,
  startTransition,
  Suspense,
  useOptimistic,
  useState,
  useSyncExternalStore,
} from 'react';
import { CheckCircle2, Cloud, FileUp, Folder, Plus, Trash2 } from 'lucide-react';
import type { DataSource, SourceKind } from '../domain/model';
import { db } from '../storage/database';
import { createSource, recordImportFailure, removeSource } from '../storage/workspace';
import { Modal } from './Modal';
import { getRefreshingSources, refreshFiles, subscribeToRefresh } from '../sources/refresh';
import { importMessage } from '../sources/feedback';

const CaldwellSource = lazy(() => import('./CaldwellSource'));
const sourceStatus = {
  ready: 'Up to date',
  'needs-files': 'Awaiting files',
  'needs-setup': 'Setup needed',
  'needs-sign-in': 'Sign-in needed',
  error: 'Refresh failed',
};

/** Edit one source's local policy and render its adapter-specific setup/import controls. */
function SourceCard({
  source,
  remember,
  onMessage,
}: {
  source: DataSource;
  remember: boolean;
  onMessage: (message: string) => void;
}) {
  const [name, setName] = useState(source.name);
  const [working, setBusy] = useState(false);
  const refreshing = useSyncExternalStore(subscribeToRefresh, getRefreshingSources);
  const busy = working || refreshing.includes(source.id);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [error, setError] = useState('');
  const [settings, setOptimisticSettings] = useOptimistic(
    source,
    (current, patch: Partial<DataSource>) => ({ ...current, ...patch }),
  );
  /** Optimistically reflect policy edits while committing them to the local source record. */
  function update(patch: Partial<DataSource>) {
    startTransition(async () => {
      setOptimisticSettings(patch);
      try {
        await db.sources.update(source.id, patch);
        setError('');
      } catch {
        setError('Source settings could not be saved.');
      }
    });
  }
  return (
    <section className="source-card" aria-label={source.name}>
      <div className="source-heading">
        <span className="source-icon">
          {source.kind === 'caldwell' ? <Cloud size={20} /> : <Folder size={20} />}
        </span>
        <div className="grow">
          <strong>{source.name}</strong>
          <small>
            {source.kind === 'caldwell' ? 'Caldwell · online account' : 'JSON / text · local files'}
          </small>
        </div>
        <span className={`status-pill ${source.status === 'ready' ? 'success' : ''}`}>
          {busy ? 'Working…' : sourceStatus[source.status]}
        </span>
      </div>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) void update({ name: name.trim() });
        }}
      >
        <label className="field grow">
          Source name
          <input
            value={name}
            required
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button disabled={busy || name.trim() === source.name}>Save name</button>
      </form>
      <label className="check-field compact">
        <input
          type="checkbox"
          checked={settings.enabled}
          disabled={busy}
          onChange={(event) => void update({ enabled: event.target.checked })}
        />
        <span>Include in Refresh</span>
      </label>
      <label className="check-field compact">
        <input
          type="checkbox"
          checked={settings.autoUpdateCatalogs}
          disabled={busy}
          onChange={(event) => void update({ autoUpdateCatalogs: event.target.checked })}
        />
        <span>
          Automatically update catalogs
          <small>When off, missing firearm or projectile names stop the entire import.</small>
        </span>
      </label>
      {source.kind === 'caldwell' ? (
        <Suspense fallback={<p className="muted">Opening connection…</p>}>
          <CaldwellSource source={source} remember={remember} busy={busy} onMessage={onMessage} />
        </Suspense>
      ) : (
        <label className={`file-picker ${busy ? 'disabled' : ''}`}>
          <FileUp size={18} />
          <span>
            {busy ? 'Importing…' : 'Choose export files'}
            <small>Select strings and shots together, or one combined JSON file.</small>
          </span>
          <input
            type="file"
            accept=".json,.csv,.txt,application/json,text/csv,text/plain"
            multiple
            disabled={busy}
            aria-label={`Import files for ${source.name}`}
            onChange={async (event) => {
              const input = event.currentTarget;
              const files = Array.from(input.files ?? []);
              if (!files.length) return;
              setBusy(true);
              setError('');
              try {
                // Parse all selected files before the atomic storage transaction begins.
                const result = await refreshFiles(source.id, files);
                onMessage(importMessage(source.name, result));
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'The import could not be completed.';
                setError(message);
                try {
                  await recordImportFailure(source.id, message);
                } catch {
                  /* The visible error remains available if storage is unavailable. */
                }
              } finally {
                setBusy(false);
                // Reset the picker so selecting the same file again still raises a change event.
                input.value = '';
              }
            }}
          />
        </label>
      )}
      {(error || source.error) && (
        <p role="alert" className="error">
          {error || source.error}
        </p>
      )}
      <div className="source-footer">
        <small>
          {source.lastSuccessAt
            ? `Updated ${new Date(source.lastSuccessAt).toLocaleString('en-GB')}`
            : 'No measurements imported yet'}
        </small>
        <button
          className="text-button danger"
          disabled={busy}
          onClick={() => setConfirmRemoval(!confirmRemoval)}
        >
          <Trash2 size={14} />
          Remove
        </button>
      </div>
      {confirmRemoval && (
        <div className="notice removal">
          <p>
            Remove this source and all its imported measurements and annotations? Catalog names are
            kept. This cannot be undone.
          </p>
          <button onClick={() => setConfirmRemoval(false)}>Keep source</button>
          <button
            className="danger-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                if (source.kind === 'caldwell') {
                  // Dispose authentication before deleting the local record that identifies its SDK app.
                  const { forgetSession } = await import('../sources/caldwell/session');
                  await forgetSession(source, remember);
                }
                await removeSource(source.id);
                onMessage('Source and its measurements removed from this device.');
              } catch {
                setError('The source could not be removed.');
                setBusy(false);
              }
            }}
          >
            Remove source and data
          </button>
        </div>
      )}
    </section>
  );
}

/** Manage immutable source types or show every enabled source participating in a refresh. */
export function SourcesDialog({
  sources,
  remember,
  mode,
  onClose,
  onMessage,
}: {
  sources: DataSource[];
  remember: boolean;
  mode: 'manage' | 'refresh';
  onClose: () => void;
  onMessage: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<SourceKind>('caldwell');
  const [automatic, setAutomatic] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const displayed = mode === 'refresh' ? sources.filter((source) => source.enabled) : sources;
  return (
    <Modal title={mode === 'refresh' ? 'Refresh sources' : 'Data sources'} onClose={onClose} wide>
      <p className="muted">
        {mode === 'refresh'
          ? 'Refresh includes every enabled source, regardless of filters. Connected accounts refresh online; file sources need their latest exports.'
          : 'Import local files or connect your Caldwell account. Measurements and source settings stay in this browser.'}
      </p>
      {mode === 'manage' && (
        <form
          className="new-source"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              await db.sources.add(createSource(name, automatic, kind));
              setName('');
            } catch {
              setError('The source could not be created.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="inline-form">
            <label className="field source-type">
              Source type
              <select
                value={kind}
                disabled={busy}
                onChange={(event) => setKind(event.target.value as SourceKind)}
              >
                <option value="caldwell">Caldwell</option>
                <option value="velociradar-export">JSON / text</option>
              </select>
            </label>
            <label className="field grow">
              New source name
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                placeholder="e.g. My VelociRadar"
              />
            </label>
            <button className="primary" disabled={busy || !name.trim()}>
              <Plus size={17} />
              Add source
            </button>
          </div>
          <label className="check-field compact">
            <input
              type="checkbox"
              checked={automatic}
              onChange={(event) => setAutomatic(event.target.checked)}
            />
            <span>Automatically update catalogs</span>
          </label>
        </form>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="source-list">
        {displayed.map((source) => (
          <SourceCard key={source.id} source={source} remember={remember} onMessage={onMessage} />
        ))}
      </div>
      {!displayed.length && (
        <div className="empty-note">
          <CheckCircle2 size={24} />
          <p>
            {mode === 'refresh'
              ? 'No enabled sources. Add or enable a source in Data sources.'
              : 'Your workspace is ready for its first source.'}
          </p>
        </div>
      )}
      <p className="fine-print">
        Up to 20 MB per import. A refresh updates matching records and retains measurements missing
        from a later import.{' '}
        <a
          href="https://github.com/tony2kk/velocitrack/blob/main/help/README.md#sources"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sources help
        </a>
      </p>
    </Modal>
  );
}
