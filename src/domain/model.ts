/** Browser-owned domain records; provider fields are preserved separately as raw data. */
export type CatalogKind = 'firearm' | 'projectile';
export type SourceKind = 'velociradar-export' | 'caldwell';
export type SourceStatus = 'ready' | 'needs-files' | 'needs-sign-in' | 'needs-setup' | 'error';
export type RawRecord = Record<string, unknown>;

/** Connection settings belong only to this browser, never to the build. */
export interface CaldwellConnection {
  projectId: string;
  apiKey: string;
}

/** Import configuration and status for one local source, optionally bound to an SDK account. */
export interface DataSource {
  id: string;
  name: string;
  kind: SourceKind;
  enabled: boolean;
  autoUpdateCatalogs: boolean;
  createdAt: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  status: SourceStatus;
  error?: string;
  connection?: CaldwellConnection;
  accountId?: string;
}

/** A provider identity is meaningful only within its source. */
export interface CatalogLink {
  sourceId: string;
  remoteId: string;
}

/** Shared display name with explicit source links and optional source-controlled naming. */
export interface CatalogItem {
  id: string;
  kind: CatalogKind;
  name: string;
  links: CatalogLink[];
  managedBySourceId?: string;
}

/** Imported measurement session with local catalog references and its original provider row. */
export interface Series {
  id: string;
  sourceId: string;
  remoteId: string;
  name: string;
  startedAt: string | null;
  firearmId: string;
  projectileId: string;
  raw: RawRecord;
}

/** One recorded shot; rawUnit is an opaque provider code, not a validated physical unit. */
export interface Shot {
  id: string;
  sourceId: string;
  seriesId: string;
  remoteId: string;
  number: number;
  muzzleVelocity: number | null;
  ballisticCoefficientG1: number | null;
  ballisticCoefficientG7: number | null;
  distances: number[];
  velocities: number[];
  excluded: boolean;
  rawUnit: string;
  raw: RawRecord;
}

/** Storage variants for future annotation editors; field definitions are not yet implemented. */
export type CustomFieldValue =
  | { type: 'text'; value: string }
  | { type: 'number'; value: number; unit?: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'date'; value: string }
  | { type: 'choice'; value: string };

/** Local annotations are separate from replaceable imported records. */
export interface Annotation {
  entityId: string;
  notes: string;
  fields: Record<string, CustomFieldValue>;
}

/** Persisted criteria: OR within each list, AND between lists; relative dates stay relative. */
export interface Filters {
  sourceIds: string[];
  firearmIds: string[];
  projectileIds: string[];
  dateMode: 'all' | 'range' | 'weeks' | 'months';
  dateFrom: string;
  dateTo: string;
  relativeAmount: number;
}

/** Singleton local preferences, independent of any connected provider account. */
export interface Profile {
  id: 'local';
  nickname: string;
  rememberSignIn: boolean;
  refreshOnStart: boolean;
  filters: Filters;
}

export const EMPTY_FILTERS: Filters = {
  sourceIds: [],
  firearmIds: [],
  projectileIds: [],
  dateMode: 'all',
  dateFrom: '',
  dateTo: '',
  relativeAmount: 4,
};

/** Return fresh defaults so changing one profile cannot mutate the shared filter template. */
export function defaultProfile(): Profile {
  return {
    id: 'local',
    nickname: '',
    rememberSignIn: false,
    refreshOnStart: false,
    filters: structuredClone(EMPTY_FILTERS),
  };
}

/** Encode identity tuples without delimiter collisions, even when provider IDs contain punctuation. */
export function entityId(...parts: string[]): string {
  return JSON.stringify(parts);
}
