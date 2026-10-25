# Plan

## Presentation batch — 0.20.0

- [x] Distinct string colors and solid measured comparison lines.
- [x] Colored By string bars with a zero baseline on automatic fit.
- [x] Local 70–200% screen chart height; preserve zoom on resize.
- [x] A4/Letter PDF paper, larger page-fitted chart snapshots and adaptive table width.
- [x] Strong String/Shot group separators in workspace and PDF tables.
- [x] Validate and back up both new local preferences; preserve older defaults.

## Foundation

- [x] New local/public GitHub repositories under the VelociTrack name.
- [x] Pinned dependencies, CI, manual Pages workflow and privacy guard.
- [x] Independent source tree; no study code, APK or private exports.

## Approved local-first MVP

- [x] Record architecture decisions and English-only convention.
- [x] IndexedDB entities, annotations and local profile.
- [x] JSON/CSV adapter, raw preservation and source-scoped identities.
- [x] Atomic repeatable import and optional automatic catalog updates.
- [x] Source/catalog management and all-enabled-source refresh.
- [x] Persistent multi-select/date filters and profile preferences.
- [x] Responsive series selection, charts/table and data-quality reporting.
- [x] Static PWA shell and owner-provided branding.
- [x] Parser, statistics, filter and transactional storage tests.

See `docs/VERIFICATION.md` for actual verification and remaining caveats. The current
release workflow in decision 023 supersedes deployment restrictions in historical
release notes below.

## Next iteration

- [x] Timed import feedback, centered refresh progress, session shot selection and linked chart/table/navigation highlighting (decision 004).

The Caldwell source and full local application import are implemented and verified, including repeat refresh without duplicate records. Dedicated user help lives in `help/README.md`. Next, review the connected workflow with the owner.

The owner authorized the next batch on 2026-10-18 (decision 006):

- [x] Report only newly imported records; show **No new data detected** when none were added.
- [x] Add a vertical chart zoom slider alongside the horizontal slider.
- [x] Persist Imperial/Metric display units in the local profile, defaulting to Imperial.
- [x] Persist Muzzle velocity/G1/G7 as the navigation shot detail, defaulting to Muzzle velocity.

1. Review the MVP workflow and appearance using local exports.
2. Validate provider enum meanings, distance origin and remaining atmosphere fields; the owner confirmed ft/s, ft and °F for the supported raw inputs.
3. Stress-test workspace backup/restore, physical-device quota handling and larger datasets.
4. Review the implemented series custom fields, tag filters and photos with the owner.
5. Design explicit mapping/merging across source catalogs.
6. Add agreed chart/report tools using validated measurement semantics.

## Connected-source verification

- [x] Keep connection configuration local and review the available public terms.
- [x] Run isolated browser-only Auth/Firestore PoC with the owner's account.
- [x] Verify successful ordinary browser Auth and own-account reads from loopback without bypasses.
- [x] Verify full application import and repeat refresh with the owner's account.
- [x] Record sanitized results, terms limitations and the owner's explicit decision to publish the independent connector.
- [x] Replace manual connection-file selection with automatic setup in the configured local installation.
- [x] Publish the standard two-field Caldwell source-type configuration for identical local/hosted setup, as explicitly requested by the owner (decision 005).
- [x] Verify intended hosted origin: the owner confirmed successful sign-in/import on the published `0.2.1` app on 2026-10-18.
- [ ] Obtain evidence for restrictions not observable from customer access.
- [ ] Obtain any applicable app-specific terms or provider clarification; the owner intends to contact Caldwell later.
- [ ] Verify opt-in persistent authentication across browser restarts.

The private browser-only test and local product import passed on 2026-10-18; the owner subsequently confirmed a successful import from GitHub Pages. Only the explicitly approved two-field source-type metadata is public; user configuration and credentials remain excluded. The owner directed publication after the terms review; this does not establish provider support or resolve the remaining service questions. See `docs/FIREBASE_POC.md` and `docs/TERMS_REVIEW.md`.

## Publication

