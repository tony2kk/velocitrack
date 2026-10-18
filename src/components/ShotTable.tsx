import { useEffect, useRef, useState } from 'react';
import type { Series, Shot } from '../domain/model';
import { inspectPoints } from '../domain/measurements';

/** Show selected raw records and reveal a linked hovered shot without changing selection. */
export function ShotTable({
  shots,
  series,
  activeShotId,
  onHoverShot,
}: {
  shots: Shot[];
  series: Series[];
  activeShotId: string | null;
  onHoverShot: (id: string | null) => void;
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
            Selected shots. All values use unverified source units.
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
              <tr
                key={shot.id}
                tabIndex={0}
                ref={activeShotId === shot.id ? activeRow : undefined}
                aria-label={`Shot ${shot.number} in ${names.get(shot.seriesId)}`}
                className={`${shot.excluded ? 'excluded' : ''} ${activeShotId === shot.id ? 'shot-highlighted' : ''}`}
                onMouseEnter={() => onHoverShot(shot.id)}
                onMouseLeave={() => onHoverShot(null)}
                onFocus={() => onHoverShot(shot.id)}
                onBlur={() => onHoverShot(null)}
              >
                <td>{names.get(shot.seriesId)}</td>
                <td>{shot.number}</td>
                <td className="numeric">{shot.muzzleVelocity ?? '—'}</td>
                <td className="numeric">{shot.ballisticCoefficientG1 ?? '—'}</td>
                <td className="numeric">{shot.ballisticCoefficientG7 ?? '—'}</td>
                <td>{inspectPoints(shot).points.length}</td>
                <td>{shot.rawUnit}</td>
                <td>{shot.excluded ? 'Source excluded' : 'Included'}</td>
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
