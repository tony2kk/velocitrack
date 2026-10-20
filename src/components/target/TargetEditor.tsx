import { useEffect, useRef, useState } from 'react';
import type { Attachment, UnitSystem } from '../../domain/model';
import {
  calibrateTarget,
  changeTargetGeometry,
  overrideTargetValues,
  parseTargetValue,
  TARGET_FIELDS,
  targetPixels,
  type TargetField,
  type TargetGeometry,
  type TargetMeasurement,
} from '../../domain/targetMeasurement';
import { db } from '../../storage/database';
import { saveTargetMeasurement } from '../../storage/targetMeasurement';
import { Modal } from '../Modal';
import { TargetValueInput } from '../TargetValueInput';
import { TargetCanvas, type TargetAction } from './TargetCanvas';

/** Load the local original only while its editor is open; revoke blob URLs on completion/unmount. */
function useTargetPhoto(photo: Attachment) {
  const [image, setImage] = useState<{ url: string; width: number; height: number }>();
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let url = '';
    void db.attachmentContents
      .get(photo.id)
      .then(async (content) => {
        if (!content) throw new Error('The photo is missing from local storage.');
        if (cancelled) return;
        url = URL.createObjectURL(content.blob);
        const element = new Image();
        element.src = url;
        await element.decode();
        if (
          !element.naturalWidth ||
          !element.naturalHeight ||
          element.naturalWidth * element.naturalHeight > 60_000_000
        )
          throw new Error('The photo dimensions are unsupported.');
        if (!cancelled)
          setImage({ url, width: element.naturalWidth, height: element.naturalHeight });
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : 'The photo could not be loaded.');
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.id]);
  return { image, error };
}

