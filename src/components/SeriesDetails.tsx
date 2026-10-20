import { useEffect, useState } from 'react';
import type {
  Annotation,
  Attachment,
  FieldDefinition,
  Series,
  Tag,
  UnitSystem,
} from '../domain/model';
import { fieldDisplay, fieldUnit, parseFieldInput } from '../domain/customFields';
import { saveSeriesDetails } from '../storage/customization';
import { addPhoto, removePhoto } from '../storage/attachments';
import { db } from '../storage/database';
import { Modal } from './Modal';
import { TagLabels } from './CustomizationManager';
import { TargetMeasurementPanel } from './TargetMeasurementPanel';

/** Load one photo on demand and release its object URL when the card unmounts. */
function PhotoCard({ photo, onError }: { photo: Attachment; onError: (message: string) => void }) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState(photo.caption);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    void db.attachmentContents
      .get(photo.id)
      .then((content) => {
        if (!content || cancelled) return;
        objectUrl = URL.createObjectURL(content.blob);
        setUrl(objectUrl);
      })
      .catch(() => onError('The photo could not be loaded.'));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id, onError]);
  return (
    <article className="photo-card">
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${photo.name} at full size`}
        >
          <img src={url} alt={photo.caption || photo.name} />
        </a>
      )}
      <small>
        {photo.name} · {(photo.size / 1024 / 1024).toFixed(1)} MiB
      </small>
      <label className="field">
        Caption
        <input
          value={caption}
          maxLength={500}
          onChange={(event) => setCaption(event.target.value)}
        />
      </label>
      <button
        disabled={busy || caption === photo.caption}
        onClick={async () => {
          setBusy(true);
          try {
            await db.attachments.update(photo.id, { caption });
          } catch {
            onError('The caption could not be saved.');
          } finally {
            setBusy(false);
          }
        }}
      >
        Save caption
      </button>
      <button disabled={busy} onClick={() => setConfirm(true)}>
        Remove photo
      </button>
      {confirm && (
        <div className="removal">
          <p>Remove this photo from local storage?</p>
          <button
            disabled={busy}
            className="danger-button"
            onClick={async () => {
              setBusy(true);
              try {
                await removePhoto(photo.id);
              } catch {
                onError('The photo could not be removed.');
                setBusy(false);
              }
            }}
          >
            Confirm removal
          </button>
          <button onClick={() => setConfirm(false)}>Keep</button>
        </div>
      )}
    </article>
  );
}

/** Edit local series context independently of imported rows; photo actions save immediately. */
export function SeriesDetails({
  series,
  annotation,
  fields,
  tags,
  photos,
  units,
  onClose,
}: {
  series: Series;
  annotation?: Annotation;
  fields: FieldDefinition[];
  tags: Tag[];
  photos: Attachment[];
  units: UnitSystem;
  onClose: () => void;
}) {
  // Freeze entry units until this editor closes so another tab cannot reinterpret unsaved numbers.
  const [editorUnits] = useState(units);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [tagIds, setTagIds] = useState<string[] | undefined>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={series.name} onClose={onClose} wide>
      <p className="muted">
        Series fields and tags apply to every shot. Refresh preserves these local details.
      </p>
      <TargetMeasurementPanel
        seriesId={series.id}
        target={annotation?.target}
        photos={photos}
        units={editorUnits}
      />
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            const patch: Record<string, string | number | undefined> = {};
            for (const [id, text] of Object.entries(edits)) {
              const field = fields.find((item) => item.id === id);
              if (!field) throw new Error('A field was removed. Reopen the series.');
              patch[id] = parseFieldInput(text, field.type, editorUnits);
            }
            await saveSeriesDetails(series.id, patch, tagIds);
            onClose();
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Details could not be saved.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="custom-field-grid">
          {fields.map((field) => (
            <label className={`field ${field.type === 'note' ? 'wide-field' : ''}`} key={field.id}>
              {field.name}
              {fieldUnit(field.type, editorUnits) ? ` (${fieldUnit(field.type, editorUnits)})` : ''}
              {field.type === 'note' ? (
                <textarea
                  rows={4}
                  value={
                    edits[field.id] ??
                    fieldDisplay(annotation?.values?.[field.id], field.type, editorUnits)
                  }
                  onChange={(event) =>
                    setEdits((current) => ({ ...current, [field.id]: event.target.value }))
                  }
                />
              ) : (
                <input
                  type={field.type === 'short-text' ? 'text' : 'number'}
                  step="any"
                  min={['weight', 'speed', 'distance'].includes(field.type) ? 0 : undefined}
                  maxLength={field.type === 'short-text' ? 100 : undefined}
                  value={
                    edits[field.id] ??
                    fieldDisplay(annotation?.values?.[field.id], field.type, editorUnits)
                  }
                  onChange={(event) =>
                    setEdits((current) => ({ ...current, [field.id]: event.target.value }))
                  }
                />
              )}
            </label>
          ))}
        </div>
        {!fields.length && <p className="muted">Define fields in Profile → Custom fields.</p>}
        <fieldset>
          <legend>Tags</legend>
          {tags.map((tag) => (
            <label className="check-field compact" key={tag.id}>
              <input
                type="checkbox"
                checked={(tagIds ?? annotation?.tagIds ?? []).includes(tag.id)}
                onChange={(event) => {
                  const current = tagIds ?? annotation?.tagIds ?? [];
                  setTagIds(
                    event.target.checked
                      ? [...current, tag.id]
                      : current.filter((id) => id !== tag.id),
                  );
                }}
              />
              <TagLabels tags={[tag]} />
            </label>
          ))}
          {!tags.length && <p className="muted">Create tags in Profile → Tags.</p>}
        </fieldset>
        <footer className="dialog-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary" disabled={busy}>
            Save details
          </button>
        </footer>
      </form>
      <hr />
      <h3>Photos</h3>
      <p className="muted">
        JPEG, PNG or WebP, up to 20 MiB and 60 megapixels each. Photo and caption changes save
        immediately. Open a thumbnail for full size.
      </p>
      <label className={`file-picker ${busy ? 'disabled' : ''}`}>
        Add photos
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            setBusy(true);
            setError('');
            try {
              for (const file of files) await addPhoto(series.id, file);
            } catch (error) {
              setError(
                `${error instanceof Error ? error.message : 'Photo could not be saved.'} Earlier successful additions are retained. Check storage space if needed.`,
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="photo-grid">
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} onError={setError} />
        ))}
      </div>
    </Modal>
  );
}
