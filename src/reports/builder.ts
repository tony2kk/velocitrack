import { availableQuantities, quantityLabel } from '../domain/analysis';
import { buildAnalysisTraces, chartStyle } from '../domain/chart';
import { DEFAULT_FORECAST_DISTANCE, MAX_FORECAST_DISTANCE } from '../domain/calculatedVelocity';
import { describeCurveConditions, distanceCurveRegistry } from '../domain/distanceCurves/registry';
import { chartGroupsCompatible, inspectPoints } from '../domain/measurements';
import {
  MAX_RENDERED_REPORT_VIEWS,
  REPORT_MODE_LABELS,
  validateReportProfiles,
  type ReportView,
} from '../domain/reportProfiles';
import type { ReportInput } from './types';

/** A deterministic view plan, independent of the screen's analysis mode and zoom memory. */
export interface PlannedReportView {
  title: string;
  view: ReportView;
  input: ReportInput;
}

/** Expand each-string views in saved order while keeping comparison/info views together. */
export function planReportViews(input: ReportInput): PlannedReportView[] {
  if (!input.template) return [];
  validateReportProfiles([input.template]);
  const count = input.template.views.reduce(
    (total, view) =>
      total + (view.mode !== 'info' && view.grouping === 'per-string' ? input.series.length : 1),
    0,
  );
  if (count > MAX_RENDERED_REPORT_VIEWS)
    throw new Error(
      `This template would create ${count} views. Select fewer strings or reduce the template to ${MAX_RENDERED_REPORT_VIEWS} views per PDF.`,
    );
  return input.template.views.flatMap((view, index) => {
    const separately = view.mode !== 'info' && view.grouping === 'per-string';
    const groups = separately ? input.series.map((series) => [series]) : [input.series];
    return groups.map((series) => ({
      view,
      title: `${index + 1}. ${REPORT_MODE_LABELS[view.mode]}${view.mode === 'simple' || view.mode === 'dual' ? ' chart' : ''}${separately ? ` · ${series[0]!.name}` : ''}`,
      input: {
        ...input,
        series,
        shots: input.shots.filter((shot) => series.some((item) => item.id === shot.seriesId)),
      },
    }));
  });
}

/** Canonical feet from valid recorded samples; use the shared model default only with no positive distance. */
export function automaticReportDistance(input: ReportInput): number {
  let distance = 0;
  for (const shot of input.shots.filter((shot) => !shot.excluded))
    for (const point of inspectPoints(shot).points) distance = Math.max(distance, point.distance);
  return Math.min(MAX_FORECAST_DISTANCE, distance > 0 ? distance : DEFAULT_FORECAST_DISTANCE);
}

/** Use the same trace builders, scalar readers, curve conditions and colors as interactive analysis. */
export function prepareReportChart(plan: PlannedReportView) {
  if (plan.view.mode === 'info') throw new Error('String info does not render a chart.');
  const { input, view } = plan;
  const units = input.profile.unitSystem;
  const settings = {
    ...view.settings,
    forecastDistance: view.settings.forecastDistance ?? automaticReportDistance(input),
  };
  const quantities = availableQuantities(
    settings.axis === 'string'
      ? input.series.map((series) => ({ seriesId: series.id }))
      : input.shots,
    input.series,
    input.fields,
    input.annotations,
    units,
    true,
  );
  const curveData = {
    series: input.series,
    fields: input.fields,
    annotations: input.annotations,
    tags: input.tags,
  };
  const activeIds = [
    ...new Set([settings.quantity, ...(view.mode === 'dual' ? [settings.secondary] : [])]),
  ];
  const supportedIds =
    settings.axis === 'distance'
      ? distanceCurveRegistry.definitions
          .filter((curve) => view.mode === 'compare' || curve.id !== 'velocity-detail')
          .map((curve) => curve.id)
      : quantities
          .filter((q) => view.mode !== 'compare' || q.scope === settings.axis)
          .map((q) => q.id);
  const unavailable = activeIds.filter((id) => !supportedIds.includes(id));
  const compatible = settings.axis === 'string' || chartGroupsCompatible(input.shots);
  const traces =
    compatible && unavailable.length === 0
      ? buildAnalysisTraces(
          input.shots,
          input.series,
          view.mode,
          settings,
          units,
          false,
          quantities,
          input.colorOrder,
          distanceCurveRegistry,
          curveData,
        )
      : [];
  const groups = [...input.series].sort((a, b) => a.id.localeCompare(b.id));
  const legend =
    view.mode === 'compare'
      ? groups.map((series, index) => ({
          label: series.name,
          color: chartStyle(Math.max(0, input.colorOrder?.indexOf(series.id) ?? index), false)
            .color,
        }))
      : activeIds.map((id, index) => ({
          label: quantities.find((q) => q.id === id)?.label ?? quantityLabel(id, units),
          color: chartStyle(index, false).color,
        }));
  const descriptions =
    settings.axis === 'distance'
      ? activeIds.flatMap((id) => {
          const curve = distanceCurveRegistry.get(id);
          return curve
            ? [
                curve.label(units) + ': ' + curve.description,
                ...describeCurveConditions(curve, input.shots, curveData),
              ]
            : [];
        })
      : [];
  const issues = [...new Set(traces.flatMap((trace) => (trace.issue ? [trace.issue] : [])))];
  if (issues.length)
    descriptions.push(
      `Some traces could not be calculated (${issues.join(', ')}). Existing curve limits and input requirements apply.`,
    );
  const message = unavailable.length
    ? `Unavailable quantity: ${unavailable.join(', ')}. Edit this report profile to select an available quantity.`
    : !compatible
      ? 'These source unit groups cannot be combined. Select compatible strings.'
      : !traces.some((trace) => trace.data.some((point) => point.value[1] !== null))
        ? 'No usable data for this view in the selected strings and shots.'
        : undefined;
  return {
    presentation: {
      traces,
      series: input.series,
      mode: settings.axis,
      settings,
      kind: view.mode,
      unitSystem: units,
      quantities,
    },
    legend,
    descriptions,
    message,
  };
}
