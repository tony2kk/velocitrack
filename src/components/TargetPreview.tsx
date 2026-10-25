import { useEffect, useState } from 'react';
import type { UnitSystem } from '../domain/model';
import type { TargetMeasurement } from '../domain/targetMeasurement';
import { db } from '../storage/database';
import { renderTargetPhoto } from '../reports/renderTarget';
import { Modal } from './Modal';

/** Read-only preview reuses PDF rendering and never changes measurements, framing or selection. */
export function TargetPreview({
  name,
  target,
  units,
  onClose,
}: {
  name: string;
  target: TargetMeasurement;
  units: UnitSystem;
  onClose: () => void;
}) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    /** Load only this local photo, releasing decoder resources even if the dialog closes early. */
    async function load() {
      try {
        const record = target.photoId ? await db.attachmentContents.get(target.photoId) : undefined;
        if (!record) throw new Error('The target photo is missing. Restore it from a backup.');
        const result = await renderTargetPhoto(record.blob, target, units);
        if (!cancelled) setImage(result);
      } catch (error) {
        if (!cancelled)
          setError(error instanceof Error ? error.message : 'The target could not be opened.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [target, units]);
  return (
    <Modal title={`Target · ${name}`} onClose={onClose} wide>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : image ? (
        <img
          className="target-preview"
          src={image}
          alt={`Measured target for ${name}, with dimensions and scale`}
        />
      ) : (
        <p role="status">Loading target…</p>
      )}
    </Modal>
  );
}
