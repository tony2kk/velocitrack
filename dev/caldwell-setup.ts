import { readFile, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { parseConnectionSettings } from '../src/sources/caldwell/configuration.ts';

const endpoint = '/velocitrack/local-caldwell-settings';

/** Serve only allowlisted connection metadata to the same-origin loopback app, never credentials. */
export function connectionSettingsMiddleware(readSettings: () => Promise<string>) {
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    if (request.url?.split('?')[0] !== endpoint) return next();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      response.writeHead(405).end('{}');
      return;
    }
    try {
      const origin = new URL(`http://${request.headers.host}`).origin;
      const hostname = new URL(origin).hostname;
      const remote = request.socket.remoteAddress;
      const site = request.headers['sec-fetch-site'];
      if (
        !['127.0.0.1', 'localhost', '[::1]'].includes(hostname) ||
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote ?? '') ||
        (request.headers.origin && request.headers.origin !== origin) ||
        (site && site !== 'same-origin' && site !== 'none')
      ) {
        response.writeHead(403).end('{}');
        return;
      }
      const text = await readSettings();
      if (Buffer.byteLength(text, 'utf8') > 16_384) throw new Error('Oversized settings');
      response.end(JSON.stringify(parseConnectionSettings(text)));
    } catch {
      // Never send filenames, supplied fields or raw parse failures to the browser/logs.
      response.writeHead(503).end('{}');
    }
  };
}

/** Add local development/preview setup only; no build hook emits these settings into dist. */
export function localCaldwellSetupPlugin(settingsPath: string): Plugin {
  const middleware = connectionSettingsMiddleware(async () => {
    if ((await stat(settingsPath)).size > 16_384) throw new Error('Oversized settings');
    return readFile(settingsPath, 'utf8');
  });
  return {
    name: 'local-caldwell-setup',
    /** Prepare the local development app without exposing the underlying file. */
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    /** Give the locally served production build the same setup flow as development. */
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
