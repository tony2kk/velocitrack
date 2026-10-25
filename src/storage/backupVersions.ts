/** Archive envelope and workspace data evolve independently of app releases and IndexedDB indexes. */
export const BACKUP_FORMAT_VERSION = 2;
export const BACKUP_DATA_VERSION = 3;

/** Information shown before replacement, including migrations already applied to the in-memory copy. */
export interface BackupCompatibility {
  appVersion?: string;
  appRevision?: string;
  currentAppVersion: string;
  formatVersion: number;
  dataVersion: number;
  targetDataVersion: number;
  changes: string[];
  notices: string[];
}

/** Accept release identifiers without interpreting an app release as a data-schema version. */
function releaseVersion(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 100 &&
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)
  );
}

/** Read only known envelopes; legacy archives did not record an app version or data version. */
export function backupCompatibility(manifest: Record<string, unknown>): BackupCompatibility {
  const version = manifest.version;
  const sourceApp = releaseVersion(manifest.appVersion) ? manifest.appVersion : 'not recorded';
  if (version !== 1 && version !== BACKUP_FORMAT_VERSION)
    throw new Error(
      `Backup format ${String(version).slice(0, 40)} is not supported by VelociTrack ${__APP_VERSION__}. Backup app: ${sourceApp}. Update the app before restoring. Your workspace has not been changed.`,
    );
  const dataVersion = version === 1 ? 1 : manifest.dataVersion;
  if (
    !Number.isSafeInteger(dataVersion) ||
    typeof dataVersion !== 'number' ||
    dataVersion < 1 ||
    dataVersion > BACKUP_DATA_VERSION
  )
    throw new Error(
      `Backup data version ${String(dataVersion).slice(0, 40)} is not supported by VelociTrack ${__APP_VERSION__} (supports 1–${BACKUP_DATA_VERSION}). Backup app: ${sourceApp}. Update the app before restoring. Your workspace has not been changed.`,
    );
  if (
    version === 1 &&
    ['appVersion', 'appRevision', 'dataVersion'].some((key) => Object.hasOwn(manifest, key))
  )
    throw new Error('The legacy backup has conflicting version metadata. Nothing was restored.');
  if (
    version === 2 &&
    (!releaseVersion(manifest.appVersion) ||
      typeof manifest.appRevision !== 'string' ||
      !/^[a-zA-Z0-9._-]{1,100}$/.test(manifest.appRevision))
  )
    throw new Error('Missing or invalid backup application version. Nothing was restored.');
  const appVersion = version === 2 ? (manifest.appVersion as string) : undefined;
  return {
    appVersion,
    appRevision: version === 2 ? (manifest.appRevision as string) : undefined,
    currentAppVersion: __APP_VERSION__,
    formatVersion: version,
    dataVersion,
    targetDataVersion: BACKUP_DATA_VERSION,
    changes: [],
    notices: [
      ...(!appVersion
        ? [
            'This legacy backup did not record its app version. Compatibility is checked against its stored data.',
          ]
        : appVersion !== __APP_VERSION__
          ? [
              'This backup was created by a different app release. Its data format is supported and all records have been validated.',
            ]
          : []),
      'Reports and calculated curves use the current app. Original measurements, notes and photo bytes are preserved; missing derived weather values are not invented.',
    ],
  };
}
