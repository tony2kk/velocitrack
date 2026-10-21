# Continue in Codex

Open `C:\dev\VelociTrack`. Remote: `https://github.com/tony2kk/velocitrack`. Check Git to distinguish local commits from published work.

Read `AGENTS.md`, `PLAN.md`, `ARCHITECTURE.md`, `docs/decisions/001-local-first-mvp.md` and `docs/VERIFICATION.md`.

## Accepted scope

- VelociTrack; English UI, documentation and code comments.
- All measurements, catalogs, source settings, profile and filters remain local. No backend.
- React/TypeScript/Vite, Dexie, ECharts and a static PWA shell.
- Local JSON/CSV/text plus a Caldwell connector verified through a private browser-only test and full local application import/repeat refresh. The owner also confirmed a successful import on the published `0.2.1` Pages app on 2026-10-18. Broader service restrictions and provider permission remain unconfirmed. The owner explicitly approved publication after the terms review. Read decisions 002 and 005.
- Shared catalogs with per-source auto-updates; missing references reject the whole source import when disabled.
- Refresh all enabled sources independent of filters. File adapters require reselection; signed-in Caldwell sources fetch online. Missing sessions wait for sign-in in Sources.
- Local annotations are separate. Profile manages typed series fields and colored tags; inherited shot-table columns and tag filters persist. Cross-source mapping remains later work. See decision 007.
- The left navigator contains series only. Shot checkboxes are in the table below the chart; unchecked rows stay visible. Deselections and hover are page-memory state; selected shots drive summaries/charts. Import feedback expires after ten seconds; progress tracks active sources. See decision 004.
- The owner confirmed ft/s, ft and °F raw inputs. Profile units default to Imperial and can be Metric; display conversion never rewrites measurements. Analysis selects scalar readings; the old Shot detail control has been removed. Other atmosphere fields and provider enums remain unvalidated; no weapon configuration or ammunition optimization.
- Import feedback counts new identities only (atomically), aggregates batch results and reports **No new data detected** when none were added. Charts have independent horizontal/vertical zoom sliders. See decision 006.

The study is not production code. Never copy private exports, APKs or account configuration into the project. The owner explicitly requested the shared two-field Caldwell client configuration in `public/sources/caldwell.json`; this is the only allowed public provider metadata (decision 005). Synthetic tests are invented from scratch. Owner-provided branding lives in `public/brand/`; the ZIP is excluded.

User help is `help/README.md`; the header opens it on GitHub in a new tab. The published app is https://tony2kk.github.io/velocitrack/. Caldwell setup reuses browser settings, otherwise loads the standard `sources/caldwell.json` on both local and hosted installations. Each source retains its connection/account binding. Only the shared service project ID/client key is public; no user credential, token or setting is shipped. Users enter only email/password. Auth defaults to memory, with SDK persistence only after profile opt-in. Read decision 005 before changing source configuration.

## Working practices

Use `npm.cmd` in PowerShell when required. `npm run verify` checks types, lint, formatting, tests, build and public-content patterns. TypeScript 6 is pinned for supported lint integration; do not bypass peer compatibility checks.

`npm run dev` serves development. Build then preview for PWA/offline checks. Storage is origin-specific: a different port/host means a different workspace. Never embed user settings in source/build configuration.

The owner authorized an ongoing workflow on 2026-10-18: continue on `main`, verify and review each completed functional batch, then commit and push it to `origin/main`. After reviewing the available terms and remaining uncertainty, the owner explicitly directed publication of the independent Caldwell connector. Do not request repeat approval for that decision or ordinary verified batches. Record new material findings without treating technical success as provider permission. Confirm the remote result instead of assuming local work is published. Pages deployment still requires a separate instruction.

The owner plans to contact Caldwell when the application is sufficiently functional. They will handle that contact; no provider message has been sent on their behalf.

## Series context update

Version 0.4.0 adds additive schema v2, local custom fields/tags, per-series raster photos and full ZIP backup/restore. Read decision 007 for units, field lifecycle, file limits and authentication/restore behavior. Photos and backups are always user browser data, never repository assets. The pinned fflate 0.8.3 fixes the malformed ZIP64 advisory affecting older versions. Manual target measurement follows in version 0.12.0.

## Analysis/display update

