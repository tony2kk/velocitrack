# 022 — Shared report overview and linked target dimensions

Accepted 2026-10-21; release 0.17.2. Refines decisions 015 and 020–021.

The owner reported repeated introductory pages for multiple strings, missing
String info output, an overlapping negative-H leader and one-way numeric calibration.
They approved one common introduction followed by a separate Targets section.

- Multiple selected strings share an overview, with at most three per table block.
  Long details can flow naturally; selecting another string does not force a new
  cover. Targets follow separately, each once with its string name and dimensions.
  Shared charts and whole-row landscape shot records retain the current selection.
- String info displays every selected string in both the workspace and PDF.
  A complete JSON snapshot includes the stored string (including raw provider
  fields), its local annotation and referenced field/tag definitions. JSON retains
  original precision and units and flows across pages. The existing report.chart
  switch controls Chart / String info. Connection records and sessions are excluded;
  the locally generated PDF may contain source IDs and original metadata.
- PDF target labels sit left for negative H and right otherwise. Dashed leaders
  depart diagonally from dimensions instead of tracing the horizontal arrow.
  Editor leaders also depart diagonally; its fixed input panel does not jump sides.
- New drawings default to Group + offset. Numeric H/V/diameter edits share the
  photo scale by default. Any represented nonzero value with a matching sign can
  recalibrate all represented dimensions. An explicit session-only Link dimensions
  to drawing checkbox permits independent manual overrides after calibration.
  Existing circle-only drawings retain their mode and independent offsets.
- No schema, source-import, numerical ballistics or backup-format change is required.
  Stored geometry, physical values and crop continue through existing ZIP recovery.

Verification uses invented two/three-string reports, all analysis modes, complete
JSON records, both H signs, linked edits in every direction, undo and saved values.
Private user reports and images remain outside the repository.
