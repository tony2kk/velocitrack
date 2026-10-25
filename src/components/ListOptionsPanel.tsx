import { useState } from 'react';
import type { FieldDefinition } from '../domain/model';
import { listOptionUsage, removeListOption, saveListOption } from '../storage/customization';

/** Immediate list maintenance with stable IDs and a usage-aware, explicit removal confirmation. */
export function ListOptionsPanel({
  field,
  onClose,
}: {
  field: FieldDefinition;
  onClose?: () => void;
}) {
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [removal, setRemoval] = useState<{ id: string; name: string; uses: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** Surface failures without closing the panel or losing a pending name. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The list could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="list-options-panel" aria-label={`Options for ${field.name}`}>
      <div className="section-heading">
        <h3>{field.name} · List options</h3>
        {onClose && (
          <button type="button" onClick={onClose}>
            Done
          </button>
        )}
      </div>
      <p className="muted">
        Changes save immediately. Renaming an option updates its label everywhere.
      </p>
      <div className="group-controls">
        <label className="field">
          Option name
          <input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
        </label>
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() =>
            void run(async () => {
              await saveListOption(field.id, { id: id ?? crypto.randomUUID(), name });
              setId(null);
              setName('');
            })
          }
        >
          {id ? 'Save option' : 'Add option'}
        </button>
        {id && (
          <button
            type="button"
            onClick={() => {
              setId(null);
              setName('');
            }}
          >
            Cancel edit
          </button>
        )}
      </div>
      <ul className="list-options">
        {(field.options ?? []).map((option) => (
          <li key={option.id}>
            <span>{option.name}</span>
            <div className="group-controls">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setId(option.id);
                  setName(option.name);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setRemoval({ ...option, uses: await listOptionUsage(field.id, option.id) });
                  })
                }
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {removal && (
        <div className="removal" role="alert">
          <p>
            Remove “{removal.name}”?{' '}
            {removal.uses
              ? `This value is used in ${removal.uses} saved record(s). Confirming also clears those assignments.`
              : 'This value is not used in saved records.'}
          </p>
          <button
            type="button"
            className="danger-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await removeListOption(field.id, removal.id, removal.uses);
                setRemoval(null);
                if (id === removal.id) {
                  setId(null);
                  setName('');
                }
              })
            }
          >
            Confirm removal
          </button>
          <button type="button" onClick={() => setRemoval(null)}>
            Keep option
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
