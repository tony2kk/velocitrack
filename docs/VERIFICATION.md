# MVP verification

## Chart/report presentation — 0.20.0

- Full verification passes: 363 tests across 50 files, types, lint, formatting,
  production/PWA build and public-content guard. All seven optional canvas/PDF
  layout checks also pass with the installed local renderer.
- Regression coverage includes distinct colors after palette index 8, solid measured
  traces, colored bars with positive/negative values and displayed temperature zero,
  resize without zoom reset, chart-height range limits, A4/Letter choices, backup
  round trips and old-profile defaults. String boundaries use IDs, including equal
  names, reversed groups and screen pagination.
- An isolated 4182 browser imported five invented strings and 20 shots. By string
  group-size bars, individual velocity traces, four table separators, and 100%/175%
  screen heights were checked. The owner's 4180 workspace was not modified.
- Actual browser-generated A4 and Letter PDFs were checked for physical page sizes
  and visually rendered. The charts use the landscape area, retain matching string
  colors and preserve readable legend/notes. Shot columns stay on one sheet with
  stronger group boundaries and complete-row pagination. A chart-only A4 report
  also stays on one page. Test artifacts remain ignored in `.local/`.

Verified on 2026-10-18, on Windows with Node 22 and the Codex in-app Chromium browser. Each section distinguishes automated checks, local browser checks and published-origin observations.

## Automated checks

- TypeScript, ESLint and Prettier checks passed.
- The original MVP's **26 behavioral tests** passed across parser, measurements, filters and Dexie transactions. See the connected-source update below for the current test count.
- Production build and PWA precache generation passed. The chart module loads separately; static precache is approximately 1.1 MB.
- Public-content pattern guard and `git diff --check` passed. These are safeguards, not a proof of privacy or a substitute for pre-publication review.
- Dependency installation reported no known vulnerabilities at install time. TypeScript was intentionally aligned to the supported ESLint peer range.

An additional ignored local check read the owner's existing JSON/CSV exports directly from outside the repository. Both formats parsed and imported successfully; repeat import preserved record counts and catalog identities. No original exports or identifying values were copied into fixtures, documentation, logs or build assets.

## Browser review

- Created a source and imported a freshly invented synthetic example through the file picker.
- Selected multiple series; checked charts, summary counts and the table's original numeric precision, including excluded shots.
- Saved nickname/startup preference and firearm filter, then reloaded and checked restoration. Resetting filters survived the application update.
- Confirmed on-start refresh marks file sources awaiting files while retaining prior measurements.
- Checked the update prompt and reload without losing the local profile/data.
- Reviewed desktop (1366 px) and mobile (390 px) layouts, including the owner's SVG logo. No page-level horizontal overflow at the mobile viewport.
- Checked modal Escape behavior and return of keyboard focus to the profile button; the mobile profile icon has an accessible name.
- Inspected browser warning/error logs during the online workflow; none were recorded.
- Stopped the owned preview server and verified HTTP could no longer connect. Reloading the cached application still restored the local data/profile, and both chart modes worked. This describes the original MVP offline test, not the current preview-server state.

Browser screenshots contain synthetic data only and remain outside versioned content. Synthetic preview records belong only to the temporary local preview origin; they are not shipped application data.

## Connected-source update — 2026-10-18

- All **44 behavioral tests** passed, including pagination/limits, authenticated path construction, account binding, session loss, safe errors, failed-download retention, catalog rollback, all-enabled-source refresh and real SDK initialization/disposal.
- Types, lint, formatting, production/PWA build and public-content guard passed for the local connector build.
- The owner's isolated browser test passed: Auth and own-account reads succeeded on loopback, without truncation or bypass. See `FIREBASE_POC.md`.
- Dependency audit reported zero known vulnerabilities after pinning the shared Firebase App modules to one Node 22-compatible version and overriding the affected transitive gRPC package. The browser uses Firestore Lite, not the Node gRPC transport.
- The owner signed in through the application's Sources dialog at `http://127.0.0.1:4180/velocitrack/`. The UI confirmed **5 series and 42 shots imported**, an up-to-date source and **Current session only** authentication.
- A subsequent **Refresh now** completed successfully and advanced the source's update time. The workspace contained **7 series and 46 shots**, including the pre-existing synthetic 2-series/4-shot file source, with no duplicate records after refresh. No private record contents are included in this report.
- Persistent-session browser verification remains outstanding; the default in-memory workflow above does not establish persistence across browser restarts.

## Update reload correction — 2026-10-18

- Replaced the update button's reliance on the plugin's Workbox `controlling` callback with explicit activation of the current waiting worker. The callback depends on update metadata and does not cover an already activated worker behind a stale prompt. The new flow handles native controller changes, worker activation without a controller change, and a missing waiting worker.
- Added bounded progress, retryable failures and listener cleanup. Other tabs do not reload automatically. The implementation does not clear browser storage.
- All **52 behavioral tests** passed, including eight update-flow cases covering activation, stale prompts, activation races, replacement, timeout, retry and unavailable registration/API. Types, lint, formatting, production/PWA build and public-content guard also passed.
- Served two versions of the production build on an isolated loopback origin using an ignored local test server. Both tabs displayed the update prompt. Reload in the first tab changed its document from build A to build B; the second tab stayed on A until its own Reload, then successfully loaded B despite the update already being active. The saved synthetic nickname survived the first reload.
- The isolated browser exercise used no Caldwell account or real measurements. Existing provider configuration remains excluded from repository and build assets.

