import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Modal } from './Modal';

/** Follow active imports while allowing the user to keep working without cancelling a download. */
export function RefreshProgress({ sourceNames }: { sourceNames: string[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <Modal title="Refreshing data" onClose={() => setDismissed(true)}>
      <div className="refresh-progress" role="status" aria-live="polite">
        <LoaderCircle className="loading-spinner" size={38} aria-hidden="true" />
        <p>Loading {sourceNames.length ? sourceNames.join(', ') : 'sources'}...</p>
      </div>
      <div className="dialog-actions">
        <button onClick={() => setDismissed(true)}>Continue in background</button>
      </div>
    </Modal>
  );
}
