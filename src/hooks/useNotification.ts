import { useCallback, useEffect, useState } from 'react';

/** Give each notification a fresh lifetime, including repeated messages with identical text. */
export function useNotification() {
  const [notification, setNotification] = useState<{ text: string } | null>(null);
  const showMessage = useCallback((text: string) => setNotification({ text }), []);
  const dismissMessage = useCallback(() => setNotification(null), []);
  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(() => setNotification(null), 10_000);
    return () => window.clearTimeout(timeout);
  }, [notification]);
  return { message: notification?.text ?? '', showMessage, dismissMessage };
}