Version 0.5.0 adds four Analysis modes, independent persistent chart settings, recorded/source/custom scalar selection, ordered configurable table columns, String info, projectile mass labels and Light/Dark/Auto theme. Read decision 008 and updated help. Development and preview now both use the exact `http://127.0.0.1:4180/velocitrack/` origin with strict port binding. Never move the owner's daily workflow to another port or copy private browser data into fixtures. Synthetic browser checks may use an isolated temporary origin without signing in.

The owner requested remembered sign-in for the existing local workspace. It was enabled through the profile, followed by owner-entered login; the UI confirmed remembered sign-in and a reload/startup refresh succeeded without credentials. No global default was changed and no session/token is in the repository. The owner-controlled reassignment verified projectile.weightUnit 0 = grains and 1 = grams; see decision 008. Unknown codes must remain explicit.

## Table order and string-panel fields

Version 0.6.0 adds visible column drag cards/insertion gaps, persistent header sorting (default String then Shot), By shot charts following table order, and bidirectional contributor highlighting for comparison means. Compare uses each string's sorted rank on X; original shot numbers remain in tooltips. Distance axes remain physical. String cards include assigned tags and enabled custom values; blanks are omitted and zero is retained. A top-right edit icon beside the shot count opens details/photos without toggling selection. Fixed grams/grains weight types share canonical storage with legacy profile-unit Weight; populated weight types may switch without rewriting values. Read decision 009 and updated help. The daily environment stays on the existing 4180 origin; no Pages deployment is included.

## Shot status, calculated velocity and help

Version 0.7.0 persists reversible local shot invalidation in annotations, with a sticky rightmost red cross/Undo, disabled Analyze on invalid rows and tri-state bulk Analyze across pages. Ordinary Analyze choices remain transient. Over distance supports Calculated velocity (G1)/(G7) from each shot's muzzle velocity and matching Caldwell BC; Dual compares models with recorded data on one velocity scale. Predictions use explicit standard atmosphere, constant BC and straight-path drag only. Each model uses at most 100 eligible shots in table order and a persisted horizon at most 1 km. Original BCs/measurements are unchanged; the owner agreed to skip replacement BC calculations. Read decision 010 and VELOCITY_RESEARCH.md before extending the model. Numerical reference table data are attributed under MIT in public/third-party-notices.txt; no external simulation code is included. Help is a short linked task-oriented hub with separate technical references. Continue to preserve the daily 4180 browser origin and its private data.

## Chart navigation and hover help

Version 0.8.0 keeps canonical numerical axis windows in session memory while updating one ECharts instance. Compatible velocity curves share their scale; unrelated quantities and horizontal-axis meanings keep their own ranges. Unit switches convert retained bounds. The bottom-right reset fits current plotted data. The existing forecast field and horizontal right edge synchronize without discarding the larger navigable domain; vertical zoom leaves the field unchanged. Native English hover titles explain meaningful controls. Read decision 011. No numerical model, atmospheric correction, schema or cloud change is included.

Version 0.8.1 restores continuous ECharts rendering while either slider is dragged. Canonical viewport capture and the debounced forecast-preference write remain separate from that visual feedback.

## Registered distance functions

Version 0.9.0 adds `domain/distanceCurves`: a shared compile-time registry, canonical sample contracts, generic dispatch, template and empty ordered custom list. Both menus and descriptions below the chart come from descriptors. Callbacks receive frozen detached measured samples and a horizon, not provider records. Built-in adapters retain existing IDs and numerical implementations. Dual separates unrelated canonical axis meanings; Compare supports null segments and zero/negative Y while retaining hover contributors. Derived callbacks are limited to 100 eligible shots and 5,000 output points; exceptions become generic alerts. This is trusted synchronous application code, not a runtime plugin sandbox. Read decision 012 and DISTANCE_CURVES.md. No schema, new solver, atmosphere correction or cloud change is included.

Version 0.10.0 extends callbacks to `DistanceCurveContext`: full detached readonly shot/string records including raw metadata, separate entity annotations, field definitions and assigned tag definitions. The string join checks local ID and source ID; missing context is explicit. Availability, omission notices and Simple/Dual/Compare dispatch receive current local records. `DistanceCurveInput` remains the minimal sample/horizon type for standalone helpers. Read decision 013 and the updated extension/data-access guides. `MEASUREMENT_UNITS.md` records owner-confirmed altitude in ft, pressure in hPa reduced to sea level, diameterUnit 0 = inches / 1 = mm and weightUnit 0 = grains / 1 = grams. Other unresolved units stay explicit. No numerical implementation or cloud change is included.

