import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { insertColumn, moveColumn, type TableColumn } from '../domain/table';

/** Persist selection/order through one callback; buttons provide keyboard and touch alternatives to drag. */
export function ColumnPicker({
  available,
  selected,
  onChange,
}: {
  available: TableColumn[];
  selected: string[];
  onChange: (ids: string[]) => void;
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
      const index = selected.indexOf(row.dataset.columnId!);
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
  /** End a drag without saving when the pointer is outside a selected row. */
  function finish(x: number, y: number) {
    const source = dragged.current;
    const gap = gapAt(x, y);
    if (source && gap !== null) onChange(insertColumn(selected, source, gap));
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
  const options = [
    ...selected
      .map((id) => available.find((item) => item.id === id))
      .filter((item): item is TableColumn => !!item),
    ...available.filter((item) => !selected.includes(item.id)),
  ];
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
      <summary>Columns</summary>
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
          Select columns. Drag selected rows to reorder, or use the arrow buttons.
        </p>
        {options.map((item) => {
          const index = selected.indexOf(item.id);
          return (
            <div
              key={item.id}
              className={`column-option ${drag?.id === item.id ? 'column-dragging' : ''}`}
              data-column-id={item.id}
              draggable={index >= 0}
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
                if (index >= 0) finish(event.clientX, event.clientY);
              }}
            >
              {drag?.gap === index && (
                <span className="column-drop-marker" aria-hidden="true">
                  Insert here
                </span>
              )}
              {index === selected.length - 1 && drag?.gap === selected.length && (
                <span className="column-drop-marker after" aria-hidden="true">
                  Insert here
                </span>
              )}
              {/* Pointer capture supports touch and keeps the handle usable without native HTML dragging. */}
              <button
                type="button"
                className="drag-handle"
                disabled={index < 0}
                tabIndex={-1}
                aria-label={`Drag ${item.label} to reorder`}
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
              <label className="check-field compact">
                <input
                  type="checkbox"
                  checked={index >= 0}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selected, item.id]
                        : selected.filter((id) => id !== item.id),
                    )
                  }
                />
                {item.label}
              </label>
              {index >= 0 && (
                <>
                  <button
                    className="icon-button"
                    aria-label={`Move ${item.label} up`}
                    disabled={index === 0}
                    onClick={() => onChange(moveColumn(selected, item.id, selected[index - 1]!))}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move ${item.label} down`}
                    disabled={index === selected.length - 1}
                    onClick={() => onChange(moveColumn(selected, item.id, selected[index + 1]!))}
                  >
                    <ArrowDown size={14} />
                  </button>
                </>
              )}
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