Review candidate files, built assets and history before publishing. The owner authorized committing and pushing each completed, verified functional batch to `origin/main` on 2026-10-18 and explicitly approved proceeding with the Caldwell connector after the terms review. Continue on `main` unless instructed otherwise. On 2026-10-21 the owner also authorized immediate Pages deployment after each verified batch. Pushes to `main` trigger a verified deployment; check the workflow and live release before reporting completion. See decision 023.

## Series context and portable workspace — 2026-10-19

- [x] Series-only navigator and shot table below the chart.
- [x] Profile Custom fields and Tags management, inherited table columns and tag filters.
- [x] Local original photos and captions per series.
- [x] Structured ZIP backup, validation preview and atomic full-workspace restore.
- [x] Additive v2 migration, unit conversion and behavioral regression tests.
- [x] Target/group measurement with calibration and local photo provenance (0.12.0).

See decision 007. No Pages deployment is implied.

## Analysis and display — 2026-10-19

- [x] Analysis toolbar: Simple chart, Dual chart, String compare, String info.
- [x] Persistent independent axes/scalars, valid distance choices and source/custom quantity readers.
- [x] Configurable table columns with persistent drag/button ordering.
- [x] Profile Display tab, projectile mass labels and Light/Dark/Auto theme.
- [x] Contrasting palettes with symbols/dashes and selection-independent string colors.
- [x] Remove the redundant units banner and obsolete Shot detail control.
- [x] Fixed 4180 local origin and remembered-session reconciliation.
- [x] Confirm provider mass codes through owner-controlled reassignment (0 = grains, 1 = grams).
- [x] Complete release verification and browser checks (135 tests; see VERIFICATION.md).

See decision 008. Pages deployment remains a separate instruction.

## Table and string-panel refinements — 2026-10-19

- [x] Floating column drag card and labeled insertion gap, with arrow alternatives.
- [x] Persistent header sorting except Shot; default String then Shot.
- [x] By shot ordering shared with table and contributor-aware comparison hover.
- [x] String cards include tags and assigned-only custom values; a top-right edit icon opens details/photos.
- [x] Fixed grams/grains fields with lossless switching between weight types.

See decision 009. Verification is recorded in VERIFICATION.md.

## Shot status, calculated velocity and help — 2026-10-19

- [x] Persistent reversible invalid-shot annotations, muted rows and a fixed rightmost cross/Undo.
- [x] Tri-state bulk Analyze over all eligible selected-string rows/pages.
- [x] Research and implement model-based G1/G7 velocity from muzzle speed, with explicit assumptions and independent numerical validation.
- [x] Allow recorded/model comparison in Dual Over distance, with saved forecast horizon and contributor linkage.
- [x] Omit replacement BC attributes as agreed; retain original Caldwell G1/G7.
- [x] Replace the long help document with a task-oriented linked hub and separate technical references.

See decision 010 and VELOCITY_RESEARCH.md. Pages deployment remains separate.

## Chart navigation and control help — 2026-10-20

- [x] Retain numerical chart ranges through parameter, data, ordering and theme changes.
- [x] Keep compatible scales shared, with independent memory for unrelated axes and quantities.
- [x] Add bottom-right reset to fit currently plotted data.
- [x] Link the existing forecast field and horizontal right edge in both directions.
- [x] Add explanatory hover titles to meaningful workspace controls.

See decision 011. Numerical models and atmosphere handling are unchanged; Pages deployment remains separate.

## Code-defined distance functions — 2026-10-20

- [x] Shared registry and generic dispatch for Over distance Quantity/Second quantity.
- [x] Compile-time function template and ordered custom registration list.
- [x] Per-function descriptions below the chart, canonical units and compatible/independent axes.
- [x] Null/zero/negative outputs, bounded callbacks and contributor-aware comparison.
- [x] Extension documentation and synthetic behavior checks.

See decision 012. Existing numerical models are unchanged; no Pages deployment is implied.

## Full custom-function context — 2026-10-20

- [x] Expose detached readonly Shot/Series records, including all raw attributes.
- [x] Pass matching local annotations, field definitions and assigned tag definitions.
- [x] Use the same context in availability, omission messages and every distance chart mode.
- [x] Document canonical units, owner-confirmed altitude/pressure/projectile units and unresolved metadata units.

