# Tests

The test runner is ready; there are no behavioral tests yet because the repository contains only a static placeholder.
`npm test` explicitly allows an empty suite. CI success at this stage means the source typechecks, builds and passes the public-content check; it does not demonstrate application behavior.

Add meaningful tests alongside the first agreed feature. Candidate cases:

- Paired `[0, 0]` padding versus a valid zero-distance measurement.
- Unequal array lengths, non-finite values, unknown units and explicit exclusions.
- CSV quoting/BOM and malformed JSON; atomic rejection without partial imports.
- Sample standard deviation, empty sets, one sample and mixed units.
- Storage migrations and offline reload if browser storage/PWA are selected.
- User-scoped reads and denial handling if cloud integration is approved.

Use entirely synthetic fixtures. Never copy or anonymize real user exports into tests.
