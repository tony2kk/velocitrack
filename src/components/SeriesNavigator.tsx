import { useMemo } from 'react';
import type { Series, Shot, ShotDetail, UnitSystem } from '../domain/model';
import { displayValue, formatValue, unitLabels } from '../domain/units';

const detailLabels = { muzzleVelocity: 'Muzzle velocity', g1: 'G1', g7: 'G7' };

/** Select a recorded coefficient or display-unit muzzle reading without changing the shot. */
function shotReading(shot: Shot, detail: ShotDetail, units: UnitSystem): string {
  if (detail === 'muzzleVelocity')
    return `${formatValue(displayValue(shot.muzzleVelocity, 'velocity', units), 2)} ${unitLabels[units].velocity}`;
  return String(
    (detail === 'g1' ? shot.ballisticCoefficientG1 : shot.ballisticCoefficientG7) ?? '—',
  );
}

/** Expand selected series into independently selectable shots with shared pointer/keyboard emphasis. */
export function SeriesNavigator({
  series,
  shots,
  selected,
  hiddenShots,
  activeShotId,
  catalogNames,
  sourceNames,
  onToggleSeries,
  onToggleShot,
  onHoverShot,
  unitSystem = 'imperial',
  shotDetail = 'muzzleVelocity',
}: {
  series: Series[];
  shots: Shot[];
  selected: string[];
  hiddenShots: ReadonlySet<string>;
  activeShotId: string | null;
  catalogNames: Map<string, string>;
  sourceNames: Map<string, string>;
  onToggleSeries: (id: string, checked: boolean) => void;
  onToggleShot: (id: string, checked: boolean) => void;
  onHoverShot: (id: string | null) => void;
  unitSystem?: UnitSystem;
  shotDetail?: ShotDetail;
}) {
  const grouped = useMemo(() => {
    const groups = new Map<string, Shot[]>();
    for (const shot of shots) {
      const group = groups.get(shot.seriesId) ?? [];
      group.push(shot);
      groups.set(shot.seriesId, group);
    }
    for (const group of groups.values())
      group.sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));
    return groups;
  }, [shots]);
  return (
    <div className="series-list">
      {series.map((item) => {
        const expanded = selected.includes(item.id);
        const records = grouped.get(item.id) ?? [];
        return (
          <section className="series-group" key={item.id} aria-label={item.name}>
            <label className={`series-card ${expanded ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={expanded}
                aria-label={`Select series ${item.name}`}
                onChange={(event) => onToggleSeries(item.id, event.target.checked)}
              />
              <div className="series-card-content">
                <div className="series-meta">
                  <span>
                    {item.startedAt
                      ? new Date(item.startedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Date unavailable'}
                  </span>
                  <span>{records.length} shots</span>
                </div>
                <strong>{item.name}</strong>
                <span>{catalogNames.get(item.firearmId)}</span>
                <span className="projectile-name">{catalogNames.get(item.projectileId)}</span>
                <small>
                  <span className="dot" />
                  {sourceNames.get(item.sourceId)}
                </small>
              </div>
            </label>
            {expanded && (
              <div className="shot-list" role="group" aria-label={`Shots in ${item.name}`}>
                <p className="shot-selection-count">
                  {records.filter((shot) => !hiddenShots.has(shot.id)).length} / {records.length}{' '}
                  selected · {detailLabels[shotDetail]}
                </p>
                {records.map((shot) => (
                  <label
                    key={shot.id}
                    className={`shot-option ${activeShotId === shot.id ? 'shot-highlighted' : ''}`}
                    onMouseEnter={() => onHoverShot(shot.id)}
                    onMouseLeave={() => onHoverShot(null)}
                    onFocus={() => onHoverShot(shot.id)}
                    onBlur={() => onHoverShot(null)}
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenShots.has(shot.id)}
                      aria-label={`Select shot ${shot.number} in ${item.name}`}
                      onChange={(event) => onToggleShot(shot.id, event.target.checked)}
                    />
                    <span>
                      Shot {shot.number}
                      {shot.excluded && <small>Source excluded</small>}
                    </span>
                    <span className="shot-reading" title={detailLabels[shotDetail]}>
                      {shotReading(shot, shotDetail, unitSystem)}
                    </span>
                  </label>
                ))}
                {!records.length && <p className="muted">No shots in this series.</p>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