See decision 013. Preserve existing sample-only helpers and unrelated local work.

## Calculated velocity catalog — 2026-10-20

- [x] Register existing G1/G7 quantities through the ordinary custom list.
- [x] Give each quantity its own file, preserving saved IDs and behavior.
- [x] Group and document constants, metadata and variable declarations at function starts.
- [x] Prepare minor release 0.11.0 with regression verification.

See decision 014. Target-image measurement follows in 0.12.0.

## Target photo measurement — 2026-10-20

- [x] Optional string H/V offsets and group size, canonical mm with cm/in display.
- [x] Direct entry and manual circle/POA photo tools with uniform calibration.
- [x] Editable dimensions, explicit recalibration, manual overrides and undo.
- [x] Zoom/pan/Fit and keyboard adjustments for multi-target sheets.
- [x] Atomic Save/Cancel, exact drawing restoration, independent per-string photo provenance.
- [x] Shared chart/table/String info quantities and readonly custom-function access.
- [x] Profile Display option for group size on string cards; cm/in unit labels.
- [x] Backup compatibility, lifecycle tests and isolated synthetic browser verification.

See decision 015 and TARGET_MEASUREMENTS.md. Automatic hole detection and perspective correction remain outside this release. Pages deployment is separate.

## Target editor ergonomics — 2026-10-20

- [x] One toolbar row with two measurement buttons and labeled Undo/trash/hand/zoom/Fit icons.
- [x] Direct handle editing; remove Action, click/tap mode and on-screen arrow controls.
- [x] Ctrl-drag/Ctrl-wheel and two-finger pan/pinch, without changing saved geometry.
- [x] Fixed numeric fields with color-matched hover/focus connectors; no image input overlays.
- [x] Gesture transition, cursor anchoring and viewport bound regressions.

Version 0.12.1 refines decision 015. Physical mobile-device verification remains separate.

## Stable column order and calculated drop — 2026-10-20

- [x] Persist complete column order independently from visibility, including hidden-column moves.
- [x] Retain legacy preferences and extend field-deletion cleanup and backup validation/round trips.
- [x] Add independent G1/G7 drop catalog entries in cm/in, using the existing standard atmosphere.
- [x] Verify the small-deflection calculation analytically and preserve existing velocity results.
- [x] Document backup coverage, model assumptions and a proposed compact heading scheme.

Release 0.13.0 implements decision 016. Compact headings remain a proposal.

## Compact table headings — 2026-10-20

- [x] Apply the accepted compact names, using plain G1/G7 and separate unit lines.
- [x] Expose full meaning via hover/focus/tap without changing sorting, IDs or custom field names.
- [x] Place the Analyze checkbox before its label and preserve selection behavior.

Release 0.13.1 implements the accepted refinement in COLUMN_LABELS_PROPOSAL.md.
This is presentation only; existing profile/backup contracts remain unchanged.

## Drop axis direction — 2026-10-20

- [x] Render positive G1/G7 drop downward, with zero at the top on initial fit/reset.
- [x] Preserve normal velocity axes in Dual and retained drop zoom across model/unit changes.

Release 0.13.2 is presentation only; calculated values and backup contracts stay unchanged.

## String atmosphere — 2026-10-21

- [x] Remove the discarded Energy retention experiment.
- [x] Review Magnus/ideal-gas calculations and make sea-level pressure reduction explicit.
- [x] Compute optional string air density and sound speed on atomic import/reimport.
- [x] Expose units, estimated provenance, table/scalar charts and custom-function access.
- [x] Preserve legacy records/archives and validate backup round trips.

Release 0.14.0 implements decision 017. Existing G1/G7 calculations remain unchanged.

## Experimental local velocity — 2026-10-21

- [x] Add separate local-atmosphere G1/G7 velocity catalog entries.
- [x] Require both string estimates and label local curves as experimental.
- [x] Preserve standard results, source BCs, shared axes and backup compatibility.
- [x] Remove the competing general chart tooltip while retaining point details.
- [x] Record the confirmed meaning of `distanceToChronograph`.
- [ ] Compare local variants with the owner's field measurements.
- [x] Resolve VelociRadar offset handling: owner confirms a zero field and physical muzzle/radar alignment; no correction. Revisit only for another device type.

