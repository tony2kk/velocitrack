import { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, Info } from 'lucide-react';
import type {
  Series,
  Shot,
  UnitSystem,
  FieldDefinition,
  Annotation,
  Tag,
  Profile,
} from '../domain/model';
import { saveProfile } from '../storage/workspace';
import { chartGroupsCompatible, inspectPoints, summarizeShots } from '../domain/measurements';
import { chartColors } from '../domain/chart';
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
  const [mode, setMode] = useState<'distance' | 'shot'>('distance');
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
      <div className="notice unit-notice">
        <Info size={17} />
        <span>
          {summary.incompatible
            ? 'Combined statistics are unavailable across different sources or unit codes.'
            : `Displaying ${unitLabels[unitSystem].velocity} and ${unitLabels[unitSystem].distance}. Original measurements are preserved.`}
        </span>
      </div>
      <div className="chart-panel">
        <header className="chart-heading">
          <div>
            <h3>
              {view === 'table'
                ? 'Shot records'
                : mode === 'distance'
                  ? 'Velocity over distance'
                  : 'Muzzle velocity by shot'}
            </h3>
            <p className="muted">
              {view === 'table'
                ? 'Selected display units, including excluded shots'
                : 'Measured points · no modeled trajectory'}
            </p>
          </div>
          {view === 'chart' && (
            <select
              aria-label="Chart type"
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
            >
              <option value="distance">Over distance</option>
              <option value="shot">By shot</option>
            </select>
          )}
        </header>
        {!shots.length ? (
          <p className="empty-note">
            No shots selected. Select shots in the table below to display measurements.
          </p>
        ) : view === 'chart' ? (
          compatible ? (
            <>
              <Suspense fallback={<p className="empty-note">Loading chart…</p>}>
                <MeasurementChart
                  shots={shots}
                  series={series}
                  mode={mode}
                  activeShotId={activeShotId}
                  onHoverShot={onHoverShot}
                  unitSystem={unitSystem}
                />
              </Suspense>
              <div className="chart-legend">
                {series.map((item, index) => (
                  <span key={item.id}>
                    <i
                      style={{
                        background: chartColors[index % chartColors.length],
                      }}
                    />
                    {item.name}
                  </span>
                ))}
              </div>
              {mode === 'distance' && shots.filter((shot) => !shot.excluded).length > 100 && (
                <p className="notice">
                  Showing the first 100 included shot traces. Narrow the selection to see the
                  others.
                </p>
              )}
              {!quality.points && mode === 'distance' && (
                <p className="notice">
                  No usable distance/velocity pairs. Choose By shot to inspect muzzle readings.
                </p>
              )}
            </>
          ) : (
            <p className="empty-note">
              Select series from one source with the same unit code to draw a comparison. All
              records remain available in Table.
            </p>
          )
        ) : (
          <ShotTable
            shots={shots}
            series={series}
            activeShotId={activeShotId}
            onHoverShot={onHoverShot}
            unitSystem={unitSystem}
          />
        )}
      </div>
      {view === 'chart' && (
        <section className="shot-table-panel">
          <header className="chart-heading">
            <div>
              <h3>Shot records</h3>
              <p className="muted">
                Uncheck shots to omit them from analysis. Rows stay available here.
              </p>
            </div>
            <details className="column-picker">
              <summary>Columns</summary>
              <div>
                <label className="check-field compact">
                  <input
                    type="checkbox"
                    checked={profile?.showTags ?? false}
                    onChange={(event) => void columns({ showTags: event.target.checked })}
                  />
                  Tags
                </label>
                {fields.map((field) => (
                  <label className="check-field compact" key={field.id}>
                    <input
                      type="checkbox"
                      checked={profile?.visibleFieldIds?.includes(field.id) ?? false}
                      onChange={(event) =>
                        void columns({
                          visibleFieldIds: event.target.checked
                            ? [...(profile?.visibleFieldIds ?? []), field.id]
                            : profile?.visibleFieldIds?.filter((id) => id !== field.id),
                        })
                      }
                    />
                    {field.name}
                  </label>
                ))}
              </div>
            </details>
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
            fields={fields.filter((field) => profile?.visibleFieldIds?.includes(field.id))}
            annotations={annotations}
            tags={tags}
            showTags={profile?.showTags}
            shotDetail={profile?.shotDetail}
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
