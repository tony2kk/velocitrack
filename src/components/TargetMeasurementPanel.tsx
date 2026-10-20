import { useState } from 'react';
import type { Attachment, UnitSystem } from '../domain/model';
import {
  emptyTarget,
  overrideTargetValues,
  parseTargetValue,
  TARGET_FIELDS,
  TARGET_LABELS,
  TARGET_HINTS,
  targetText,
  targetUnit,
  type TargetValues,
  type TargetMeasurement,
  type TargetField,
} from '../domain/targetMeasurement';
import { saveTargetValues } from '../storage/targetMeasurement';
import { db } from '../storage/database';
import { TargetEditor } from './target/TargetEditor';

/** Edit optional string lengths directly or open the active photo's local measurement draft. */
export function TargetMeasurementPanel({
  seriesId,
  target,
  photos,
  units,
}: {
  seriesId: string;
  target?: TargetMeasurement;
  photos: Attachment[];
  units: UnitSystem;
}) {
  const [edits, setEdits] = useState<Partial<Record<TargetField, string>>>({});
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [editor, setEditor] = useState<{ photo: Attachment; initial: TargetMeasurement } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const photo = photos.find((item) => item.id === (selectedPhoto || target?.photoId)) ?? photos[0];

  /** Read only touched fields; empty inputs explicitly clear a value. */
  function patch(): Partial<TargetValues> {
    return Object.fromEntries(
      Object.entries(edits).map(([field, text]) => [
        field,
        parseTargetValue(text, field as TargetField, units),
      ]),
    );
  }

  /** Read current storage before a manual edit so an untouched geometry survives a fresh annotation. */
  async function currentDraft(): Promise<TargetMeasurement> {
    const current = (await db.annotations.get(seriesId))?.target ?? emptyTarget();
    return overrideTargetValues(current, patch());
  }

  return (
    <section className="target-summary">
      <h3>Target measurement</h3>
      <p className="muted">
        Optional string values. H is positive right; V is positive up. Group size is the diameter of
        a manually placed circle.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            await saveTargetValues(seriesId, patch());
            setEdits({});
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Values could not be saved.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="target-values">
          {TARGET_FIELDS.map((field) => (
            <label className="field" key={field} title={TARGET_HINTS[field]}>
              {TARGET_LABELS[field]} ({targetUnit(units).label})
              <input
                type="number"
                step="any"
                min={field === 'groupSize' ? 0 : undefined}
                value={edits[field] ?? targetText(target?.values[field] ?? null, units)}
                onChange={(event) =>
                  setEdits((current) => ({ ...current, [field]: event.target.value }))
                }
              />
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            disabled={busy || !Object.keys(edits).length}
            onClick={() => setEdits({})}
          >
            Cancel edits
          </button>
          <button type="submit" disabled={busy || !Object.keys(edits).length}>
            Save target values
          </button>
        </div>
      </form>
      <div className="target-photo-picker">
        <label className="field">
          Target photo
          <select
            value={photo?.id ?? ''}
            disabled={!photos.length || busy}
            onChange={(event) => setSelectedPhoto(event.target.value)}
          >
            {!photos.length && <option value="">Add a photo below</option>}
            {photos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.id === target?.photoId ? ' · Active measurement' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!photo || busy}
          title="Open a local draft. Save confirms its geometry and values together."
          onClick={async () => {
            if (!photo) return;
            setBusy(true);
            setError('');
            try {
              const initial = await currentDraft();
              setEditor({ photo, initial });
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'The editor could not be opened.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Measure photo
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {editor && (
        <TargetEditor
          photo={editor.photo}
          initial={editor.initial}
          units={units}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEdits({});
            setEditor(null);
          }}
        />
      )}
    </section>
  );
}
