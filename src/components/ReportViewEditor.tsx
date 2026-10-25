import type { ChartSettings, FieldDefinition, UnitSystem } from '../domain/model';
import { availableQuantities, normalizeChart } from '../domain/analysis';
import { distanceCurveRegistry } from '../domain/distanceCurves/registry';
import { MAX_FORECAST_DISTANCE } from '../domain/calculatedVelocity';
import { newReportView, REPORT_MODE_LABELS, type ReportView } from '../domain/reportProfiles';
import { formatValue, unitLabels } from '../domain/units';

/** Configure intent independently of current selection; absent readings never remove saved choices. */
export function ReportViewEditor({
  view,
  fields,
  units,
  onChange,
}: {
  view: ReportView;
  fields: FieldDefinition[];
  units: UnitSystem;
  onChange: (view: ReportView) => void;
}) {
  const factor = units === 'metric' ? 0.3048 : 1;
  const choices =
    view.mode === 'info'
      ? []
      : view.settings.axis === 'distance'
        ? distanceCurveRegistry.definitions
            .filter((curve) => view.mode === 'compare' || curve.id !== 'velocity-detail')
            .map((curve) => ({ id: curve.id, label: curve.label(units) }))
        : availableQuantities([], [], fields, [], units, true).filter(
            (q) => view.mode !== 'compare' || q.scope === view.settings.axis,
          );
  const forecast =
    view.mode !== 'info' &&
    view.settings.axis === 'distance' &&
    [view.settings.quantity, ...(view.mode === 'dual' ? [view.settings.secondary] : [])].some(
      (id) => distanceCurveRegistry.get(id)?.usesForecast,
    );
  /** Axis changes may invalidate both choices; keep Dual's second selector distinct and visible. */
  function compatibleSettings(settings: ChartSettings, mode: 'simple' | 'dual' | 'compare') {
    const next = normalizeChart(settings, mode === 'compare');
    if (mode === 'dual' && next.axis === 'distance' && next.secondary === next.quantity)
      next.secondary = distanceCurveRegistry.definitions.find(
        (curve) => curve.id !== 'velocity-detail' && curve.id !== next.quantity,
      )!.id;
    return next;
  }
  /** Preserve unused choices, except when an explicit axis/mode change requires a compatible quantity. */
  function changeAxis(axis: 'distance' | 'shot' | 'string') {
    if (view.mode === 'info') return;
    onChange({
      ...view,
      settings: compatibleSettings({ ...view.settings, axis }, view.mode),
    });
  }
  /** Retain an unknown ID visibly after a custom field/function disappears rather than substitute data. */
  function options(selected: string, exclude?: string) {
    return (
      <>
        {!choices.some((choice) => choice.id === selected) && (
          <option value={selected}>Unavailable: {selected}</option>
        )}
        {choices
          .filter((choice) => choice.id !== exclude)
          .map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
      </>
    );
  }
  return (
    <div className="report-view-fields">
      <label className="field">
        Analysis
        <select
          value={view.mode}
          title="Choose the analysis to include in this report position."
          onChange={(event) => {
            const mode = event.target.value as ReportView['mode'];
            if (view.mode === 'info' || mode === 'info') onChange(newReportView(mode, view.id));
            else
              onChange({
                ...view,
                mode,
                grouping: mode === 'compare' ? 'combined' : view.grouping,
                settings: compatibleSettings(view.settings, mode),
              });
          }}
        >
          {Object.entries(REPORT_MODE_LABELS).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {view.mode === 'info' ? (
        <p className="muted">
          All selected strings, including their attributes and complete original JSON. No chart axes
          apply.
        </p>
      ) : (
        <>
          <label className="field">
            Horizontal axis
            <select
              value={view.settings.axis}
              title="Use the same axes and quantity ownership rules as the workspace charts."
              onChange={(event) => changeAxis(event.target.value as typeof view.settings.axis)}
            >
              <option value="distance">Over distance</option>
              <option value="shot">By shot</option>
              {view.mode === 'compare' && <option value="string">By string</option>}
            </select>
          </label>
          <label className="field">
            Quantity
            <select
              value={view.settings.quantity}
              title="Choose the recorded or calculated quantity. Templates can be prepared before importing data."
              onChange={(event) =>
                onChange({
                  ...view,
                  settings: {
                    ...view.settings,
                    quantity: event.target.value,
                    secondary:
                      view.settings.secondary === event.target.value
                        ? (choices.find((choice) => choice.id !== event.target.value)?.id ??
                          event.target.value)
                        : view.settings.secondary,
                  },
                })
              }
            >
              {options(view.settings.quantity)}
            </select>
          </label>
          {view.mode === 'dual' && (
            <label className="field">
              Second quantity
              <select
                value={view.settings.secondary}
                title="Choose the second quantity; compatible physical quantities share an axis."
                onChange={(event) =>
                  onChange({
                    ...view,
                    settings: { ...view.settings, secondary: event.target.value },
                  })
                }
              >
                {options(view.settings.secondary, view.settings.quantity)}
              </select>
            </label>
          )}
          {forecast && (
            <label className="field">
              Forecast distance ({unitLabels[units].distance})
              <input
                type="number"
                min="0.001"
                max={MAX_FORECAST_DISTANCE * factor}
                step="any"
                placeholder="Automatic from data"
                title="Leave blank to use the furthest valid measured distance for this chart. With no positive measured distance, the model default is used."
                value={
                  view.settings.forecastDistance === undefined
                    ? ''
                    : formatValue(view.settings.forecastDistance * factor, 6)
                }
                onChange={(event) =>
                  onChange({
                    ...view,
                    settings: {
                      ...view.settings,
                      forecastDistance:
                        event.target.value === '' ? undefined : event.target.valueAsNumber / factor,
                    },
                  })
                }
              />
            </label>
          )}
          {(view.mode === 'simple' || view.mode === 'dual') && (
            <label className="field">
              Strings
              <select
                value={view.grouping}
                title="Combine selected strings in one chart, or repeat this chart once for every selected string."
                onChange={(event) =>
                  onChange({ ...view, grouping: event.target.value as typeof view.grouping })
                }
              >
                <option value="combined">Combined strings</option>
                <option value="per-string">One chart per string</option>
              </select>
            </label>
          )}
        </>
      )}
    </div>
  );
}
