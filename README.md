# VelociTrack

A private, local workspace for exploring recorded Caldwell VelociRadar measurements. An unofficial community project, built for the browser. End users need no EXE, Python installation or VelociTrack account.

**MVP:** JSON/CSV/text imports, read-only Caldwell account imports, shared catalogs, persistent filters, series comparison, charts, a shot table and an offline application shell. The Caldwell connector passed local browser sign-in, import and repeat-refresh checks. Configured local installations prepare connection settings automatically, so users enter only their email/password. No provider configuration is bundled. Hosted-origin support remains unverified.

VelociTrack is not affiliated with, endorsed by or supported by Caldwell or American Outdoor Brands (AOB). The original feasibility study, proprietary APK and private exports are not part of this project.

## Using VelociTrack

See the [user help](help/README.md) for Sources, Caldwell sign-in, JSON/text import formats, filters, profile preferences and offline use.

## Your data stays on your device

Measurements, source settings, catalogs, annotations, profile and filters live only in this browser's **IndexedDB**. File imports stay local. Caldwell sign-in and read requests go directly to the provider; no measurements or settings are uploaded to a VelociTrack server. Git, the build and GitHub Pages contain application assets only. There is no telemetry, external font service, credential proxy or server database.

Storage belongs to a specific origin and browser profile. Development, preview and GitHub Pages have separate workspaces. Clearing site data, private browsing or browser eviction can remove local content. **Keep original exports.** Full workspace backup/restore is planned. Local storage is not separately encrypted by the application; use an appropriate device/browser profile on shared devices.

The production PWA caches static application assets after a successful online visit. Imported data remains in IndexedDB. Offline mode is not a backup. Updates offer a reload prompt. Installation requires browser support and HTTPS (loopback is allowed for previews). Development mode does not install the service worker.

## Measurement interpretation

- Physical units, enum meanings and atmosphere are **unvalidated**. Raw values are not labeled as m/s, fps, metres or feet; no conversions are applied.
- Paired `[0, 0]` samples are omitted from charts as padding. Zero distance with positive velocity remains valid. **Data quality** reports invalid/unpaired samples. Original arrays remain intact.
- Source-excluded shots stay visible in the table but do not enter charts/statistics. Positive finite muzzle readings contribute to mean, sample SD (`n − 1`) and extreme spread.
- Charts/statistics require one source/raw-unit-code group. Equal codes within a source are a provisional comparison grouping, not proof of physical units.
- Distance charts show up to 100 included shot traces; narrow the selection for others. Tables paginate in groups of 100. These are measured points, not predicted trajectories.

## Develop locally

Use Node.js 22.12+ and npm; CI uses Node 22. These are contributor tools, not end-user requirements.

```powershell
git clone https://github.com/tony2kk/velocitrack.git C:\dev\VelociTrack
Set-Location C:\dev\VelociTrack
npm.cmd ci
npm.cmd run dev
```

Open the printed URL, normally `http://127.0.0.1:5173/velocitrack/`. On macOS/Linux use `npm`. `npm.cmd` avoids PowerShell script-policy restrictions. Do not open `index.html` through `file://`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Loopback development server |
| `npm run verify` | Types, lint, formatting, tests, build and public-content guard |
| `npm test` | Parser, measurement, filter and IndexedDB transaction tests |
| `npm run format` | Format application, tests and configuration |
| `npm run build` | Generate static `dist/` and service worker |
| `npm run preview` | Serve the production build on loopback port 4173 |
| `npm run check:public` | Basic prohibited-file/credential-pattern scan, not a privacy proof |

TypeScript 6 is pinned because the selected ESLint TypeScript integration does not support TypeScript 7 yet. Do not bypass peer checks to upgrade it.

Firebase 12.19 uses the Node 22-compatible SDK line. Overrides keep Firebase App/compat peers on one matching version; otherwise npm can install a second App instance and break Auth component registration. The gRPC override fixes the reported transitive advisories; the browser connector uses Firestore Lite and does not use the Node gRPC transport. Revalidate SDK initialization, peer consistency and the dependency audit when updating these pins.

For a configured local Caldwell preview, the maintainer supplies permitted `projectId` and `apiKey` fields in ignored `.local/caldwell-connection.json`, then starts/restarts Vite. The dev/preview helper serves only these fields to same-origin loopback requests; it accepts no credentials and emits nothing into `dist/`. Users create a Caldwell source and enter only their email/password. Settings are then reused from the browser profile. A fresh public/static installation still requires a separately approved provider-configuration distribution mechanism; a normal build does not include this local helper or its data. See [decision 003](docs/decisions/003-automatic-local-setup.md).

## Project layout

```text
src/components/      Workspace and dialogs
src/domain/          Identities, filtering and measurement semantics
src/sources/         File and read-only online source adapters
src/storage/         IndexedDB schema and atomic operations
dev/                 Local Vite setup helpers, excluded from the application build
public/brand/        Owner-supplied logo, favicons and PWA icons
tests/               Synthetic behavioral tests
help/                User documentation
docs/decisions/      Accepted decisions
.github/workflows/   CI and manual Pages deployment
```

Read [ARCHITECTURE.md](ARCHITECTURE.md), [PLAN.md](PLAN.md), [AGENTS.md](AGENTS.md), [Codex handoff](docs/CODEX_HANDOFF.md) and [brand asset notes](docs/BRANDING.md). Keep private exports outside the repository. Authorized local experiments belong in ignored `.local/`.

## GitHub Pages

Deployment is **manual**; pushing code does not deploy the site. After owner authorization and review of the exact public commit:

1. In **Settings → Pages**, choose **GitHub Actions**.
2. Run **Deploy GitHub Pages (manual)** on `main`.
3. Check the workflow and deployed application.

The configured destination is `https://tony2kk.github.io/velocitrack/`; this does not assert deployment has occurred. Only `dist/` is uploaded. No application secrets are needed. If the base path changes, update Vite base, manifest start/scope and service-worker navigation scope together. See [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Cloud feasibility and contributions

The private loopback Firebase Auth/Firestore test and full application import passed. Hosted-origin compatibility, general service restrictions and provider permission remain unconfirmed. The owner approved publication after reviewing the available terms and this uncertainty. Neither the Python exporter nor a successful local browser test establishes provider permission. Read [FIREBASE_POC.md](docs/FIREBASE_POC.md) and [TERMS_REVIEW.md](docs/TERMS_REVIEW.md) before cloud work. Do not bypass provider controls.

Use English throughout. Write small, readable modules and behavior-focused tests. Never publish credentials, real account identifiers, private exports, HAR files, APKs or vendor code. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Original project code and documentation use the [MIT License](LICENSE). This grants no rights to Caldwell/AOB services, software, data or trademarks.
