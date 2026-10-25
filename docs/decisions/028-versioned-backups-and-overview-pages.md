# 028 — Versioned backups and dedicated comparison pages

Accepted 2026-10-25 for release 0.21.0.

- New workspace backups record app version/revision, archive format and independent
  data version. Preserve backward compatibility with version-one archives.
- Recovery shows current/backup versions, compatibility, explicit conversions and
  their effects before the existing replacement confirmation. Legacy archives have
  no recorded app version. Do not infer one from dates or content.
- Migrations operate on detached, checksum-verified data. Keep original measurements,
  annotations and photographs. Unknown schemas/fields stop recovery rather than
  silently losing data. Retain historical migration fixtures in future releases.
- Different app releases with supported data contracts can restore after strict
  validation. Derived views use the current implementation; custom code is not
  embedded in backups. See [backup contract](../BACKUP_FORMAT.md).
- The report overview uses portrait for up to three strings, landscape for more,
  with at most five comparison columns per landscape group. Each additional group
  starts on a new page. Long content may continue with repeated headers; no new
  cover page is inserted and content must not be truncated to force a fit.
- Targets and String info return to portrait; charts and records keep their own
  landscape layout. Apply the same rules to A4 and Letter.
- Continue verified main-branch publishing under decision 023.
