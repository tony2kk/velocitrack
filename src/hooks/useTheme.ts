import { useEffect, useSyncExternalStore } from 'react';
import type { Profile } from '../domain/model';

/** Subscribe to operating-system changes only; explicit profile choices override this signal. */
function subscribe(listener: () => void) {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}
/** Read a safe default for older browsers and DOM tests without matchMedia. */
function systemDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}
/** Apply one resolved theme to native controls, CSS surfaces and canvas charts. */
export function useTheme(theme: Profile['theme'] = 'auto'): boolean {
  const automatic = useSyncExternalStore(subscribe, systemDark);
  const dark = theme === 'dark' || (theme === 'auto' && automatic);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);
  return dark;
}
