import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { insertColumn, moveColumn, type TableColumn } from '../domain/table';
import type { Profile } from '../domain/model';

/** Keep visibility independent of order; persist both atomically on each explicit user edit. */
export function ColumnPicker({
  available,
  order,
  selected,
  onChange,
}: {
  available: TableColumn[];
  order: string[];
  selected: string[];
  onChange: (patch: Pick<Profile, 'tableColumns' | 'tableColumnOrder'>) => void;
}) {
  // Drag events can arrive in one browser frame; a ref avoids waiting for a render between them.
  const dragged = useRef<string | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    gap: number | null;
    pointer: boolean;
  } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  /** Locate a gap against stable row bounds; the insertion marker never changes row geometry. */
  function gapAt(x: number, y: number): number | null {
    const rows = panel.current?.querySelectorAll<HTMLElement>('[data-column-id]') ?? [];
    for (const row of rows) {
      const index = order.indexOf(row.dataset.columnId!);
      const bounds = row.getBoundingClientRect();
      if (
        index >= 0 &&
        x >= bounds.left &&
        x <= bounds.right &&
        y >= bounds.top &&
        y <= bounds.bottom
      )
        return index + (y > (bounds.top + bounds.bottom) / 2 ? 1 : 0);
    }
    return null;
  }
  /** End a drag without saving when the pointer is outside a column row. */
  function finish(x: number, y: number) {
    const source = dragged.current;
    const gap = gapAt(x, y);
    if (source && gap !== null) reorder(insertColumn(order, source, gap));
    dragged.current = null;
    setDrag(null);
  }
  /** Keep the floating card and insertion gap synchronized for mouse, pen and touch. */
  function move(x: number, y: number) {
    setDrag((current) => (current ? { ...current, x, y, gap: gapAt(x, y) } : null));
    const bounds = panel.current?.getBoundingClientRect();
    if (bounds && panel.current && x >= bounds.left && x <= bounds.right) {
      if (y < bounds.top + 28) panel.current.scrollTop -= 14;
      else if (y > bounds.bottom - 28) panel.current.scrollTop += 14;
    }
  }
  /** A move changes order only; hidden columns remain in place until explicitly moved. */
  function reorder(nextOrder: string[]) {
    onChange({
      tableColumnOrder: nextOrder,
      tableColumns: nextOrder.filter((id) => selected.includes(id)),
    });
  }
  const options = order
    .map((id) => available.find((item) => item.id === id))
    .filter((item): item is TableColumn => !!item);
  return (
    <details
      className="column-picker"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          dragged.current = null;
          setDrag(null);
        }
      }}
    >
      <summary title="Show, hide and reorder shot-table columns. Changes are saved in your local profile.">
        Columns
      </summary>
      <div
        className="column-options"
        ref={panel}
        onDragOver={(event) => {
          if (!dragged.current) return;
          move(event.clientX, event.clientY);
          if (gapAt(event.clientX, event.clientY) !== null) event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDrag((current) => (current ? { ...current, gap: null } : null));
        }}
      >
        <p className="muted">
          Show or hide columns without changing their order. Drag any row or use the arrows to move
          it.
        </p>
        {options.map((item, optionIndex) => {
          const index = order.indexOf(item.id);
          return (
            <div
              key={item.id}
              className={`column-option ${drag?.id === item.id ? 'column-dragging' : ''}`}
              data-column-id={item.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', item.id);
                event.dataTransfer.effectAllowed = 'move';
                dragged.current = item.id;
                setDrag({
                  id: item.id,
                  x: event.clientX,
                  y: event.clientY,
                  gap: index,
                  pointer: false,
                });
              }}
              onDragEnd={() => {
                dragged.current = null;
                setDrag(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                finish(event.clientX, event.clientY);
              }}
            >
              {drag?.gap === index && (
                <span className="column-drop-marker" aria-hidden="true">
                  Insert here
                </span>
              )}
              {optionIndex === options.length - 1 && drag?.gap === index + 1 && (
                <span className="column-drop-marker after" aria-hidden="true">
                  Insert here
                </span>
              )}
              {/* Pointer capture supports touch and keeps the handle usable without native HTML dragging. */}
              <button
                type="button"
                className="drag-handle"
                tabIndex={-1}
                aria-label={`Drag ${item.label} to reorder`}
                title={`Drag to move ${item.label}, or use the up/down buttons.`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  dragged.current = item.id;
                  setDrag({
                    id: item.id,
                    x: event.clientX,
                    y: event.clientY,
                    gap: index,
                    pointer: true,
                  });
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerCancel={() => {
                  dragged.current = null;
                  setDrag(null);
                }}
                onPointerMove={(event) => {
                  if (dragged.current) move(event.clientX, event.clientY);
                }}
                onPointerUp={(event) => {
                  finish(event.clientX, event.clientY);
                }}
              >
                <GripVertical size={15} aria-hidden="true" />
              </button>
              <label
                className="check-field compact"
                title={`Show or hide the ${item.label} column.`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={(event) =>
                    onChange({
                      tableColumnOrder: order,
                      tableColumns: order.filter((id) =>
                        id === item.id ? event.target.checked : selected.includes(id),
                      ),
                    })
                  }
                />
                {item.label}
              </label>
              <button
                className="icon-button"
                aria-label={`Move ${item.label} up`}
                title={`Move ${item.label} one column to the left.`}
                disabled={optionIndex === 0}
                onClick={() => reorder(moveColumn(order, item.id, options[optionIndex - 1]!.id))}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={`Move ${item.label} down`}
                title={`Move ${item.label} one column to the right.`}
                disabled={optionIndex === options.length - 1}
                onClick={() => reorder(moveColumn(order, item.id, options[optionIndex + 1]!.id))}
              >
                <ArrowDown size={14} />
              </button>
            </div>
          );
        })}
      </div>
      {drag?.pointer &&
        createPortal(
          <div
            className="column-drag-card"
            style={{
              left: Math.max(8, Math.min(drag.x + 14, window.innerWidth - 320)),
              top: Math.max(8, Math.min(drag.y + 14, window.innerHeight - 70)),
            }}
            role="status"
          >
            <GripVertical size={18} />
            {available.find((item) => item.id === drag.id)?.label}
          </div>,
          document.body,
        )}
    </details>
  );
}
