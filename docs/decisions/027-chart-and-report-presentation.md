# 027 — Chart and report presentation

Accepted 2026-10-25 for release 0.20.0.

- String identity uses stable workspace colors. The palette no longer repeats after
  eight strings; additional indexes receive deterministic colors. Measured string
  comparisons use solid lines. Dashed lines remain reserved for calculated estimates.
- By string uses a separate colored bar per string, matching the legend and other
  comparison views. Automatic fitting includes displayed zero, including signed
  offsets. Manual zoom remains available; absent values are not invented as zero.
- Profile → Display offers chart height from 70–200% in whole percentages, default
  100% of the existing responsive height. This changes only the screen and preserves
  the numerical viewport. It has no effect on PDF layout.
- Profile → Report offers A4 (default) or Letter paper. Chart snapshots are rerendered
  at a page-specific aspect ratio, preserving the current data window and reserving
  room for headings, legend, model notes and footer. Very long notes may continue
  onto another page rather than making the chart unreadably small.
- Shot-record columns fit the chosen landscape paper width. Whole rows may continue
  to further pages. String/Shot sorting adds a stronger boundary before each new
  string, in both screen and PDF tables; other sort keys do not add group boundaries.
  Group identity uses IDs, so identical string names remain distinct.
- Chart height and paper size are optional local profile attributes and are included
  in validated ZIP backups. Older profiles/backups retain 100% and A4 defaults. No
  measurement, source, authentication or database schema changes are involved.
- Follow the verified main-branch publishing workflow in decision 023.