## Version display and code documentation — 2026-10-18

The footer now includes the package version and build-time source revision. The local production preview displayed `v0.1.0` with the expected dirty-checkout marker, while retaining its 7 series and 46 shots. The existing 52 tests and full verification passed after the code-documentation pass. Domain, storage, adapter, UI and update-flow classes/functions now have English purpose/invariant comments; this pass does not change their behavior.

## Automatic local Caldwell setup — 2026-10-18

- All **68 behavioral tests** passed. New cases cover profile reuse, existing-source preservation, deletion during setup, safe failures, credential-free requests and the loopback/same-origin boundary. Types, lint, formatting, production/PWA build and the public-content guard also passed.
- On a fresh isolated loopback origin, adding a Caldwell source automatically displayed the email/password form with no connection-file picker. Reloading the page retained the source and prepared sign-in. No credentials were entered and no measurements were imported during this check.
- The footer displayed version `0.1.1`; the profile explains the consequences of remembered sign-in on a shared browser profile.
- An additional ignored local check confirmed that the actual provider project ID/key were absent from every candidate source file and production build asset. The helper's input remains ignored and is not a static build asset.

These checks supplement the earlier live-import checks; they do not constitute another account sign-in or a persistence test across browser restarts. Automatic first setup in a fresh publicly hosted browser remains outside this implementation.

## Shot interactions and import feedback — 2026-10-18

- All **83 behavioral tests** passed with types, lint, formatting, production/PWA build and the public-content guard. React/DOM tests cover repeated ten-second notifications, dismissal cleanup, session shot choices, duplicate shot numbers, linked hover/focus, table pagination and progress dismissal. Refresh tests cover failure cleanup and moving to the next source; chart tests cover point metadata, emphasis without reconstruction and escaped tooltip text.
- In an isolated production-preview origin with only invented fixtures, selecting a series expanded all its shots as checked. Unchecking one removed its table row and changed the displayed count/mean. Collapsing and reselecting the series preserved that choice; a page reload reset the choices.
- A real canvas point displayed the expected series, shot/sample number, raw distance and velocity. The matching navigation row highlighted, and the trace became more prominent. A table-row interaction also highlighted the matching navigation row. No user account or private measurements were used.
- The tooltip is rendered as escaped React text alongside the canvas, keeping sample details available independently of ECharts emphasis. A ten-pixel hit tolerance resolves actual nearby samples rather than interpolating data. Chart bridge unit tests mock ECharts, so the separate browser observation above is material.
- Newly added DOM test dependencies are pinned; installation reported zero known vulnerabilities. The existing 100-trace limit and unverified physical units remain unchanged.

## Still unverified / intentionally absent

- General API restrictions/App Check configuration and server rule isolation. Local checks and the owner's successful hosted import do not prove these broader properties.
- Provider permission and any app-specific terms remain unconfirmed. The owner approved publication after reviewing this uncertainty; see `TERMS_REVIEW.md`. This is a release decision, not a technical test result.
- Provider unit-code enums and atmosphere semantics beyond the owner's confirmed ft/s, ft and °F input contract. The display conversion checks below do not establish a vendor specification.
- Real-device installation across Safari/iOS/Android, browser eviction/quota behavior, and assistive-technology testing beyond the checks above.
- Large-dataset stress tests and future schema migrations beyond the v1→v2 migration verified below.

File parsing and IndexedDB tests do not replace these remaining checks. Any future change to persistence, import semantics or units must add appropriate tests and update this record.

## Public installation and standard source configuration — 2026-10-18

- The owner authorized Pages deployment. The first published build (`0.2.0`, `eb9ae14`) passed the deployment workflow and loaded at `https://tony2kk.github.io/velocitrack/`, with its version confirmed in the rendered footer.
- The owner then explicitly requested the standard Caldwell source-type configuration for identical local/hosted setup (decision 005). Version `0.2.1` loads `sources/caldwell.json` on both origins. Only the shared `projectId` and Firebase client `apiKey` are intentionally public; no account information or user data belongs in this file.
- All **88 behavioral tests** passed, with types, lint, formatting, production/PWA build and publication guard. Setup tests cover a fresh public origin, profile reuse without another request, preservation of configured sources and safe failure on malformed/oversized responses. Publication tests exercise the actual guard in isolated temporary repositories with invented data; extra account fields and client keys outside the standard file are rejected.
- The obsolete loopback helper and its eight boundary tests were removed. No backend or deployment secret is needed. The standard source file is copied by the ordinary build; existing measurements and source/account bindings are not migrated or cleared.
- Version `0.2.1` (`41bb5bf`) passed both GitHub validation and Pages deployment. The published app's update prompt successfully activated it and the footer showed the expected version/revision. On that origin, adding a Caldwell source automatically reached **Sign-in needed** with the email/password form and no file picker or configuration fields. No credentials were entered during this setup check.
- After being asked to sign in and import on the published `0.2.1` site, the owner confirmed that the import completed successfully on 2026-10-18. This is owner-reported end-to-end verification on the Pages origin, beyond the independently observed sign-in form. No record counts, account identifiers, credentials, tokens or measurement contents were collected. It does not establish persistent sign-in across browser restarts or unrestricted service access.

