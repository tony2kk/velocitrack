# 001 — Local-first MVP

Accepted with the owner on 2026-10-18.

## Decisions

- The application, documentation, identifiers and code comments are English.
- There is one local profile. There is no VelociTrack account, backend or server-side data storage.
- All measurements, source configurations, shared catalogs, annotations and user preferences live in the browser's IndexedDB. No user data or configuration belongs in the repository, build or hosting assets.
- Use React/TypeScript/Vite, Dexie for IndexedDB, modular ECharts for visualizations and a static PWA shell. No third-party font, analytics or runtime CDN requests.
- Keep the domain close to the observed VelociRadar series/shot structure while giving sources, series, shots and catalog items stable local identities.
- Imported records and local annotations have separate storage. Refresh must not overwrite local annotations.
- Provide shared firearm/projectile catalogs. A source controls automatic catalog updates. Disabled automatic updates make unknown references an actionable error and roll back that source's complete import.
- Resolve known provider identities within their source; allow a unique manually created catalog name to satisfy a missing reference. Do not automatically merge identities from different sources. Advanced mapping is deferred.
- Refresh targets every enabled source, independently of display filters. Each source refresh is atomic; one failure does not invalidate another source's successful update.
- Persist filter values in the local profile. OR within one filter, AND across filters; empty means all. Relative dates remain relative. Hidden series leave the active comparison.
- Store nickname, remember-sign-in preference and refresh-on-start preference locally. Future authentication stays in memory by default; never persist passwords. The preference is not an implemented authentication flow.
- The first connector reads existing JSON/CSV exports through an explicit local file picker. Refresh asks for current export files; the browser cannot silently reread arbitrary filesystem paths. On-start refresh marks file sources as requiring files without interrupting startup.
- Firebase browser access remains unverified and is excluded from this MVP. No credentials form or network integration is implied by the profile preference.

## UI

Header with product identity, nickname/profile and external GitHub help. Toolbar with Data, Filters and Tools. A narrow selectable series list and wider visualization/table workspace. Footer with refresh and local-storage status. Responsive layouts, keyboard-accessible controls, native modal dialogs and reduced-motion support.

## Measurement boundaries

Physical unit enums and atmosphere remain unvalidated. Keep raw measurements and explicit unknown-unit labels. Exclude paired zero padding only from chart/statistical views, preserve zero-distance samples with positive velocity, and never silently zip unequal arrays. Do not combine incompatible source/unit groups into aggregate statistics.

## Later phases

Provider authentication; live reads; source-to-catalog mapping; typed custom-field editors; additional source adapters, tools, charts and reports. No ammunition optimization or weapon-configuration behavior.
