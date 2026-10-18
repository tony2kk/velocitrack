import { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, Info } from 'lucide-react';
import type { Series, Shot } from '../domain/model';
import { chartGroupsCompatible, inspectPoints, summarizeShots } from '../domain/measurements';

// Keep the chart library out of the initial workspace load until a selection needs it.
const MeasurementChart = lazy(() => import('./MeasurementChart'));
/** Round summary cards for readability; the shot table renders original numeric precision. */
const format = (value: number | null) =>
  value === null ? '—' : value.toLocaleString('en-GB', { maximumFractionDigits: 2 });

/** Present compatible summary statistics, recorded charts and a paginated raw-value table. */
export function AnalysisPanel({
  series,
  shots,
  view,
}: {
  series: Series[];
  shots: Shot[];
  view: 'chart' | 'table';
}) {
  const [mode, setMode] = useState<'distance' | 'shot'>('distance');
  const [page, setPage] = useState(0);
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
  const names = new Map(series.map((item) => [item.id, item.name]));
  const compatible = chartGroupsCompatible(shots);
  // Changing selection may shrink the result set while the user is on a later table page.
  const currentPage = Math.min(page, Math.max(0, Math.ceil(shots.length / 100) - 1));
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
            {shots.length} recorded shots · {shots.filter((shot) => shot.excluded).length} excluded
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
          ['Mean velocity', summary.mean],
          ['Sample SD', summary.sd],
          ['Extreme spread', summary.spread],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{format(value as number | null)}</strong>
            <small>
              {label === 'Included shots' ? 'Valid muzzle readings' : 'Raw units · unverified'}
            </small>
          </div>
        ))}
      </div>
      <div className="notice unit-notice">
        <Info size={17} />
        <span>
          {summary.incompatible
            ? 'Combined statistics are unavailable across different sources or unit codes.'
            : 'Physical units are not yet verified. Values are shown exactly as recorded; no unit conversion is applied.'}
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
                ? 'Original values, including excluded shots'
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
        {view === 'chart' ? (
          compatible ? (
            <>
              <Suspense fallback={<p className="empty-note">Loading chart…</p>}>
                <MeasurementChart shots={shots} series={series} mode={mode} />
              </Suspense>
              <div className="chart-legend">
                {series.map((item, index) => (
                  <span key={item.id}>
                    <i
                      style={{
                        background: [
                          '#0c8176',
                          '#5978c7',
                          '#d38a36',
                          '#ac6399',
                          '#758b3c',
                          '#607b91',
                        ][index % 6],
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
          <>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">
                  Shots in selected series. All values use unverified source units.
                </caption>
                <thead>
                  <tr>
                    <th>Series</th>
                    <th>Shot</th>
                    <th>Muzzle velocity</th>
                    <th>G1</th>
                    <th>G7</th>
                    <th>Points</th>
                    <th>Unit code</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shots.slice(currentPage * 100, (currentPage + 1) * 100).map((shot) => (
                    <tr key={shot.id} className={shot.excluded ? 'excluded' : ''}>
                      <td>{names.get(shot.seriesId)}</td>
                      <td>{shot.number}</td>
                      <td className="numeric">{shot.muzzleVelocity ?? '—'}</td>
                      <td className="numeric">{shot.ballisticCoefficientG1 ?? '—'}</td>
                      <td className="numeric">{shot.ballisticCoefficientG7 ?? '—'}</td>
                      <td>{inspectPoints(shot).points.length}</td>
                      <td>{shot.rawUnit}</td>
                      <td>{shot.excluded ? 'Excluded' : 'Included'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shots.length > 100 && (
              <div className="pagination">
                <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </button>
                <span>
                  Page {currentPage + 1} of {Math.ceil(shots.length / 100)}
                </span>
                <button
                  disabled={(currentPage + 1) * 100 >= shots.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
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
          Excluded shots are visible in the table and omitted from statistics and charts. Standard
          deviation uses the sample formula (n − 1). Atmosphere and unit meanings still need
          validation.
        </p>
      </details>
    </section>
  );
}
