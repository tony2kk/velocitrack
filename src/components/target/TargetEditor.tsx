import { useEffect, useRef, useState } from 'react';
import {
  CircleDot,
  Crop,
  Crosshair,
  Hand,
  Maximize,
  Ruler,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Attachment, UnitSystem } from '../../domain/model';
import {
  calibrateTarget,
  changeTargetCalibration,
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
import { TargetCanvas, type TargetCanvasHandle } from './TargetCanvas';
import { TargetConnections } from './TargetConnections';
import { TARGET_COLORS } from './TargetDrawing';
import { initialReportCrop, type ReportCrop } from '../../domain/reportCrop';
import {
  calibrationScale,
  initialCalibration,
  type TargetCalibration,
} from '../../domain/targetCalibration';
import { CalibrationInput } from './CalibrationInput';

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
  const [mode, setMode] = useState<'group' | 'offset'>(
    draft.geometry && !draft.geometry.poa ? 'group' : 'offset',
  );
  const [pan, setPan] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const canvas = useRef<TargetCanvasHandle>(null);
  const canvasElement = useRef<SVGSVGElement>(null);
  const valuesPanel = useRef<HTMLElement>(null);
  const [hoveredField, setHoveredField] = useState<TargetField | null>(null);
  const [focusedField, setFocusedField] = useState<TargetField | null>(null);
  const activeField = hoveredField ?? focusedField;
  const [linked, setLinked] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { image, error: imageError } = useTargetPhoto(photo);
  const mismatch =
    image &&
    ((draft.geometry &&
      (image.width !== draft.geometry.width || image.height !== draft.geometry.height)) ||
      (draft.reportCrop &&
        (image.width !== draft.reportCrop.width || image.height !== draft.reportCrop.height)) ||
      (draft.calibration &&
        (image.width !== draft.calibration.width || image.height !== draft.calibration.height)));
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
  /** Report framing changes no physical values, calibration or measurement geometry. */
  function cropChanged(reportCrop: ReportCrop) {
    update({ ...latest.current, photoId: photo.id, reportCrop });
  }
  /** Reference edits share one scale without changing the circle, POA or report framing. */
  function calibrationChanged(reference: TargetCalibration) {
    update(changeTargetCalibration({ ...latest.current, photoId: photo.id }, reference));
  }
  /** A positive known length makes the independent reference usable for every subsequent group edit. */
  function referenceLengthChanged(text: string) {
    try {
      const lengthMm = parseTargetValue(text, 'groupSize', editorUnits);
      if (!lengthMm) throw new Error('Enter a positive reference length.');
      if (!latest.current.calibration) return;
      remember(latest.current);
      calibrationChanged({ ...latest.current.calibration, lengthMm });
      setLinked(true);
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The reference length could not be applied.',
      );
    }
  }
  /** Linked dimensions share one scale after every edit; independent overrides require an explicit choice. */
  function valueChanged(field: TargetField, text: string) {
    try {
      const value = parseTargetValue(text, field, editorUnits);
      const current = latest.current;
      // Circle-only drawings have no offset dimensions; those values remain independent.
      const represented = current.geometry && targetPixels(current.geometry)[field] !== null;
      const next =
        !current.mmPerPixel || (linked && represented)
          ? calibrateTarget(current, field, value)
          : overrideTargetValues(current, { [field]: value });
      remember(current);
      update(next);
      setCalibrationMode(false);
      setError('');
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
      <div className="target-editor-toolbar" role="group" aria-label="Target tools">
        <div className="target-tool-modes" role="group" aria-label="Measurement tool">
          {(['group', 'offset'] as const).map((tool) => (
            <button
              key={tool}
              type="button"
              className="target-tool-button"
              aria-pressed={mode === tool && !pan && !cropMode && !calibrationMode}
              aria-label={tool === 'group' ? 'Group size' : 'Group size + offset'}
              title={
                tool === 'group'
                  ? 'Draw a circle from its center to its edge.'
                  : 'Draw from the point of aim to the group center, then adjust the circle.'
              }
              disabled={busy}
              onClick={() => {
                setCropMode(false);
                setCalibrationMode(false);
                setPan(false);
                if (tool === mode) return;
                setMode(tool);
                const g = latest.current.geometry;
                if (g) {
                  remember(latest.current);
                  geometryChanged({
                    ...g,
                    poa: tool === 'group' ? null : (g.poa ?? { ...g.center }),
                  });
                }
              }}
            >
              {tool === 'group' ? <CircleDot size={19} /> : <Crosshair size={19} />}
              <span>{tool === 'group' ? 'Group size' : 'Group + offset'}</span>
            </button>
          ))}
          <button
            type="button"
            className="target-tool-button"
            aria-label="Calibrate scale"
            aria-pressed={calibrationMode && !pan}
            disabled={busy || !image}
            title="Place both ends of the reference arrow on a known length, then enter its dimension."
            onClick={() => {
              if (!image) return;
              if (!latest.current.calibration) {
                remember(latest.current);
                calibrationChanged(initialCalibration(image.width, image.height));
              }
              setCalibrationMode(true);
              setCropMode(false);
              setPan(false);
            }}
          >
            <Ruler size={19} />
            <span>Calibrate</span>
          </button>
        </div>
        <span className="target-toolbar-divider" aria-hidden="true" />
        <button
          type="button"
          className="icon-button"
          aria-label="Undo"
          disabled={!history.length || busy}
          title="Undo the last completed gesture or value change."
          onClick={() => {
            const previous = history.at(-1);
            if (previous) {
              update(previous);
              setMode(previous.geometry && !previous.geometry.poa ? 'group' : 'offset');
              if (!previous.calibration) setCalibrationMode(false);
              setHistory((items) => items.slice(0, -1));
              setError('');
            }
          }}
        >
          <Undo2 size={20} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Clear drawing"
          disabled={!draft.geometry || busy}
          title="Clear the group drawing; keep numeric values and any reference calibration."
          onClick={() => {
            remember(latest.current);
            update({
              values: { ...draft.values },
              manual: TARGET_FIELDS.filter((field) => draft.values[field] !== null),
              ...(draft.reportCrop ? { reportCrop: draft.reportCrop, photoId: photo.id } : {}),
              ...(draft.calibration
                ? {
                    calibration: draft.calibration,
                    mmPerPixel: draft.mmPerPixel,
                    photoId: photo.id,
                  }
                : {}),
            });
            setLinked(true);
            setPan(false);
            setError('');
          }}
        >
          <Trash2 size={20} />
        </button>
        <span className="target-toolbar-divider" aria-hidden="true" />
        <button
          type="button"
          className="icon-button"
          aria-label="Edit report crop"
          aria-pressed={cropMode}
          disabled={busy || !image}
          title="Set a square report crop. Drag inside to move; drag its corner to resize."
          onClick={() => {
            if (!image) return;
            if (!latest.current.reportCrop) {
              remember(latest.current);
              cropChanged(
                initialReportCrop(
                  image.width,
                  image.height,
                  draft.geometry?.center,
                  draft.geometry ? draft.geometry.radius * 2 : undefined,
                ),
              );
            }
            setPan(false);
            setCropMode((value) => !value);
            setCalibrationMode(false);
          }}
        >
          <Crop size={20} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Pan image"
          aria-pressed={pan}
          disabled={busy}
          title="Drag to pan. You can also hold Ctrl while dragging, or use two fingers."
          onClick={() => setPan((value) => !value)}
        >
          <Hand size={20} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Zoom in"
          disabled={busy || !image}
          title="Zoom in. Ctrl + wheel or pinch zooms around the pointer."
          onClick={() => canvas.current?.zoom(1.5)}
        >
          <ZoomIn size={20} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Zoom out"
          disabled={busy || !image}
          title="Zoom out."
          onClick={() => canvas.current?.zoom(1 / 1.5)}
        >
          <ZoomOut size={20} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Fit image"
          disabled={busy || !image}
          title="Fit the complete photo and reset its position."
          onClick={() => canvas.current?.fit()}
        >
          <Maximize size={20} />
        </button>
        <output className="target-zoom-level" aria-label="Image zoom">
          {Math.round(zoom * 100)}%
        </output>
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
            ref={canvas}
            canvasRef={canvasElement}
            url={image.url}
            width={image.width}
            height={image.height}
            measurement={draft}
            mode={mode}
            pan={pan}
            cropMode={cropMode}
            calibrationMode={calibrationMode}
            onCalibrationChange={calibrationChanged}
            units={editorUnits}
            onCropChange={cropChanged}
            activeField={activeField}
            onZoom={setZoom}
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
          />
          <aside ref={valuesPanel} className="target-editor-values">
            {draft.calibration && (
              <section className="target-calibration-panel" aria-label="Reference calibration">
                <h3>Reference scale</h3>
                <p className="muted">
                  Move A and B onto a known length, such as the target diameter. Then enter its
                  size.
                </p>
                <CalibrationInput
                  value={draft.calibration.lengthMm}
                  units={editorUnits}
                  onCommit={referenceLengthChanged}
                />
                <p className="muted">
                  {calibrationScale(draft.calibration)
                    ? 'Scale set. Use Group + offset to measure the group. Manual H, V or group size entry clears this reference.'
                    : 'Enter the reference length before saving.'}
                </p>
              </section>
            )}
            <label className="check-field">
              <input
                type="checkbox"
                checked={!!draft.reportCrop}
                disabled={busy}
                onChange={(event) => {
                  remember(latest.current);
                  if (event.target.checked) {
                    cropChanged(
                      initialReportCrop(
                        image.width,
                        image.height,
                        draft.geometry?.center,
                        draft.geometry ? draft.geometry.radius * 2 : undefined,
                      ),
                    );
                    setCropMode(true);
                    setCalibrationMode(false);
                    setPan(false);
                  } else {
                    const next = { ...latest.current };
                    delete next.reportCrop;
                    if (!next.geometry && !next.calibration) delete next.photoId;
                    update(next);
                    setCropMode(false);
                  }
                }}
              />
              <span>
                Use report crop
                <small>
                  Square framing for PDF only. The original photo and dimensions stay unchanged.
                </small>
              </span>
            </label>
            <h3>Dimensions</h3>
            <p className="muted">Hover or focus a value to locate its dimension on the photo.</p>
            <p className="muted">
              {draft.calibration && calibrationScale(draft.calibration)
                ? 'Dimensions follow the reference scale. Manual entry clears reference calibration.'
                : !draft.geometry
                  ? 'Draw a circle to begin.'
                  : linked || !draft.mmPerPixel
                    ? 'Changing any nonzero dimension updates the photo scale and all other dimensions. Its sign must agree with the drawing.'
                    : 'Independent values. Manual overrides are replaced when the corresponding geometry changes.'}
            </p>
            {TARGET_FIELDS.map((field) => (
              <div
                key={field}
                data-target-field={field}
                className="target-dimension-field"
                style={{ borderInlineStartColor: TARGET_COLORS[field] }}
                onMouseEnter={() => setHoveredField(field)}
                onMouseLeave={() => setHoveredField(null)}
                onFocusCapture={() => setFocusedField(field)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                    setFocusedField(null);
                }}
              >
                <TargetValueInput
                  field={field}
                  value={draft.values[field]}
                  units={editorUnits}
                  manual={draft.manual.includes(field)}
                  onCommit={valueChanged}
                />
                {!draft.mmPerPixel && pixels?.[field] && draft.values[field] ? (
                  <button
                    className="target-use-scale"
                    title="Use this existing value as the known dimension for the photo scale."
                    onClick={() => {
                      try {
                        const next = calibrateTarget(latest.current, field, draft.values[field]);
                        remember(latest.current);
                        update(next);
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
            <label className="check-field">
              <input
                type="checkbox"
                checked={linked}
                disabled={busy || !draft.mmPerPixel}
                onChange={(event) => setLinked(event.target.checked)}
              />
              <span>Link dimensions to drawing</span>
            </label>
            <p className="muted">
              Use a front-facing, upright photo. The circle and its center are placed manually.
              Circle-only edits preserve separately entered offsets.
            </p>
            {initial.photoId && initial.photoId !== photo.id && (
              <p className="muted">Saving replaces the active measurement from the other photo.</p>
            )}
          </aside>
          <TargetConnections
            canvasRef={canvasElement}
            panelRef={valuesPanel}
            geometry={draft.geometry}
            field={activeField}
          />
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
            busy ||
            !image ||
            !!mismatch ||
            (!draft.reportCrop && !draft.calibration && (!draft.geometry || !draft.mmPerPixel)) ||
            (!!draft.calibration && calibrationScale(draft.calibration) === null) ||
            (!!draft.geometry && !draft.mmPerPixel)
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
