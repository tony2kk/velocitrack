import { useRef } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { moveColumn, type TableColumn } from '../domain/table';

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
  const panel = useRef<HTMLDivElement>(null);
  const options = [
    ...selected
      .map((id) => available.find((item) => item.id === id))
      .filter((item): item is TableColumn => !!item),
    ...available.filter((item) => !selected.includes(item.id)),
  ];
  return (
    <details className="column-picker">
      <summary>Columns</summary>
      <div className="column-options" ref={panel}>
        <p className="muted">
          Select columns. Drag selected rows to reorder, or use the arrow buttons.
        </p>
        {options.map((item) => {
          const index = selected.indexOf(item.id);
          return (
            <div
              key={item.id}
              className="column-option"
              data-column-id={item.id}
              draggable={index >= 0}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', item.id);
                event.dataTransfer.effectAllowed = 'move';
                dragged.current = item.id;
              }}
              onDragEnd={() => {
                dragged.current = null;
              }}
              onDragOver={(event) => {
                if (dragged.current && index >= 0) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragged.current && index >= 0)
                  onChange(moveColumn(selected, dragged.current, item.id));
                dragged.current = null;
              }}
            >
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
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerCancel={() => {
                  dragged.current = null;
                }}
                onPointerUp={(event) => {
                  const source = dragged.current;
                  dragged.current = null;
                  if (!source || !panel.current) return;
                  const target = [
                    ...panel.current.querySelectorAll<HTMLElement>('[data-column-id]'),
                  ].find((row) => {
                    const bounds = row.getBoundingClientRect();
                    return (
                      event.clientX >= bounds.left &&
                      event.clientX <= bounds.right &&
                      event.clientY >= bounds.top &&
                      event.clientY <= bounds.bottom
                    );
                  })?.dataset.columnId;
                  if (target && selected.includes(target))
                    onChange(moveColumn(selected, source, target));
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
    </details>
  );
}