## Display preferences, zoom and incremental feedback — 2026-10-18

- Version `0.3.0` passed the full verification command: types, lint, formatting, **100 tests across 17 files**, production/PWA build and public-content guard. New tests cover unit conversion and missing values, chart coordinates/tooltips, profile defaults and persistence, navigation choices, table/statistics consistency, vertical zoom configuration, transactional new-record counts, concurrent imports and aggregate refresh feedback.
- In an isolated production-preview origin using invented fixtures only, the initial profile displayed Imperial units and muzzle velocity. A 1000 ft/s reading became 304.8 m/s in the table; the mean of 1000 and 1010 ft/s displayed as 306.32 m/s. Both chart axes changed to the matching metric labels. G1 and G7 navigation choices showed the original coefficients, and the Metric/G1 profile survived a page reload.
- Dragged the actual canvas sliders independently: vertical zoom narrowed the velocity range while retaining the distance range; horizontal zoom then narrowed distance while retaining the selected velocity range. Selected-shot counts and statistics remained unchanged. The canvas check supplements the mocked chart bridge tests.
- The first file import reported two new series and four new shots. Reimporting the same fixture displayed **No new data detected**. Importing an extended fixture reported **1 new shot imported** and retained two series with five total shots.
- Stored raw measurements remain unchanged by display preferences; automated tests cover this invariant. Fahrenheit conversion has reference-value tests in the shared utility; the application does not yet display an atmosphere panel.
- This batch did not sign into a Caldwell account, read private measurements, retest persistent authentication or deploy Pages. The file and connected-source paths share the tested storage counting and notification formatter; live connected refresh remains supported by the earlier checks above.

## Series context and workspace backup — 2026-10-19

Full verification passed: TypeScript, ESLint, Prettier, **119 behavioral tests across 20 files**, production/PWA build and public-content guard. Git diff whitespace checks passed.

- Version 0.4.0 adds schema v2 without clearing existing tables. Automated coverage exercises legacy annotation migration, typed value validation/conversion (including zero vs missing), unchanged-value precision, refresh preservation, field rename/type-change/removal, tag filtering/cleanup, photo validation/source removal, and inherited table columns.
- Backup tests cover a complete ZIP round trip including raw measurements, profile, custom values, tags and photo bytes; corrupted/missing entries, unsafe paths, unsupported versions, invalid references/identities, reserved field IDs and rollback after a late simulated quota failure. The empty-workspace round trip also passes.
- UI tests exercise confirmation before field removal, series detail saves and the new table selection behavior. A shared Web Lock surrounds imports; restore uses an exclusive lock to avoid overlapping downloads/commits.
- The browser workflow ran on isolated loopback port 4193 with one invented series, three invented shots and a generated test image only. Created a Weight field and colored tag, assigned both to the series, added a PNG and caption, enabled inherited table columns and unchecked a shot. Counts/statistics changed while the unchecked row remained available. The tag-column width was corrected after visual review.
- Changed the profile to Metric, downloaded the actual ZIP through the UI, selected that ZIP, saw the validated count preview and confirmed restoration of the synthetic workspace. The restored series retained its tag, caption and rendered image; one gr displayed as 0.06479891 g. Temporary selection reset on restore. No user account, real export or private measurement was accessed.
- fflate is pinned to 0.8.3. The dependency audit reported zero known vulnerabilities after replacing the version affected by the malformed ZIP64 advisory.
- Screenshots and generated browser fixtures remain outside versioned content. No Pages deployment or live Caldwell sign-in was performed. Physical mobile devices, narrow-screen browser review, maximum-sized archives, real quota exhaustion and persistent authentication across restarts remain unverified; the automated quota test simulates a write failure.

## Analysis, ordered columns and display — 2026-10-19

