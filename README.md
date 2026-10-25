# VelociTrack

A private, local workspace for exploring recorded Caldwell VelociRadar measurements. An unofficial community project, built for the browser. End users need no EXE, Python installation or VelociTrack account.

**MVP:** JSON/CSV/text imports, read-only Caldwell account imports, shared catalogs, persistent filters, series comparison, charts, a shot table below the chart, series custom fields/tags, local photos, ZIP backup/restore and an offline application shell. Local and hosted installations use the same standard Caldwell client configuration, so users enter only their email/password. See the [verification record](docs/VERIFICATION.md) for observed sign-in/import results and remaining checks.

The shot table supports saved reversible invalidation and bulk Analyze. Over distance can compare recorded velocity with G1/G7 model estimates from each shot's muzzle velocity and matching Caldwell BC. Predictions automatically use each string's saved local atmosphere, with a disclosed standard fallback, and retain original data; see the [research and numerical validation](docs/VELOCITY_RESEARCH.md). Start with the short [user help hub](help/README.md) for everyday tasks.

VelociTrack is not affiliated with, endorsed by or supported by Caldwell or American Outdoor Brands (AOB). The original feasibility study, proprietary APK and private exports are not part of this project.

## Using VelociTrack

**New here?** Open **Sources → Demo data → Add source** to explore five example
strings with target photos, custom fields, tags and a reusable report. No account
or file is needed. The opt-in sample is copied locally; your settings remain yours.
Remove it when finished and choose which reusable definitions to keep.

