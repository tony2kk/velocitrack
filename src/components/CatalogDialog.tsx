import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { CatalogItem, CatalogKind } from '../domain/model';
import { removeCatalogItem, saveCatalogItem } from '../storage/workspace';
import { Modal } from './Modal';

/** Edit shared local names; storage enforces uniqueness and protects referenced entries from removal. */
export function CatalogDialog({ items, onClose }: { items: CatalogItem[]; onClose: () => void }) {
  const [kind, setKind] = useState<CatalogKind>('firearm');
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  /** Keep asynchronous catalog edits busy until completion and present actionable local errors. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The catalog could not be updated.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Local catalogs" onClose={onClose}>
      <p className="muted">
        Shared names for your workspace. Manual edits are preserved on refresh. Cross-source mapping
        will follow in a later release.
      </p>
      <div className="segmented" aria-label="Catalog type">
        {(['firearm', 'projectile'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setEditing(undefined);
              setName('');
              setError('');
            }}
          >
            {value === 'firearm' ? 'Firearms' : 'Projectiles'}
          </button>
        ))}
      </div>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await saveCatalogItem(kind, name, editing);
            setName('');
            setEditing(undefined);
          });
        }}
      >
        <label className="field grow">
          {editing ? 'Edit name' : 'New name'}
          <input
            value={name}
            maxLength={120}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button disabled={busy || !name.trim()} className="primary">
          <Plus size={16} />
          {editing ? 'Save' : 'Add'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(undefined);
              setName('');
            }}
          >
            Cancel
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="catalog-list">
        {items
          .filter((item) => item.kind === kind)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => (
            <div className="catalog-row" key={item.id}>
              <span>
                {item.name}
                <small>{item.links.length ? 'Linked to an import' : 'Manual entry'}</small>
              </span>
              <button
                className="icon-button"
                aria-label={`Rename ${item.name}`}
                onClick={() => {
                  setEditing(item.id);
                  setName(item.name);
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                className="icon-button"
                disabled={busy}
                aria-label={`Remove ${item.name}`}
                onClick={() => void run(() => removeCatalogItem(item))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
      </div>
      {!items.some((item) => item.kind === kind) && (
        <p className="empty-note">
          No entries yet. Import with automatic catalog updates, or add a name above.
        </p>
      )}
    </Modal>
  );
}