Version 0.11.0 moves Calculated velocity G1/G7 into explicit entries in `customDistanceCurves.ts`. Each owns a separate definition/callback file; the existing common calculation lives in `distanceCurves/velocityCalculation.ts`, with the old module path retained as re-exports. Saved `calculated:g1`/`calculated:g7` IDs and all numerical behavior remain unchanged. Constants, metadata and working-variable declarations lead the corresponding functions, with documented deferred assignments after guards. Read decision 014. The owner wants target-image connection/processing in the following release; this batch does not implement it.

## Target photo measurement

Version 0.12.0 adds optional `Annotation.target` on strings: H offset positive right,
V offset positive up, and group size as the diameter of a manually placed circle.
Values are canonical mm, displayed as cm/in according to the profile. Existing
recorded distances remain ft, displayed as ft/m. Read decision 015,
TARGET_MEASUREMENTS.md and the linked user guide before extending the editor.

String details support direct entry and an attached-photo editor with circle or
POA-plus-circle tools, editable dimensions, explicit calibration, manual overrides,
undo and zoom/pan/Fit. Save atomically confirms values, original-pixel geometry,
scale and photo reference. Cancel writes nothing; reopening restores the drawing.
Each string has one active result, independent even when several strings use the
same six-target sheet. Deleting its photo retains numbers as manual values.

The scalar pipeline exposes the three `target:*` quantities in charts, tables and
String info. Custom callbacks receive canonical mm through
`input.stringAnnotation?.target`; image bytes are not in that context. Display can
optionally show saved group size on string cards (`showGroupSize`, default false).
Optional annotation/profile fields need no schema or backup format bump.

Browser verification used an invented six-target image on a separate temporary
origin. No owner photo or measurement was inspected or copied. The daily local
origin remains 4180. Automatic target detection and perspective correction are
outside this release; Pages deployment is separate.

Version 0.12.1 simplifies the target editor to one toolbar row with two tool buttons
and Undo/trash/hand/zoom/Fit icons. The Action dropdown, click/tap toggle and arrow
buttons are removed. Users drag handles directly; Ctrl-drag/Ctrl-wheel and two-finger
pan/pinch navigate without modifying the measurement or undo history. A second touch
cancels a provisional drawing and suppresses further drawing until both fingers lift.
Target inputs now exist only in the fixed panel; hover/focus connectors follow the
photo transform. Read the updated target guide and navigation tests before modifying
pointer handling. The data contract and existing saved drawings remain unchanged.

## Column visibility and calculated drop (0.13.0)

Read decision 016. `Profile.tableColumnOrder` retains hidden positions independently
of `tableColumns`. The picker saves both atomically; only explicit moves reorder
columns. Legacy profiles retain their visible order, new definitions append, and
custom-field removal clears both lists. Backup validation accepts the optional
property and rejects malformed IDs, duplicates and dangling custom fields.

The catalog now includes `curve:drop-g1` and `curve:drop-g7`, each in its own file.
Canonical drop is mm, displayed cm/in, positive downward below a horizontal muzzle
axis. The shared speed kernel optionally integrates first-order gravity without
feeding drop back into speed. Existing velocity results remain unchanged.
See DROP_MODEL.md for the derivation, approximation and independent analytic tests.
Chart IDs/forecast are backed up; derived points are recomputed after recovery.

Version 0.13.1 implements the approved compact headings in COLUMN_LABELS_PROPOSAL.md,
with plain G1/G7 and a separate unit line. Quantity/column unit metadata is explicit,
never parsed from labels. ColumnLabel provides a portal explanation on hover, focus
or tap; sorting remains separate. The Analyze checkbox precedes its label.
Domain IDs, custom field names, saved preferences and backups remain compatible.

Version 0.13.2 inverts the shared `drop` chart axis and fits its lower numerical
bound to zero, so positive drop runs downward from the top. Velocity axes are
unchanged, including mixed Dual charts. Canonical zoom memory remains increasing
and survives model/unit changes; reset fits again from zero. This is presentation
only and requires no backup or schema migration. See DROP_MODEL.md.

## String atmosphere — 0.14.0

