[Help home](README.md) / Profile

# Make the workspace yours

Open the profile icon at the top right. There is no separate VelociTrack account.

## General

- **Nickname:** a local display name.
- **Units:** Imperial (ft/s, ft, in, °F) or Metric (m/s, m, cm, °C). Target sizes and offsets use in/cm; recorded distances use ft/m. Select **Save profile**.
- **Allow sign-in to be remembered on this device:** keep connected sessions between visits. Leave off on shared browser profiles. Passwords are never saved.
- **Refresh all enabled sources after startup:** refresh signed-in sources when the app opens. File sources wait for files.

Units update charts, tooltips, tables, and applicable custom fields. Originals stay unchanged. Fixed grams/grains fields keep their unit; G1/G7 are unchanged. **Source units** means no unverified physical conversion has been assigned.

## Display

- **Projectile weight:** append original mass, such as `Example projectile 150.0grs` or `Example projectile 2.00g`.
- **Theme:** Light, Dark, or Auto to follow your operating system.
- **Show group size on string cards:** display each string's saved target diameter in cm/in. Starts off; missing values stay hidden and zero is shown. See [Target measurements](targets.md).
- **Show Caldwell string notes on cards:** show the original imported string note. Enabled by default, including older profiles; blank notes stay hidden. This does not change your separate local notes.

Choose **Save display**. These choices are saved and included in backups.

Readonly measurements use consistent [decimal places](../docs/DISPLAY_FORMAT.md),
including trailing zeroes. This does not round your stored measurements or edits.

Labels use each string's recorded projectile snapshot. If a Caldwell catalog edit does not update an old string's weight, assign the updated projectile to that string in Caldwell and refresh again.

## Report

**String details, Target, String statistics, Chart and Shot records are all enabled by default.** Choose sections and select **Save report preferences**. These local choices are included in backups. See [PDF reports](reports.md) for framing and Save as behavior.

## Custom fields and tags

The other tabs manage reusable fields and colored tags. See [Add context](strings.md).

> [!TIP]
> For the local installation, keep using `http://127.0.0.1:4180/velocitrack/` in the same browser profile. Another address or browser opens different local data and sessions.

**Related:** [Backup](backup.md) · [Sign-in help](troubleshooting.md)