The **[visual user guide](https://tony2kk.github.io/velocitrack/help/)** offers short,
captioned walkthroughs from first setup through targets and reporting. Open it
from **?** at the top right. The [Markdown guide](help/README.md) remains available.

Choose **Quick report** or a saved profile in Tools, then use the PDF icon to
[save or print a local report](help/reports.md). Quick report captures current chart
zoom. **Profile → Report Builder** creates reusable reports with ordered charts,
including one chart per string and shared comparisons. Report sections default on;
templates, selection and settings stay local and are included in backups.

See the [user help](help/README.md) for Sources, Caldwell sign-in, JSON/text import formats, filters, profile preferences and offline use.

Open the published app at **[tony2kk.github.io/velocitrack](https://tony2kk.github.io/velocitrack/)**.

## Your data stays on your device

Measurements, source settings, catalogs, annotations, profile and filters live in this browser's **IndexedDB**. File imports stay local. Caldwell sign-in and read requests go directly to the provider; no measurements or settings are uploaded to a VelociTrack server. GitHub Pages contains application/help assets and one explicitly owner-approved, curated demo session. That sample has location and private identifiers removed; it contains no account or general preferences. Subsequent edits stay local. See the [demo data review](docs/DEMO_DATA.md). There is no telemetry, external font service, credential proxy or server database.

Storage belongs to a specific origin and browser profile. Development, preview and GitHub Pages have separate workspaces. Clearing site data, private browsing or browser eviction can remove local content. **Keep original exports and regular ZIP backups.** Use Backup / Restore for the entire workspace, including photos. Restore replaces local data after validation and confirmation; archives are private and not encrypted. Local storage is not separately encrypted by the application; use an appropriate device/browser profile on shared devices.

The production PWA caches static application assets after a successful online visit. Imported data remains in IndexedDB. Offline mode is not a backup. Updates offer a reload prompt. Installation requires browser support and HTTPS (loopback is allowed for previews). Development mode does not install the service worker.

## Measurement interpretation

- The owner confirmed **ft/s, ft and °F** for the supported Caldwell/VelociRadar raw inputs. Choose **Imperial** (default) or **Metric** in the local profile; displayed values convert without rewriting measurements. Provider enum meanings and other atmosphere fields remain unvalidated.
- Paired `[0, 0]` samples are omitted from charts as padding. Zero distance with positive velocity remains valid. **Data quality** reports invalid/unpaired samples. Original arrays remain intact.
- Source-excluded shots stay visible in the table but do not enter charts/statistics. Positive finite muzzle readings contribute to mean, sample SD (`n − 1`) and extreme spread.
- Charts/statistics retain the existing one-source/raw-unit-code comparison grouping. Source codes are metadata, not display-unit selectors.
- Simple/Dual distance charts show up to 100 included shot traces; narrow the selection for others. Tables paginate in groups of 100. These are measured points, not predicted trajectories.
- Use the horizontal and vertical sliders to zoom either axis. Analysis offers Simple chart, Dual chart, String compare and String info. Chart axes/quantities and table-column selection/order/sort persist. Sort with header arrows (default String, then Shot); By shot charts follow table order. Compare means link to contributing rows. Profile → Custom fields offers optional string-panel values and fixed grams/grains fields. Profile → Display controls projectile weight labels and Light/Dark/Auto theme. Import messages count only new records; unchanged imports report **No new data detected**.

## Develop locally

Use Node.js 22.12+ and npm; CI uses Node 22. These are contributor tools, not end-user requirements.

```powershell
git clone https://github.com/tony2kk/velocitrack.git C:\dev\VelociTrack
Set-Location C:\dev\VelociTrack
npm.cmd ci
npm.cmd run dev
```

Development and preview share the fixed URL `http://127.0.0.1:4180/velocitrack/`. On macOS/Linux use `npm`. `npm.cmd` avoids PowerShell script-policy restrictions. Do not open `index.html` through `file://`.

| Command                | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run dev`          | Loopback development server                                        |
| `npm run verify`       | Types, lint, formatting, tests, build and public-content guard     |
| `npm test`             | Parser, measurement, filter and IndexedDB transaction tests        |
| `npm run format`       | Format application, tests and configuration                        |
| `npm run build`        | Generate static `dist/` and service worker                         |
| `npm run preview`      | Serve the production build on loopback port 4180                   |
| `npm run check:public` | Basic prohibited-file/credential-pattern scan, not a privacy proof |

TypeScript 6 is pinned because the selected ESLint TypeScript integration does not support TypeScript 7 yet. Do not bypass peer checks to upgrade it.

To add a code-defined Over distance function, use the [curve registry and template guide](docs/DISTANCE_CURVES.md). One definition supplies the calculation, availability, units, axis identity and description for both quantity menus.

The [workspace data reference](docs/DATA_ACCESS.md) lists normalized records, provider paths, units, joins and local access APIs, including the distinction between application data and curve callback inputs.

Firebase 12.19 uses the Node 22-compatible SDK line. Overrides keep Firebase App/compat peers on one matching version; otherwise npm can install a second App instance and break Auth component registration. The gRPC override fixes the reported transitive advisories; the browser connector uses Firestore Lite and does not use the Node gRPC transport. Revalidate SDK initialization, peer consistency and the dependency audit when updating these pins.

`public/sources/caldwell.json` is the standard configuration for the Caldwell source type. It contains only the common Firebase `projectId` and client `apiKey`, deliberately served as public application metadata. A normal build copies it into `dist/sources/caldwell.json`; local development and static hosting use the same file. No local helper, deployment secret or end-user configuration file is needed. Existing browser/source bindings are preserved. User credentials, sessions, preferences and measurements remain separate. See [decision 005](docs/decisions/005-public-source-configuration.md).

## Project layout

```text
src/components/      Workspace and dialogs
src/domain/          Identities, filtering and measurement semantics
src/sources/         File and read-only online source adapters
src/storage/         IndexedDB schema and atomic operations
public/brand/        Owner-supplied logo, favicons and PWA icons
public/sources/      Shared public source-type metadata, never account settings
tests/               Synthetic behavioral tests
help/                Visual guide entry and plain-text documentation
src/help/            User-goal guide content and walkthrough player
public/demo/         Explicitly authorized opt-in example session
public/help/media/   Reviewed captures from an isolated demo workspace
docs/decisions/      Accepted decisions
.github/workflows/   CI and verified Pages deployment
```

Read [ARCHITECTURE.md](ARCHITECTURE.md), [PLAN.md](PLAN.md), [AGENTS.md](AGENTS.md), [Codex handoff](docs/CODEX_HANDOFF.md) and [brand asset notes](docs/BRANDING.md). Keep private exports outside the repository. Authorized local experiments belong in ignored `.local/`.

## GitHub Pages

Every push to `main` starts **Deploy GitHub Pages**. Its build job runs the full
verification suite and public-content guard before deployment. The owner authorized
this release workflow on 2026-10-21; see [decision 023](docs/decisions/023-publish-verified-batches.md).
Review the exact public commit before pushing, then check the workflow and live release.

In **Settings → Pages**, the deployment source must be **GitHub Actions**. To retry
a release, run **Deploy GitHub Pages** manually on `main`; the same checks apply.

The published destination is `https://tony2kk.github.io/velocitrack/`. Only `dist/` is uploaded, including the standard public source-type configuration. No application secrets are needed. If the base path changes, update Vite base, manifest start/scope and service-worker navigation scope together. See [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Cloud feasibility and contributions

The private loopback Firebase Auth/Firestore test and full application import passed. The owner also confirmed successful import on the published `0.2.1` Pages app on 2026-10-18. General service restrictions and provider permission remain unconfirmed. The owner approved publication after reviewing the available terms and this uncertainty. Neither the Python exporter nor a successful browser import establishes provider permission. Read [FIREBASE_POC.md](docs/FIREBASE_POC.md), [VERIFICATION.md](docs/VERIFICATION.md) and [TERMS_REVIEW.md](docs/TERMS_REVIEW.md) before cloud work. Do not bypass provider controls.

Use English throughout. Write small, readable modules and behavior-focused tests. Never publish credentials, real account identifiers, private exports, HAR files, APKs or vendor code. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Original project code and documentation use the [MIT License](LICENSE). This grants no rights to Caldwell/AOB services, software, data or trademarks.

String compare supports **By shot**, **By string** (for example Group size), and
**Over distance**, including individual **Velocity detail** traces colored by string.
Changing selected strings fits the chart scales. Local custom fields also support
reusable **List** options. Measured-target card icons open read-only previews with
the same dimensions, crop and ruler used in PDF reports.
