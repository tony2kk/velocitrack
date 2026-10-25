[Help home](README.md) / Backup and restore

# Take your workspace with you

## Save a backup

Open the **archive icon (Backup / Restore)** in Tools and select **Download backup ZIP**.

The ZIP includes measurements and originals, string details, custom fields, tags, invalid-shot marks, photos, filters, and saved display/chart/table preferences. It contains organized JSON and original images. Passwords and remembered sign-in sessions are not included.

Column visibility and the complete order (including hidden columns) are both included.
Target measurements include their numeric values, calibration, drawing geometry and report crop. Report section preferences are included; older backups without them use the all-enabled default.
Calculated velocity/drop choices and forecast distance are saved; the curves are
recomputed from restored measurements. Temporary shot selection, hover and chart
zoom are session state and are not included.

Keep it somewhere private: the ZIP is not encrypted. Save a fresh backup after adding important notes or photos.

## Restore a workspace

1. Back up the current workspace first. Finish imports and close other VelociTrack tabs.
2. In **Backup / Restore**, choose a backup ZIP.
3. Review **Compatibility**, conversions and record counts, check the replacement confirmation, and select **Replace workspace from backup**.

Restore replaces the whole local workspace; it does not merge or change Caldwell cloud data. An invalid archive or failed database write leaves the workspace intact. Sign-in cleanup may already have happened, so sign in before your next online refresh.

## Versions and compatibility

New backups record the creating app version and revision, archive format and data
version. The preview shows the backup and current app versions, whether conversion
is needed, and each change that will be applied. Inspecting a ZIP changes neither
the current workspace nor the original ZIP.

Older version-one backups remain supported. They did not record the app version;
the preview displays **Not recorded (legacy backup)**. Missing optional settings
receive explicit defaults, listed before restore. Existing choices are retained.
Historical Shot sorting and local G1/G7 curve choices are converted to their
current equivalents. Without a separate hidden-column order, the saved visible
order is retained and other columns follow it.

A different app version does not necessarily mean incompatible data. A backup from
a newer app can be restored when its data format and all records are supported.
Unknown newer formats or unsupported fields stop recovery without changing your
workspace; update the app and retry. No records are silently skipped to make it fit.
New version-two archives require VelociTrack 0.21 or later; keep your original older
ZIP if you also need to use an older app.

Measurements, notes and original photo bytes retain their stored precision. Reports
and calculated curves use the current app, so derived output can differ between
releases. Custom curve code is not included in a backup; unavailable saved functions
are listed so you can choose an available quantity after restore.

Derived string **Air density** and **Sound speed** are backed up with their source
weather. Restore preserves their values; it does not recalculate them. Older
archives may lack them. Refresh/reimport to calculate them from complete weather
inputs; see [atmosphere attributes](atmosphere.md).

Archives are limited to 256 MiB. If storage is full, keep both backups and use a browser profile with enough space. Avoid clearing current site data to troubleshoot.

## Offline is not a backup

The cached app and imported measurements work offline after initial setup. Browser cleanup or storage eviction can still remove your data.

Your workspace belongs to this exact browser profile and address. Another browser, hostname, or port opens a separate workspace. Use a ZIP to move data deliberately.

**Related:** [Privacy](privacy.md) · [Troubleshooting](troubleshooting.md)
