import { useMemo } from 'react';
import { SquarePen } from 'lucide-react';
import type { Annotation, Tag, FieldDefinition, UnitSystem } from '../domain/model';
import { fieldText, fieldUnit } from '../domain/customFields';
import { TagLabels } from './CustomizationManager';
import type { Series, Shot } from '../domain/model';
import { targetDisplay, targetUnit } from '../domain/targetMeasurement';

/** Select series only; shot selection lives in the table below the chart. */
export function SeriesNavigator({
  series,
  shots,
  selected,
  catalogNames,
  projectileNames,
  sourceNames,
  onToggleSeries,
  onSelectOnly,
  annotations = [],
  tags = [],
  onDetails,
  fields = [],
  unitSystem = 'imperial',
  showGroupSize = false,
  showCaldwellNotes = true,
}: {
  fields?: FieldDefinition[];
  unitSystem?: UnitSystem;
  showGroupSize?: boolean;
  showCaldwellNotes?: boolean;
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
  onSelectOnly?: (id: string) => void;
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
        const groupSize = annotations.find((a) => a.entityId === item.id)?.target?.values.groupSize;
        const note = typeof item.raw.notes === 'string' ? item.raw.notes.trim() : '';
        return (
          <section
            className={`series-group ${expanded ? 'selected' : ''}`}
            key={item.id}
            aria-label={item.name}
            title="Ctrl + click to select only this string."
            onClick={(event) => {
              // Cancel label forwarding so a Ctrl-click never toggles the sole selection back off.
              if (!event.ctrlKey || !onSelectOnly || (event.target as Element).closest('button, a'))
                return;
              if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
              onSelectOnly(item.id);
            }}
          >
            <label className={`series-card ${expanded ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={expanded}
                aria-label={`Select series ${item.name}`}
                title="Include or remove this string. Ctrl + click selects only this string."
                onChange={(event) => {
                  // React checkbox changes use the native click; exclusive selection is handled by the card.
                  if (
                    onSelectOnly &&
                    event.nativeEvent instanceof MouseEvent &&
                    event.nativeEvent.ctrlKey
                  )
                    return;
                  onToggleSeries(item.id, event.target.checked);
                }}
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
            {showCaldwellNotes && note && (
              <p
                className="navigator-note"
                title="Original Caldwell string note"
                aria-label="Caldwell string note"
              >
                {note}
              </p>
            )}
            <TagLabels
              tags={tags.filter((tag) =>
                annotations.find((a) => a.entityId === item.id)?.tagIds?.includes(tag.id),
              )}
            />
            <dl className="navigator-fields">
              {showGroupSize && groupSize !== null && groupSize !== undefined && (
                <div title="Saved string-level diameter of the manually placed target circle.">
                  <dt>Group size</dt>
                  <dd>
                    {targetDisplay(groupSize, unitSystem)} {targetUnit(unitSystem).label}
                  </dd>
                </div>
              )}
              {fields
                .filter((field) => field.showInNavigator)
                .map((field) => {
                  const value = annotations.find((a) => a.entityId === item.id)?.values?.[field.id];
                  if (value === undefined || value === '') return null;
                  return (
                    <div key={field.id}>
                      <dt>{field.name}</dt>
                      <dd>
                        {fieldText(value, field.type, unitSystem)}{' '}
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
