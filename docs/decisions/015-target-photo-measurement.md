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

## Interaction refinement — 0.12.1

The owner reported overlapping dimension inputs and confusing pan controls, and requested a clearer single-row toolbar. Replace the Tool dropdown with two measurement buttons, remove Action and click/tap mode, and use labeled icons for Undo, Clear drawing, Pan image, zoom and Fit. Handles are edited directly.

Use Ctrl-drag/Ctrl-wheel on desktop and two-finger pan/pinch on touch devices. Navigating must preserve calibration, geometry, manual overrides and undo history, including the transition from one touch to two. Numeric inputs stay in the fixed panel, with color-matched connectors on hover/focus rather than floating input boxes over the photo. Keep keyboard fine adjustment and a hand tool as navigation alternatives. The underlying storage contract is unchanged.
