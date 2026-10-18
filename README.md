# VelociTrack

A private, local workspace for exploring recorded Caldwell VelociRadar measurements. An unofficial community project, built for the browser. End users need no EXE, Python installation or VelociTrack account.

**MVP:** JSON/CSV imports, shared catalogs, persistent filters, series comparison, charts, a shot table and an offline application shell. Live Caldwell/Firebase connectivity is not implemented or verified.

VelociTrack is not affiliated with, endorsed by or supported by Caldwell or American Outdoor Brands (AOB). The original feasibility study, proprietary APK and private exports are not part of this project.

## Using VelociTrack

1. Open **Sources**, name a source, and choose **Add source**. A source represents one independent export collection.
2. Choose **strings.json and shots.json together**, or the equivalent CSV pair. A single JSON object with `strings[]` and `shots[]` is also supported. Do not select `points.csv`. The combined file limit is 20 MB.
3. **Automatically update catalogs** creates firearm/projectile names found in the export. With it disabled, an unknown name rejects the entire import. Use **Local catalogs** beside Refresh to add the missing name and retry.
4. Filter by source, firearm, projectile or date. Values within a filter are alternatives; different filters combine. Empty means all. Dates use local time; relative windows remain relative.
5. Select one or more series. **Chart** shows recorded velocity over distance or muzzle velocity by shot; **Table** includes excluded shots. Hidden series leave the active selection.
6. **Refresh** includes every enabled source, regardless of filters. Select its current export files again. Matching records are updated without duplicates; records absent from later exports are retained. One source's failure does not undo another source's success.
7. Open **Local profile** for nickname and startup preferences. Filters save automatically. On-start refresh marks file sources as awaiting files; the browser cannot silently reread disk paths.

The remember-sign-in checkbox stores a preference for future connected sources. File imports use no credentials; no authentication flow exists. Future authentication defaults to memory until application close/reload, and passwords will never be saved.

Sources can be renamed, disabled or removed. **Remove source and data** requires confirmation and permanently deletes its series, shots and annotations. Catalog names remain. Used catalog entries cannot be deleted. Manual catalog renames survive refresh; cross-source mapping/merging is deferred.

## Your data stays on your device

Measurements, source settings, catalogs, annotations, profile and filters live only in this browser's **IndexedDB**. Nothing is uploaded. Git, the build and GitHub Pages contain application assets only. There is no telemetry, external font service, credential proxy or server database.

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

## Project layout

```text
src/components/      Workspace and dialogs
src/domain/          Identities, filtering and measurement semantics
src/sources/         Validated local file adapter
src/storage/         IndexedDB schema and atomic operations
public/brand/        Owner-supplied logo, favicons and PWA icons
tests/               Synthetic behavioral tests
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

Browser-only Firebase access, permitted configuration, API/origin restrictions and distribution rights remain unresolved. A working Python exporter proves neither browser compatibility nor permission. Read [FIREBASE_POC.md](docs/FIREBASE_POC.md) and [TERMS_REVIEW.md](docs/TERMS_REVIEW.md) before cloud work. Do not bypass provider controls.

Use English throughout. Write small, readable modules and behavior-focused tests. Never publish credentials, real account identifiers, private exports, HAR files, APKs or vendor code. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Original project code and documentation use the [MIT License](LICENSE). This grants no rights to Caldwell/AOB services, software, data or trademarks.
