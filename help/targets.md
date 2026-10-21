[Help home](README.md) / Target measurements

# Measure a target

For PDF framing, enable **Use report crop** in the photo editor. Drag the square or its bottom-right corner, then save. Framing is independent of measurement and does not alter the original photo. See [PDF reports](reports.md).

Open a string's **pencil** button. **Target measurement** contains three optional values:

| Value | Meaning |
| --- | --- |
| Horizontal offset | Circle center relative to the point of aim (POA). Positive is right; negative is left. |
| Vertical offset | Circle center relative to POA. Positive is up; negative is down. |
| Group size | Diameter of the circle you place around the group. |

**Profile → General → Units** selects **cm** in Metric or **in** in Imperial. Recorded distances still use m/ft. Switching units converts the display without changing the saved physical measurement. Empty means unknown; zero is a valid value.

## Enter values directly

Type any known values and select **Save target values**. No photo is required. Clear a field and save to remove that value. **Cancel edits** discards pending numeric changes.

Target values save separately from the custom fields and tags saved by **Save details**.

## Measure a photo

1. Add a photo in the string's **Photos** section, or use one already attached.
2. Choose **Target photo**, then **Measure photo**.
3. Choose one of the two tool buttons and draw. New drawings default to **Group + offset**; reopening preserves the saved drawing's tool:
   - **Group size:** press at the desired circle center and drag to its edge.
   - **Group size + offset:** press at POA and drag to the desired circle center. A rectangle joins the two points; a circle appears around the center.
4. Drag the center to move the circle, its edge to resize it, or the POA cross to move the aiming point.
5. Enter one known, nonzero dimension in the fixed **Dimensions** panel. Press Enter or leave the field to apply it. This sets the image scale and calculates the other dimensions represented by the drawing.
6. Select **Save measurement** to save the values and drawing together. **Cancel**, the close button and Escape leave the previous saved measurement unchanged.

The diagonal double arrow measures the circle's diameter. The other arrows measure horizontal and vertical offsets. They hide during a drawing drag and return when it ends. Numeric fields stay outside the image. Hover or focus a field to highlight its arrow and show a matching colored connector to the photo. A dimension outside the visible image has no connector until you pan or zoom it back into view.

### Calibration and manual overrides

Use an actual known dimension to establish scale; photo pixels alone do not establish centimeters or inches. An offset used for calibration must have the same sign as the drawing. A zero offset cannot calibrate the photo.

If a known value was entered before opening the photo, draw the geometry, then choose **Use this value for scale** beside it. Existing numeric values do not silently calibrate a different photo.

**Link dimensions to drawing** starts enabled. Changing any represented nonzero H, V or group-size value updates the scale and immediately recalculates the other dimensions. The drawing stays in place. Signs must agree with the geometry; a zero or empty value cannot define a scale.

To enter independent values after calibration, turn off **Link dimensions to drawing**. Those edits are marked **Manual** and do not change the scale. A later geometry edit recalculates represented dimensions and replaces their overrides. A circle without POA keeps separately entered H/V offsets independent. Re-enabling the link affects the next numeric edit; it does not silently rewrite current values.

The **Undo** arrow restores the last completed gesture or numeric edit. The **trash** button (**Clear drawing**) removes the draft geometry and scale while retaining its numbers as manual values.

## Several targets on one photo

Each string has its own active measurement. Attach the same sheet to the relevant strings and place each string's circle on its corresponding target. The original image stays unchanged.

The toolbar stays in one row. The two measurement buttons select circle-only or circle-plus-offset drawing. The remaining icons are Undo, Clear drawing, Pan image, Zoom in, Zoom out and Fit image. Hover an icon for its name and shortcut; on narrow screens the row can scroll horizontally.

**Mouse:** hold **Ctrl and drag** to pan. Use **Ctrl + mouse wheel** over the photo to zoom around the pointer. Plain wheel scrolling keeps its normal behavior. The **hand** button also enables drag-to-pan without holding Ctrl. Choose a measurement button to return to drawing.

**Touch:** use **two fingers** to pan and spread/pinch them to zoom. One finger draws or drags a handle. Adding a second finger cancels the provisional drawing gesture and starts navigation; the remaining finger cannot accidentally draw when the other lifts.

The magnifier buttons zoom in/out; **Fit image** restores the complete photo and its position. Navigation never changes measurement values, calibration, or undo history. Zoom is bounded between 100% and 1200%, and panning stays within the photo.

Drag the circle center, edge or POA directly to adjust it. With the canvas focused, arrow keys nudge the last selected handle by one original-image pixel; Shift moves ten. Ctrl + arrow keys pan, as do plain arrows while the hand tool is active. The old Action dropdown, click/tap mode and on-screen arrow buttons have been removed.

Reopening the active photo restores its saved circle, POA and calibration. A string currently has **one active measurement**. Saving a measurement on a different photo replaces the previous active drawing; cancelling keeps it. Removing the active photo preserves its numeric values as manual entries but removes the drawing and image reference.

## Show the result

- **Profile → Display → Show group size on string cards** displays saved group size beside each string. It starts off; strings without a value stay blank.
- In **By shot** charts, choose **String horizontal offset**, **String vertical offset** or **String group size**. These string-level values repeat for its shots; they are not individual shot locations.
- Enable the same quantities in table **Columns**, or view them in **String info**.
- Measurements, photos and the display preference are included in a [workspace backup](backup.md).

Use an upright, front-facing photo. This editor applies one uniform scale; it does not correct perspective, detect holes, calculate a statistical center or measure center-to-center extreme spread automatically. Group size is the diameter of your manually positioned circle.

**Related:** [String details](strings.md) · [Display preferences](profile.md) · [Technical contract](../docs/TARGET_MEASUREMENTS.md)
