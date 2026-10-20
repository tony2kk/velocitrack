# 011 — Retained chart ranges and control help

Requested on 2026-10-20. This batch improves chart navigation and explanations; it does not change numerical prediction models, atmosphere handling or recorded data.

## Ranges and reset

Keep one ECharts instance for the mounted canvas. Update its options with explicit axis domains and zoom percentages, rather than disposing it on each parameter change. Session-only viewport memory belongs to the analysis panel, so temporary empty selections and String info do not discard it.

Retain canonical numerical bounds, not only percentages of a changing dataset. Each horizontal axis meaning and vertical quantity has its own range. Recorded and calculated velocities share a dimension. Unrelated quantities start with their own fitted range and restore it when revisited. Explicit display transforms preserve the physical view through Imperial/Metric changes, including affine temperature conversion and fixed-unit custom fields.

The navigable domain may expand for incoming data while the visible window stays fixed. Missing readings must not establish a placeholder 0–1 range for future valid data. Dual vertical axes retain independent numerical windows while sharing slider gestures. Reset fits only the active axes to current plotted data, without changing selected shots or filters.

## Horizontal field coordination

While the existing forecast field is active, its value is the visible right edge in canonical feet. Horizontal zoom commits a settled right edge after a short debounce; vertical gestures never change it. Edits to the field preserve the left edge and vertical view. Crossing the left edge resets that edge to zero. The existing forecast bounds and numerical implementation are unchanged.

Retain the larger slider domain after a shorter right edge is saved, avoiding a shrinking feedback loop that would prevent zooming back out. Only the forecast preference is saved; viewport memory is local to this page session and is not added to ZIP backups or the database schema.

## Help and graphical interpretation

Use concise English native hover titles for meaningful controls, with accessible names retained for icon buttons. Explain selection versus data mutation, summary statistics, axis controls, table columns and reset behavior. Keep measured-point details as escaped React text.

The supplied screenshots used different vertical limits, so their visual comparison alone cannot validate a physical model. The distance view already uses a shared velocity axis for its two traces. This batch makes that numerical scale stable when switching curves; it does not claim model accuracy or infer unvalidated environmental units.
