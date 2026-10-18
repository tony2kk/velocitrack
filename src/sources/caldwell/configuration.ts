import type { CaldwellConnection } from '../../domain/model';

/** Accept only the two local connection fields; never trust imported endpoints or account IDs. */
export function parseConnectionSettings(text: string): CaldwellConnection {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Connection settings must be a JSON object.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Connection settings must be a JSON object.');
  const { projectId, apiKey } = value as Record<string, unknown>;
  if (typeof projectId !== 'string' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId))
    throw new Error('Connection settings contain an invalid project ID.');
  if (typeof apiKey !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(apiKey))
    throw new Error('Connection settings contain an invalid API key.');
  // Ignore extra fields, including endpoints, identifiers and possible credentials.
  return { projectId, apiKey };
}
