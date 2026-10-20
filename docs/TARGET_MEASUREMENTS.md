# Local target measurements

Version 0.12.0 adds one optional active target result per string, stored as `Annotation.target`. Imported `Series` and `Shot` records are unchanged. The result, its image and every preference remain local browser data.

## Contract and units

`src/domain/targetMeasurement.ts` defines the contract:

| Property | Unit / invariant |
| --- | --- |
| `values.horizontalOffset` | Finite **mm** or null; positive right relative to POA. |
| `values.verticalOffset` | Finite **mm** or null; positive up relative to POA. |
| `values.groupSize` | Finite nonnegative **mm** or null; manually placed circle diameter. |
| `manual` | Unique names of non-null values entered manually rather than derived from the active drawing. |
| `photoId` | Optional local attachment ID belonging to the same string. |
| `geometry.width`, `geometry.height` | Positive integer dimensions of the decoded original image in pixels, at most 60 megapixels in total. |
| `geometry.center`, `geometry.poa` | Original-image `{ x, y }` coordinates in pixels, inside image bounds. POA may be null. Image Y increases downwards. |
| `geometry.radius` | Positive radius in original-image pixels, bounded by the image diagonal. The circle may extend beyond an image edge. |
| `mmPerPixel` | Optional finite positive uniform image scale, in **mm/pixel**. |

No geometry means no photo reference or scale. Geometry requires a photo reference. The editor saves photo results only after successful calibration; manually entered results need no photo. Null and zero have distinct meanings. The validator is shared by local writes and backup validation.

Target lengths intentionally use canonical **mm**, independently of the existing ft-based recorded-distance contract. Display divides by **10** for cm or **25.4** for inches. Profile changes never rewrite stored values or geometry. Rounded editor text is not written back unless the field was changed.

## Geometry and calibration

Given radius `r`, center `(cx, cy)` and POA `(px, py)`, pixel dimensions are:

- Group size: `2r`.
- Horizontal offset: `cx - px`.
- Vertical offset: `py - cy`.

Calibrating from a represented, nonzero dimension `d` sets `mmPerPixel = knownMillimeters / d`. Signs must agree so the scale is positive. Every represented dimension is then multiplied by that scale. The model assumes an upright image with uniform scale; there is no perspective correction or automated target analysis.

After calibration, editing a number applies a manual override without changing geometry or scale. A later geometry change recomputes represented dimensions and clears those overrides. Circle-only geometry has no POA and preserves independently entered H/V offsets. Recalibration is explicit once a scale exists.

The editor holds a detached draft, a synchronous gesture snapshot and up to 50 undo steps. Pointer cancellation restores the pre-gesture draft. Viewport zoom/pan does not change physical values. Changing the measurement tool may add or remove POA geometry; selecting the hand tool preserves the drawing. Geometry is saved in original pixels so opening the photo at a different screen size restores the same drawing; viewport position itself is not persisted.

Since 0.12.1, one toolbar row contains the two measurement buttons and labeled icon controls. Numeric fields live only in the fixed panel. Hover/focus highlights the matching dimension and a screen-space connector. The connector follows actual SVG transforms, resizing and scrolling, and disappears when its anchor is outside the canvas. On narrow screens the toolbar scrolls horizontally and fields move below the image.

Ctrl-drag or the hand tool pans; a non-passive canvas listener consumes Ctrl-wheel to zoom around the cursor without zooming the browser page. Ordinary wheel events are untouched. Two captured touch pointers share a centroid/distance navigation snapshot. Adding the second pointer rolls back a provisional geometry edit; after one finger lifts, drawing remains blocked until both are released. Pan/pinch do not create undo entries. Zoom is clamped to 1–12× and the visible image window remains in bounds. Keyboard arrows adjust the last selected handle; Ctrl-arrows or the hand tool pan.

## Persistence and lifecycle

`src/storage/targetMeasurement.ts` writes values, geometry, photo reference and calibration in one transaction. It checks that the string still exists and the photo still belongs to it. It merges the result into the latest annotation, preserving unrelated fields, tags and notes. Direct numeric edits merge only touched fields with the current result inside the transaction.

Imported refreshes preserve annotations. Each string has independent attachment IDs and a separate result, even when the attached image bytes contain the same multi-target sheet. No cross-string photo matching or measurement propagation occurs.

Opening a different photo carries the old numeric values into a draft as manual values but discards old geometry and scale. Saving explicitly replaces the active measurement; cancelling writes nothing. Deleting an active photo removes its bytes and provenance atomically while retaining numeric values as manual entries. Deleting unrelated photos leaves the active result unchanged.

The optional annotation/profile additions require no IndexedDB schema change or backup format bump. Older backups without these properties remain valid. Restore validates finite lengths, bounded geometry, manual-field names, string ownership and attachment references before writing. The regular ZIP backup includes both result and original image.

## Analysis and custom functions

The generic scalar pipeline exposes:

- `target:horizontalOffset`
- `target:verticalOffset`
- `target:groupSize`

Their labels start with **String**, and display units follow the profile. They are string-level scalars inherited by each shot, available to By shot charts, table columns and String info; they are not distance curves or per-shot impact coordinates. Axis display transforms use canonical mm so profile switches retain physical chart windows.

Custom distance functions receive the detached readonly result through `input.stringAnnotation?.target`, including `values`, geometry and calibration. Its lengths remain **mm** regardless of display settings. The context does not expose image bytes or blob URLs. A photo editor or numeric change updates the annotation and therefore the generic analysis context.

`Profile.showGroupSize` is an optional local boolean, default false. When enabled, the navigator shows non-null saved group size in cm/in; zero is retained. The preference is included in backups.

## Module responsibilities

- `TargetMeasurementPanel`: direct entry and photo selection in string details.
- `target/TargetEditor`: draft, calibration, undo, image loading and explicit persistence.
- `target/TargetCanvas`: mouse/touch capture, geometry gestures and navigation arbitration.
- `target/targetViewport`: pure screen/image transforms and bounded cursor/centroid zoom.
- `target/TargetDrawing`: SVG circle, anchors and color-matched dimension arrows.
- `target/TargetConnections`: focused/hovered field connector with layout/viewport tracking.
- `TargetValueInput`: local typing, one commit on Enter/blur and Escape cancellation.

Behavior tests cover conversion, calibration/signs, override lifecycle, missing values, storage ownership, refresh preservation, photo deletion, ZIP round trips, readonly custom context, drawing/undo/cancellation, reopening, untouched precision and card display. Navigation tests cover letterboxing, cursor anchoring, pan/zoom bounds, Ctrl gestures, two-finger transitions and unchanged saved geometry after navigation. Browser checks use invented images and a separate origin; see [verification](VERIFICATION.md).

[User guide](../help/targets.md) · [Measurement units](MEASUREMENT_UNITS.md) · [Decision 015](decisions/015-target-photo-measurement.md)
