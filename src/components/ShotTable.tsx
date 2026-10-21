import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Series,
  Shot,
  UnitSystem,
  FieldDefinition,
  Annotation,
  Tag,
  ShotDetail,
  CatalogItem,
  Profile,
} from '../domain/model';
import { ArrowDown, ArrowUp, ArrowUpDown, Undo2, X } from 'lucide-react';
import { fieldText } from '../domain/customFields';
import { TagLabels } from './CustomizationManager';
import { inspectPoints } from '../domain/measurements';
import { displayValue, formatQuantity, unitLabels } from '../domain/units';

import { availableQuantities, rawPath } from '../domain/analysis';
import { tableColumns, DEFAULT_COLUMNS } from '../domain/table';
import { projectileName } from '../domain/projectiles';
import { providerTime } from './StringInfo';
import { ColumnLabel } from './ColumnLabel';

/** Show selected records in display units and reveal a linked hovered shot without changing selection. */
export function ShotTable({
  shots,
  series,
  activeShotId,
  activeShotIds,
  onHoverShot,
  unitSystem = 'imperial',
  hiddenShots = new Set<string>(),
  onToggleShot,
  onToggleShots,
  invalidShots = new Set<string>(),
  onInvalidateShot,
  fields = [],
  annotations = [],
  tags = [],
  showTags = false,
  shotDetail = 'muzzleVelocity',
  columnIds,
  catalog = [],
  showProjectileWeight = false,
  sort,
  onSort,
}: {
  activeShotIds?: string[];
  sort?: Profile['tableSort'];
  onSort?: (sort: NonNullable<Profile['tableSort']>) => void;
  shots: Shot[];
  series: Series[];
  activeShotId: string | null;
  onHoverShot: (id: string | null) => void;
  unitSystem?: UnitSystem;
  hiddenShots?: ReadonlySet<string>;
  onToggleShot?: (id: string, checked: boolean) => void;
  onToggleShots?: (ids: string[], checked: boolean) => void;
  invalidShots?: ReadonlySet<string>;
  onInvalidateShot?: (id: string, invalid: boolean) => void;
  fields?: FieldDefinition[];
  annotations?: Annotation[];
  tags?: Tag[];
  showTags?: boolean;
  shotDetail?: ShotDetail;
  columnIds?: string[];
  catalog?: CatalogItem[];
  showProjectileWeight?: boolean;
}) {
  const [page, setPage] = useState(0);
  const scrollArea = useRef<HTMLDivElement>(null);
  const activeRow = useRef<HTMLTableRowElement>(null);
  const selectAll = useRef<HTMLInputElement>(null);
  const eligible = shots.filter((shot) => !invalidShots.has(shot.id));
  const selectedCount = eligible.filter((shot) => !hiddenShots.has(shot.id)).length;
  const allSelected = eligible.length > 0 && selectedCount === eligible.length;
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [selectedCount, allSelected]);
  const hoveredIndex = shots.findIndex((shot) => shot.id === activeShotId);
  const currentPage =
    hoveredIndex >= 0
      ? Math.floor(hoveredIndex / 100)
      : Math.min(page, Math.max(0, Math.ceil(shots.length / 100) - 1));
  const names = new Map(series.map((item) => [item.id, item.name]));
  const sessions = new Map(series.map((item) => [item.id, item]));
  const catalogNames = new Map(catalog.map((item) => [item.id, item.name]));
  const quantities = useMemo(
    () =>
      availableQuantities(
        shots.map((shot) => ({ ...shot, excluded: false })),
        series,
        fields,
        annotations,
        unitSystem,
        true,
      ),
    [shots, series, fields, annotations, unitSystem],
  );
  const definitions = tableColumns(fields, quantities, unitSystem);
  const ids = columnIds ?? [
    ...DEFAULT_COLUMNS,
    ...(showTags ? ['tags'] : []),
    ...fields.map((field) => `field:${field.id}`),
  ];
  const columns = ids.flatMap((id) => {
    const definition = definitions.find((item) => item.id === id);
    return definition ? [definition] : [];
  });
  const details = new Map(annotations.map((item) => [item.entityId, item]));
  useEffect(() => {
    // Keep a revealed page in place after the pointer leaves the navigation row.
    if (hoveredIndex >= 0) setPage(Math.floor(hoveredIndex / 100));
  }, [hoveredIndex]);
  useEffect(() => {
    const container = scrollArea.current;
    const row = activeRow.current;
    if (!container || !row) return;
    // Scroll only this panel: scrollIntoView would also move the whole page under the pointer.
    const bounds = container.getBoundingClientRect();
    const target = row.getBoundingClientRect();
    const headerHeight = container.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    if (target.top < bounds.top + headerHeight)
      container.scrollTop += target.top - bounds.top - headerHeight;
    else if (target.bottom > bounds.bottom) container.scrollTop += target.bottom - bounds.bottom;
  }, [activeShotId, currentPage]);
  return (
    <>
      <div className="table-scroll" ref={scrollArea}>
        <table>
          <caption className="sr-only">
            Shots in selected series. Muzzle velocity in {unitLabels[unitSystem].velocity}; G1 and
            G7 coefficients are unchanged.
          </caption>
          <thead>
            <tr>
              {onToggleShot && (
                <th>
                  <label className="column-heading">
                    <input
                      ref={selectAll}
                      type="checkbox"
                      aria-label="Analyze all shots"
                      title="Select or deselect all eligible shots across every table page. Invalid and source-excluded shots remain omitted."
                      aria-checked={selectedCount > 0 && !allSelected ? 'mixed' : allSelected}
                      checked={allSelected}
                      disabled={!eligible.length}
                      onChange={(event) => {
                        const ids = eligible.map((shot) => shot.id);
                        if (onToggleShots) onToggleShots(ids, event.target.checked);
                        else for (const id of ids) onToggleShot(id, event.target.checked);
                      }}
                    />
                    Analyze
                  </label>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  aria-label={column.label}
                  aria-sort={
                    (sort?.columnId ?? 'series') === column.id
                      ? sort?.direction === 'desc'
                        ? 'descending'
                        : 'ascending'
                      : undefined
                  }
                >
                  <span className="column-heading">
                    <ColumnLabel column={column} />
                    {column.id !== 'shot' && onSort && (
                      <button
                        className="sort-button"
                        aria-label={`Sort by ${column.label}`}
                        title={`Sort by ${column.label}`}
                        onClick={() =>
                          onSort({
                            columnId: column.id,
                            direction:
                              (sort?.columnId ?? 'series') === column.id &&
                              sort?.direction !== 'desc'
                                ? 'desc'
                                : 'asc',
                          })
                        }
                      >
                        {(sort?.columnId ?? 'series') === column.id ? (
                          sort?.direction === 'desc' ? (
                            <ArrowDown size={14} />
                          ) : (
                            <ArrowUp size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </button>
                    )}
                  </span>
                </th>
              ))}
              {onInvalidateShot && (
                <th className="shot-actions">
                  <span className="sr-only">Shot actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {shots.slice(currentPage * 100, (currentPage + 1) * 100).map((shot) => (
              <tr
                key={shot.id}
                tabIndex={0}
                ref={activeShotId === shot.id ? activeRow : undefined}
                aria-label={`Shot ${shot.number} in ${names.get(shot.seriesId)}`}
                className={`${shot.excluded || hiddenShots.has(shot.id) ? 'excluded' : ''} ${invalidShots.has(shot.id) ? 'shot-invalid' : ''} ${(activeShotIds ?? (activeShotId ? [activeShotId] : [])).includes(shot.id) ? 'shot-highlighted' : ''}`}
                onMouseEnter={() => onHoverShot(shot.id)}
                onMouseLeave={() => onHoverShot(null)}
                onFocus={() => onHoverShot(shot.id)}
                onBlur={() => onHoverShot(null)}
              >
                {onToggleShot && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select shot ${shot.number} in ${names.get(shot.seriesId)}`}
                      title="Include this shot in charts and summary statistics for this session."
                      checked={!hiddenShots.has(shot.id) && !invalidShots.has(shot.id)}
                      disabled={invalidShots.has(shot.id)}
                      onChange={(event) => onToggleShot(shot.id, event.target.checked)}
                    />
                  </td>
                )}
                {columns.map((column) => {
                  const session = sessions.get(shot.seriesId);
                  const field = fields.find((item) => `field:${item.id}` === column.id);
                  let value: React.ReactNode;
                  switch (column.id) {
                    case 'series':
                      value = names.get(shot.seriesId);
                      break;
                    case 'shot':
                      value = shot.number;
                      break;
                    case 'velocity':
                      value = formatQuantity(
                        displayValue(shot.muzzleVelocity, 'velocity', unitSystem),
                        'velocity',
                      );
                      break;
                    case 'g1':
                      value = formatQuantity(shot.ballisticCoefficientG1, 'g1');
                      break;
                    case 'g7':
                      value = formatQuantity(shot.ballisticCoefficientG7, 'g7');
                      break;
                    case 'points':
                      value = inspectPoints(shot).points.length;
                      break;
                    case 'rawUnit':
                      value = shot.rawUnit;
                      break;
                    case 'status':
                      value = invalidShots.has(shot.id)
                        ? 'Invalid'
                        : shot.excluded
                          ? 'Source excluded'
                          : hiddenShots.has(shot.id)
                            ? 'Not selected'
                            : 'Included';
                      break;
                    case 'tags':
                      value = (
                        <TagLabels
                          tags={tags.filter((tag) =>
                            details.get(shot.seriesId)?.tagIds?.includes(tag.id),
                          )}
                        />
                      );
                      break;
                    case 'shotNotes':
                      value = typeof shot.raw.notes === 'string' ? shot.raw.notes : '—';
                      break;
                    case 'seriesNotes':
                      value = typeof session?.raw.notes === 'string' ? session.raw.notes : '—';
                      break;
                    case 'timestamp':
                      value = providerTime(shot.raw.timestamp);
                      break;
                    case 'firearm':
                      value = session
                        ? (catalogNames.get(session.firearmId) ??
                          (rawPath(session.raw, 'firearm.name') as string))
                        : '—';
                      break;
                    case 'projectile':
                      value = session
                        ? projectileName(session, catalogNames, showProjectileWeight)
                        : '—';
                      break;
                    default:
                      value = field
                        ? fieldText(
                            details.get(shot.seriesId)?.values?.[field.id],
                            field.type,
                            unitSystem,
                          ) || '—'
                        : formatQuantity(
                            quantities.find((q) => q.id === column.id)?.read(shot) ?? null,
                            column.id,
                            column.unit,
                          );
                  }
                  const preferred =
                    column.id === (shotDetail === 'muzzleVelocity' ? 'velocity' : shotDetail);
                  return (
                    <td
                      key={column.id}
                      className={`${preferred ? 'preferred-reading' : ''} ${column.id === 'tags' ? 'tags-column' : ''} ${field || column.id.endsWith('Notes') ? 'custom-value' : ''}`}
                    >
                      {value}
                    </td>
                  );
                })}
                {onInvalidateShot && (
                  <td className="shot-actions">
                    <button
                      type="button"
                      className={`icon-button ${invalidShots.has(shot.id) ? 'restore-shot' : 'invalidate-shot'}`}
                      aria-label={`${invalidShots.has(shot.id) ? 'Restore' : 'Mark invalid'} shot ${shot.number} in ${names.get(shot.seriesId)}`}
                      title={
                        invalidShots.has(shot.id)
                          ? 'Undo invalidation'
                          : 'Mark shot invalid (saved until undone)'
                      }
                      onClick={() => onInvalidateShot(shot.id, !invalidShots.has(shot.id))}
                    >
                      {invalidShots.has(shot.id) ? (
                        <Undo2 size={16} aria-hidden="true" />
                      ) : (
                        <X size={16} aria-hidden="true" />
                      )}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shots.length > 100 && (
        <div className="pagination">
          <button
            disabled={currentPage === 0}
            title="Show the previous 100 shot records without changing analysis selection."
            onClick={() => {
              onHoverShot(null);
              setPage(currentPage - 1);
            }}
          >
            Previous
          </button>
          <span>
            Page {currentPage + 1} of {Math.ceil(shots.length / 100)}
          </span>
          <button
            disabled={(currentPage + 1) * 100 >= shots.length}
            title="Show the next 100 shot records without changing analysis selection."
            onClick={() => {
              onHoverShot(null);
              setPage(currentPage + 1);
            }}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
