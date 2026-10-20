# Plan

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

See `docs/VERIFICATION.md` for actual verification and remaining caveats. Local MVP work does not authorize a Pages deployment.

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

Review candidate files, built assets and history before publishing. The owner authorized committing and pushing each completed, verified functional batch to `origin/main` on 2026-10-18 and explicitly approved proceeding with the Caldwell connector after the terms review. Continue on `main` unless instructed otherwise. Pages deployment remains manual and requires a separate instruction.

## Series context and portable workspace — 2026-10-19

- [x] Series-only navigator and shot table below the chart.
- [x] Profile Custom fields and Tags management, inherited table columns and tag filters.
- [x] Local original photos and captions per series.
- [x] Structured ZIP backup, validation preview and atomic full-workspace restore.
- [x] Additive v2 migration, unit conversion and behavioral regression tests.
- [ ] Future target/group analysis with calibration and per-photo result provenance.

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
