import { useMemo } from 'react';
import { SquarePen } from 'lucide-react';
import type { Annotation, Tag, FieldDefinition, UnitSystem } from '../domain/model';
import { fieldDisplay, fieldUnit } from '../domain/customFields';
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
  fields = [],
  unitSystem = 'imperial',
}: {
  fields?: FieldDefinition[];
  unitSystem?: UnitSystem;
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
          <section
            className={`series-group ${expanded ? 'selected' : ''}`}
            key={item.id}
            aria-label={item.name}
          >
            <label className={`series-card ${expanded ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={expanded}
                aria-label={`Select series ${item.name}`}
                title="Include or remove this string from the current workspace selection."
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
            {onDetails && (
              <button
                type="button"
                className="icon-button series-edit"
                title="Edit string details & photos"
                onClick={() => onDetails(item.id)}
                aria-label={`Details for ${item.name}`}
              >
                <SquarePen size={15} aria-hidden="true" />
              </button>
            )}
            <TagLabels
              tags={tags.filter((tag) =>
                annotations.find((a) => a.entityId === item.id)?.tagIds?.includes(tag.id),
              )}
            />
            <dl className="navigator-fields">
              {fields
                .filter((field) => field.showInNavigator)
                .map((field) => {
                  const value = annotations.find((a) => a.entityId === item.id)?.values?.[field.id];
                  if (value === undefined || value === '') return null;
                  return (
                    <div key={field.id}>
                      <dt>{field.name}</dt>
                      <dd>
                        {fieldDisplay(value, field.type, unitSystem)}{' '}
                        {fieldUnit(field.type, unitSystem)}
                      </dd>
                    </div>
                  );
                })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
