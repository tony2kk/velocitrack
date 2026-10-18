# Architecture discussion

**Status: not decided.** The owner requested repository/infrastructure preparation first. Do not treat this document or the original study as approval to implement an architecture.

## Current implementation

A static React page is compiled by TypeScript/Vite. GitHub Actions validates source and can publish `dist/` through a manually invoked Pages workflow. There is no domain model, persistence layer, API adapter, PWA or data flow to preserve yet.

The initial tooling follows the previous discussion and is replaceable. No product dependency on ECharts, Dexie or Firebase has been introduced.

## Constraints brought into the discussion

- Public, unofficial open-source project; Windows is the primary user platform.
- End users should not need an EXE or Python installation.
- Analyze lawfully obtained user measurements; preserve provenance and uncertainty.
- Do not expose private exports or authentication data through the repository.
- Cloud access, if implemented, must respect the provider's permissions and terms.
- The earlier study is evidence to examine, not production code to reuse.

## Decisions to make together

| Topic | Questions and candidate approaches |
| --- | --- |
| First useful workflow | Import an export, inspect one series, compare series, or synchronize? Which comes first? |
| Delivery | Hosted browser app only, installable PWA, or another workflow? Is opening a downloaded ZIP a requirement? |
| Offline scope | Which screens and datasets must work offline? What constitutes a reliable backup? |
| Import contract | Which JSON/CSV variants are accepted? Whole export vs normalized project format? What stays raw? |
| Measurement semantics | How are unit enums, distance origin, velocity units, padding, exclusions and atmosphere verified? |
| Data ownership | Separate imports, merge by source identity, or snapshots? How are corrections and duplicates represented? |
| Storage | IndexedDB/Dexie is a candidate. Migration, backup/restore, deletion and quota behavior need a design. |
| Visualization | ECharts is a candidate. Agree on necessary graphs before choosing data structures. |
| Authentication | Is a browser client permitted and technically supported? Default persistence and shared-device behavior? |
| Synchronization | Explicit one-shot read, partial retry, limits and user scoping; no writes to provider data. |
| Branding and audience | Language, intended audience and clear unofficial identity. |
| Testing | Parser/statistics fixtures first; storage/browser tests when those features exist. |

## Known data hints, not a schema contract

The study described `Users/{uid}/Strings/{id}/Shots/{id}` and shot fields `muzzleVelocity`, `ballisticCoefficientG1`, `ballisticCoefficientG7`, `velocities[]`, `distances[]` and an exclusion flag. Some paired zeros appear to be padding. The provider format is undocumented here and may change.

Do not infer physical units from numeric magnitude or enum values. A zero distance with positive velocity may be a valid point. Preserve raw arrays when a future importer is designed, and define how unequal lengths and invalid values are handled. Atmosphere and unit interpretation require a separate validation exercise.

## How decisions will be recorded

After discussion, add a short dated decision describing the chosen approach, alternatives considered, evidence and consequences. Only then create domain modules and dependencies. Until that point, the repository deliberately contains a small infrastructure scaffold.
