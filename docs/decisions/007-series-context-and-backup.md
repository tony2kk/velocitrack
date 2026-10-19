# 007 — Series context, photos and portable backups

Accepted with the owner on 2026-10-19. Supersedes the shot-navigation layout in decisions 004/006 and the deferred field-editor/backup work in decision 001.

## Workspace interaction

The left navigator contains series only. The chart and a shot table are visible together. Table checkboxes control temporary analytical membership; unchecked rows stay visible so they can be selected again. Provider exclusions remain separate. The existing Shot detail preference now emphasizes the chosen table reading. Hover/focus remains linked between chart and table.

## Custom fields and tags

Profile has General, Custom fields and Tags sections. Definitions and labels save immediately; General preferences retain their explicit Save profile action. There is no fixed count limit for definitions or tags. Names are unique within each collection, trimmed and limited to 100 characters.

Every field has a stable ID, name, order and one type: Short text (100 characters), Note (multiline), Number, Weight, Speed or Distance. Fields are optional and belong to a series. Dimensional values use canonical gr, ft/s and ft internally; the profile selects Imperial (gr, ft/s, ft) or Metric (g, m/s, m) for entry and display. Weight uses exactly 0.06479891 grams per grain; speed/distance use 0.3048. Plain numbers allow negatives; dimensions are nonnegative. Blank means absent and differs from zero. Changing units does not rewrite stored values. Only edited values are parsed when saving details.

Renaming preserves values. A populated field cannot change type. Removing a definition requires confirmation and atomically deletes its values and saved column selection. Existing legacy annotation fields/notes remain preserved.

Tags have stable IDs, names and six-digit hex colors. Multiple tags can be assigned to a series. Visible names and colored swatches avoid conveying meaning only through color. OR applies within Tags, AND between filter groups. Removing a tag requires confirmation and removes assignments and filter references, never measurements. Field values and tags appear as optional inherited columns on every shot row; edits take place in series details, not individual shots.

These are user-authored records only; no ammunition optimization, weapon configuration or inferred recommendations are added.

## Photos

Multiple original JPEG/PNG/WebP photos may belong to each series. Each has a caption and a full-size view. Adding photos, editing captions and removing photos save immediately. Limits are 20 MiB and 60 megapixels per uploaded photo. SVG and arbitrary files are unsupported. Metadata and Blob content have separate tables so ordinary workspace queries do not load image bytes. Object URLs are released on unmount. Source deletion removes its photo metadata and bytes in the same transaction.

Target/group analysis is deferred. Future analysis should reference a specific photo and retain calibration/marked points; no analysis results are fabricated in this release.

## Backup and restore

A version-one ZIP contains manifest.json, one JSON per data collection under data/, and original raster files under attachments/ using stable attachment IDs. The manifest records creation time, byte lengths and SHA-256 checksums. Profile, catalogs, source/account bindings, raw measurements, annotations, definitions, tags and photos are included. Firebase SDK storage, passwords and authentication tokens are never read or exported. Archives are private data and are not encrypted.

Backup takes one consistent readonly snapshot. Restore is full replacement, not merging. Archive selection validates format/version, bounded paths/entry counts/expanded sizes, checksums, domain types, references and raster signatures. A count preview and explicit replacement checkbox precede any mutation. Every application table is replaced in one IndexedDB transaction; validation/quota/write failures retain the prior workspace. Connected sources require sign-in again; current local SDK sessions are cleared before replacement. Authentication cleanup is outside the database transaction, so a failed restore may still leave a source signed out.

Archive and expanded-size limits are 256 MiB, at most 10,000 ZIP entries, and a 2 MiB manifest. Restore requires Web Locks and acquires an exclusive origin-wide lock; file/connected imports hold shared locks through loading and commit. Users must close other workspace tabs before restore, including older app versions that do not participate in the lock protocol. Storage usage/quota estimates are shown when the browser supports them. Large archives and physical-device quota/eviction behavior remain verification limits.

## Persistence and publication

Dexie schema v2 adds fieldDefinitions, tags, attachments and attachmentContents without clearing v1 tables. Optional annotation values/tagIds and profile column settings need no index migration. Imported measurements and local context remain separate. User files and backups never become repository or hosted assets. The ordinary verified commit/push workflow applies; Pages deployment still requires its own instruction.
