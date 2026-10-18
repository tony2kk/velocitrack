# VelociTrack — instructions for Codex

## Scope and current state

This is a new project, not a continuation or copy of the old feasibility code.
The owner asked for local/remote repositories and basic infrastructure first.
Architecture still needs discussion. Read `PLAN.md`, `ARCHITECTURE.md` and
`docs/CODEX_HANDOFF.md` before proposing or implementing features.

React/TypeScript/Vite are only the starting development tools. Do not silently
commit to a domain model, Dexie, ECharts, Firebase or PWA behavior. Discuss the
first user flow and record accepted decisions before adding product code.

## Commands

- `npm ci` — reproducible dependency installation (Node 22.12+).
- `npm run verify` — types, test runner, build and public-content guard.
- `npm run dev` — loopback development server.
- `npm run preview` — production preview after build.

On Windows PowerShell use `npm.cmd` when execution policy blocks `npm.ps1`.
The test runner currently permits an empty suite. Do not report that as
behavioral test coverage. Add useful tests alongside real behavior; avoid
tests that merely repeat static placeholder text.

## Data and access boundaries

Never commit passwords, tokens, real account identifiers, personal data,
user exports, HAR files, service accounts, proprietary APKs or vendor code.
Keep any expressly authorized local experiments in ignored `.local/`.
Create synthetic test fixtures from scratch; do not copy/anonymize real ones.

No Firebase integration or provider configuration is included. Read
`docs/FIREBASE_POC.md` and `docs/TERMS_REVIEW.md` before cloud work. Use only
permitted access to the authenticated owner's data. Do not bypass CORS,
API restrictions, App Check or Firestore rules, impersonate an Android app,
introduce a credential proxy or change a third-party Firebase project.

Units and atmosphere remain unvalidated. Preserve uncertainty. A zero
distance alone is not padding; paired `[0, 0]` handling needs explicit tests.
Do not add weapon configuration or ammunition optimization features.

## Workflow and publishing

Keep changes scoped and easy to review. Preserve user changes. Run checks
appropriate to changed behavior. Report what was tested and what remains
unverified. Prefer simple modules until an architecture is agreed.

`npm run check:public` is a basic pattern guard, not a proof of privacy.
Review staged files and Git history before publication. GitHub Pages is
manual; do not trigger deployment without the owner's instruction. Never
publish cloud integration merely because its technical requests succeed.

Use an unofficial community identity; do not claim Caldwell/AOB endorsement.
User instructions in the active conversation take precedence over this file.
