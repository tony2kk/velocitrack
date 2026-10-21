# VelociTrack — instructions for Codex

## Scope and current state

This is a new project, not a continuation or copy of the old feasibility code.
The owner approved a local-first MVP after repository preparation. Read
`PLAN.md`, `ARCHITECTURE.md`, `docs/decisions/001-local-first-mvp.md` and
`docs/CODEX_HANDOFF.md` before extending it. React/TypeScript/Vite, Dexie,
ECharts and a static PWA shell are accepted. The Caldwell connector passed
the private browser-only test and full local application import. Read decision 002 and
the feasibility/terms records before changing or publishing connected sources.
All UI, documentation and code comments must be English. Keep modules readable
and record newly accepted product decisions.

Document classes, named functions/methods and domain contracts with concise English
JSDoc. Explain invariants, side effects and non-obvious decisions near the relevant
code. Keep comments accurate when behavior changes; avoid comments that only repeat
syntax. Inline React callbacks need explanations where the behavior is non-obvious,
not boilerplate on every handler.

For code-defined calculated curves, keep each quantity in its own module and register
it in customDistanceCurves.ts. Group metadata, constants and working-variable declarations
at the start of their respective functions, with English purpose/unit comments.
Keep guard-dependent assignments after validation and loop-dependent assignments in the loop.

The footer displays the package version and build-time Git revision. Update the
package version and lockfile together for a release. Build after committing when
handing off a clean preview; uncommitted work is intentionally marked `-dirty`.

## Commands

- `npm ci` — reproducible dependency installation (Node 22.12+).
- `npm run verify` — types, lint, formatting, tests, build and public-content guard.
- `npm run dev` — loopback development server.
- `npm run preview` — production preview after build.

On Windows PowerShell use `npm.cmd` when execution policy blocks `npm.ps1`.
Add behavior-focused tests, not tests that repeat implementation details or
static text. Empty suites must fail.

## Data and access boundaries

Never commit passwords, tokens, real account identifiers, personal data,
user exports, HAR files, service accounts, proprietary APKs or vendor code.
Keep any expressly authorized local experiments in ignored `.local/`.
Create synthetic test fixtures from scratch; do not copy/anonymize real ones.
Measurements and every user setting are local browser data, never repository
files, build configuration or hosted assets. No application backend. Keep
imports atomic, provider IDs source-scoped and annotations separate. Do not
automatically merge catalogs across sources.

The owner explicitly requested standard public Caldwell client configuration; see
decision 005. Only `public/sources/caldwell.json` may contain the shared `projectId`
and Firebase client `apiKey`. This is service metadata, not a user's profile or credentials. Read
`docs/FIREBASE_POC.md` and `docs/TERMS_REVIEW.md` before cloud work. Use only
permitted access to the authenticated owner's data. Do not bypass CORS,
API restrictions, App Check or Firestore rules, impersonate an Android app,
introduce a credential proxy or change a third-party Firebase project.

Caldwell sign-in must not ask ordinary users for a project ID or configuration file.
Automatic setup reuses browser metadata or loads the standard source-type configuration
from the same origin, locally and on Pages. Never publish the contents of an ignored
local file wholesale. The public-content guard permits exactly the two shared metadata
fields in the standard file and rejects extra fields. Do not add a credential proxy.

The owner confirmed that the supported Caldwell/VelociRadar raw measurements use
ft/s, ft and °F (decision 006). Preserve these values in storage and convert only for
display using the local profile's Imperial/Metric preference. Provider unit enum codes
remain metadata, not conversion instructions. The owner confirmed altitude in ft,
weatherData.pressure in hPa reduced to sea level, and projectile.diameterUnit
0 = inches / 1 = mm (decision 013). Projectile weightUnit is independently
0 = grains / 1 = grams. Other unresolved metadata units remain unvalidated;
see docs/MEASUREMENT_UNITS.md.
A zero distance alone is not padding; paired `[0, 0]` handling needs explicit tests.
Do not add weapon configuration or ammunition optimization features.

## Workflow and publishing

Keep changes scoped and easy to review. Preserve user changes. Run checks
appropriate to changed behavior. Report what was tested and what remains
unverified. Evolve the accepted architecture deliberately.

Work on `main` unless the owner instructs otherwise. After each completed
functional batch, run the appropriate checks, review the public content,
commit the batch with a descriptive English message and push it to
`origin/main`. The owner authorized this ongoing workflow on 2026-10-18;
do not ask for repeat approval for ordinary verified feature batches.
On 2026-10-21, the owner extended this authorization to immediate GitHub Pages
deployment after every completed, verified batch. Pushes to `main` now trigger
the Pages workflow, which verifies the same commit before deployment. Wait for
its result and verify the live release before reporting completion; do not ask
for separate deployment approval. See decision 023.
Do not force-push or include unrelated/private files. If a check or privacy
gate fails, resolve it before publishing or report the concrete blocker.
On 2026-10-18, after reviewing the available terms and their unresolved scope,
the owner explicitly instructed publication of the independent Caldwell
connector. That decision is recorded in `docs/TERMS_REVIEW.md`; do not reopen
the same approval question for this batch or ordinary verified maintenance.
It is not provider endorsement or legal clearance. The owner plans to contact
Caldwell when the application is sufficiently functional; do not send a message
on their behalf.

`npm run check:public` is a basic pattern guard, not a proof of privacy.
Review staged files and Git history before publication. The Pages workflow also
supports manual reruns on `main` when needed to finish an authorized release. Never
publish cloud integration merely because its technical requests succeed.

Use an unofficial community identity; do not claim Caldwell/AOB endorsement.
User instructions in the active conversation take precedence over this file.