- Version `0.5.0` passed the full verification command: types, lint, formatting, **135 tests across 22 files**, production/PWA build and the public-content guard. New behavior checks cover independent chart settings, axis fallback, scalar/source/custom quantities, merged dual sequences, missing-reading gaps, comparison interpolation and disconnected domains, stable palette assignments, ordered column persistence, pointer/native drag handlers, zero-shot context, OS theme changes and backup round trips with the new preferences.
- On an isolated synthetic-only origin, imported two invented three-shot strings and an invented zero-shot string. Verified Simple G1 selection and automatic fallback to Velocity on Over distance. Verified Dual's shared six-shot sequence, separate axes and a real gap for a missing coefficient. String compare rendered separate curves and mean distance traces.
- Verified light and dark chart/table readability, brighter dark palette colors, and original projectile suffixes `150grs` and `2g` even with Metric display selected. The overly wide Columns panel was corrected to a right-aligned scrollable overlay; G1/G7 table text uses bounded display precision.
- Dragged G1 using its actual pointer handle before Shot in the browser. The live table changed to Analyze, Series, G1, Shot, Velocity. Reloaded and reselected the strings; the order, Dual mode, independent axes/quantities, theme, weight labels and prior local custom-column choices survived. Up/Down buttons and HTML drag events also have DOM coverage. Physical touch devices remain unverified.
- String info displayed imported notes, converted temperature and recorded conditions for the zero-shot string without inventing measurements. Existing photos/local context remained available through Details.
- For the owner's existing **4180** workspace, enabled remembered sign-in at the owner's explicit request. The owner entered credentials directly. The Sources UI confirmed **Remembered on this device**; reload/startup refresh succeeded without another credential entry. Full browser-process restart remains unverified. Development and preview now both strictly bind to 4180.
- A controlled owner-side change to grams, followed by explicit projectile reassignment to a string and an ordinary authenticated refresh, changed that string's weightUnit from 0 to 1. Together with the owner's confirmation of the original grain entries this establishes the supported mapping **0 = grains; 1 = grams**. Catalog-only edits had not changed existing string snapshots. Only unit-code differences were reported; private exports, IDs and measurements were not copied into code, fixtures or this record.
- New profile properties are additive, and ZIP round trips retain them. Authentication sessions remain outside application backups. No Pages deployment was triggered. Large-dataset stress testing, provider measurement-unit enums and remaining weather units retain their existing caveats.

## Table order and string panels — 2026-10-19

- Version `0.6.0` passed full verification: types, lint, formatting, **145 tests across 23 files**, production/PWA build and the public-content guard. Added behavior checks cover natural String/Shot ordering, ascending/descending numeric/text/custom/tag sorts with missing values last, mixed timestamp forms, shared scalar-chart order, adjacent sort controls/persistence and contributor hover without recreating the chart.
- Pointer/native drag tests cover the floating card, insertion gap and cancellation outside selected rows. In the isolated synthetic browser, actually dragged G1 after Velocity and observed the table headers change. Sorted G1 numerically with its missing reading last. Clicking a mean distance point highlighted all three contributing rows from its string; row hover also emphasized the corresponding mean curve.
- Saved a populated legacy weight field as fixed grains with Show on string panel enabled in the synthetic browser. Metric display retained `1 gr` on the string panel. Tests cover fixed grams/grains under both profile systems, lossless switching of populated weight definitions, assigned-only panel values including zero, and editing without toggling selection.
- String cards enclose basic details, tags and custom values; their edit icon sits beside the shot count. ZIP round trips retain sort, visibility and fixed weight type, while malformed sort/visibility preferences reject before replacement. Deleting a field clears its saved sort reference.
- Activated the final synthetic browser update, reloaded and reselected strings: G1 sort order, moved columns, Compare mode and fixed-grains panel values survived. Visually verified the edit icon immediately to the right of the shot count, with tags/custom values inside the same card. The screenshot remains outside the repository.
- Browser fixtures remain invented and isolated from the owner's 4180 workspace. Physical touch, maximum-size workspace performance and browser-process authentication restarts remain unverified. No Pages deployment is included.

## Shot invalidation, velocity models and linked help — 2026-10-19

- Version `0.7.0` passed full verification with **160 tests across 25 files**, types, lint, formatting, production/PWA build and the public-content guard. New checks cover local invalidation/Undo, raw and annotation preservation across import and ZIP restore, source cleanup, bulk Analyze over multiple pages, unsupported/mismatched model inputs, forecast persistence, actual/model plotting and comparison contributors.
- Independently validated the drag integrator against a closed-form low-Mach solution and exact piecewise analytic integration plus bisection at 100/300/1,000 m, including transonic table crossings. The 0.002 m/s acceptance bound is numerical agreement with the stated simplified model, not real-world prediction accuracy. See VELOCITY_RESEARCH.md for source/derivation and retained MIT attribution.
- In the isolated invented-data browser, selected Dual Over distance with Velocity and Calculated velocity (G1), set a 30 m horizon and saw recorded curves end at their sampled range while dashed predictions continued from muzzle zero. Clicking a calculated curve revealed the exact shot row and an explicit model/BC tooltip. Missing G1 was omitted and disclosed rather than borrowing another coefficient.
- The actual rightmost cross unchecked/disabled Analyze and dimmed the row; Undo restored it. The heading checkbox cleared/reselected eligible rows while leaving the invalid shot unchecked. After reload and reselecting strings, invalidation, Dual/model choices, horizon and prior column/sort settings persisted. Reviewed row/action readability in both Light and Dark. Rounded only the forecast editor's displayed value to remove a conversion artifact; canonical storage remains unchanged.
- Help is now a nine-page task-oriented linked guide with separate import-format and research references. A local link audit found no broken relative links. No private browser data or third-party simulation code is included. Physical touch, maximum-size performance, live shooting/model accuracy and provider weather/distance-origin semantics remain unverified. No Pages deployment is included.

