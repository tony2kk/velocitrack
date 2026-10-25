import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/** Repack invented test archives with valid checksums so tests exercise schema compatibility, not corruption. */
export async function rewriteBackup(
  bytes: Uint8Array,
  edit: (manifest: Record<string, unknown>, data: Record<string, unknown>) => void,
): Promise<Uint8Array> {
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(strFromU8(entries['manifest.json']!));
  const data: Record<string, unknown> = {};
  for (const [path, entry] of Object.entries(entries)) {
    if (path.startsWith('data/')) data[path.slice(5, -5)] = JSON.parse(strFromU8(entry));
  }
  edit(manifest, data);
  for (const [name, value] of Object.entries(data))
    entries[`data/${name}.json`] = strToU8(JSON.stringify(value));
  manifest.files = await Promise.all(
    Object.entries(entries)
      .filter(([path]) => path !== 'manifest.json')
      .map(async ([path, value]) => ({
        path,
        size: value.length,
        sha256: Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(value))),
          (byte) => byte.toString(16).padStart(2, '0'),
        ).join(''),
      })),
  );
  entries['manifest.json'] = strToU8(JSON.stringify(manifest));
  return zipSync(entries);
}

/** Version-one envelopes, used by releases 0.4–0.20, had no application or data version. */
export function legacyManifest(manifest: Record<string, unknown>): void {
  manifest.version = 1;
  delete manifest.appVersion;
  delete manifest.appRevision;
  delete manifest.dataVersion;
}

/** Fixed 0.4-era profile shape; intentionally not derived from today's profile defaults. */
export function legacyProfile() {
  return {
    id: 'local',
    nickname: 'Synthetic legacy profile',
    rememberSignIn: false,
    refreshOnStart: false,
    unitSystem: 'metric',
    shotDetail: 'g1',
    filters: {
      sourceIds: [],
      firearmIds: [],
      projectileIds: [],
      dateMode: 'all',
      dateFrom: '',
      dateTo: '',
      relativeAmount: 4,
    },
  };
}
