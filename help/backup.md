[Help home](README.md) / Backup and restore

# Take your workspace with you

## Save a backup

Open **Backup / Restore** and select **Download backup ZIP**.

The ZIP includes measurements and originals, string details, custom fields, tags, invalid-shot marks, photos, filters, and saved display/chart/table preferences. It contains organized JSON and original images. Passwords and remembered sign-in sessions are not included.

Keep it somewhere private: the ZIP is not encrypted. Save a fresh backup after adding important notes or photos.

## Restore a workspace

1. Back up the current workspace first. Finish imports and close other VelociTrack tabs.
2. In **Backup / Restore**, choose a backup ZIP.
3. Review counts, check the replacement confirmation, and select **Replace workspace from backup**.

Restore replaces the whole local workspace; it does not merge or change Caldwell cloud data. An invalid archive or failed database write leaves the workspace intact. Sign-in cleanup may already have happened, so sign in before your next online refresh.

Archives are limited to 256 MiB. If storage is full, keep both backups and use a browser profile with enough space. Avoid clearing current site data to troubleshoot.

## Offline is not a backup

The cached app and imported measurements work offline after initial setup. Browser cleanup or storage eviction can still remove your data.

Your workspace belongs to this exact browser profile and address. Another browser, hostname, or port opens a separate workspace. Use a ZIP to move data deliberately.

**Related:** [Privacy](privacy.md) · [Troubleshooting](troubleshooting.md)
