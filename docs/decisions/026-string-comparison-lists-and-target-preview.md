# 026 — String comparison, local lists and target previews

Accepted 2026-10-25 for release 0.19.0.

- Changing the selected string ID set resets chart scales. Quantity, units, theme,
  table order and updates to the same strings retain compatible session viewports.
  This supersedes decision 011 only for string selection changes.
- String compare has three axes: By shot (shot-owned scalars), By string
  (numeric string-owned scalars, including target values and custom numeric fields),
  and Over distance. Velocity detail shows up to 100 individual measured shot curves
  in table order, colored by string. Existing Velocity comparison remains a mean.
  By string works without selected shots and never repeats a string value per shot.
- List custom fields own reusable options with stable IDs and editable names.
  Annotations store IDs; all visible values and sort keys resolve current names.
  New lists are defined in Profile; existing options can also be maintained in a
  top panel opened with + from string details. Option edits save immediately.
  String value edits still require Save details.
- Removing an option reports its saved usage count and requires confirmation.
  Confirmation removes the option and clears only those assignments atomically.
  Changed usage requires fresh confirmation. Duplicate/blank option names and
  dangling values are rejected. Renaming preserves assignments.
- String details show firearm/projectile followed by the plain Caldwell note.
  A measured photo adds a target button before the shot count. It opens a read-only
  preview, without changing string selection, using the same rendering as PDF.
- Calibrated target figures include a cm/in ruler immediately below the photo,
  capped at 30% of the visible image width. Both independent references and manual
  image calibration provide scale. Original images remain unchanged.
- Reports omit absent targets and omit the Targets section entirely when none
  exist. Projectile mass labels have a space before the unit.

All additions remain browser-local. Existing IndexedDB stores and ZIP format 1
support the optional field options and comparison axis without a schema migration.
Backup validation checks option identities, membership and axis ownership. Older
backups remain valid; use the current application to restore backups containing
the new List type. No authentication or connected-source behavior changes.
