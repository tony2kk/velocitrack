import { useMemo } from 'react';
import type { Annotation, Tag } from '../domain/model';
import { TagLabels } from './CustomizationManager';
import type { Series, Shot } from '../domain/model';

/** Select series only; shot selection lives in the table below the chart. */
export function SeriesNavigator({
  series,
  shots,
  selected,
  catalogNames,
  projectileNames,
  sourceNames,
  onToggleSeries,
  annotations = [],
  tags = [],
  onDetails,
}: {
  annotations?: Annotation[];
  tags?: Tag[];
  onDetails?: (id: string) => void;
  series: Series[];
  shots: Shot[];
  selected: string[];
  catalogNames: Map<string, string>;
  projectileNames?: Map<string, string>;
  sourceNames: Map<string, string>;
  onToggleSeries: (id: string, checked: boolean) => void;
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
                <span className="projectile-name">
                  {projectileNames?.get(item.id) ?? catalogNames.get(item.projectileId)}
                </span>
                <small>
                  <span className="dot" />
                  {sourceNames.get(item.sourceId)}
                </small>
              </div>
            </label>
            <TagLabels
              tags={tags.filter((tag) =>
                annotations.find((a) => a.entityId === item.id)?.tagIds?.includes(tag.id),
              )}
            />
            {onDetails && (
              <button
                className="text-button"
                onClick={() => onDetails(item.id)}
                aria-label={`Details for ${item.name}`}
              >
                Details & photos
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
