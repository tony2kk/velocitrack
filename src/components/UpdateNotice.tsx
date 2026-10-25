import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { reloadApplication } from '../pwa/reload';
import { monitorUpdates, type UpdateMonitor } from '../pwa/updates';

// This tab reloads only after its own Reload button is clicked.
const onNeedReload = () => {};

/** Footer version doubles as a manual update check; prompts never interrupt work with an automatic reload. */
export function UpdateNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
  } = useRegisterSW({
    immediate: true,
    onNeedReload,
    onRegisteredSW: (_url, value) => setRegistration(value),
    onRegisterError: () => setRegistrationFailed(true),
  });
  const monitor = useRef<UpdateMonitor | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!registration) return;
    const watcher = monitorUpdates(registration, () => {
      setNeedRefresh(true);
      setCheckMessage('');
    });
    monitor.current = watcher;
    return () => {
      watcher.stop();
      monitor.current = null;
    };
  }, [registration, setNeedRefresh]);

  /** Manual checks report connectivity and installation status instead of silently doing nothing. */
  async function checkForUpdates() {
    if (!monitor.current) {
      setCheckMessage(
        import.meta.env.DEV
          ? 'Development preview: reload the browser to load changes.'
          : registrationFailed
            ? 'Update setup failed. Check connectivity and reload the browser to retry.'
            : 'Update checking is not ready. Check connectivity, then reload the browser if this persists.',
      );
      return;
    }
    setChecking(true);
    setCheckMessage('');
    const result = await monitor.current.check();
    setChecking(false);
    setCheckMessage(
      {
        available: '',
        current: 'No new version found.',
        installing: 'An update is downloading. Reload will appear when it is ready.',
        offline: 'Offline. Reconnect to check for updates.',
        failed: 'Could not check for updates. Check connectivity and try again.',
      }[result],
    );
  }

  return (
    <>
      <button
        className="app-version update-check"
        aria-label="Check for application updates"
        title={`Application version and source revision: v${__APP_VERSION__} · ${__BUILD_REVISION__}. Click to check for updates.`}
        disabled={checking || reloading}
        onClick={() => void checkForUpdates()}
      >
        <RefreshCw size={12} aria-hidden="true" />v{__APP_VERSION__} · {__BUILD_REVISION__}
        {checking ? ' · Checking…' : ''}
      </button>
      {checkMessage && <span role="status">{checkMessage}</span>}
      {needRefresh && (
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
      )}
    </>
  );
}
