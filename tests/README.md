# Verification

Committed fixtures are invented from scratch. Tests never read personal exports or provider accounts.

- `import.test.ts`: JSON pairs/combined data, BOM, CSV quoting/nested JSON, booleans, identities, timestamps, padding preservation, unequal arrays and malformed/duplicate/orphan records.
- `measurements.test.ts`: zero padding versus valid zero distance, invalid/unpaired samples, sample SD, exclusions and incompatible groups.
- `filters.test.ts`: OR/AND, local boundaries, invalid ranges and relative calendar windows.
- `storage.test.ts`: Dexie with fake IndexedDB; idempotency, rollback, manual catalog repair, preserved annotations/renames, source isolation, reopening and removal scope.
- `interaction.test.tsx`: React/DOM checks for notification deadlines, session selection, linked navigation/table hover, pagination and progress dismissal.
- `chart.test.ts` and `chart-interaction.test.tsx`: sample identity/precision, trace limits, chart event mapping, emphasis without canvas reconstruction, and safe point-detail rendering. The chart bridge tests mock ECharts; real canvas rendering is verified separately in the browser.
- `refresh.test.ts`: enabled-source coordination, in-flight deduplication, progress updates and cleanup after failures.
- `caldwell-setup.test.ts`: identical standard source setup for local/hosted origins, profile reuse, preserved account bindings, bounded responses and safe failures.
- `public-content.test.ts`: runs the publication guard in isolated temporary Git repositories, allowing only the standard two-field client metadata and rejecting extra fields or client keys elsewhere. All values are invented.
- `units.test.ts` and `preferences.test.tsx`: conversion reference points, unchanged raw values, chart/tooltip/table/statistic consistency, table emphasis and local profile persistence. Storage tests cover legacy defaults and counting new identities under repeats/concurrent imports; feedback/refresh tests cover zero additions and multi-source aggregation. Chart bridge tests cover independently bound sliders and tooltip clearing on zoom.

Run `npm test` or `npm run verify`. Empty suites fail. Browser testing is separate; see `docs/VERIFICATION.md`. Fake IndexedDB tests do not prove browser quota, migration or service-worker behavior.

Series-context coverage includes the additive v2 migration, custom field unit/value semantics, tag filters and cleanup, inherited shot columns, original photo lifecycle, ZIP validation/round trips, and full rollback when a restore write fails. All records and raster fixtures are invented. Browser smoke checks use an isolated origin and are recorded in docs/VERIFICATION.md.

- `analysis.test.ts`: scalar availability/conversion, incompatible-axis fallback, merged dual sequences and missing-reading gaps, per-string comparison/interpolation, disjoint measured ranges, stable comparison colors, projectile mass units and immutable column moves.
- `analysis-ui.test.tsx`: independent saved chart choices/remounts, distance-only velocity, Display controls, theme system changes, selected-column persistence, drag/button ordering, missing source columns and zero-shot String info.
- Backup round trips include analysis, ordered columns, theme and projectile-display preferences. Session lifecycle checks reconcile a changed persistence choice on reused SDK handles. Tests use invented data and mock the canvas bridge where appropriate; real rendering remains a separate browser check.

- `chart-viewport.test.ts` and `chart-interaction.test.tsx`: retain canonical numerical ranges across data, quantity, theme and unit changes; align independent vertical axes; handle empty/constant data; reset active ranges; coordinate the horizontal right edge with the forecast field without vertical-write or shrinking-domain feedback. Remount and reset-follow-up tests exercise session memory and asynchronously supplied data.
- `analysis-ui.test.tsx` also verifies that displaying a rounded forecast value does not overwrite its stored precision on an untouched blur.

