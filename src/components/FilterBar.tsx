import { CalendarDays, ChevronDown, RotateCcw } from 'lucide-react';
import type { CatalogItem, DataSource, Filters } from '../domain/model';
import { EMPTY_FILTERS } from '../domain/model';
import { filterDateError, hasFilters } from '../domain/filters';

function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <details className="filter-popover" name="workspace-filter">
      <summary>
        {label}
        {selected.length > 0 && <span className="count-badge">{selected.length}</span>}
        <ChevronDown size={14} />
      </summary>
      <div className="popover-content">
        <div className="popover-heading">
          <strong>{label}</strong>
          <button className="text-button" disabled={!selected.length} onClick={() => onChange([])}>
            Clear
          </button>
        </div>
        {options.map((option) => (
          <label className="check-field compact" key={option.id}>
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }
            />
            <span>{option.name}</span>
          </label>
        ))}
        {!options.length && <p className="muted">No entries yet.</p>}
        <small>Empty selection includes all.</small>
      </div>
    </details>
  );
}

export function FilterBar({
  filters,
  sources,
  catalog,
  onChange,
}: {
  filters: Filters;
  sources: DataSource[];
  catalog: CatalogItem[];
  onChange: (filters: Filters) => void;
}) {
  const dateLabel =
    filters.dateMode === 'all'
      ? 'Any date'
      : filters.dateMode === 'range'
        ? 'Date range'
        : `Last ${filters.relativeAmount} ${filters.dateMode}`;
  const dateError = filterDateError(filters);
  return (
    <div className="toolbar-group filter-group">
      <span className="group-label">FILTERS</span>
      <div className="group-controls">
        <MultiFilter
          label="Source"
          options={sources}
          selected={filters.sourceIds}
          onChange={(sourceIds) => onChange({ ...filters, sourceIds })}
        />
        <MultiFilter
          label="Firearms"
          options={catalog.filter((item) => item.kind === 'firearm')}
          selected={filters.firearmIds}
          onChange={(firearmIds) => onChange({ ...filters, firearmIds })}
        />
        <MultiFilter
          label="Projectiles"
          options={catalog.filter((item) => item.kind === 'projectile')}
          selected={filters.projectileIds}
          onChange={(projectileIds) => onChange({ ...filters, projectileIds })}
        />
        <details className="filter-popover date-filter" name="workspace-filter">
          <summary>
            <CalendarDays size={15} />
            {dateLabel}
            <ChevronDown size={14} />
          </summary>
          <div className="popover-content">
            <label className="field">
              Date window
              <select
                value={filters.dateMode}
                onChange={(event) =>
                  onChange({ ...filters, dateMode: event.target.value as Filters['dateMode'] })
                }
              >
                <option value="all">Any date</option>
                <option value="range">Date range</option>
                <option value="weeks">Last X weeks</option>
                <option value="months">Last X months</option>
              </select>
            </label>
            {filters.dateMode === 'range' && (
              <>
                <label className="field">
                  From
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
                  />
                </label>
                <label className="field">
                  To
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
                  />
                </label>
              </>
            )}
            {(filters.dateMode === 'weeks' || filters.dateMode === 'months') && (
              <label className="field">
                Number of {filters.dateMode}
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={filters.relativeAmount}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      relativeAmount: Math.min(120, Math.max(1, Number(event.target.value) || 1)),
                    })
                  }
                />
              </label>
            )}
            <small>Dates use this device's local time.</small>
            {dateError && (
              <p role="alert" className="error">
                {dateError}
              </p>
            )}
          </div>
        </details>
        {hasFilters(filters) && (
          <button
            className="icon-button"
            aria-label="Reset filters"
            onClick={() => onChange(structuredClone(EMPTY_FILTERS))}
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
