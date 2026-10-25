# 024 — Reference calibration and string-card controls

Accepted: 2026-10-25. Release: 0.18.0.

## Decision

- Add optional local `Profile.showCaldwellNotes`, default true even when absent in older profiles. Show nonblank imported `Series.raw.notes` as plain text on cards. Keep local annotation notes separate.
- Ctrl-click anywhere on a string card selects exactly that string; ordinary selection remains additive. The details button remains independent. This selection is session state, not a new profile preference.
- Add an independent reference-length tool to the existing one-row target toolbar. Two draggable original-image endpoints and a known length in cm/in define one uniform mm/pixel scale. The group circle, POA and report crop remain independent.
- Store optional `TargetMeasurement.calibration` with original-image width/height, start/end pixels and positive `lengthMm`. Complete calibration can be saved before a group exists; incomplete calibration is editor-only. Geometry edits and endpoint/length edits recalculate represented dimensions.
- Explicit manual group/H/V entry clears reference provenance and its ruler. The existing linked or independent manual workflow continues; an untouched patch never clears calibration. Undo restores prior drafts. Clearing only the group retains the reference for reuse.
- Draw a contrasted ruler at the visible image's bottom right. Choose readable cm/in intervals, capped by the known reference and 30% of visible image width. Zoom and pan affect presentation only.

## Boundaries and compatibility

Calibration belongs to one string's active photo. Identical attachments in different strings do not share state. A front-facing image and a real known length are still required; there is no perspective correction or automatic group detection.

All data stays in IndexedDB. Existing annotation/profile backup paths preserve the optional additions. Save/restore validate scale consistency, bounded endpoints, shared frame dimensions and attachment ownership. Reimport preserves annotations. Removing a photo clears reference provenance and retains numeric values. No schema or backup-version change is required. Legacy records and backups remain valid.

## Verification and delivery

Behavior tests cover reference scaling, cm/in display, bounded rulers, both endpoint gestures, undo/cancellation, manual replacement, reference-only save/reopen, reimport and ZIP recovery, note preferences and Ctrl selection. Use synthetic local browser data for visual checks. Publish verified main via Pages under decision 023.
