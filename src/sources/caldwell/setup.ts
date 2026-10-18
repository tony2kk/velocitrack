import { defaultProfile, type CaldwellConnection, type DataSource } from '../../domain/model';
import { db } from '../../storage/database';
import { parseConnectionSettings } from './configuration';
import { CaldwellError } from './errors';

/** Load local preview metadata, without transmitting any account identifier or credential. */
export async function loadLocalConnection(): Promise<CaldwellConnection> {
  try {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) throw new Error();
    const response = await fetch(`${import.meta.env.BASE_URL}local-caldwell-settings`, {
      cache: 'no-store',
      credentials: 'omit',
      mode: 'same-origin',
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error();
    const text = await response.text();
    if (new TextEncoder().encode(text).length > 16_384) throw new Error();
    return parseConnectionSettings(text);
  } catch {
    throw new CaldwellError(
      'Caldwell sign-in is unavailable in this installation. Try again or contact the app maintainer.',
      'setup',
    );
  }
}

/**
 * Prepare a source without asking the user for technical configuration.
 * Reuse browser-local settings before contacting the local preview helper; never replace a bound source.
 */
export async function prepareCaldwellSource(
  sourceId: string,
  database = db,
  loadSettings = loadLocalConnection,
): Promise<DataSource> {
  const source = await database.sources.get(sourceId);
  if (!source || source.kind !== 'caldwell')
    throw new CaldwellError('This Caldwell source no longer exists.', 'setup');
  if (source.connection) return source;

  let connection = (await database.profiles.get('local'))?.caldwellConnection;
  if (!connection) {
    // Migrate existing browser setups without choosing arbitrarily between different projects.
    const configured = (await database.sources.toArray())
      .filter((item) => item.kind === 'caldwell' && item.connection)
      .map((item) => JSON.stringify(item.connection));
    const unique = [...new Set(configured)];
    if (unique.length === 1) connection = parseConnectionSettings(unique[0]!);
  }
  connection = connection ?? (await loadSettings());
  const settings = parseConnectionSettings(JSON.stringify(connection));

  return database.transaction('rw', [database.sources, database.profiles], async () => {
    const current = await database.sources.get(sourceId);
    if (!current || current.kind !== 'caldwell')
      throw new CaldwellError('This Caldwell source no longer exists.', 'setup');
    // Another tab may have finished setup while this tab was loading the metadata.
    if (current.connection) return current;
    const profile = (await database.profiles.get('local')) ?? defaultProfile();
    await database.profiles.put({
      ...profile,
      caldwellConnection: profile.caldwellConnection ?? settings,
    });
    const ready: DataSource = {
      ...current,
      connection: settings,
      status: 'needs-sign-in',
      error: undefined,
    };
    await database.sources.put(ready);
    return ready;
  });
}
