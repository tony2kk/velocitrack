import type { AnalysisMode, ChartSettings, ReportSettings } from './model';
import { MAX_FORECAST_DISTANCE } from './calculatedVelocity';

export const MAX_REPORT_PROFILES = 100;
export const MAX_REPORT_VIEWS = 50;
export const MAX_RENDERED_REPORT_VIEWS = 200;

/** Saved report composition excludes Quick report's screen-chart toggle. */
export type ReportSections = Omit<ReportSettings, 'chart'>;
/** String info has no axes or grouping; comparison always joins the selected strings. */
export type ReportView =
  | { id: string; mode: 'info' }
  | {
      id: string;
      mode: Exclude<AnalysisMode, 'info'>;
      settings: ChartSettings;
      grouping: 'combined' | 'per-string';
    };
/** A browser-owned reusable template. Array order is the exact order of its generated views. */
export interface ReportProfile {
  id: string;
  name: string;
  sections: ReportSections;
  views: ReportView[];
}

export const REPORT_MODE_LABELS: Record<AnalysisMode, string> = {
  simple: 'Simple',
  dual: 'Dual',
  compare: 'String compare',
  info: 'String info',
};

/** Names are unique regardless of case, compatibility characters or repeated whitespace. */
export function reportName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

/** Start an unsaved template; Quick report preferences remain independent. */
export function newReportProfile(): ReportProfile {
  return {
    id: crypto.randomUUID(),
    name: '',
    sections: { details: true, target: true, statistics: true, records: true },
    views: [],
  };
}

/** A new chart starts with recorded distance samples and automatic forecast extent. */
export function newReportView(
  mode: AnalysisMode = 'simple',
  id: string = crypto.randomUUID(),
): ReportView {
  return mode === 'info'
    ? { id, mode }
    : {
        id,
        mode,
        grouping: 'combined',
        settings: { axis: 'distance', quantity: 'velocity', secondary: 'calculated:g1' },
      };
}

/** Insert at a stable gap without changing any view settings or identities. */
export function reorderReportViews(views: ReportView[], id: string, gap: number): ReportView[] {
  const index = views.findIndex((view) => view.id === id);
  if (index < 0 || !Number.isInteger(gap) || gap < 0 || gap > views.length) return views;
  const result = views.filter((view) => view.id !== id);
  result.splice(gap > index ? gap - 1 : gap, 0, views[index]!);
  return result;
}

/** Validate untrusted local/archive template data without deleting unknown fields or choices. */
export function validateReportProfiles(
  value: unknown,
  selected?: unknown,
): asserts value is ReportProfile[] {
  const object = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === 'object' && !Array.isArray(item);
  const exact = (item: Record<string, unknown>, names: string[]) =>
    Object.keys(item).every((key) => names.includes(key));
  const identity = (item: unknown): item is string =>
    typeof item === 'string' && /^[a-zA-Z0-9_.:-]{1,200}$/.test(item);
  const fail = (message: string): never => {
    throw new Error(message);
  };
  if (!Array.isArray(value) || value.length > MAX_REPORT_PROFILES)
    fail(`Use up to ${MAX_REPORT_PROFILES} report profiles.`);
  const profiles = value as unknown[];
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const item of profiles) {
    if (
      !object(item) ||
      !exact(item, ['id', 'name', 'sections', 'views']) ||
      !identity(item.id) ||
      ids.has(item.id)
    )
      fail('Report profiles contain invalid or duplicate identities.');
    const profile = item as Record<string, unknown>;
    const name = typeof profile.name === 'string' ? reportName(profile.name) : '';
    if (!name || name.length > 100) fail('Each report profile needs a name of 1–100 characters.');
    if (name.toLowerCase() === 'quick report')
      fail('Quick report is reserved for the current workspace view. Choose another name.');
    if (names.has(name.toLowerCase()))
      fail('A report profile with this name already exists. Choose a unique name.');
    names.add(name.toLowerCase());
    ids.add(profile.id as string);
    const sections = profile.sections;
    if (
      !object(sections) ||
      !exact(sections, ['details', 'target', 'statistics', 'records']) ||
      !['details', 'target', 'statistics', 'records'].every(
        (key) => typeof sections[key] === 'boolean',
      )
    )
      fail('Invalid report sections.');
    if (!Array.isArray(profile.views) || profile.views.length > MAX_REPORT_VIEWS)
      fail(`Use up to ${MAX_REPORT_VIEWS} views per report profile.`);
    const viewIds = new Set<string>();
    for (const entry of profile.views as unknown[]) {
      if (!object(entry) || !identity(entry.id) || viewIds.has(entry.id))
        fail('Report views contain invalid or duplicate identities.');
      const view = entry as Record<string, unknown>;
      viewIds.add(view.id as string);
      if (view.mode === 'info') {
        if (!exact(view, ['id', 'mode'])) fail('String info does not use chart settings.');
        continue;
      }
      if (
        !exact(view, ['id', 'mode', 'settings', 'grouping']) ||
        !['simple', 'dual', 'compare'].includes(String(view.mode)) ||
        !['combined', 'per-string'].includes(String(view.grouping)) ||
        (view.mode === 'compare' && view.grouping !== 'combined')
      )
        fail('Invalid report analysis or grouping.');
      const settings = view.settings;
      if (
        !object(settings) ||
        !exact(settings, ['axis', 'quantity', 'secondary', 'forecastDistance'])
      )
        fail('Invalid report chart settings.');
      const chart = settings as Record<string, unknown>;
      if (
        !(view.mode === 'compare' ? ['distance', 'shot', 'string'] : ['distance', 'shot']).includes(
          String(chart.axis),
        ) ||
        !identity(chart.quantity) ||
        !identity(chart.secondary)
      )
        fail('Invalid report axis or quantity.');
      if (
        chart.forecastDistance !== undefined &&
        (typeof chart.forecastDistance !== 'number' ||
          !Number.isFinite(chart.forecastDistance) ||
          chart.forecastDistance <= 0 ||
          chart.forecastDistance > MAX_FORECAST_DISTANCE)
      )
        fail('Forecast distance must be positive and at most 1 km (3280.84 ft).');
    }
  }
  if (selected !== undefined && (typeof selected !== 'string' || !ids.has(selected)))
    fail('The selected report profile no longer exists. Choose Quick report or another profile.');
}
