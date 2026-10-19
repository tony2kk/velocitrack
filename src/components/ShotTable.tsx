import { useEffect, useRef, useState } from 'react';
import type {
  Series,
  Shot,
  UnitSystem,
  FieldDefinition,
  Annotation,
  Tag,
  ShotDetail,
} from '../domain/model';
import { fieldDisplay, fieldUnit } from '../domain/customFields';
import { TagLabels } from './CustomizationManager';
import { inspectPoints } from '../domain/measurements';
import { displayValue, formatValue, unitLabels } from '../domain/units';

/** Show selected records in display units and reveal a linked hovered shot without changing selection. */
export function ShotTable({
  shots,
  series,
  activeShotId,
  onHoverShot,
  unitSystem = 'imperial',
  hiddenShots = new Set<string>(),
  onToggleShot,
  fields = [],
  annotations = [],
  tags = [],
  showTags = false,
  shotDetail = 'muzzleVelocity',
}: {
  shots: Shot[];
  series: Series[];
  activeShotId: string | null;
  onHoverShot: (id: string | null) => void;
  unitSystem?: UnitSystem;
  hiddenShots?: ReadonlySet<string>;
  onToggleShot?: (id: string, checked: boolean) => void;
  fields?: FieldDefinition[];
  annotations?: Annotation[];
  tags?: Tag[];
  showTags?: boolean;
  shotDetail?: ShotDetail;
}) {
  const [page, setPage] = useState(0);
  const scrollArea = useRef<HTMLDivElement>(null);
  const activeRow = useRef<HTMLTableRowElement>(null);
  const hoveredIndex = shots.findIndex((shot) => shot.id === activeShotId);
  const currentPage =
    hoveredIndex >= 0
      ? Math.floor(hoveredIndex / 100)
      : Math.min(page, Math.max(0, Math.ceil(shots.length / 100) - 1));
  const names = new Map(series.map((item) => [item.id, item.name]));
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
              {onToggleShot && <th>Analyze</th>}
              <th>Series</th>
              <th>Shot</th>
              <th>Muzzle velocity ({unitLabels[unitSystem].velocity})</th>
              <th>G1</th>
              <th>G7</th>
              <th>Points</th>
              <th>Source unit code</th>
              <th>Status</th>
              {showTags && <th>Tags</th>}
              {fields.map((field) => (
                <th key={field.id}>
                  {field.name}
                  {fieldUnit(field.type, unitSystem)
                    ? ` (${fieldUnit(field.type, unitSystem)})`
                    : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shots.slice(currentPage * 100, (currentPage + 1) * 100).map((shot) => (
              <tr
                key={shot.id}
                tabIndex={0}
                ref={activeShotId === shot.id ? activeRow : undefined}
                aria-label={`Shot ${shot.number} in ${names.get(shot.seriesId)}`}
                className={`${shot.excluded || hiddenShots.has(shot.id) ? 'excluded' : ''} ${activeShotId === shot.id ? 'shot-highlighted' : ''}`}
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
                      checked={!hiddenShots.has(shot.id)}
                      onChange={(event) => onToggleShot(shot.id, event.target.checked)}
                    />
                  </td>
                )}
                <td>{names.get(shot.seriesId)}</td>
                <td>{shot.number}</td>
                <td
                  className={`numeric ${shotDetail === 'muzzleVelocity' ? 'preferred-reading' : ''}`}
                >
                  {formatValue(displayValue(shot.muzzleVelocity, 'velocity', unitSystem))}
                </td>
                <td className={`numeric ${shotDetail === 'g1' ? 'preferred-reading' : ''}`}>
                  {shot.ballisticCoefficientG1 ?? '—'}
                </td>
                <td className={`numeric ${shotDetail === 'g7' ? 'preferred-reading' : ''}`}>
                  {shot.ballisticCoefficientG7 ?? '—'}
                </td>
                <td>{inspectPoints(shot).points.length}</td>
                <td>{shot.rawUnit}</td>
                <td>
                  {shot.excluded
                    ? 'Source excluded'
                    : hiddenShots.has(shot.id)
                      ? 'Not selected'
                      : 'Included'}
                </td>
                {showTags && (
                  <td className="tags-column">
                    <TagLabels
                      tags={tags.filter((tag) =>
                        details.get(shot.seriesId)?.tagIds?.includes(tag.id),
                      )}
                    />
                  </td>
                )}
                {fields.map((field) => (
                  <td className="custom-value" key={field.id}>
                    {fieldDisplay(
                      details.get(shot.seriesId)?.values?.[field.id],
                      field.type,
                      unitSystem,
                    ) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shots.length > 100 && (
        <div className="pagination">
          <button
            disabled={currentPage === 0}
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
