import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};

/** Identify the source checkout without exposing paths, remotes or local configuration. */
function buildRevision(): string {
  try {
    const options: ExecFileSyncOptionsWithStringEncoding = {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    };
    const revision = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], options).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], options).trim().length > 0;
    return `${revision}${dirty ? '-dirty' : ''}`;
  } catch {
    // Source archives can be built without Git; do not imply a known commit in that case.
    return 'local';
  }
}

export default defineConfig({
  base: '/velocitrack/',
  // Inject only public build identity. Never expose process.env or provider settings.
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_REVISION__: JSON.stringify(buildRevision()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['brand/*.{svg,png,ico}'],
      manifest: {
        name: 'VelociTrack',
        short_name: 'VelociTrack',
        description: 'Your local measurement workspace.',
        theme_color: '#08796e',
        background_color: '#f6f7f4',
        display: 'standalone',
        start_url: '/velocitrack/',
        scope: '/velocitrack/',
        icons: [
          {
            src: 'brand/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Precache the app shell only; account requests and user data are never runtime-cached.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Large opt-in demo/photos and walkthrough images are downloaded only when requested.
        globIgnores: ['demo/**', 'help/media/**'],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/velocitrack\/(?:index\.html)?$/],
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 4180,
    strictPort: true,
    fs: {
      // Preserve Vite's default denials and keep local setup/study files out of its file server.
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem,key,p12,pfx,cer,der}',
        '.npmrc',
        '.yarnrc.yml',
        '**/.git/**',
        '**/.local/**',
        '**/.private/**',
      ],
    },
  },
  preview: { host: '127.0.0.1', port: 4180, strictPort: true },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        help: fileURLToPath(new URL('./help/index.html', import.meta.url)),
      },
    },
  },
});
