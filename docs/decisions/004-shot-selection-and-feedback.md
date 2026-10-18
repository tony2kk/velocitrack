# 004 — Shot selection and import feedback

Accepted with the owner on 2026-10-18.

- Import notifications dismiss automatically after ten seconds. A later notification, even with identical text, gets its own ten seconds.
- Refresh shows centered progress with `Loading <source name>...`. It follows the active source, closes after completion/failure, and can be dismissed to continue in the background. File selection and missing sign-in remain explicit user actions.
- Selecting a series expands its shots. Every shot starts selected; deselections are held in page memory, survive filtering, series collapse/reselection and refresh, and reset on page reload. Newly imported shot identities start selected. No persisted records or provider exclusion flags change.
- Only selected shots contribute to the table, charts and statistics. Existing provider exclusions and source/unit compatibility rules still apply.
- Hover/focus links a shot's navigation row, table row and chart trace/point using its stable local ID, never its display number. Point details preserve the original sample index, distance, velocity and raw unit code without claiming validated physical units.
- Hover does not rebuild the chart or change selection. Large tables reveal the hovered shot's page. The existing 100-trace chart limit remains visible.
