# 021 — Report readability and consistent display precision

Accepted 2026-10-21; release 0.17.1. Refines decision 020 without changing storage.

The owner requested clearer target geometry, all selected shot columns together,
and consistent rounded visualization with trailing zeroes throughout the app.

- Target figures use a white stroke over a dark halo, sized in print coordinates
  (1.5 pt center / 3.5 pt outline before final proportional fitting). H/V/G labels
  occupy a separate rail beside the photo with leader lines, avoiding label/photo
  overlap. The complete numeric caption is centered underneath.
- Shot records always use landscape A4. All columns stay in one table; column bands
  from decision 020 are superseded. Continuation pages repeat headings and contain
  whole rows. Width/type-size adaptation is bounded; impossible layouts produce an
  actionable message instead of clipping or silently omitting a shot.
- A shared readonly formatting policy rounds after unit conversion. Velocity uses
  one decimal, G1/G7 three, target lengths two. See DISPLAY_FORMAT.md for the table.
  Source values, calculation inputs, chart coordinates, editors and backups retain
  their previous precision. Optional curve unit metadata avoids parsing labels.
- No new user preference, schema or backup-format migration is needed. The report
  reads existing crop/measurement settings and leaves original photos untouched.

Verification includes shared-format and UI assertions, isolated layout tests, and
a rendered PDF using invented data: high-contrast target, 11 columns, 55 shots and
multiple landscape continuation pages. No real account data or photos are fixtures.
