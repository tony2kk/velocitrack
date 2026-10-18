# MVP verification

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

- Hosted-origin reads, general API restrictions/App Check configuration and server rule isolation. Loopback Auth/own-account reads passed, but do not prove these broader properties.
- Provider permission and any app-specific terms remain unconfirmed. The owner approved publication after reviewing this uncertainty; see `TERMS_REVIEW.md`. This is a release decision, not a technical test result.
- Physical unit codes, atmosphere and physical interpretation of provider values.
- Real-device installation across Safari/iOS/Android, browser eviction/quota behavior, and assistive-technology testing beyond the checks above.
- Large-dataset stress tests, future schema migrations and full workspace backup/restore.

File parsing and IndexedDB tests do not replace these remaining checks. Any future change to persistence, import semantics or units must add appropriate tests and update this record.

## Public installation and standard source configuration — 2026-10-18

- The owner authorized Pages deployment. The first published build (`0.2.0`, `eb9ae14`) passed the deployment workflow and loaded at `https://tony2kk.github.io/velocitrack/`, with its version confirmed in the rendered footer.
- The owner then explicitly requested the standard Caldwell source-type configuration for identical local/hosted setup (decision 005). Version `0.2.1` loads `sources/caldwell.json` on both origins. Only the shared `projectId` and Firebase client `apiKey` are intentionally public; no account information or user data belongs in this file.
- All **88 behavioral tests** passed, with types, lint, formatting, production/PWA build and publication guard. Setup tests cover a fresh public origin, profile reuse without another request, preservation of configured sources and safe failure on malformed/oversized responses. Publication tests exercise the actual guard in isolated temporary repositories with invented data; extra account fields and client keys outside the standard file are rejected.
- The obsolete loopback helper and its eight boundary tests were removed. No backend or deployment secret is needed. The standard source file is copied by the ordinary build; existing measurements and source/account bindings are not migrated or cleared.
- Version `0.2.1` (`41bb5bf`) passed both GitHub validation and Pages deployment. The published app's update prompt successfully activated it and the footer showed the expected version/revision. On that origin, adding a Caldwell source automatically reached **Sign-in needed** with the email/password form and no file picker or configuration fields. No credentials were entered during this setup check.
- Actual hosted sign-in and authenticated Firestore reads still require the owner to enter credentials directly on the published site. Preparing a sign-in form is not evidence of a successful cloud import. No credentials or tokens are copied from the local origin.