Read decision 017 and ATMOSPHERE.md. The discarded Energy retention experiment is
removed. `domain/atmosphere.ts` now accepts explicit station pressure or sea-level
pressure with elevation and returns Magnus/ideal-mixture density and sound speed.
`sources/atmosphere.ts` converts the supported raw weather units and maps missing
or invalid inputs to null. `importBundle` calculates both attributes together on
every upsert without changing raw metadata or local annotations. No ISA fallback.

`Series.airDensity` is canonical kg/m³; `Series.soundSpeed` is canonical m/s.
Display, scalar analysis and readonly custom context expose both. Older records
need refresh/reimport; ZIP restore preserves values and validates optional positive
finite numbers. No schema migration or changes to G1/G7 numerical models are included.

Version 0.14.1 suppresses vertical viewport-boundary labels while retaining regular
ticks and the zero baseline. The minimum-label formatter uses the current tick index
so live vertical zoom also hides arbitrary new boundaries; the maximum label is
disabled through ECharts. Numerical ranges, point details and backups are unchanged.

## Experimental local velocity — 0.15.0

Read decision 018 and ATMOSPHERE.md. Separate `curve:velocity-g1-local` and
`curve:velocity-g7-local` catalog modules use the matching string's saved density
and sound speed. Both are required; older strings need refresh/reimport. The shared
integrator takes optional fixed conditions and defaults to the original standard
values, including for drop. Local sound speed also controls the Mach input domain.
Standard/local metadata flows into individual and mean tooltips; local variants
are experimental, without sample fitting or distance-offset correction. The owner
initially identified `distanceToChronograph` as muzzle/radar displacement; the
0.16 clarification below resolves its handling for VelociRadar. Chart hover help moved from `title` to an
accessible description to avoid covering point details. Selections and inputs use
the existing backup contract. No Pages deployment is part of this batch.

## Automatic velocity atmosphere — 0.16.0

Decision 019 supersedes 018's separate choices. The two canonical velocity definitions
select the matching string's saved density/sound-speed pair or standard fallback.
Keep calculation, availability and conditions metadata on that shared policy.
The optional conditions callback feeds per-shot/mean tooltips and per-string chart
notices. Recorded weather parsing is shared with import; descriptions reconstruct
station pressure for display without changing stored estimates. Drop remains standard.
Old local IDs normalize on chart read/save, including restored archives; duplicate
family selections collapse. No schema/backup migration or Pages deployment.

The owner clarified that VelociRadar always reports `distanceToChronograph = 0`.
Muzzle alignment is beside the radar, aligned or at most 5 cm ahead. Preserve raw
metadata but do not apply an offset; revisit only when supporting another device.

## Local PDF reports — 0.17.0

Follow-up 0.17.1 implements decision 021: high-contrast target geometry with a separate
H/V/G label rail, centered captions and whole-row landscape tables with all columns
together. `recordTable` rejects impossible layouts instead of losing content.
`units.formatQuantity` defines readonly precision; `fieldText`/`targetDisplay` are
distinct from editor formatting. Optional distance-curve `unit` metadata covers
custom output without parsing labels. Storage, calculations and backups are unchanged.
See DISPLAY_FORMAT.md for the complete precision table. Full verification and an
optional synthetic PDF layout check cover 11 columns and 55 unique shot rows.

Read decision 020 and help/reports.md. Profile.report is optional; absence means all sections enabled. Reports freeze the current selection and retain chart zoom via a separate light ECharts instance. pdfmake/Roboto load lazily but are precached for offline use. The save picker is called only by a fresh user click; fall back to a named download. Do not serialize sources, credentials or arbitrary raw records into PDF details.

TargetMeasurement.reportCrop uses original-image pixels (x/y/size/width/height), requires a photo owned by the string and remains independent of physical values. Crop-only targets are valid without geometry/calibration. Save and backup validators cover the addition. Removing a photo removes its framing/provenance while retaining numeric target values. Original image bytes are never overwritten.

Verification: full npm run verify passed (307 tests across 42 files), including real PDF bytes, selected column/unit rendering, min/max, crop-only editing and backup round trips. A browser PDF with a local synthetic target crop and live chart was downloaded, rendered and inspected; multipage records and Czech text were checked separately. Native Save as is unit-tested; the embedded browser's PDF was obtained through its download capability. No Pages deployment is included.
