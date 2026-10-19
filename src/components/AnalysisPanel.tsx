import { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined } from 'lucide-react';
import type {
  Series,
  Shot,
  UnitSystem,
  FieldDefinition,
  Annotation,
  Tag,
  Profile,
  CatalogItem,
  Attachment,
  ChartSettings,
} from '../domain/model';
import { saveProfile } from '../storage/workspace';
import { chartGroupsCompatible, inspectPoints, summarizeShots } from '../domain/measurements';
import { chartStyle } from '../domain/chart';
import { defaultAnalysis, defaultProfile } from '../domain/model';
import { availableQuantities, normalizeChart, quantityLabel } from '../domain/analysis';
import { saveAnalysis } from '../storage/analysis';
import { ColumnPicker } from './ColumnPicker';
import { tableColumns, visibleColumns } from '../domain/table';
import { StringInfo } from './StringInfo';
import { ShotTable } from './ShotTable';
import { displayValue, formatValue, unitLabels } from '../domain/units';

// Keep the chart library out of the initial workspace load until a selection needs it.
const MeasurementChart = lazy(() => import('./MeasurementChart'));

/** Present compatible statistics, charts and a paginated table in the profile's display units. */
export function AnalysisPanel({
  series,
  shots,
  view,
  activeShotId,
  onHoverShot,
  unitSystem = 'imperial',
  allShots = shots,
  hiddenShots,
  onToggleShot,
  fields = [],
  annotations = [],
  tags = [],
  profile,
  catalog = [],
  attachments = [],
  onDetails,
  dark = false,
  colorOrder,
}: {
  series: Series[];
  shots: Shot[];
  view: 'chart' | 'table';
  activeShotId: string | null;
  onHoverShot: (id: string | null) => void;
  unitSystem?: UnitSystem;
  allShots?: Shot[];
  hiddenShots?: ReadonlySet<string>;
  onToggleShot?: (id: string, checked: boolean) => void;
  fields?: FieldDefinition[];
  annotations?: Annotation[];
  tags?: Tag[];
  profile?: Profile;
  catalog?: CatalogItem[];
  attachments?: Attachment[];
  onDetails?: (id: string) => void;
  dark?: boolean;
  colorOrder?: string[];
}) {
  const [columnError, setColumnError] = useState('');
  /** Persist column choices without changing annotations or the active shot selection. */
  async function columns(patch: Partial<Profile>) {
    try {
      await saveProfile(patch);
      setColumnError('');
    } catch {
      setColumnError('Column choices could not be saved.');
    }
  }
  const kind = profile?.analysis?.mode ?? 'simple';
  const chartKind = kind === 'info' ? 'simple' : kind;
  const settings = useMemo(
    () => normalizeChart(profile?.analysis?.[chartKind] ?? defaultAnalysis()[chartKind]),
    [profile?.analysis, chartKind],
  );
  const mode = settings.axis;
  const quantities = useMemo(
    () => availableQuantities(shots, series, fields, annotations, unitSystem),
    [shots, series, fields, annotations, unitSystem],
  );
  const tableQuantities = useMemo(
    () =>
      availableQuantities(
        allShots.map((shot) => ({ ...shot, excluded: false })),
        series,
        fields,
        annotations,
        unitSystem,
        true,
      ),
    [allShots, series, fields, annotations, unitSystem],
  );
  const infoSeries = series.find((item) => item.id === profile?.infoSeriesId) ?? series[0];
  /** Persist explicit control edits; missing readings alone never overwrite a saved quantity. */
  async function changeChart(patch: Partial<ChartSettings>) {
    const next = normalizeChart({ ...settings, ...patch });
    const available = quantities.filter((q) => next.axis === 'shot' || q.id === 'velocity');
    if (patch.axis && available.length && !available.some((q) => q.id === next.quantity))
      next.quantity = available[0]!.id;
    if (!available.some((q) => q.id === next.secondary && q.id !== next.quantity))
      next.secondary = available.find((q) => q.id !== next.quantity)?.id ?? next.quantity;
    try {
      await saveAnalysis(chartKind, next);
      setColumnError('');
    } catch {
      setColumnError('Analysis settings could not be saved.');
    }
  }
  const summary = useMemo(() => summarizeShots(shots), [shots]);
  const quality = useMemo(
    () =>
      shots.reduce(
        (total, shot) => {
          const result = inspectPoints(shot);
          return {
            padding: total.padding + result.padding,
            invalid: total.invalid + result.invalid,
            unpaired: total.unpaired + result.unpaired,
            points: total.points + result.points.length,
          };
        },
        { padding: 0, invalid: 0, unpaired: 0, points: 0 },
      ),
    [shots],
  );
  const compatible = chartGroupsCompatible(shots);
  // Distance velocity is usable even when the provider supplied no separate muzzle scalar.
  const choices =
    mode === 'distance'
      ? quality.points
        ? [{ id: 'velocity', label: quantityLabel('velocity', unitSystem) }]
        : []
      : quantities;
  const secondaryChoices = choices.filter((item) => item.id !== settings.quantity);
  if (!series.length)
    return (
      <section className="analysis-empty">
        <span className="empty-illustration">
          <ChartNoAxesCombined size={42} strokeWidth={1.3} />
        </span>
        <p className="eyebrow">YOUR MEASUREMENTS, IN PERSPECTIVE</p>
        <h2>Select a series to get started</h2>
        <p>
          Explore recorded velocities, compare series,
          <br />
          and inspect every shot in one place.
        </p>
        <div className="local-note">
          <span className="dot" />
          Private by design. Stored on this device.
        </div>
      </section>
    );
  return (
    <section className="analysis-panel">
      <div className="analysis-heading">
        <div>
          <p className="eyebrow">WORKSPACE / {series.length > 1 ? 'COMPARISON' : 'SERIES'}</p>
          <h2>{series.length === 1 ? series[0]!.name : `${series.length} series selected`}</h2>
          <p className="muted">
            {shots.length} selected shots · {shots.filter((shot) => shot.excluded).length} source
            excluded
          </p>
        </div>
        <span className="outline-badge">
          <ArrowUpRight size={14} />
          Recorded data
        </span>
      </div>
      <div className="statistics">
        {[
          ['Included shots', summary.count],
          ['Mean velocity', displayValue(summary.mean, 'velocity', unitSystem)],
          ['Sample SD', displayValue(summary.sd, 'velocity', unitSystem)],
          ['Extreme spread', displayValue(summary.spread, 'velocity', unitSystem)],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{formatValue(value as number | null, 2)}</strong>
            <small>
              {label === 'Included shots'
                ? 'Valid muzzle readings'
                : unitLabels[unitSystem].velocity}
            </small>
          </div>
        ))}
      </div>
      {summary.incompatible && (
        <p className="notice">
          Combined statistics are unavailable across different sources or unit codes.
        </p>
      )}
      {kind === 'info' && infoSeries ? (
        <div className="chart-panel">
          {series.length > 1 && (
            <label className="field">
              String
              <select
                value={infoSeries.id}
                onChange={(event) => void columns({ infoSeriesId: event.target.value })}
              >
                {series.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <StringInfo
            series={infoSeries}
            shots={allShots.filter((shot) => shot.seriesId === infoSeries.id)}
            profile={profile ?? defaultProfile()}
            fields={fields}
            annotations={annotations}
            tags={tags}
            catalog={catalog}
            photos={attachments.filter((photo) => photo.seriesId === infoSeries.id)}
            onDetails={onDetails}
          />
        </div>
      ) : (
        <div className="chart-panel">
          <header className="chart-heading">
            <div>
              <h3>
                {view === 'table'
                  ? 'Shot records'
                  : kind === 'dual'
                    ? 'Dual chart'
                    : kind === 'compare'
                      ? 'String compare'
                      : 'Simple chart'}
              </h3>
              <p className="muted">
                {mode === 'distance' && kind === 'compare'
                  ? 'Mean of measured traces · linear interpolation within measured ranges'
                  : mode === 'shot' && kind !== 'compare'
                    ? 'One sequence across selected strings'
                    : 'Recorded measurements'}
              </p>
            </div>
            {view === 'chart' && (
              <div className="analysis-controls">
                <label>
                  Horizontal axis
                  <select
                    aria-label="Chart type"
                    value={mode}
                    onChange={(event) =>
                      void changeChart({ axis: event.target.value as typeof mode })
                    }
                  >
                    <option value="distance">Over distance</option>
                    <option value="shot">By shot</option>
                  </select>
                </label>
                <label>
                  Quantity
                  <select
                    aria-label="Chart quantity"
                    value={settings.quantity}
                    onChange={(event) => void changeChart({ quantity: event.target.value })}
                  >
                    {!choices.some((q) => q.id === settings.quantity) && (
                      <option value={settings.quantity} disabled>
                        {quantityLabel(settings.quantity, unitSystem)} — no readings
                      </option>
                    )}
                    {choices.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </label>
                {kind === 'dual' && (
                  <label>
                    Second quantity
                    <select
                      aria-label="Second chart quantity"
                      disabled={!secondaryChoices.length}
                      value={secondaryChoices.length ? settings.secondary : ''}
                      onChange={(event) => void changeChart({ secondary: event.target.value })}
                    >
                      {!secondaryChoices.length && (
                        <option value="">No second quantity available</option>
                      )}
                      {secondaryChoices.length > 0 &&
                        !secondaryChoices.some((q) => q.id === settings.secondary) && (
                          <option value={settings.secondary} disabled>
                            Saved quantity — no readings
                          </option>
                        )}
                      {secondaryChoices.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </header>
          {!shots.length ? (
            <p className="empty-note">
              No shots selected. Select shots in the table below to display measurements.
            </p>
          ) : view === 'table' ? (
            <ShotTable
              shots={shots}
              series={series}
              activeShotId={activeShotId}
              onHoverShot={onHoverShot}
              unitSystem={unitSystem}
            />
          ) : compatible ? (
            <>
              <Suspense fallback={<p className="empty-note">Loading chart…</p>}>
                <MeasurementChart
                  shots={shots}
                  series={series}
                  mode={mode}
                  settings={settings}
                  kind={kind}
                  quantities={quantities}
                  dark={dark}
                  colorOrder={colorOrder}
                  activeShotId={activeShotId}
                  onHoverShot={onHoverShot}
                  unitSystem={unitSystem}
                />
              </Suspense>
              <div className="chart-legend">
                {(kind === 'compare'
                  ? [...series].sort((a, b) => a.id.localeCompare(b.id)).map((item) => item.name)
                  : [
                      settings.quantity,
                      ...(kind === 'dual' && settings.secondary !== settings.quantity
                        ? [settings.secondary]
                        : []),
                    ].map(
                      (id) =>
                        quantities.find((q) => q.id === id)?.label ?? quantityLabel(id, unitSystem),
                    )
                ).map((label, index) => (
                  <span key={index}>
                    <i
                      style={{
                        background: chartStyle(
                          kind === 'compare' && colorOrder
                            ? Math.max(
                                0,
                                colorOrder.indexOf(
                                  [...series].sort((a, b) => a.id.localeCompare(b.id))[index]!.id,
                                ),
                              )
                            : index,
                          dark,
                        ).color,
                      }}
                    />
                    {label}
                  </span>
                ))}
              </div>
              {kind === 'dual' && mode === 'distance' && (
                <p className="muted">
                  Only velocity is recorded over distance. Choose By shot to compare two quantities.
                </p>
              )}
              {mode === 'distance' &&
                kind !== 'compare' &&
                shots.filter((shot) => !shot.excluded).length > 100 && (
                  <p className="notice">
                    Showing the first 100 included shot traces. Narrow the selection to see the
                    others.
                  </p>
                )}
              {mode === 'distance' && !quality.points && (
                <p className="notice">
                  No usable distance/velocity pairs. Choose By shot to inspect recorded scalars.
                </p>
              )}
            </>
          ) : (
            <p className="empty-note">
              Select series from one source with the same unit code to draw a comparison. All
              records remain available below.
            </p>
          )}
        </div>
      )}
      {view === 'chart' && (
        <section className="shot-table-panel">
          <header className="chart-heading">
            <div>
              <h3>Shot records</h3>
              <p className="muted">
                Uncheck shots to omit them from analysis. Rows stay available here.
              </p>
            </div>
            <ColumnPicker
              available={tableColumns(fields, tableQuantities, unitSystem)}
              selected={visibleColumns(profile)}
              onChange={(tableColumns) => void columns({ tableColumns })}
            />
          </header>
          {columnError && (
            <p className="error" role="alert">
              {columnError}
            </p>
          )}
          <ShotTable
            shots={allShots}
            series={series}
            activeShotId={activeShotId}
            onHoverShot={onHoverShot}
            unitSystem={unitSystem}
            hiddenShots={hiddenShots}
            onToggleShot={onToggleShot}
            fields={fields}
            columnIds={visibleColumns(profile)}
            catalog={catalog}
            showProjectileWeight={profile?.showProjectileWeight}
            annotations={annotations}
            tags={tags}
            showTags={profile?.showTags}
            shotDetail={
              settings.quantity === 'g1' || settings.quantity === 'g7'
                ? settings.quantity
                : 'muzzleVelocity'
            }
          />
        </section>
      )}
      <details className="quality">
        <summary>
          Data quality <span>{quality.points} usable points</span>
        </summary>
        <p>
          {quality.padding} paired [0, 0] padding samples, {quality.invalid} invalid pairs and{' '}
          {quality.unpaired} unpaired values omitted from charts. Zero distance with positive
          velocity is retained. Raw arrays are preserved locally.
        </p>
        <p>
          Selected source-excluded shots are visible in the table and omitted from statistics and
          charts. Standard deviation uses the sample formula (n − 1). Source unit codes are retained
          as metadata; display units follow your local profile.
        </p>
      </details>
    </section>
  );
}