## Retained chart ranges and control help — 2026-10-20

- Version `0.8.0` passed full verification: types, lint, formatting, **169 tests across 26 files**, production/PWA build and the public-content guard. New tests cover retained numerical bounds as data changes, compatible quantities, canonical/display conversion, independent dual-axis windows, empty data, remounts, explicit reset and the follow-up data update caused by a linked reset.
- Forecast coordination tests cover both directions, preservation of the left and vertical bounds, vertical-only gestures, debounce cleanup and unchanged-value precision. The editor displays at most three decimal places without overwriting a more precise saved value when an untouched field loses focus.
- In an isolated production-preview origin with invented data, dragged horizontal and vertical sliders independently, switched the secondary quantity, edited the forecast field and reset the chart. The selected numerical ranges survived quantity changes; a horizontal gesture changed the field, a vertical gesture did not, and a field edit preserved the left edge and vertical window. The larger navigable distance domain remained available for zooming back out.
- On the final build, Reset changed a 60 ft right edge to the available 100 ft extent and fitted both axes after the linked data update. Visually checked the bottom-right reset control and native hover help on chart, profile, filter, toolbar and table controls. The existing update flow activated the new build.
- The chart bridge tests mock ECharts; the actual canvas checks above supplement them. No account sign-in, private measurement access, numerical-model modification or atmospheric correction was performed. No Pages deployment is included. Physical touch devices and maximum-size performance remain unverified.

## Continuous chart zoom — 2026-10-20

- Version `0.8.1` restores live rendering for both ECharts slider controls. The separate 180 ms forecast-preference debounce and canonical range retention remain unchanged.
- Full verification passed: types, lint, formatting, **169 tests across 26 files**, production/PWA build and public-content guard. No additional implementation-mirroring tests were added for the two library-option corrections.
- On an isolated synthetic-data preview, dragged the horizontal handle and observed the range and linked field change together. Then dragged the vertical handle, narrowing the vertical scale while the horizontal field stayed unchanged. These checks verify the completed gestures; frame-by-frame timing during a held pointer and physical touch remain unverified.
- Updated chart help. No numerical model, atmospheric correction, measurement, authentication, schema or backup change is included. No Pages deployment was triggered.

## Registered distance functions — 2026-10-20

- Version `0.9.0` passed full verification: types, lint, formatting, **183 tests across 27 files**, production/PWA build and public-content guard. New behavior checks cover registry identity/axis validation, detached frozen inputs, availability/failures, malformed output and callback limits, zero/negative Y, null segments, exact contributor hover, canonical conversion and independent axes. UI tests verify both menus, per-function descriptions, reload-style persistence and incompatible-axis fallback. ZIP round-trip coverage retains a custom curve ID independently of whether the receiving build registers it.
- In an isolated synthetic-data production preview, temporarily registered the supplied sample-centering template. Both menus discovered it. Selecting it beside recorded Velocity produced a separate right scale with zero/negative values and two matching descriptions below the chart. Reset fitted the selected data. Reload and reselecting strings restored the custom choice and its description.
- The sample registration was removed after that browser check; the shipped custom list starts empty. Existing measured/G1/G7 choices go through the same registry and retain their IDs and numerical implementations. No private workspace data was copied to test fixtures or code. No new solver, weather correction, schema, authentication or cloud behavior is included, and no Pages deployment was triggered.
- Added the extension guide, a normalized-data/raw-path/access reference and linked chart help. Generic callbacks receive only the documented sample/horizon contract. They are trusted synchronous application code; output limits and exception handling do not interrupt an infinite loop. Physical touch and maximum-size performance remain unverified.

## Full custom-function context and units — 2026-10-20

- Version `0.10.0` adds eight behavior tests for the complete shot/string context, preservation of arbitrary nested raw attributes, detached readonly records, source-scoped joins, missing parents/annotations, local fields/tags, consistent availability/calculation and Simple/Dual/Compare dispatch. A DOM test uses the real analysis panel and chart adapter with ECharts mocked; local annotation changes update plotted values, menu availability and omission notices.
- Full verification passed in the working directory: types, lint, formatting, **197 tests across 30 files**, production/PWA build and public-content guard. This count includes six pre-existing local tests outside this batch; those tests and their unrelated implementation are not included in this commit. No browser account or private measurement was accessed. No numerical model or metadata display conversion was changed.
- The owner confirmed altitude in ft, pressure in hPa reduced to sea level, diameterUnit 0 = inches / 1 = mm and weightUnit 0 = grains / 1 = grams. These are documented input contracts, not newly inferred provider rules. Other unresolved units remain explicit in MEASUREMENT_UNITS.md.
- Existing sample-only helpers remain compatible. The full-record adapter clones/freeze-checks more data than before; maximum-size performance remains unverified. No browser visual review was needed for this nonvisual data-contract change. Pages deployment is not included.

## Calculated velocity catalog — 2026-10-20

