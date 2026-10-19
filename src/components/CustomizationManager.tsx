import { useState } from 'react';
import type { FieldDefinition, FieldType, Tag } from '../domain/model';
import { FIELD_TYPES } from '../domain/customFields';
import { moveField, removeField, removeTag, saveField, saveTag } from '../storage/customization';

/** Display labels with a color swatch and readable text, independent of the chosen color contrast. */
export function TagLabels({ tags }: { tags: Tag[] }) {
  return (
    <span className="tag-list">
      {tags.map((tag) => (
        <span className="tag-label" key={tag.id}>
          <i style={{ backgroundColor: tag.color }} />
          {tag.name}
        </span>
      ))}
    </span>
  );
}

/** Manage immediately saved workspace definitions; deletion requires an explicit second action. */
export function CustomizationManager({
  kind,
  fields,
  tags,
}: {
  kind: 'fields' | 'tags';
  fields: FieldDefinition[];
  tags: Tag[];
}) {
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('short-text');
  const [showInNavigator, setShowInNavigator] = useState(false);
  const [color, setColor] = useState('#08796e');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const items = kind === 'fields' ? fields : tags;
  /** Keep storage failures visible and prevent concurrent clicks while a mutation is pending. */
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Changes could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <p className="muted">
        {kind === 'fields'
          ? 'Define optional fields for every string. Choose table columns and optional string panel values. Weight can use fixed grams or grains; speed and distance follow profile units.'
          : 'Create reusable labels, assign them to series and filter by them.'}{' '}
        Changes here are saved immediately.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            if (kind === 'fields')
              await saveField({
                id: id ?? crypto.randomUUID(),
                name,
                type,
                showInNavigator,
                order:
                  fields.find((field) => field.id === id)?.order ??
                  Math.max(-1, ...fields.map((field) => field.order)) + 1,
              });
            else await saveTag({ id: id ?? crypto.randomUUID(), name, color });
            setId(null);
            setName('');
            setShowInNavigator(false);
          });
        }}
      >
        <label className="field">
          Name
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {kind === 'fields' ? (
          <label className="field">
            Type
            <select value={type} onChange={(event) => setType(event.target.value as FieldType)}>
              {Object.entries(FIELD_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            Color
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
        )}
        {kind === 'fields' && (
          <label className="check-field">
            <input
              type="checkbox"
              checked={showInNavigator}
              onChange={(event) => setShowInNavigator(event.target.checked)}
            />
            Show on string panel
          </label>
        )}
        <div className="group-controls">
          <button className="primary" disabled={busy}>
            {id ? 'Save changes' : kind === 'fields' ? 'Add field' : 'Add tag'}
          </button>
          {id && (
            <button
              type="button"
              onClick={() => {
                setId(null);
                setName('');
                setShowInNavigator(false);
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="definition-list">
        {items.map((item, index) => (
          <div className="definition-row" key={item.id}>
            <span>
              {'color' in item ? (
                <TagLabels tags={[item]} />
              ) : (
                <>
                  <strong>{item.name}</strong>
                  <small>{FIELD_TYPES[item.type]}</small>
                </>
              )}
            </span>
            <div className="group-controls">
              {kind === 'fields' && (
                <>
                  <button
                    aria-label={`Move ${item.name} up`}
                    disabled={busy || index === 0}
                    onClick={() => void run(() => moveField(item.id, -1))}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Move ${item.name} down`}
                    disabled={busy || index === items.length - 1}
                    onClick={() => void run(() => moveField(item.id, 1))}
                  >
                    ↓
                  </button>
                </>
              )}
              <button
                disabled={busy}
                onClick={() => {
                  setId(item.id);
                  setName(item.name);
                  if ('type' in item) {
                    setType(item.type);
                    setShowInNavigator(item.showInNavigator ?? false);
                  } else setColor(item.color);
                }}
              >
                Edit
              </button>
              <button disabled={busy} onClick={() => setConfirm(item.id)}>
                Remove
              </button>
            </div>
            {confirm === item.id && (
              <div className="removal">
                <p>
                  Remove “{item.name}” and all its{' '}
                  {kind === 'fields' ? 'saved values' : 'assignments'}? Measurements are retained.
                </p>
                <button
                  className="danger-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (kind === 'fields') await removeField(item.id);
                      else await removeTag(item.id);
                      setConfirm(null);
                      if (id === item.id) {
                        setId(null);
                        setName('');
                      }
                    })
                  }
                >
                  Confirm removal
                </button>
                <button onClick={() => setConfirm(null)}>Keep</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
