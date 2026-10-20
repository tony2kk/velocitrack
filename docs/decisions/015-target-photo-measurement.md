# 015 — Local target photo measurement

Date: 2026-10-20

Status: Accepted by the owner; implemented in 0.12.0.

## Decision

Add optional horizontal offset, vertical offset and group size to each string's local annotation. The owner confirmed conventional directions: H is positive right, V is positive up. Display target lengths in cm for Metric and inches for Imperial; retain m/ft for recorded distances. Store physical target values in mm.

Allow direct numeric entry and two manual photo tools: a circle for group size, or POA-to-center rectangle plus circle for group size and offsets. The first known nonzero dimension establishes one image scale. Subsequent numeric edits are manual overrides until a geometry edit recalculates represented dimensions. Recalibration is explicit. Group size means the drawn circle's diameter.

Store original-image pixel geometry, scale and a local photo reference together with numeric values. Save confirms the draft atomically; Cancel preserves the previous result. Reopening restores the exact drawing. Each string has one active result, with a new photo replacing it only after Save. Removing its photo preserves numeric values as manual entries.

Provide zoom/pan/Fit for sheets with several targets, undo, draggable anchors/edge and click/tap/nudge alternatives. The owner reported attaching a six-target sheet to several strings; each string selects its own target independently.

Expose the three values through the generic scalar/chart/table pipeline and existing readonly custom-function context. Add **Profile → Display → Show group size on string cards**, off by default, and include cm/in in the profile unit-system labels. The setting, annotations and photos stay in local storage and workspace backups.

## Boundaries

No automatic hole detection, perspective correction, statistical-center inference, cloud image upload, ammunition optimization or weapon configuration is included. The original photo and imported measurements are unchanged. Optional annotation/profile fields need no database or backup version migration. Pages deployment remains separate.

See [technical contract](../TARGET_MEASUREMENTS.md) and [user help](../../help/targets.md).