- Version `0.11.0` passed full verification: types, lint, formatting, **201 tests across 31 files**, production/PWA build and public-content guard. This working-directory count includes six pre-existing local tests and their separate implementation, which are outside this batch and remain uncommitted.
- Four catalog behavior tests cover independent G1/G7 registration/removal, legacy identities and metadata, duplicate/unknown ID rejection, and parity between direct calculation and the readonly custom-context dispatch path. Existing numerical regression tests passed without changes.
- Reviewed the moved implementation against the previous module: constants, numerical expressions, operation order, guards and iteration limits are preserved. Leading declarations keep validation-dependent assignments after their guards. Saved quantity IDs, labels, units and descriptions remain compatible; no database or preference migration is needed.
- No browser visual review, live account access or private-data import was needed for this code-organization change. This verification does not establish physical model accuracy. No Pages deployment was triggered. Target-image connection/processing is deferred to the following release.

## Target photo measurement — 2026-10-20

- Version `0.12.0` passed full working-directory verification: types, lint, formatting, **219 tests across 33 files**, production/PWA build and public-content guard. The count includes six pre-existing local tests and their unrelated implementation, which remain outside this batch. The committed batch adds 18 target tests; the clean checkout contains 213 tests across 32 files.
- Domain/storage checks cover calibration from each dimension, signed and zero offsets, missing values, manual overrides, circle-only preservation, cm/in conversion, malformed geometry, source refresh preservation, foreign/missing-photo rejection, photo removal, complete ZIP round trips and readonly custom context.
- DOM checks cover draw/calibrate/resize/undo/save/reopen, two-click placement, pointer cancellation, retained zoom across tool changes, Cancel without writes, new-photo calibration, Enter/blur deduplication, untouched numeric precision, direct values without photos, inherited table columns and optional string-card group size. Image dimensions and SVG pointer APIs are mocked in these tests.
- In a separate temporary browser origin, imported invented strings and attached a synthetic six-target sheet. Drew POA/circle geometry, calibrated from a 2 in diameter, zoomed/panned, saved, reloaded and reopened the same drawing. Switching the profile to Metric showed 5.08 cm with converted offsets. Enabled the Display option and verified 5.08 cm on the string card; selected the target quantity in a By shot chart and enabled its table column. The table displayed the saved 5.08 cm. No browser console errors were captured.
- Reviewed the real SVG/photo layout at a 1265×712 desktop viewport. Physical touch input, narrow-device rendering, maximum-size image performance and tilted-photo accuracy remain unverified. The editor assumes uniform scale and does not correct perspective. Only synthetic local data were used; no owner photo, cloud account or private measurement was accessed. No Pages deployment was triggered.

## Target editor ergonomics — 2026-10-20

- Version `0.12.1` replaces floating numeric inputs with a fixed dimension panel and hover/focus connectors. One toolbar row contains two measurement buttons and labeled Undo/trash/hand/zoom/Fit icons. Action and click/tap controls and on-screen arrow buttons are removed.
- Working-directory checks include **223 tests across 34 files**. Six pre-existing local tests and their unrelated implementation remain outside this batch; the clean checkout contains 217 tests across 33 files. New regression coverage includes Ctrl-drag, Ctrl-wheel event consumption, unchanged saved geometry/calibration after navigation, the transition from one touch to two, pinch plus centroid translation, suppression of drawing by the remaining finger, cancellation, cursor anchoring through letterboxing, zoom bounds and Fit.
- In the isolated synthetic-data browser origin, reopened an existing calibrated drawing, zoomed to 225%, dragged with the hand tool, fitted the photo and focused different numeric fields. Values stayed unchanged; connectors followed the matching arrows and updated after navigation. The field panel scrolls independently on desktop, so focusing a field does not scroll the image. The toolbar's eight buttons occupied one row. No browser console errors were captured.
- The real browser check used a 1265×712 desktop viewport and an invented six-target image. Ctrl and two-finger input were verified by automated event tests; physical mobile devices, narrow-device rendering and maximum-size photo performance remain unverified. No private photos or cloud accounts were used, and no Pages deployment was triggered.

## Stable columns and calculated drop — 2026-10-20

- Version `0.13.0` passed types, lint, formatting, **238 tests across 36 files**,
  production/PWA build and the public-content guard. Six pre-existing local tests
  and their unrelated implementation remain outside this batch; the clean checkout
  contains 232 tests across 35 files.
- Column regressions cover hide/show without reordering, moving hidden columns,
  reopening, old profiles, new/unavailable definitions and custom-field deletion.
  ZIP tests include complete order, both drop choices, curve reproduction after
  recovery, old profiles without order, malformed IDs, duplicates and missing fields.
- Independent analytic drop tests cover vacuum and constant-Cd solutions. Actual
  G1/G7 tests preserve velocity output, matching coefficients, cm/in conversion,
  zero origin, finite increasing drop, axes, tooltip reference and bounded means.
  These are numerical checks of the documented approximation, not field accuracy validation.