- `distance-context.test.ts`: full record/raw preservation, detached readonly nested values, source-scoped parent joins, explicit missing data, separate annotations and field/tag definitions, callback consistency, failed mutations and all three distance trace modes.
- `distance-context-ui.test.tsx`: context-based availability in both menus, omission notices and actual chart dispatch through the analysis panel; local annotation edits update results without changing imported records. ECharts rendering is mocked.
- `distance-curves.test.ts`: generic registration/dispatch, frozen detached inputs, canonical transforms, malformed outputs/failures, independent axes, bounded callbacks and null-segment contributor linkage. UI/chart bridge tests register the example only in their test modules and verify saved choices, descriptions and separate distance axes.
- `velocity-catalog.test.ts`: independent G1/G7 registration and removal, preserved legacy IDs and metadata, duplicate/unknown ID rejection, and unchanged output/inputs through the full readonly custom dispatch path. Existing calculation regression tests remain the numerical baseline.
- `target-measurement.test.ts`: signed calibration, zero/missing dimensions, manual overrides, circle-only offsets, cm/in conversion, malformed geometry, readonly custom context, atomic storage ownership, refresh preservation, photo deletion and ZIP round trips.
- `target-editor.test.tsx`: draw/calibrate/move/resize/undo/save/reopen, pointer cancellation, viewport retention across tool changes, Ctrl-drag/wheel, two-finger pan/pinch and remaining-finger suppression, unchanged saved geometry after navigation, fixed numeric inputs, Cancel without writes, explicit calibration on a different photo, untouched input precision, direct values without photos, inherited table columns and optional group size on string cards.
- `target-viewport.test.ts`: screen/image mapping through letterboxing, cursor-anchored zoom, translated touch midpoint, zoom/pan bounds and complete fit.
- Display preference coverage also saves `showGroupSize`; backup validation accepts its absence for older workspaces and includes it in new archives. DOM image dimensions/pointer APIs are mocked; real SVG geometry and image loading are checked separately in an isolated browser origin.

- Column regressions preserve positions through hide/show, explicit hidden-column moves,
  reopening, unavailable/new definitions and custom-field deletion. Backup tests cover
  complete hidden-column order, old profiles without it, invalid references and duplicates.
- `drop-integration.test.ts` checks independent vacuum and constant-Cd analytic solutions.
  `calculated-drop.test.ts` verifies actual-model speed parity, availability, units, axes,
  tooltips and bounded contributor means. Backup round trips reproduce both drop curves
  from restored source measurements and retain chart choices/forecast distance.

- `column-labels.test.tsx`: full header explanations through hover/focus/tap and
  dismissal, unchanged sort identities, structured units, literal custom names,
  fixed-unit fields, and distinct string/shot scope. Existing selection and backup
  regressions cover compatibility of this presentation-only change.

- `atmosphere.test.ts`: Magnus reference values, dry/humid ideal-gas behavior,
  independent mass-weighted acoustic heat capacities, sea-level pressure reduction,
  required inputs, supported ranges, unit conversion and source preservation.
- `atmosphere-storage.test.ts`: both source types, recalculation/clearing on reimport,
  rollback, annotations, legacy records, validated backup round trips and readonly context.
- `atmosphere-ui.test.tsx`: density/sound-speed table and scalar charts, profile units,
  pressure/elevation units and unavailable/present String info values.

- `local-velocity.test.ts`: standard parity, independent analytic local-condition
  integration, density/sound-speed effects and Mach bounds, unavailable or unrelated
  inputs, unchanged source data/distances, shared axes, display units and per-string
  tooltip/contributor provenance. Automatic selection checks cover complete standard
  fallback, source isolation, dry/humid station descriptions, plotted-shot limits,
  historical selection normalization and unchanged drop. Analysis controls verify
  unified menus and mixed conditions; atmosphere storage checks restore historical
  local choices as automatic models and reproduce values after ZIP recovery.

- `reports.test.ts`: section defaults, current column order/units, curated details, safe Unicode names, recorded min/max, crop bounds and real PDF generation with embedded fonts. Set VELOCI_REPORT_SAMPLE=1 to write an ignored synthetic PDF for visual QA.
- `report-preferences.test.tsx`: local all-on defaults and save, native picker cancellation/success, fallback download lifecycle.
- Existing chart, target-editor and backup suites verify a frozen zoom export, crop-only movement/save and recovery of report preferences plus crop geometry.
