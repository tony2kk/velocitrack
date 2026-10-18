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
- Local annotations are separate. Typed-field editing and cross-source mapping are later work.
- Expanded series expose shot checkboxes. Deselections and hover are page-memory state; selected shots drive summaries, charts and table. Import feedback expires after ten seconds; progress tracks active sources. See decision 004.
- Units/atmosphere are unvalidated; no weapon configuration or ammunition optimization.

The study is not production code. Never copy private exports, APKs or account configuration into the project. The owner explicitly requested the shared two-field Caldwell client configuration in `public/sources/caldwell.json`; this is the only allowed public provider metadata (decision 005). Synthetic tests are invented from scratch. Owner-provided branding lives in `public/brand/`; the ZIP is excluded.

User help is `help/README.md`; the header opens it on GitHub in a new tab. The published app is https://tony2kk.github.io/velocitrack/. Caldwell setup reuses browser settings, otherwise loads the standard `sources/caldwell.json` on both local and hosted installations. Each source retains its connection/account binding. Only the shared service project ID/client key is public; no user credential, token or setting is shipped. Users enter only email/password. Auth defaults to memory, with SDK persistence only after profile opt-in. Read decision 005 before changing source configuration.

## Working practices

Use `npm.cmd` in PowerShell when required. `npm run verify` checks types, lint, formatting, tests, build and public-content patterns. TypeScript 6 is pinned for supported lint integration; do not bypass peer compatibility checks.

`npm run dev` serves development. Build then preview for PWA/offline checks. Storage is origin-specific: a different port/host means a different workspace. Never embed user settings in source/build configuration.

The owner authorized an ongoing workflow on 2026-10-18: continue on `main`, verify and review each completed functional batch, then commit and push it to `origin/main`. After reviewing the available terms and remaining uncertainty, the owner explicitly directed publication of the independent Caldwell connector. Do not request repeat approval for that decision or ordinary verified batches. Record new material findings without treating technical success as provider permission. Confirm the remote result instead of assuming local work is published. Pages deployment still requires a separate instruction.

The owner plans to contact Caldwell when the application is sufficiently functional. They will handle that contact; no provider message has been sent on their behalf.