- At the isolated synthetic browser origin, hid G1, reloaded, then enabled it again:
  it returned between muzzle velocity and G7, and stayed in place in Columns.
  Rendered G1/G7 drop on a shared cm axis and velocity/drop on independent axes.
  No console warnings or errors were captured. No owner records or cloud account
  were accessed; existing synthetic fixtures were extended with invented BCs.
- Browser testing exposed stale chart settings when two controls changed before a
  live-query render. The edit now resolves dependent choices against the latest
  profile inside the transaction; a regression test and repeated browser selection
  confirm that both choices survive. Screenshots remain ignored local artifacts.
- Verification used desktop Chromium at 1265×712. No Pages deployment was triggered.

## Compact table headings — 2026-10-20

- Version `0.13.1` passed types, lint, formatting, **241 tests across 37 files**,
  production/PWA build and the public-content guard. Six pre-existing local tests
  and their unrelated implementation remain outside this batch; the clean checkout
  contains 235 tests across 36 files.
- Header tests cover full explanations on hover/focus/tap, Escape/outside dismissal,
  scroll invalidation, unchanged sort IDs, separate display units, fixed custom-field
  units, literal parentheses in user-defined names, and string/shot scope distinctions.
  Existing preference, selection and ZIP round-trip checks also pass. There is no
  change to stored records, profile fields or the archive format.
- At the isolated synthetic-data browser origin, checked compact headers, the cm/m/s
  unit lines, plain G1/G7, full tooltip meaning and the Analyze checkbox to the left
  of its text. Escape dismissed help; Analyze still deselected/reselected the row.
  No browser console warnings/errors were captured. The 1265×712 desktop screenshot
  remains ignored locally. Physical mobile input was not separately verified.
- No private records were accessed and no Pages deployment was triggered.

## Downward calculated-drop axis — 2026-10-20

- Version `0.13.2` passed full verification: types, lint, formatting, 249 tests in
  37 files, production/PWA build and the public-content guard. This includes six
  unrelated pre-existing local tests excluded from the release; the clean checkout
  contains 243 tests in 36 files.
- Eight synthetic chart cases cover G1/G7 in Simple/String compare, cm/in,
  mixed Dual axes in both positions, a shared G1/G7 drop axis, retained zoom
  across model/unit changes and reset to zero at the top. Curve values stay
  positive; the separate velocity axis retains its upward direction.
- This batch was verified through automated component/axis-option tests, without
  a new interactive browser check. Calculations, saved records and backups are
  unchanged. No Pages deployment was triggered.

## Derived string atmosphere — 2026-10-21

- Version `0.14.0` passed full verification: types, lint, formatting, **277 tests
  across 39 files**, production/PWA build and the public-content guard. The removed
  Energy retention experiment has no remaining code/test references.
- New synthetic checks cover dry-air references, humid density and sound speed,
  independent mass-weighted heat capacities, pressure/temperature dependence,
  estimated station pressure, negative/zero elevation, invalid/absent weather and
  exact source-unit conversions. Magnus remains the over-water convention.
- Both source kinds use the tested atomic import path. Reimport updates or clears
  both attributes, preserves raw fields/annotations and rolls back on a catalog
  error. ZIP round trips retain canonical values/preferences; old archives remain
  valid and malformed derived values fail before any restore write.
- Component tests cover density/sound-speed columns and scalar charts in both
  display systems, confirmed pressure/elevation units and missing/present String
  info values. Custom context exposes detached readonly values.
- No new live account import or interactive browser check was performed. Source
  sensor accuracy and the provider's original sea-level pressure reduction remain
  unverified. Existing G1/G7 calculations are unchanged. No Pages deployment.

## Vertical axis labels — 2026-10-21

- Version `0.14.1` hides exact vertical viewport endpoints, preserving ordinary
  scale ticks and the zero baseline on an inverted drop axis.
- Full verification passed: types, lint, formatting, **277 tests across 39 files**,
  production/PWA build and the public-content guard. Tests ran outside the sandbox
  because the public-content cases need temporary Git repositories.
- A synthetic check extracted the component's actual label configuration and
  rendered it with ECharts SVG. Both axes hid fractional endpoints, retained
  regular labels and drop zero, and continued hiding new boundaries after a live
  vertical `dataZoom` action. No owner data or cloud account was accessed.
- Numerical ranges, point detail precision, local data and backups are unchanged.
  No interactive browser check or Pages deployment was performed.

## Experimental local-atmosphere velocity — 2026-10-21

- Version `0.15.0` passed full verification: types, lint, formatting, **289 tests
  across 40 files**, production/PWA build and the public-content guard.
- Synthetic numerical checks cover exact standard/default parity for G1/G7,
  independent analytic low-Mach integration under local conditions, density and
  sound-speed effects, local Mach-domain validation, positive decreasing bounded
  output, missing/invalid/cross-source context, unchanged raw inputs and no offset.
- Chart checks cover shared velocity axes, one-time unit conversion, matching BCs,
  standard/local tooltip provenance, per-string comparison conditions and omitted
  unavailable shots. UI checks select both new choices, persist a local selection
  and explain missing weather without replacing the saved preference.
- ZIP recovery restores both local curve IDs, the forecast horizon and imported
  atmosphere estimates, and reproduces both predictions from restored records.
