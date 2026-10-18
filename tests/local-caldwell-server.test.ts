import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { connectionSettingsMiddleware } from '../dev/caldwell-setup';

const settings = { projectId: 'synthetic-project', apiKey: 'synthetic-key-for-tests-only' };

/** Exercise the helper's request boundary without opening sockets or reading private files. */
async function request(overrides: Record<string, unknown> = {}, text = JSON.stringify(settings)) {
  const read = vi.fn().mockResolvedValue(text);
  const headers: Record<string, string> = {};
  const response = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    writeHead: vi.fn().mockReturnThis(),
    end: vi.fn(),
  };
  const next = vi.fn();
  await connectionSettingsMiddleware(read)(
    {
      url: '/velocitrack/local-caldwell-settings',
      method: 'GET',
      socket: { remoteAddress: '127.0.0.1' },
      headers: { host: '127.0.0.1:4180', 'sec-fetch-site': 'same-origin' },
      ...overrides,
    } as unknown as IncomingMessage,
    response as unknown as ServerResponse,
    next,
  );
  return { read, response, headers, next };
}

describe('local-only setup helper', () => {
  it('returns only technical connection metadata with caching disabled', async () => {
    const result = await request(
      {},
      JSON.stringify({
        ...settings,
        password: 'synthetic-discarded',
        accountId: 'synthetic-owner',
      }),
    );
    expect(JSON.parse(result.response.end.mock.calls[0]![0])).toEqual(settings);
    expect(result.headers['Cache-Control']).toBe('no-store');
    expect(result.headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  it.each([
    { headers: { host: 'example.test:4180' } },
    { headers: { host: '127.0.0.1:4180', origin: 'https://example.test' } },
    { headers: { host: '127.0.0.1:4180', 'sec-fetch-site': 'same-site' } },
    { socket: { remoteAddress: '192.0.2.1' } },
  ])('rejects non-local or cross-origin access without reading settings: %j', async (overrides) => {
    const result = await request(overrides);
    expect(result.response.writeHead).toHaveBeenCalledWith(403);
    expect(result.read).not.toHaveBeenCalled();
  });

  it('rejects writes and never accepts credentials', async () => {
    const result = await request({ method: 'POST' });
    expect(result.response.writeHead).toHaveBeenCalledWith(405);
    expect(result.read).not.toHaveBeenCalled();
  });

  it('leaves unrelated routes to the preview server', async () => {
    const result = await request({ url: '/velocitrack/' });
    expect(result.next).toHaveBeenCalledOnce();
    expect(result.read).not.toHaveBeenCalled();
  });

  it('does not expose malformed private settings in errors', async () => {
    const result = await request({}, 'synthetic private parse failure');
    expect(result.response.writeHead).toHaveBeenCalledWith(503);
    expect(result.response.end).toHaveBeenCalledWith('{}');
  });
});
