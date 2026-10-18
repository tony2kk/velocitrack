export type CatalogKind = 'firearm' | 'projectile';
export type SourceStatus = 'ready' | 'needs-files' | 'error';
export type RawRecord = Record<string, unknown>;

export interface DataSource {
  id: string;
  name: string;
  kind: 'velociradar-export';
  enabled: boolean;
  autoUpdateCatalogs: boolean;
  createdAt: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  status: SourceStatus;
  error?: string;
}

export interface CatalogLink {
  sourceId: string;
  remoteId: string;
}

export interface CatalogItem {
  id: string;
  kind: CatalogKind;
  name: string;
  links: CatalogLink[];
  managedBySourceId?: string;
}

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

export interface Filters {
  sourceIds: string[];
  firearmIds: string[];
  projectileIds: string[];
  dateMode: 'all' | 'range' | 'weeks' | 'months';
  dateFrom: string;
  dateTo: string;
  relativeAmount: number;
}

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

export function defaultProfile(): Profile {
  return {
    id: 'local',
    nickname: '',
    rememberSignIn: false,
    refreshOnStart: false,
    filters: structuredClone(EMPTY_FILTERS),
  };
}

export function entityId(...parts: string[]): string {
  return JSON.stringify(parts);
}
