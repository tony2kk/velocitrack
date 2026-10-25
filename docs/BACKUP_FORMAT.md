# Backup compatibility contract

Backups are local ZIP files. They contain private workspace data and original
photos, never passwords or Firebase sessions. See [user help](../help/backup.md)
for replacement semantics and limits. Release 0.21.0 introduces explicit version
management without changing the live IndexedDB schema.

## Independent versions

| Manifest field | Meaning |
| --- | --- |
| `version` | ZIP envelope version; current writer: 2 |
| `dataVersion` | Workspace contract and migration baseline; current writer: 2 |
| `appVersion` | Package version that created the archive |
| `appRevision` | Build-time Git revision, including `-dirty` for a modified local build |
| `createdAt` | ISO timestamp of archive creation |
| `files` | Entry paths, byte lengths and SHA-256 hashes |

`format` remains `velocitrack-workspace`. Each table is in `data/<table>.json`,
with `data/profile.json` for the singleton profile. Original raster bytes are in
`attachments/<id>.<extension>`. No user settings are added to the application build.
Versions are metadata, not authentication or proof of who created a ZIP.

## Supported readers and migration

- Archive version 1 (releases 0.4–0.20) is interpreted as data version 1. It did
  **not** record the creating app version. The preview says so rather than guessing.
- Archive version 2 declares data version 1 or 2 and a valid app release/revision.
  Data version 1 is migrated in memory; data version 2 is validated directly.
- A different, even newer, app release is acceptable if the envelope, data version
  and every record are supported. The preview shows both app versions and explains
  that reports and calculated views use the current app's implementation.
- Unknown envelope/data versions, invalid values, unrecognized domain fields or
  broken references stop preparation. Nothing is partially imported or discarded.
  The user sees the version problem and can update the app before retrying.
- This is backward read compatibility, not a downgrade exporter: apps before
  0.21 cannot read version-2 archives. Keep the original older ZIP as well.

The `1 → 2` step fills absent optional profile choices with the documented defaults
(system theme, card display preferences, 100% chart height, A4, all report sections
and default analysis views). It preserves explicit choices and never fills missing
required fields. Historical Shot sorting becomes String / Shot sorting with the
same direction. The old local G1/G7 choices map to unified atmosphere-aware G1/G7.
Every applied change is listed before confirmation. These defaults are frozen in
the migration rather than inherited from future application defaults.

Measurements, raw provider records, custom values, notes, target geometry and photo
bytes are preserved. Missing atmosphere attributes remain absent: reimport can
derive them later. Missing hidden-column order keeps the existing visible-order
fallback. Unknown custom curve IDs are retained with a warning; a ZIP contains
their settings, not executable custom code. The user can select an available curve.

## Validation and transaction boundary

1. Enforce archive/expanded-size, count, path and duplicate-entry limits.
2. Read version metadata; verify every declared original byte length and hash.
3. Decode JSON and apply the explicit migration chain to the detached copy.
4. Validate the complete current domain contract, references and photo signatures.
5. Show versions, conversion impact, counts and limitations before confirmation.
6. Revalidate prepared data and replace every application table in one transaction.

Inspection never writes IndexedDB or rewrites the original ZIP. A failed database
write rolls back all tables. Session cleanup precedes replacement and may sign the
user out even when a later write fails. This pre-existing behavior is explained in
the help. Restore requires the existing replacement confirmation and exclusive lock.

## Rules for future changes

- Keep every supported reader and migration. Never remove compatibility to simplify
  current validation. Do not use app-version ordering as a substitute for a schema.
- For a changed stored meaning, renamed required field, new required field or new
  table, increment the data version and append a deterministic migration. Change the
  envelope version only when the archive structure/metadata contract requires it.
- Optional fields may stay additive when omission is explicitly valid and old data
  keeps its meaning. Test the absent-field case and document its default/impact.
- Never round measurements, regenerate photographs, silently discard unknown fields
  or substitute defaults for invalid values. Stop when a lossless conversion is not
  defined. Partial salvage would need a separately reviewed, explicit workflow.
- Retain synthetic fixtures for every historical contract. Test archive preparation
  and actual restore, exact values/bytes, explicit preferences, corruption rejection,
  unknown newer versions and transaction rollback. Re-saving a migrated workspace
  must produce the current format with no second migration.

Implementation: `storage/backupVersions.ts`, `storage/backupMigrations.ts`,
`storage/backupValidation.ts` and `storage/backup.ts`.