Release 0.15.0 implements decision 018. Pages deployment remains separate.

## Automatic velocity atmosphere — 2026-10-21

- [x] Replace separate local choices with automatic G1/G7 velocity quantities.
- [x] Select a complete local pair per string, otherwise the standard pair.
- [x] Show actual conditions and standard fallback in notices and point/mean details.
- [x] Preserve historical profile/backup selections and existing numerical boundaries.

Release 0.16.0 implements decision 019. Field comparison remains pending. VelociRadar distance-offset handling is resolved.

## PDF reports — 2026-10-21

- [x] Local PDF generation, editable name, Save as/download and print preview.
- [x] All sections enabled by default in Profile → Report; portrait context and landscape charts/wide tables.
- [x] Independent square target crop, movement/resizing, undo, save and backup recovery.
- [x] Current chart zoom and selected record/column order, min/max velocity summaries.
- [x] Embedded Unicode fonts, repeated table headings, versioned archival footer and offline assets.
- [x] Behavior tests, browser-generated PDF and rendered-page layout checks on synthetic data.

Release 0.17.0 implements decision 020. Build the clean preview after committing; Pages deployment remains separate.

## Report readability and display precision — 2026-10-21

- [x] Strong two-tone target strokes, non-overlapping H/V/G callouts and centered captions.
- [x] All selected shot columns together on landscape pages; continuation by whole rows.
- [x] Shared fixed precision including trailing zeroes, without rounding stored/calculated values.
- [x] Layout/format regression tests and rendered synthetic multipage PDF inspection.

Release 0.17.1 implements decision 021. No backup/schema migration or Pages deployment.

## Report selection and target calibration — 2026-10-21

- [x] One shared overview for multiple strings, followed by separate named Targets.
- [x] Complete String info for every selected string, including unrounded JSON in PDF.
- [x] Negative/positive H callout rails and dashed diagonal leader departures.
- [x] Default Group + offset and mutually linked H/V/diameter edits with explicit overrides.
- [x] Regression coverage and rendered two/three-string report inspection.

Release 0.17.2 implements decision 022. Existing backups remain compatible; Pages deployment is separate.

## Reference calibration and string cards — 2026-10-25

- [x] Imported Caldwell notes on string cards, with a default-on Display preference.
- [x] Independent known-length reference, movable endpoints and cm/in ruler.
- [x] Reference-only save/reopen, manual replacement, undo and reimport/backup preservation.
- [x] Ctrl-click selects only the clicked string; ordinary selection remains additive.

Release 0.18.0 implements decision 024. Publish verified main automatically under decision 023.

## Reliable update discovery — 2026-10-25

- [x] Restart the local production preview on port 4180.
- [x] Check long-lived visible tabs periodically and on resume/reconnect.
- [x] Manual update check on the footer version, with connectivity/install status.
- [x] Preserve explicit Reload and local data; test detection and cleanup.

Maintenance release 0.18.1 implements decision 025 independently of deferred features.

## Next batch — requested 2026-10-25

- [x] Add a space between projectile weight and its unit in display labels. Explicitly deferred by the owner; do not include in 0.18.0.
- [x] Omit the Targets report page/section when no targets are provided. Explicitly deferred by the owner; do not include in 0.18.0.
- [x] Add String compare → Over distance → Velocity detail: individual recorded shot curves as in Simple/Dual, colored by string. Explicitly deferred by the owner; do not include in 0.18.0.

## String workspace improvements — 0.19.0

- [x] Fit chart scales when the selected string set changes.
- [x] List custom fields, inline management, usage warnings and backup round trips.
- [x] Firearm/projectile and plain source note in string details.
- [x] Shared read-only target preview and report ruler below the image.
- [x] Compare By string for numeric string attributes; By shot for shot attributes.

Decision 026 records scope. Publish after verification under decision 023.
