/** Browser-owned domain records; provider fields are preserved separately as raw data. */
export type CatalogKind = 'firearm' | 'projectile';
export type SourceKind = 'velociradar-export' | 'caldwell';
export type SourceStatus = 'ready' | 'needs-files' | 'needs-sign-in' | 'needs-setup' | 'error';
export type RawRecord = Record<string, unknown>;
export type UnitSystem = 'imperial' | 'metric';
export type ShotDetail = 'muzzleVelocity' | 'g1' | 'g7';
export type AnalysisMode = 'simple' | 'dual' | 'compare' | 'info';
export type ChartQuantity = string;
/** Each analysis keeps independent axis/quantity choices across visits. */
export interface ChartSettings {
  axis: 'distance' | 'shot';
  quantity: ChartQuantity;
  secondary: ChartQuantity;
}
/** Persist intent even when a temporary selection has no usable readings. */
export interface AnalysisSettings {
  mode: AnalysisMode;
  simple: ChartSettings;
  dual: ChartSettings;
  compare: ChartSettings;
}

/** Return independent objects so changes to one analysis never alter another. */
export function defaultAnalysis(): AnalysisSettings {
  return {
    mode: 'simple',
    simple: { axis: 'distance', quantity: 'velocity', secondary: 'g1' },
    dual: { axis: 'shot', quantity: 'velocity', secondary: 'g1' },
    compare: { axis: 'shot', quantity: 'velocity', secondary: 'g1' },
  };
}

/** Shared public service identifiers; user credentials and account bindings remain separate. */
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

/** One recorded shot in the adapter's imperial input units; rawUnit preserves provider metadata. */
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

/** Legacy annotation variants are retained for lossless workspace migration and backup. */
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
  values?: Record<string, string | number>;
  tagIds?: string[];
}

/** Typed series fields; dimensional numbers are stored in gr, ft/s and ft, independently of display. */
export type FieldType =
  | 'short-text'
  | 'note'
  | 'number'
  | 'weight'
  | 'weight-grams'
  | 'weight-grains'
  | 'speed'
  | 'distance';
/** Workspace-wide definition with stable identity and user-controlled ordering. */
export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  order: number;
  showInNavigator?: boolean;
}
/** Reusable named label; color is a validated six-digit hex value. */
export interface Tag {
  id: string;
  name: string;
  color: string;
}
/** Photo metadata stays separate from bytes so normal workspace reads do not load every image. */
export interface Attachment {
  id: string;
  seriesId: string;
  name: string;
  caption: string;
  mime: string;
  size: number;
  createdAt: string;
}
/** Browser-owned original raster bytes, referenced by attachment identity. */
export interface AttachmentContent {
  id: string;
  blob: Blob;
}

/** Persisted criteria: OR within each list, AND between lists; relative dates stay relative. */
export interface Filters {
  tagIds?: string[];
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
  tableSort?: { columnId: string; direction: 'asc' | 'desc' };
  tableColumns?: string[];
  infoSeriesId?: string;
  analysis?: AnalysisSettings;
  theme?: 'light' | 'dark' | 'auto';
  showProjectileWeight?: boolean;
  visibleFieldIds?: string[];
  showTags?: boolean;
  id: 'local';
  nickname: string;
  rememberSignIn: boolean;
  refreshOnStart: boolean;
  unitSystem: UnitSystem;
  shotDetail: ShotDetail;
  filters: Filters;
  /** Shared technical provider settings, never a password or an account token. */
  caldwellConnection?: CaldwellConnection;
}

export const EMPTY_FILTERS: Filters = {
  tagIds: [],
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
    unitSystem: 'imperial',
    shotDetail: 'muzzleVelocity',
    analysis: defaultAnalysis(),
    theme: 'auto',
    showProjectileWeight: false,
    filters: structuredClone(EMPTY_FILTERS),
  };
}

/** Encode identity tuples without delimiter collisions, even when provider IDs contain punctuation. */
export function entityId(...parts: string[]): string {
  return JSON.stringify(parts);
}
