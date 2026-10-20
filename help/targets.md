[Help home](README.md) / Target measurements

# Measure a target

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
3. Choose a tool and draw:
   - **Group size:** press at the desired circle center and drag to its edge.
   - **Group size + offset:** press at POA and drag to the desired circle center. A rectangle joins the two points; a circle appears around the center.
4. Drag the center to move the circle, its edge to resize it, or the POA cross to move the aiming point.
5. Enter one known, nonzero dimension next to an arrow or in **Dimensions**. Press Enter or leave the field to apply it. This sets the image scale and calculates the other dimensions represented by the drawing.
6. Select **Save measurement** to save the values and drawing together. **Cancel**, the close button and Escape leave the previous saved measurement unchanged.

The diagonal double arrow measures the circle's diameter. The other arrows measure horizontal and vertical offsets. Dimensions hide during a drag and return when it ends.

### Calibration and manual overrides

Use an actual known dimension to establish scale; photo pixels alone do not establish centimeters or inches. An offset used for calibration must have the same sign as the drawing. A zero offset cannot calibrate the photo.

If a known value was entered before opening the photo, draw the geometry, then choose **Use this value for scale** beside it. Existing numeric values do not silently calibrate a different photo.

Once calibrated, subsequent numeric edits are marked **Manual**. They override individual values without moving the drawing or changing its scale. The next geometry edit recalculates the dimensions represented by that drawing and replaces their overrides. A circle without POA preserves separately entered offsets.

Use **Recalibrate** to explicitly change the scale from a new known dimension. **Undo** restores the last completed gesture or numeric edit. **Clear drawing** removes the draft geometry and scale while retaining its numbers as manual values.

## Several targets on one photo

Each string has its own active measurement. Attach the same sheet to the relevant strings and place each string's circle on its corresponding target. The original image stays unchanged.

Use **Zoom +**, **Zoom −**, **Pan image** and **Fit image** to reach a small target. Zooming or panning changes only the view. It never changes measured values.

**Use clicks / taps** provides an alternative to dragging: choose two points for a new drawing, or one point for **Place center**, **Resize circle** or **Place POA**. The arrow buttons provide fine adjustments. With the canvas focused, arrow keys move the selected handle by one original-image pixel; Shift moves ten.

Reopening the active photo restores its saved circle, POA and calibration. A string currently has **one active measurement**. Saving a measurement on a different photo replaces the previous active drawing; cancelling keeps it. Removing the active photo preserves its numeric values as manual entries but removes the drawing and image reference.

## Show the result

- **Profile → Display → Show group size on string cards** displays saved group size beside each string. It starts off; strings without a value stay blank.
- In **By shot** charts, choose **String horizontal offset**, **String vertical offset** or **String group size**. These string-level values repeat for its shots; they are not individual shot locations.
- Enable the same quantities in table **Columns**, or view them in **String info**.
- Measurements, photos and the display preference are included in a [workspace backup](backup.md).

Use an upright, front-facing photo. This editor applies one uniform scale; it does not correct perspective, detect holes, calculate a statistical center or measure center-to-center extreme spread automatically. Group size is the diameter of your manually positioned circle.

**Related:** [String details](strings.md) · [Display preferences](profile.md) · [Technical contract](../docs/TARGET_MEASUREMENTS.md)
