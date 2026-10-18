# Plan

## Foundation

- [x] New local/public GitHub repositories under the VelociTrack name.
- [x] Pinned dependencies, CI, manual Pages workflow and privacy guard.
- [x] Independent source tree; no study code, APK or private exports.

## Approved local-first MVP

- [x] Record architecture decisions and English-only convention.
- [x] IndexedDB entities, annotations and local profile.
- [x] JSON/CSV adapter, raw preservation and source-scoped identities.
- [x] Atomic repeatable import and optional automatic catalog updates.
- [x] Source/catalog management and all-enabled-source refresh.
- [x] Persistent multi-select/date filters and profile preferences.
- [x] Responsive series selection, charts/table and data-quality reporting.
- [x] Static PWA shell and owner-provided branding.
- [x] Parser, statistics, filter and transactional storage tests.

See `docs/VERIFICATION.md` for actual verification and remaining caveats. Local MVP work does not authorize a Pages deployment.

## Next iteration

1. Review the MVP workflow and appearance using local exports.
2. Validate physical units, distance origin and atmosphere against reliable evidence.
3. Design workspace backup/restore, quota handling and larger-dataset pagination.
4. Define typed custom-field definitions, applicable entities and editor UX.
5. Design explicit mapping/merging across source catalogs.
6. Add agreed chart/report tools using validated measurement semantics.

## Cloud gate — unresolved

- [ ] Obtain permitted web configuration and applicable service terms.
- [ ] Run isolated browser-only Auth/Firestore PoC with the owner's account.
- [ ] Verify origin/API restrictions, App Check and authorized reads.
- [ ] Record sanitized results and distribution rights before integration publication.

No browser-only cloud test has passed. No Firebase SDK/configuration is included. Follow `docs/FIREBASE_POC.md` and `docs/TERMS_REVIEW.md`.

## Publication

Review candidate files, built assets and history before publishing. The owner authorized committing and pushing each completed, verified functional batch to `origin/main` on 2026-10-18. Continue on `main` unless instructed otherwise. Pages deployment remains manual and requires a separate instruction; the cloud feasibility and terms gate still applies.
