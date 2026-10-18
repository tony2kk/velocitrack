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

The Caldwell source and full local application import are implemented and verified, including repeat refresh without duplicate records. Dedicated user help lives in `help/README.md`. Next, review the connected workflow with the owner.

1. Review the MVP workflow and appearance using local exports.
2. Validate physical units, distance origin and atmosphere against reliable evidence.
3. Design workspace backup/restore, quota handling and larger-dataset pagination.
4. Define typed custom-field definitions, applicable entities and editor UX.
5. Design explicit mapping/merging across source catalogs.
6. Add agreed chart/report tools using validated measurement semantics.

## Connected-source verification

- [x] Keep connection configuration local and review the available public terms.
- [x] Run isolated browser-only Auth/Firestore PoC with the owner's account.
- [x] Verify successful ordinary browser Auth and own-account reads from loopback without bypasses.
- [x] Verify full application import and repeat refresh with the owner's account.
- [x] Record sanitized results, terms limitations and the owner's explicit decision to publish the independent connector.
- [ ] Verify intended hosted origin and obtain evidence for restrictions not observable from customer access.
- [ ] Obtain any applicable app-specific terms or provider clarification; the owner intends to contact Caldwell later.
- [ ] Verify opt-in persistent authentication across browser restarts.

Both the private browser-only test and product import passed on 2026-10-18. Provider configuration is excluded. The owner directed publication after the terms review; this does not establish provider support or resolve the remaining service questions. See `docs/FIREBASE_POC.md` and `docs/TERMS_REVIEW.md`.

## Publication

Review candidate files, built assets and history before publishing. The owner authorized committing and pushing each completed, verified functional batch to `origin/main` on 2026-10-18 and explicitly approved proceeding with the Caldwell connector after the terms review. Continue on `main` unless instructed otherwise. Pages deployment remains manual and requires a separate instruction.