- A production preview on isolated port 4182 imported an invented file, offered
  both local choices, rendered standard/local G1 together and retained the chart
  range until Reset. Point details identified the local experimental model; the
  chart element had no competing native title. No browser warnings/errors were
  captured. A screenshot remains ignored in `.local/`.
- No owner records, credentials or cloud account were accessed. Field agreement,
  provider BC normalization and radar/muzzle offset semantics remain unverified.
  The owner's planned measurement date is 2026-10-25. No Pages deployment.

## Automatic velocity atmosphere — 2026-10-21

- Version 0.16.0 passed types, lint, formatting, **296 tests across 40 files**,
  production/PWA build and the public-content guard after staging removed modules.
- G1/G7 use a complete valid local pair, otherwise the complete standard pair.
  Tests cover absent/invalid/cross-source inputs, independent analytic references,
  local Mach validation, unchanged drop, units, source preservation and ignored offsets.
- Notices/point/mean details cover dry/humid local conditions, estimated station
  pressure, explicit fallback, missing raw-weather details and eligible-shot limits.
- UI tests cover unified choices, historical local-ID normalization, duplicate-model
  collapse and mixed string conditions. ZIP tests restore both historical and current
  selections and reproduce the same numerical predictions.
- An isolated production preview on port 4182 restored a legacy standard/local pair
  as one automatic model, displayed “Same as primary quantity”, then plotted recorded
  velocity against G7. The notice showed 30 °C, 951.53 hPa estimated station pressure
  and 55% RH from invented data. Menus had only the two velocity models. No warnings
  or errors were captured. The screenshot is ignored in .local/.
- No owner data or cloud account was accessed. Field accuracy is not established;
  no Pages deployment was triggered. Owner-confirmed VelociRadar zero-offset handling
  is recorded in decision 019 and the unit reference.

## Report selection and target calibration — 2026-10-21

- Version 0.17.2 passed full verification: types, lint, formatting, **320 tests
  across 44 files**, production/PWA build and the public-content guard. The optional
  canvas layout case was also run separately; the default full suite skips only
  this optional renderer.
- Synthetic PDFs cover two strings in Compare and three in Simple, Dual and String
  info. Rendered pages were visually inspected. Each has one introduction, a separate
  Targets section, both H label directions and landscape whole-row records. Extracted
  text verifies every expected unique shot marker (37 or 55) and three complete JSON
  records in String info, including nested unrounded values and final record fields.
- An isolated preview on port 4182 verified Group + offset as the new-drawing default,
  H-to-V/G, V-to-H/G and G-to-H/V recalibration, saved geometry, full JSON inspection
  and successful String info PDF generation. Browser logs contained no warnings or
  errors. Screenshots and rendered PDFs remain ignored in `.local/`.
- Existing backup tests passed; there is no new stored preference or schema change.
  The owner's supplied PDF was inspected locally, never copied into fixtures or
  published. No cloud account or production browser data was changed. Pages
  deployment remains separate from this maintenance batch.

## Reference calibration and string cards — 2026-10-25

- Version 0.18.0 passes full `npm run verify`: types, lint, formatting, **330 tests
  across 45 files**, production/PWA build and public-content guard. One existing
  optional PDF renderer is skipped; this batch does not change PDF rendering.
- Tests cover diagonal reference scaling, both draggable endpoints, cancellation,
  undo, manual replacement, group-clear reuse, reference-only save/reopen, cm/in
  conversion, ruler bounds, invalid scale/frame rejection, reimport, ZIP recovery
  and photo-deletion cleanup. Note display and Ctrl selection include controlled
  checkbox-state regressions and preservation of ordinary selection/details behavior.
- An isolated browser preview on port 4182 verified both endpoint drags, live values,
  a zoom-adaptive ruler, save/reopen and unit switching, plus the default-enabled
  note checkbox in an older profile. Desktop and 390-pixel-wide layouts were inspected
  using an invented target. Browser logs contained no warnings or errors. Screenshots
  remain ignored in `.local/`; no personal target or connected account was used.
- Public delivery follows the existing verified-main Pages workflow (decision 023).

## Update discovery — 2026-10-25

- Maintenance 0.18.1 passes full verification: **337 tests across 47 files**, types,
  lint, formatting, production/PWA build and public-content review. The existing
  optional PDF renderer remains skipped; reports are unchanged.
- A separate loopback test server served two app-shell revisions. Without reloading
  the open first revision, the footer check discovered the second and showed Reload.
  Later hid the prompt, a new manual check restored it, and Reload activated the
  second revision. The synthetic string/profile persisted. This also exercises rapid
  update classification, with no cache deletion or registration removal.
- The actual 4180 server was initially unreachable although its cached app could
  still run. It was restarted as a hidden production preview; HTTP availability was
  confirmed. The public 0.18.0 build was already current before this repair.
- Focus/visibility/reconnect, periodic polling, offline/server failure recovery,
  first-install distinction, external activation, cleanup and overlapping requests
  have behavior tests. The browser screenshot remains ignored in `.local/`.
