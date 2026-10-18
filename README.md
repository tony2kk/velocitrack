# VelociTrack

An unofficial, open-source project for exploring measurement data from Caldwell VelociRadar.

**Current scope: repository and development infrastructure. Application architecture is still to be discussed.** This is a new project; the earlier feasibility study, exporter, APK and private measurements are not part of this repository.

VelociTrack is not affiliated with, endorsed by, or supported by Caldwell or American Outdoor Brands (AOB). Product names identify compatibility goals only; this project uses no vendor logos or proprietary assets.

## What exists today

- A minimal React + TypeScript + Vite development scaffold and placeholder page.
- Strict TypeScript checks, a pinned dependency lockfile and an empty Vitest test harness.
- GitHub Actions CI for install, typechecking, build and a public-content check.
- A **manually triggered** GitHub Pages deployment workflow, restricted to `main`.
- Project guidance for Codex, a discussion document, a plan and cloud feasibility notes.
- MIT licensing, contributor guidance and exclusions for private data and credentials.

There is no import implementation, database, charting, authentication, synchronization or service worker yet. No cloud connectivity or offline behavior has been verified. No website is deployed by creating or pushing this repository.

## Product direction — to discuss

The initial idea is a browser application that can be used primarily on Windows, with no EXE or Python installation for end users. Candidate capabilities include CSV/JSON import, local/offline analysis, charts, and explicit read-only synchronization of the user's own permitted cloud data.

React, TypeScript and Vite provide a replaceable starting scaffold. PWA, ECharts, IndexedDB/Dexie and Firebase are proposals from the study, **not an approved application architecture**. We will agree on the first user flow and data contracts before introducing those dependencies. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Run locally for development

Prerequisites: Git, Node.js 22.12+ (Node 22 LTS is used in CI) and npm. These are developer tools; the intended hosted application will run in an end user's browser.

```powershell
git clone https://github.com/tony2kk/velocitrack.git C:\dev\VelociTrack
Set-Location C:\dev\VelociTrack
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vite, normally `http://127.0.0.1:5173/velocitrack/`.
Using `npm.cmd` avoids PowerShell execution-policy problems with `npm.ps1`. On macOS/Linux, use `npm`.

```powershell
npm.cmd run verify
npm.cmd run preview
```

The preview serves the production build at `http://127.0.0.1:4173/velocitrack/`.
Do not open `index.html` directly through `file://`; this scaffold is served over HTTP. A future installed PWA would require a secure origin (HTTPS, with loopback exceptions for development).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server, bound to loopback |
| `npm run typecheck` | Strict TypeScript validation |
| `npm test` | Run tests; an empty suite is explicitly allowed at this stage |
| `npm run build` | Typecheck and generate `dist/` |
| `npm run preview` | Preview a completed production build |
| `npm run check:public` | Scan Git candidate files for prohibited paths/common credential patterns |
| `npm run verify` | All current checks and a production build |

An empty test suite is not evidence of application correctness. Add behavioral tests with the first agreed feature; see [tests/README.md](tests/README.md). The content scanner is a basic guard and cannot replace reviewing staged files and history.

## Repository layout

```text
.github/workflows/    CI and manual Pages deployment
docs/                Feasibility, terms review and handoff guidance
scripts/             Repository checks
src/                 Static placeholder only
tests/               Test plan; no behavioral tests yet
AGENTS.md            Codex instructions
ARCHITECTURE.md      Open design questions, not an implementation mandate
PLAN.md              Scope and next steps
```

Local experiments belong in `.local/` (ignored). Keep source measurements outside this repository. Do not force-add ignored files. The earlier study remains independent of this project.

## GitHub Pages

The repository includes `.github/workflows/pages.yml` but **does not auto-deploy**. When the owner explicitly wants to publish a site:

1. Review the exact commit and confirm it contains only intended public files.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
3. In **Actions**, run **Deploy GitHub Pages (manual)** on `main`.
4. Check the run result; the expected project URL is `https://tony2kk.github.io/velocitrack/`.

That URL is a planned destination, not a claim of current deployment. Vite's base path is `/velocitrack/`. If the repository path changes or a custom domain is introduced, update the base before deploying. The workflow uploads only `dist/`; it does not upload source exports or local experiments. No GitHub secrets are needed by this scaffold.

See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite's deployment guide](https://vite.dev/guide/static-deploy.html).

## Cloud integration and data handling

Cloud integration is an unresolved feasibility item. A working Python export does not establish that browser authentication, API restrictions, origins, App Check or Firestore rules allow a web client. The repository contains no Firebase SDK, provider project configuration or integration code.

Before implementing or publishing cloud integration, follow [docs/FIREBASE_POC.md](docs/FIREBASE_POC.md) and resolve the questions in [docs/TERMS_REVIEW.md](docs/TERMS_REVIEW.md). A successful login is not permission to distribute an integration. Do not change or bypass provider restrictions.

Never commit passwords, session/refresh tokens, user IDs tied to actual accounts, personal details, user exports, HAR files, service accounts, proprietary APKs or copied vendor code. All future test fixtures must be created synthetically.

## Continue in Codex

Open the repository folder as the local project and begin with `AGENTS.md`, `PLAN.md` and `ARCHITECTURE.md`. The next conversation is an architecture discussion, not automatic implementation of the earlier proposal. See [docs/CODEX_HANDOFF.md](docs/CODEX_HANDOFF.md).

## License and contributions

The original source and documentation in this repository use the [MIT License](LICENSE). This license grants no rights to Caldwell/AOB software, services, data or trademarks. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
