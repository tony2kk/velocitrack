# Verification

Committed fixtures are invented from scratch. Tests never read personal exports or provider accounts.

- `import.test.ts`: JSON pairs/combined data, BOM, CSV quoting/nested JSON, booleans, identities, timestamps, padding preservation, unequal arrays and malformed/duplicate/orphan records.
- `measurements.test.ts`: zero padding versus valid zero distance, invalid/unpaired samples, sample SD, exclusions and incompatible groups.
- `filters.test.ts`: OR/AND, local boundaries, invalid ranges and relative calendar windows.
- `storage.test.ts`: Dexie with fake IndexedDB; idempotency, rollback, manual catalog repair, preserved annotations/renames, source isolation, reopening and removal scope.
- `interaction.test.tsx`: React/DOM checks for notification deadlines, session selection, linked navigation/table hover, pagination and progress dismissal.
- `chart.test.ts` and `chart-interaction.test.tsx`: sample identity/precision, trace limits, chart event mapping, emphasis without canvas reconstruction, and safe point-detail rendering. The chart bridge tests mock ECharts; real canvas rendering is verified separately in the browser.
- `refresh.test.ts`: enabled-source coordination, in-flight deduplication, progress updates and cleanup after failures.

Run `npm test` or `npm run verify`. Empty suites fail. Browser testing is separate; see `docs/VERIFICATION.md`. Fake IndexedDB tests do not prove browser quota, migration or service-worker behavior.
