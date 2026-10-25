import type { TargetMeasurement } from './targetMeasurement';
import type { ReportProfile } from './reportProfiles';

/** Browser-owned domain records; provider fields are preserved separately as raw data. */
export type CatalogKind = 'firearm' | 'projectile';
export type SourceKind = 'velociradar-export' | 'caldwell' | 'demo';
export type SourceStatus = 'ready' | 'needs-files' | 'needs-sign-in' | 'needs-setup' | 'error';
export type RawRecord = Record<string, unknown>;
export type UnitSystem = 'imperial' | 'metric';
export type ShotDetail = 'muzzleVelocity' | 'g1' | 'g7';
export type AnalysisMode = 'simple' | 'dual' | 'compare' | 'info';
export type ChartQuantity = string;
/** Each analysis keeps independent axis/quantity choices across visits. */
export interface ChartSettings {
  /** Maximum predicted distance in canonical feet; absent means the shared bounded default. */
  forecastDistance?: number;
  axis: 'distance' | 'shot' | 'string';
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
  /** Derived ideal-gas air density in kg/m³. Null means unavailable; absent in older records. */
  airDensity?: number | null;
  /** Derived ideal-mixture sound speed in m/s, with the same availability as airDensity. */
  soundSpeed?: number | null;
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
  /** String-only manual target dimensions and optional photo geometry; never provider data. */
  target?: TargetMeasurement;
  /** Persistent local shot exclusion, independent of replaceable provider records. */
  invalid?: boolean;
  entityId: string;
  notes: string;
  fields: Record<string, CustomFieldValue>;
  values?: Record<string, string | number>;
  tagIds?: string[];
}

/** Typed series fields; dimensional numbers are stored in gr, ft/s and ft, independently of display. */
export type FieldType =
  | 'list'
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
  /** Stable identities keep existing assignments intact when an option is renamed. */
  options?: ListOption[];
  id: string;
  name: string;
  type: FieldType;
  order: number;
  showInNavigator?: boolean;
}

/** A local list entry; annotations store its ID, never its editable label. */
export interface ListOption {
  id: string;
  name: string;
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
  /** Dismiss the first-workspace demo invitation permanently on this browser. */
  demoHintDismissed?: boolean;
  /** Local report templates and the Tools choice; absence selects Quick report. */
  reportProfiles?: ReportProfile[];
  selectedReportProfileId?: string;
  /** Local PDF section choices; missing preferences enable every section. */
  report?: ReportSettings;
  /** Physical PDF sheet size; independent of screen chart height. */
  reportPaperSize?: 'A4' | 'LETTER';
  tableSort?: { columnId: string; direction: 'asc' | 'desc' };
  /** Visible identities; their order is inherited from tableColumnOrder when present. */
  tableColumns?: string[];
  /** Complete column order, including hidden identities; visibility never changes it. */
  tableColumnOrder?: string[];
  infoSeriesId?: string;
  analysis?: AnalysisSettings;
  theme?: 'light' | 'dark' | 'auto';
  showProjectileWeight?: boolean;
  /** Optional local target diameter on each string card; unset values stay hidden. */
  showGroupSize?: boolean;
  /** Show imported string notes on cards; older profiles default to enabled. */
  showCaldwellNotes?: boolean;
  /** Chart height relative to the responsive default, in whole percent (70–200). */
  chartHeightPercent?: number;
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

/** Independent report sections; the current analysis selection supplies their content. */
export interface ReportSettings {
  details: boolean;
  target: boolean;
  statistics: boolean;
  chart: boolean;
  records: boolean;
}

/** All sections are included on first use and when restoring an older profile. */
export function defaultReportSettings(): ReportSettings {
  return { details: true, target: true, statistics: true, chart: true, records: true };
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
    reportProfiles: [],
    id: 'local',
    nickname: '',
    rememberSignIn: false,
    refreshOnStart: false,
    unitSystem: 'imperial',
    shotDetail: 'muzzleVelocity',
    analysis: defaultAnalysis(),
    theme: 'auto',
    showProjectileWeight: false,
    showGroupSize: false,
    showCaldwellNotes: true,
    chartHeightPercent: 100,
    reportPaperSize: 'A4',
    filters: structuredClone(EMPTY_FILTERS),
  };
}

/** Encode identity tuples without delimiter collisions, even when provider IDs contain punctuation. */
export function entityId(...parts: string[]): string {
  return JSON.stringify(parts);
}
