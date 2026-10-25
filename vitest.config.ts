import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';

export default defineConfig({
  // Component tests mock this build-only module; resolving it must not register a real worker.
  plugins: [
    {
      name: 'test-pwa-registration',
      resolveId(id) {
        if (id === 'virtual:pwa-register/react') return id;
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(
      JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version,
    ),
    __BUILD_REVISION__: JSON.stringify('test'),
  },
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
});
