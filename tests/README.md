# Verification

Committed fixtures are invented from scratch. Tests never read personal exports or provider accounts.

- `import.test.ts`: JSON pairs/combined data, BOM, CSV quoting/nested JSON, booleans, identities, timestamps, padding preservation, unequal arrays and malformed/duplicate/orphan records.
- `measurements.test.ts`: zero padding versus valid zero distance, invalid/unpaired samples, sample SD, exclusions and incompatible groups.
- `filters.test.ts`: OR/AND, local boundaries, invalid ranges and relative calendar windows.
- `storage.test.ts`: Dexie with fake IndexedDB; idempotency, rollback, manual catalog repair, preserved annotations/renames, source isolation, reopening and removal scope.

Run `npm test` or `npm run verify`. Empty suites fail. Browser testing is separate; see `docs/VERIFICATION.md`. Fake IndexedDB tests do not prove browser quota, migration or service-worker behavior.
