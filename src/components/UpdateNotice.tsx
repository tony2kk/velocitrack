import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { reloadApplication } from '../pwa/reload';

// This tab reloads only after its own Reload button is clicked.
const onNeedReload = () => {};

/** Ask this tab to opt into an available app update, reporting progress and retryable failures. */
export function UpdateNotice() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
  } = useRegisterSW({ immediate: true, onNeedReload });
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState('');
  if (!needRefresh) return null;
  return (
    <aside className="update-notice" role="status">
      <span>A new version is ready. Reload when you have finished importing.</span>
      {error && <span role="alert">{error}</span>}
      <button
        className="primary"
        disabled={reloading}
        onClick={async () => {
          setReloading(true);
          setError('');
          try {
            await reloadApplication(navigator.serviceWorker, location.href, () =>
              location.reload(),
            );
          } catch {
            setError('The update could not finish. Please try Reload again.');
            setReloading(false);
          }
        }}
      >
        {reloading ? 'Reloading…' : 'Reload'}
      </button>
      <button disabled={reloading} onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </aside>
  );
}
