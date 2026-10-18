# Plan

## Current milestone — repository foundation

- [x] Establish the VelociTrack name and new source tree.
- [x] Add minimal React/TypeScript/Vite tooling and a placeholder page.
- [x] Pin dependencies and commit a lockfile.
- [x] Add CI, a manual GitHub Pages workflow, ignore rules and a basic public-content check.
- [x] Add README, Codex guidance, architecture questions, terms notes and test plan.
- [x] Keep study files, private measurements and cloud integration out of the source tree.

The local/remote repository status and verification results are recorded in the handoff after setup.

## Next milestone — discuss architecture

1. Agree on the first end-user workflow and boundaries of the first release.
2. Review the options in `ARCHITECTURE.md`; decide which parts of the original proposal still fit.
3. Define a synthetic example and measurement semantics without copying private exports.
4. Decide whether the first release depends on live cloud access or can begin with local imports.
5. Record decisions and a narrow implementation plan before writing product features.

## Cloud feasibility gate — unresolved

- [ ] Obtain a web configuration permitted for the intended use.
- [ ] Review applicable Caldwell app/service terms and resolve integration distribution rights.
- [ ] Prepare a private browser-only PoC after architecture discussion.
- [ ] Have the owner enter credentials locally; never in chat, source or logs.
- [ ] Verify permitted Auth and Firestore reads from loopback and, if authorized, the intended hosted origin.
- [ ] Record sanitized results and limits; do not infer rules or rights from one successful read.

No credentials or permitted web configuration were available during repository preparation. No live Firebase test has passed.

## Later implementation candidates — not approved yet

CSV/JSON import; data-quality rules; statistics and graphs; local storage; offline/PWA behavior; backup/restore; explicit read-only cloud sync. Ordering and libraries remain open.

## Publication

Repository creation and its initial infrastructure content are within the current repository request. Website deployment is a separate action and remains manual. Integration publication requires the feasibility/terms work above and the owner's publication instruction.
