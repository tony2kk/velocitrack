import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import type { FieldDefinition, UnitSystem } from '../domain/model';
import { reorderReportViews, REPORT_MODE_LABELS, type ReportView } from '../domain/reportProfiles';
import { ReportViewEditor } from './ReportViewEditor';

/** Pointer handles support mouse, pen and touch; arrow buttons provide the same accessible ordering. */
export function ReportViewList({
  views,
  fields,
  units,
  onChange,
}: {
  views: ReportView[];
  fields: FieldDefinition[];
  units: UnitSystem;
  onChange: (views: ReportView[]) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const source = useRef<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; gap: number | null } | null>(null);
  /** Use the existing card boxes so insertion feedback never shifts the pointer's destination. */
  function gapAt(x: number, y: number): number | null {
    const rows = panel.current?.querySelectorAll<HTMLElement>('[data-report-view]') ?? [];
    for (const [index, row] of [...rows].entries()) {
      const bounds = row.getBoundingClientRect();
      if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom)
        return index + (y > (bounds.top + bounds.bottom) / 2 ? 1 : 0);
    }
    return null;
  }
  /** Clear transient drag state without modifying saved or draft order. */
  function cancel() {
    source.current = null;
    setDrag(null);
  }
  return (
    <div
      className="report-view-list"
      ref={panel}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && source.current) {
          event.stopPropagation();
          cancel();
        }
      }}
    >
      {views.map((view, index) => (
        <section
          key={view.id}
          data-report-view={view.id}
          className={`report-view-card ${drag?.id === view.id ? 'is-dragging' : ''}`}
          aria-label={`View ${index + 1}`}
        >
          {drag?.gap === index && (
            <span className="column-drop-marker" aria-hidden="true">
              Insert here
            </span>
          )}
          {index === views.length - 1 && drag?.gap === index + 1 && (
            <span className="column-drop-marker after" aria-hidden="true">
              Insert here
            </span>
          )}
          <header className="report-view-heading">
            <button
              type="button"
              className="drag-handle"
              aria-label={`Drag view ${index + 1}`}
              title="Drag to reorder with a mouse or touch, or use the arrow buttons."
              onPointerDown={(event) => {
                event.preventDefault();
                source.current = view.id;
                setDrag({ id: view.id, gap: index });
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!source.current) return;
                setDrag({ id: source.current, gap: gapAt(event.clientX, event.clientY) });
                const bounds = panel.current?.getBoundingClientRect();
                if (panel.current && bounds) {
                  if (event.clientY < bounds.top + 28) panel.current.scrollTop -= 16;
                  if (event.clientY > bounds.bottom - 28) panel.current.scrollTop += 16;
                }
              }}
              onPointerUp={(event) => {
                const gap = gapAt(event.clientX, event.clientY);
                if (source.current && gap !== null)
                  onChange(reorderReportViews(views, source.current, gap));
                cancel();
              }}
              onPointerCancel={cancel}
              onLostPointerCapture={cancel}
            >
              <GripVertical size={18} />
            </button>
            <strong>
              {index + 1}. {REPORT_MODE_LABELS[view.mode]}
            </strong>
            <span className="report-view-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Move view ${index + 1} up`}
                title="Move this view earlier in the report."
                disabled={index === 0}
                onClick={() => onChange(reorderReportViews(views, view.id, index - 1))}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move view ${index + 1} down`}
                title="Move this view later in the report."
                disabled={index === views.length - 1}
                onClick={() => onChange(reorderReportViews(views, view.id, index + 2))}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove view ${index + 1}`}
                title="Remove this view from the draft report profile."
                onClick={() => onChange(views.filter((item) => item.id !== view.id))}
              >
                <Trash2 size={16} />
              </button>
            </span>
          </header>
          <ReportViewEditor
            view={view}
            fields={fields}
            units={units}
            onChange={(next) => onChange(views.map((item) => (item.id === next.id ? next : item)))}
          />
        </section>
      ))}
      {drag && (
        <span className="sr-only" role="status">
          {drag.gap === null
            ? 'Release outside the list to cancel.'
            : `Insert at position ${drag.gap + 1}.`}
        </span>
      )}
    </div>
  );
}
