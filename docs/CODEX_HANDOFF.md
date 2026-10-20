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

Version 0.4.0 adds additive schema v2, local custom fields/tags, per-series raster photos and full ZIP backup/restore. Read decision 007 for units, field lifecycle, file limits and authentication/restore behavior. Photos and backups are always user browser data, never repository assets. The pinned fflate 0.8.3 fixes the malformed ZIP64 advisory affecting older versions. Target analysis remains future work.

## Analysis/display update

Version 0.5.0 adds four Analysis modes, independent persistent chart settings, recorded/source/custom scalar selection, ordered configurable table columns, String info, projectile mass labels and Light/Dark/Auto theme. Read decision 008 and updated help. Development and preview now both use the exact `http://127.0.0.1:4180/velocitrack/` origin with strict port binding. Never move the owner's daily workflow to another port or copy private browser data into fixtures. Synthetic browser checks may use an isolated temporary origin without signing in.

The owner requested remembered sign-in for the existing local workspace. It was enabled through the profile, followed by owner-entered login; the UI confirmed remembered sign-in and a reload/startup refresh succeeded without credentials. No global default was changed and no session/token is in the repository. The owner-controlled reassignment verified projectile.weightUnit 0 = grains and 1 = grams; see decision 008. Unknown codes must remain explicit.

## Table order and string-panel fields

Version 0.6.0 adds visible column drag cards/insertion gaps, persistent header sorting (default String then Shot), By shot charts following table order, and bidirectional contributor highlighting for comparison means. Compare uses each string's sorted rank on X; original shot numbers remain in tooltips. Distance axes remain physical. String cards include assigned tags and enabled custom values; blanks are omitted and zero is retained. A top-right edit icon beside the shot count opens details/photos without toggling selection. Fixed grams/grains weight types share canonical storage with legacy profile-unit Weight; populated weight types may switch without rewriting values. Read decision 009 and updated help. The daily environment stays on the existing 4180 origin; no Pages deployment is included.

## Shot status, calculated velocity and help

Version 0.7.0 persists reversible local shot invalidation in annotations, with a sticky rightmost red cross/Undo, disabled Analyze on invalid rows and tri-state bulk Analyze across pages. Ordinary Analyze choices remain transient. Over distance supports Calculated velocity (G1)/(G7) from each shot's muzzle velocity and matching Caldwell BC; Dual compares models with recorded data on one velocity scale. Predictions use explicit standard atmosphere, constant BC and straight-path drag only. Each model uses at most 100 eligible shots in table order and a persisted horizon at most 1 km. Original BCs/measurements are unchanged; the owner agreed to skip replacement BC calculations. Read decision 010 and VELOCITY_RESEARCH.md before extending the model. Numerical reference table data are attributed under MIT in public/third-party-notices.txt; no external simulation code is included. Help is a short linked task-oriented hub with separate technical references. Continue to preserve the daily 4180 browser origin and its private data.

## Chart navigation and hover help

Version 0.8.0 keeps canonical numerical axis windows in session memory while updating one ECharts instance. Compatible velocity curves share their scale; unrelated quantities and horizontal-axis meanings keep their own ranges. Unit switches convert retained bounds. The bottom-right reset fits current plotted data. The existing forecast field and horizontal right edge synchronize without discarding the larger navigable domain; vertical zoom leaves the field unchanged. Native English hover titles explain meaningful controls. Read decision 011. No numerical model, atmospheric correction, schema or cloud change is included.
