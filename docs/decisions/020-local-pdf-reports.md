# 020 — Local PDF reports and independent target framing

Accepted 2026-10-21. Release 0.17.0.

The owner requested printable archival reports from the current selection, plus an optional target crop. All five sections default on; chart and wide record pages may be landscape. All settings and images remain browser-local.

- Optional Profile.report stores five section booleans. Missing preferences enable all sections. No database version migration is required.
- The workspace freezes selected strings, included shots, table order, quantities, profile and chart image when the PDF action runs. A separate light ECharts canvas copies live options including dataZoom, without resizing or resetting the live chart.
- pdfmake and Roboto fonts are bundled and lazy-loaded. PDFs use selectable Unicode text and deny remote resource loading. No upload, server or CDN is involved. The generated Blob lives until the report dialog closes.
- An explicit Save as click preserves browser user activation for showSaveFilePicker. The same PDF can be downloaded or opened in the local PDF viewer where that API is unavailable.
- Portrait A4 holds string context, statistics and targets. Charts and tables wider than five columns use landscape. More than eight columns split into bands with stable row numbers. All selected records are included, regardless of screen pagination.
- TargetMeasurement.reportCrop is an optional square in original-image pixels, with original width/height. It requires a local photo reference but no circle or calibration. Bounds and photo ownership are validated. It remains independent of physical values and survives geometry changes, reimport and backup/restore.
- Image export reads the local original Blob, clips only the report rendering and overlays saved geometry. The rendered longest side is capped at 1600 pixels. Original files remain unchanged.
- Min/max muzzle velocity join the recorded-only summary. No ballistic or ammunition-optimization behavior changes.

Package and lockfile versions change together. The dirty suffix remains an honest working-tree indicator; the delivered preview is rebuilt after committing reviewed changes. This batch does not authorize a Pages deployment.
