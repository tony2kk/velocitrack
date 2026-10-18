# MVP verification

Verified locally on 2026-10-18, on Windows with Node 22 and the Codex in-app Chromium browser. Results below describe local work; they do not assert that the current MVP is pushed or deployed.

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

## Still unverified / intentionally absent

- Hosted-origin reads, general API restrictions/App Check configuration and server rule isolation. Loopback Auth/own-account reads passed, but do not prove these broader properties.
- Provider permission and any app-specific terms remain unconfirmed. The owner approved publication after reviewing this uncertainty; see `TERMS_REVIEW.md`. This is a release decision, not a technical test result.
- Physical unit codes, atmosphere and physical interpretation of provider values.
- Real-device installation across Safari/iOS/Android, browser eviction/quota behavior, and assistive-technology testing beyond the checks above.
- Large-dataset stress tests, future schema migrations and full workspace backup/restore.
- A publicly deployed GitHub Pages build; deployment remains manual and requires owner instruction.

File parsing and IndexedDB tests do not replace these remaining checks. Any future change to persistence, import semantics or units must add appropriate tests and update this record.
