import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateNotice() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  if (!needRefresh) return null;
  return (
    <aside className="update-notice" role="status">
      <span>A new version is ready. Reload when you have finished importing.</span>
      <button className="primary" onClick={() => void updateServiceWorker(true)}>
        Reload
      </button>
      <button onClick={() => setNeedRefresh(false)}>Later</button>
    </aside>
  );
}
