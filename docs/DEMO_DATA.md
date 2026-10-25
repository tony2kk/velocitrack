# Public demonstration data

The owner explicitly authorized this one public demonstration session on
2026-10-25. It is **real example data**, not synthetic test data. Ordinary user
measurements and every user's settings remain private browser data.

## Published contents

- Five strings dated 2026-10-25 and 50 original shot records; saved invalid-shot
  marks leave 43 eligible readings. Original numerical precision and raw units
  are preserved. Measurements are examples, not recommendations.
- One shared target-sheet photograph, referenced by five attachments. Existing
  per-string geometry, calibration and report crops select the relevant target.
- Two field definitions, including one List with its options; two tags; one report
  profile with individual velocity comparisons and string-level G1/group summaries.
- Only `public/demo/sample.json` and `public/demo/target-session.jpg` form the package.
  Download size is approximately 3.5 MB; no sign-in or provider request is made.

## Preparation and review

The owner-provided local backup was read in an ignored local preparation area.
Only the requested date was selected. The original archive is never published.
All source configuration, profile/preferences, credentials, provider account/device
identifiers, original record IDs and location references were removed, including
location-dependent sunrise/sunset timestamps. Public IDs
are generic and re-scoped again when installed. Free-text notes and catalog labels
were reviewed along with structured attributes. The omitted location is not
replaced with invented coordinates or weather readings.

The photograph was visually checked: a target sheet, without people or identifying
location information. JPEG camera/author/GPS/XMP/ICC/comment segments were removed.
Only its minimal EXIF orientation tag remains, preserving the original compressed
pixel stream and the coordinate system used by saved geometry. This is deliberate:
stripping orientation without rotating geometry would misalign the measurements.

The public-content guard has a narrow path allowlist plus recursive identity,
location and private-field checks for the JSON. The JPEG guard accepts only the
exact orientation-only metadata tag. These guards supplement human review; they
do not prove that arbitrary data or imagery is anonymous. Do not expand this
exception to other exports or photographs without a new explicit owner request.

## Local lifecycle

`sources/demo.ts` downloads and validates before a single all-table transaction.
Existing workspace content is preserved. New field/tag/catalog/report names are
disambiguated, never automatically merged. IDs prefixed by the new source ID track
the supporting definitions through edits and backup/restore. One demo is allowed
per workspace. Storage failure or missing photos rolls back the entire addition.

Refresh is a no-op for this fixed sample. Removal deletes sample records and photo
bytes, then applies the three keep choices. Reused fields/tags and catalog entries
remain; retained report references also protect fields. A later installation gets
new IDs and is independent of any definitions kept from a previous demo.

The demo contains no general settings. Only the explicitly requested report
template is appended to the existing local report-profile list. Units, nickname,
filters, report selection and sign-in preferences are unchanged. All subsequent
edits are local and are never uploaded. Backup data version 4 preserves ownership.
