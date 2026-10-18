/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** Public package version embedded by Vite in the running app, including offline builds. */
declare const __APP_VERSION__: string;
/** Short source commit, optionally suffixed with -dirty; local when Git is unavailable. */
declare const __BUILD_REVISION__: string;
