import { defineConfig } from 'vitest/config';

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
  define: { __APP_VERSION__: JSON.stringify('test'), __BUILD_REVISION__: JSON.stringify('test') },
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
});
