[Help home](README.md) / PDF reports

# Save or print a range report

Select strings and shots, arrange the chart and its zoom, then choose the **PDF document icon** in **Tools**. The report captures the selection at that moment and is generated entirely on this device.

Once ready, edit the suggested file name and choose **Save as…**. Supported browsers open a native file dialog; other browsers download the file using your chosen name. **Open / print PDF** opens the finished document for preview, printing or saving through the browser's PDF viewer. Canceling Save as leaves the report ready to save again.

The suggested name is `VelociTrack_YYYY-MM-DD_String-name.pdf`, using the earliest selected string date. Multiple strings use `N-strings`; a missing date uses the generation date. The footer records generation time, app version, source revision and page number.

## Choose sections

Open **Profile → Report**. **Every section is enabled by default.** Save changes with **Save report preferences**.

- **String details:** date and place, firearm, projectile, weather, notes, local notes, tags and custom values. Missing details are omitted. Pressure is explicitly labeled as sea-level pressure.
- **Target:** the active photo and its report crop, or the complete photo if no crop is saved. Saved group geometry appears over the photo, with group size and offsets below it. Without an active photo, the first attached photo is used.
- **String statistics:** included valid muzzle readings, mean, minimum, maximum, sample SD and extreme spread, recalculated per string from the current shot selection.
- **Chart:** the displayed chart with current horizontal/vertical zoom, units, colors, legend and model descriptions. A light background is used for printing. String info and point-table views produce a no-chart note; switch to a chart view first if you want a graph.
- **Shot records:** selected valid shots in current table sort order, with visible columns in their saved order. All selected rows are included regardless of screen pagination. Source-excluded and locally invalid shots are omitted.

Details and targets use portrait A4. Charts use landscape A4, as do tables with more than five columns. More than eight columns are split into successive bands with a repeated Row number for matching records. Headings repeat on continuation pages. Long notes and multiple strings may need extra pages.

## Frame a target

1. Open the string's pencil button, attach a photo if needed, and choose **Measure photo**.
2. Enable **Use report crop**, or select the crop icon in the one-row toolbar. A square starts around the measured group, or at the image center.
3. Drag inside the square to move it; drag its bottom-right corner to resize it. It stays inside the original photo. Arrow keys fine-tune the active handle; Shift makes larger steps. Ctrl + drag pans and Ctrl + wheel zooms; two fingers pan/pinch on touch screens.
4. Choose **Save measurement**. A crop can be saved without drawing or calibrating a group. Reopen the editor to adjust it, or disable Use report crop to use the full photo.

Framing does not change group size, offsets, calibration or the original image. Report preferences and crop geometry are included in [workspace backups](backup.md).

Reports include selected notes and photos, so choose where to save or share them. They never include credentials or sign-in sessions. A PDF archives the selected view; it is not a recoverable workspace backup. The bundled report engine and fonts are cached with the PWA for offline generation after the updated application finishes installing.

**Related:** [Target measurements](targets.md) · [Chart controls](analysis.md) · [Profile](profile.md)
