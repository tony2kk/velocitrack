# 029 — Local Report Builder

Accepted 2026-10-25 for release 0.22.0.

The owner requested reusable report compositions alongside the existing report
of the current screen. The latest instruction chooses one Tools dropdown:
**Quick report** first, followed by named profiles, with the existing PDF button
beside it. Remember the selection in the local profile.

## Composition and ownership

- Profile → Report Builder manages detached drafts, explicit saves and confirmed
  deletions. Names are required and unique after Unicode normalization, whitespace
  normalization and case folding. Quick report is reserved.
- A profile selects details, targets, statistics and shot records independently of
  Quick report, plus an ordered array of zero or more views. Every section starts
  enabled. Views use Simple, Dual, String compare or String info.
- Simple/Dual offer **Combined strings** or **One chart per string**. Compare and
  info always use all selected strings. Drag handles and keyboard-operable arrows
  change order. String info has no irrelevant chart settings.
- Current selected strings/shots, profile units, A4/Letter paper, and sorted visible
  shot columns are captured at generation time. Templates do not contain data,
  photos, credentials or executable functions. Everything stays in IndexedDB.
- Blank forecast uses the furthest valid measured distance in each generated
  chart, ignoring excluded shots and invalid/padding pairs. Without a positive
  sample it uses the existing 1000 ft model default. An explicit distance is stored
  in canonical feet, displayed in profile units, and bounded by the existing 1 km
  limit. No prediction or atmosphere formulas change.

## Rendering

Interactive charts and report charts share trace builders and the extracted pure
`charts/options.ts` presentation. Quick report captures the screen's current
physical viewport. Template charts fit independently, without changing screen
mode, quantities, selection or zoom. Both use `charts/engine.ts` for page-fitted
light-background images; each detached renderer is disposed before the next.

One introduction and optional overview/targets precede ordered chart/info views;
shot records follow. Existing orientation, colors, model notes and whole-row
pagination rules apply. A missing quantity or unusable data produces an explicit
notice in its view, not a silent replacement. Current calculated-curve input and
shot-count limits remain in force. Profiles are bounded to 100, configured views
to 50 per profile, and expanded views to 200 per PDF. Generation can be dismissed
between chart renders. Suggested filenames include the profile name.

## Compatibility

The local profile gains optional `reportProfiles` and `selectedReportProfileId`.
Save/delete transactions preserve unrelated concurrent preference edits. Deleting
the selected template returns Tools to Quick report.

Backup envelope remains version 2; data contract advances to 3. The ordered 2 → 3
step initializes absent profiles to an empty list and is shown before restoration.
Older archives remain readable, all previous migrations remain intact, and new
profiles/selection round-trip. Unsupported custom quantities retain their IDs
with notices. No IndexedDB index migration, reset or backend is introduced.
