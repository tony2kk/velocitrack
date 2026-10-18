import { startTransition, useOptimistic, useState } from 'react';
import { CheckCircle2, FileUp, Folder, Plus, Trash2 } from 'lucide-react';
import type { DataSource } from '../domain/model';
import { db } from '../storage/database';
import {
  createSource,
  importBundle,
  recordImportFailure,
  removeSource,
} from '../storage/workspace';
import { readExportFiles } from '../sources/velociradar';
import { Modal } from './Modal';

function SourceCard({
  source,
  onMessage,
}: {
  source: DataSource;
  onMessage: (message: string) => void;
}) {
  const [name, setName] = useState(source.name);
  const [busy, setBusy] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [error, setError] = useState('');
  const [settings, setOptimisticSettings] = useOptimistic(
    source,
    (current, patch: Partial<DataSource>) => ({ ...current, ...patch }),
  );
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
          <Folder size={20} />
        </span>
        <div className="grow">
          <strong>{source.name}</strong>
          <small>VelociRadar export · local files</small>
        </div>
        <span className={`status-pill ${source.status === 'ready' ? 'success' : ''}`}>
          {source.status === 'ready'
            ? 'Up to date'
            : source.status === 'error'
              ? 'Import failed'
              : 'Awaiting files'}
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
      <label className={`file-picker ${busy ? 'disabled' : ''}`}>
        <FileUp size={18} />
        <span>
          {busy ? 'Importing…' : 'Choose export files'}
          <small>Select strings and shots together, or one combined JSON file.</small>
        </span>
        <input
          type="file"
          accept=".json,.csv,application/json,text/csv"
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
              const bundle = await readExportFiles(files);
              const result = await importBundle(source.id, bundle);
              onMessage(
                `${source.name}: ${result.series} series and ${result.shots} shots imported.`,
              );
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
              input.value = '';
            }
          }}
        />
      </label>
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

export function SourcesDialog({
  sources,
  mode,
  onClose,
  onMessage,
}: {
  sources: DataSource[];
  mode: 'manage' | 'refresh';
  onClose: () => void;
  onMessage: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [automatic, setAutomatic] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const displayed = mode === 'refresh' ? sources.filter((source) => source.enabled) : sources;
  return (
    <Modal title={mode === 'refresh' ? 'Refresh sources' : 'Data sources'} onClose={onClose} wide>
      <p className="muted">
        {mode === 'refresh'
          ? 'Refresh includes every enabled source, regardless of the current filters. Select the latest files for each source.'
          : 'Connect a local VelociRadar export. All files are read on this device; nothing is uploaded.'}
      </p>
      {mode === 'manage' && (
        <form
          className="new-source"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              await db.sources.add(createSource(name, automatic));
              setName('');
            } catch {
              setError('The source could not be created.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="inline-form">
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
          <SourceCard key={source.id} source={source} onMessage={onMessage} />
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
        JSON and CSV · 20 MB per import · Original exports stay on your device. Files absent from a
        later export do not delete existing measurements.
      </p>
    </Modal>
  );
}