/** A complete local measurement draft; Save is the only write, while Cancel leaves the prior result intact. */
export function TargetEditor({
  photo,
  initial,
  units,
  onClose,
  onSaved,
}: {
  photo: Attachment;
  initial: TargetMeasurement;
  units: UnitSystem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editorUnits] = useState(units);
  const [draft, setDraft] = useState<TargetMeasurement>(() =>
    initial.photoId === photo.id
      ? structuredClone(initial)
      : {
          values: { ...initial.values },
          manual: TARGET_FIELDS.filter((field) => initial.values[field] !== null),
        },
  );
  const latest = useRef(draft);
  const gestureStart = useRef<TargetMeasurement | null>(null);
  const [history, setHistory] = useState<TargetMeasurement[]>([]);
  const [mode, setMode] = useState<'group' | 'offset'>(draft.geometry?.poa ? 'offset' : 'group');
  const [action, setAction] = useState<TargetAction>('draw');
  const [twoClicks, setTwoClicks] = useState(false);
  const [calibrating, setCalibrating] = useState(!draft.mmPerPixel);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { image, error: imageError } = useTargetPhoto(photo);
  const mismatch =
    image &&
    draft.geometry &&
    (image.width !== draft.geometry.width || image.height !== draft.geometry.height);
  const pixels = draft.geometry ? targetPixels(draft.geometry) : undefined;

  /** Keep a synchronous gesture snapshot beside React state so release events cannot use a stale draft. */
  function update(next: TargetMeasurement) {
    latest.current = next;
    setDraft(next);
  }
  /** Bound local undo memory; store one snapshot per gesture or confirmed value edit. */
  function remember(previous: TargetMeasurement) {
    setHistory((items) => [...items.slice(-49), structuredClone(previous)]);
  }
  /** Geometry changes recalculate only dimensions represented by this tool's drawing. */
  function geometryChanged(geometry: TargetGeometry) {
    update(changeTargetGeometry({ ...latest.current, photoId: photo.id }, geometry));
  }
  /** First nonzero length establishes scale; later edits become explicit overrides until geometry moves. */
  function valueChanged(field: TargetField, text: string) {
    try {
      const value = parseTargetValue(text, field, editorUnits);
      const current = latest.current;
      const next =
        !current.mmPerPixel || calibrating
          ? calibrateTarget(current, field, value)
          : overrideTargetValues(current, { [field]: value });
      remember(current);
      update(next);
      setError('');
      setCalibrating(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The value could not be applied.');
    }
  }

  return (
    <Modal
      title={`Measure target · ${photo.name}`}
      onClose={() => {
        if (!busy) onClose();
      }}
      className="target-editor"
      wide
    >
      <div className="target-editor-toolbar">
        <label className="field">
          Tool
          <select
            value={mode}
            disabled={busy}
            title="Measure a circle alone, or include the point of aim for horizontal and vertical offsets."
            onChange={(event) => {
              const next = event.target.value as 'group' | 'offset';
              setMode(next);
              setAction('draw');
              const g = latest.current.geometry;
              if (g) {
                remember(latest.current);
                geometryChanged({
                  ...g,
                  poa: next === 'group' ? null : (g.poa ?? { ...g.center }),
                });
              }
            }}
          >
            <option value="group">Group size</option>
            <option value="offset">Group size + offset</option>
          </select>
        </label>
        <label className="field">
          Action
          <select
            value={action}
            disabled={busy}
            title="Draw a new result, adjust one part of the drawing, or pan the photo without changing measurements."
            onChange={(event) => setAction(event.target.value as TargetAction)}
          >
            <option value="draw">Draw new</option>
            <option value="center" disabled={!draft.geometry}>
              Place center
            </option>
            <option value="edge" disabled={!draft.geometry}>
              Resize circle
            </option>
            <option value="poa" disabled={!draft.geometry || mode === 'group'}>
              Place POA
            </option>
            <option value="pan">Pan image</option>
          </select>
        </label>
        <label
          className="check-field"
          title="Place points with clicks or taps instead of dragging."
        >
          <input
            type="checkbox"
            checked={twoClicks}
            onChange={(event) => setTwoClicks(event.target.checked)}
          />{' '}
          Use clicks / taps
        </label>
        <button
          disabled={!history.length || busy}
          title="Undo the last completed gesture or value change."
          onClick={() => {
            const previous = history.at(-1);
            if (previous) {
              update(previous);
              setMode(previous.geometry?.poa ? 'offset' : 'group');
              setCalibrating(!previous.mmPerPixel);
              setHistory((items) => items.slice(0, -1));
              setError('');
            }
          }}
        >
          Undo
        </button>
        <button
          disabled={!draft.geometry || busy}
          title="Remove this draft's drawing and calibration; keep the numeric values as manual entries."
          onClick={() => {
            remember(latest.current);
            update({
              values: { ...draft.values },
              manual: TARGET_FIELDS.filter((field) => draft.values[field] !== null),
            });
            setCalibrating(true);
            setAction('draw');
            setError('');
          }}
        >
          Clear drawing
        </button>
      </div>
      {imageError && (
        <p role="alert" className="error">
          {imageError}
        </p>
      )}
      {mismatch && (
        <p role="alert" className="error">
          This photo's dimensions differ from the saved drawing. Clear the drawing to measure it
          again.
        </p>
      )}
      {!image && !imageError && <p role="status">Loading local photo…</p>}
      {image && !mismatch && (
        <div className="target-editor-body">
          <TargetCanvas
            url={image.url}
            width={image.width}
            height={image.height}
            measurement={draft}
            units={editorUnits}
            mode={mode}
            action={action}
            twoClicks={twoClicks}
            onBegin={() => {
              gestureStart.current = structuredClone(latest.current);
            }}
            onChange={geometryChanged}
            onEnd={() => {
              if (
                gestureStart.current &&
                JSON.stringify(gestureStart.current) !== JSON.stringify(latest.current)
              )
                remember(gestureStart.current);
              gestureStart.current = null;
              setError('');
            }}
            onCancel={() => {
              if (gestureStart.current) update(gestureStart.current);
              gestureStart.current = null;
            }}
            onValue={valueChanged}
          />
          <aside className="target-editor-values">
            <h3>Dimensions</h3>
            <p className="muted">
              {!draft.geometry
                ? 'Draw a circle to begin.'
                : calibrating || !draft.mmPerPixel
                  ? 'Enter one known nonzero dimension to set the photo scale. Its sign must agree with the drawing.'
                  : 'Scale set. Manual overrides are replaced when the corresponding geometry changes.'}
            </p>
            {TARGET_FIELDS.map((field) => (
              <div key={field}>
                <TargetValueInput
                  field={field}
                  value={draft.values[field]}
                  units={editorUnits}
                  manual={draft.manual.includes(field)}
                  onCommit={valueChanged}
                />
                {(calibrating || !draft.mmPerPixel) && pixels?.[field] && draft.values[field] ? (
                  <button
                    className="target-use-scale"
                    title="Use this existing value as the known dimension for the photo scale."
                    onClick={() => {
                      try {
                        const next = calibrateTarget(latest.current, field, draft.values[field]);
                        remember(latest.current);
                        update(next);
                        setCalibrating(false);
                        setError('');
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : 'Calibration failed.');
                      }
                    }}
                  >
                    Use this value for scale
                  </button>
                ) : null}
              </div>
            ))}
            <button
              disabled={!draft.geometry || busy}
              onClick={() => setCalibrating((value) => !value)}
              title="Explicitly replace the photo scale using the next known nonzero dimension."
            >
              {calibrating && draft.mmPerPixel ? 'Keep current scale' : 'Recalibrate'}
            </button>
            <p className="muted">
              Use a front-facing, upright photo. The circle and its center are placed manually.
              Circle-only edits preserve separately entered offsets.
            </p>
            {initial.photoId && initial.photoId !== photo.id && (
              <p className="muted">Saving replaces the active measurement from the other photo.</p>
            )}
          </aside>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <footer className="dialog-actions">
        <button disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={
            busy || !image || !!mismatch || !draft.geometry || !draft.mmPerPixel || calibrating
          }
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await saveTargetMeasurement(photo.seriesId, latest.current);
              onSaved();
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : 'The measurement could not be saved.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Saving…' : 'Save measurement'}
        </button>
      </footer>
    </Modal>
  );
}
