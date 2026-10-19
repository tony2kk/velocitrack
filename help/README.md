# VelociTrack help

VelociTrack is a local workspace for recorded measurements. It is an unofficial community project, independent of Caldwell and American Outdoor Brands. Your workspace, settings and imported measurements stay in your browser.

- [Sources](#sources)
- [Filters and selection](#filters-and-selection)
- [Analysis and table columns](#analysis-and-table-columns)
- [Custom fields, tags and photos](#custom-fields-tags-and-photos)
- [Backup and restore](#backup-and-restore)
- [Profile and offline use](#profile-and-offline-use)
- [Measurement interpretation](#measurement-interpretation)

## Sources

Open **Sources**, choose **Source type**, give the source a name and select **Add source**. Each source has independent measurements, account/session state and catalog links. Source type is fixed after creation; create another source to use a different type.

**Refresh** includes all sources with **Include in Refresh** enabled, regardless of display filters. Caldwell sources refresh online when signed in. JSON / text sources ask you to select their latest files. You can close Sources while a connected source is refreshing; its progress remains visible in the toolbar.

While data is loading, a centered progress dialog shows **Loading <source name>...** with an activity indicator. It follows each active source and closes when loading finishes, including failures. **Continue in background** closes the dialog without cancelling the import. After a toolbar refresh, any sources requiring a file, sign-in or error resolution appear in Refresh sources. Import notifications disappear automatically after **10 seconds**, or immediately with their dismiss button.

Refresh updates matching records without adding duplicates. Measurements absent from a later import are retained. One source's failed refresh does not undo another source's successful refresh. A failed download, malformed input or missing catalog entry leaves previously imported measurements intact.

Import notifications count **new series and new shots only**. A repeat import with no added records says **No new data detected**. Existing records can still be updated. A toolbar/startup refresh combines successful sources into one result and notes sources that still need attention.

### Caldwell

This source signs in directly with Firebase for your Caldwell account and reads your own series and shots. There is no VelociTrack server or credential proxy, and the connector does not change or delete Caldwell cloud data.

1. Add a source of type **Caldwell**.
2. The application prepares the connection automatically. You do not need a Firebase project number, API key or configuration file.
3. Enter your **Caldwell email** and **Password**, then select **Sign in and import**.
4. After a successful import, select series in the workspace. Use **Refresh** or the source's **Refresh now** to fetch current data.
5. **Sign out** clears this source's SDK session; already imported measurements remain available locally.

Technical connection settings identify the Caldwell service, not an individual user. They are prepared by the installation and saved in the local browser profile for reuse. Your email/password identify your own account. You do not create a separate Firebase project.

Local and published installations prepare sign-in from the same standard Caldwell source configuration. It contains only the common service project ID and Firebase client API key, which are public application metadata, not your account credentials. Existing browser settings are reused. You enter only your Caldwell email/password; no configuration file selection is needed. A first-time setup needs an internet connection on the published site.

The first signed-in account binds the source to that account. To import a different account, create another source; this prevents measurements from two accounts being mixed accidentally. Source settings are not a credential export or a workspace backup.

Sign-in lasts until the page closes or reloads by default. To keep the SDK session between visits, explicitly enable **Allow sign-in to be remembered on this device** in your local profile. Turning it off moves sessions back to memory. VelociTrack never saves passwords. Remembered sessions contain authentication tokens in browser storage; use the preference only on a device/browser profile you trust.

#### Connection status and troubleshooting

| Status or problem | Action |
| --- | --- |
| Preparing sign-in | Wait briefly for automatic setup. No file selection is required. |
| Sign-in unavailable in this installation | Select Try again; if it persists, contact the app maintainer. Your existing measurements remain intact. |
| Sign-in needed | Enter your own account credentials. |
| Sign-in failed | Check email/password; no account registration or password reset is performed here. |
| Browser connection not allowed | Check supported web configuration and service access with the provider. VelociTrack stops on denial. |
| Service could not be reached | Check connectivity and retry later. Imported data is still available offline. |
| Different account | Sign in with the source's original account or create another source. |
| Missing catalog value | Add the missing name in Local catalogs, or enable automatic catalog updates, then retry. |
| Unsupported format or size limit | No partial import is committed. Keep the existing local workspace and report the error category without private exports or credentials. |

The connector reads `Users/{authenticated uid}/Strings/{series id}/Shots`. It uses pagination and the same validation/atomic storage rules as file imports. Limits are 10,000 series, 50,000 shots, 20 MB of normalized records and the point limits described below. This is a cumulative refresh, not a live subscription or deletion mirror.

Browser-only authentication and reads were verified on loopback with the owner's account. The owner also confirmed successful import on the published `0.2.1` Pages app on 2026-10-18. This result does not guarantee future service availability or provider support. This is an unofficial integration; see the [verification record](../docs/VERIFICATION.md) and [terms review](../docs/TERMS_REVIEW.md). No restrictions, App Check requirements or service rules are bypassed.

### JSON / text

Choose **JSON / text** for local files. Nothing from these files is uploaded. Select either:

- One combined JSON object with `strings` and `shots` arrays.
- Two files: one array of series and one array of shots, in JSON or CSV form. Select both together; their order does not matter.

Extensions `.json`, `.csv` and `.txt` are supported. A `.txt` file must contain the same JSON or CSV structure; arbitrary prose, column-free text and NDJSON are not supported. Files use UTF-8, with an optional BOM. Do not select the separate points export: distance/velocity arrays are already in the shots.

For a non-empty pair, content identifies each collection. Empty paired arrays/files need names containing `strings` and `shots` respectively. A combined object with both empty arrays is also valid. At most two files and 20 MB combined are accepted.

#### Combined JSON example

This example is invented, not an actual account export. The import contract uses ft/s for velocities and ft for distances, independent of the display units chosen in your profile. Do not pre-convert exports to metric.

```json
{
  "strings": [
    {
      "_documentId": "example-series",
      "name": "Example session",
      "startTimestamp": "2026-01-01T10:00:00Z",
      "firearm": { "id": "example-firearm", "name": "Example firearm" },
      "projectile": { "id": "example-projectile", "name": "Example projectile" }
    }
  ],
  "shots": [
    {
      "_documentId": "example-shot",
      "_stringId": "example-series",
      "number": 1,
      "muzzleVelocity": 310,
      "ballisticCoefficientG1": 0.111,
      "ballisticCoefficientG7": 0.055,
      "distances": [0, 10, 20, 0],
      "velocities": [310, 300, 292, 0],
      "unit": "unknown",
      "exclude": false
    }
  ]
}
```

#### Series fields

| Field | Format and behavior |
| --- | --- |
| `_documentId` | Required stable string or numeric ID. `id`, then `stringId`, are accepted aliases when earlier fields are absent. |
| `name` | Optional string/number. Missing or empty becomes `Untitled series`. |
| `startTimestamp` | Optional Unix timestamp in seconds, recognizable Unix milliseconds (at least 100,000,000,000), or ISO date-time. Accepted range: 1970 through the start of 2100. Missing means date unavailable. Include a timezone in ISO values. |
| `firearm` | Required object with `name`; optional `id`. Missing ID uses the name as the source reference. |
| `projectile` | Same shape as `firearm`. |

Names and IDs must be non-empty and at most 500 characters. The date filter uses each series' start time, not the import time.

#### Shot fields

| Field | Format and behavior |
| --- | --- |
| `_documentId` | Required stable ID; `id` is an alias. Unique within its series. |
| `_stringId` | Required parent series ID; `stringId` is an alias. Must match a series in this import. |
| `number` | Optional finite number; `stringNumber` is an alias. Missing uses input row position plus one. |
| `muzzleVelocity` | Optional finite number or numeric string; blank/null means unavailable. |
| `ballisticCoefficientG1`, `ballisticCoefficientG7` | Optional finite numbers or numeric strings; blank/null means unavailable. |
| `distances`, `velocities` | Arrays of finite numbers, paired by index. Missing/blank/null arrays become empty. Empty/null elements inside an array are rejected. |
| `unit` | Optional raw provider code; missing becomes `unknown`. Retained as metadata, not used as a display-unit selector. |
| `exclude` | Optional boolean. Also accepts `1`, `0`, and strings `true`, `false`, `True`, `False`, `1`, `0`. Missing means false. |

Each shot must contain at least `muzzleVelocity` or `velocities`, even if that value is unavailable. Duplicate IDs, orphan shots and invalid numeric fields reject the import. Each distance/velocity array may have up to 5,000 elements. The total point limit is 1,000,000, counting the longer array in each shot. Unequal array lengths are preserved and reported as data-quality issues.

Unknown fields are preserved in each record's local raw data. Original array order is retained. A paired `[0, 0]` sample is omitted from charts as padding; `[0, positive velocity]` remains a valid measured point.

#### CSV format

Use a header row with the same field names as JSON, one record per row. Nested objects and arrays are JSON inside CSV cells. Quote such cells and double their inner quotation marks. For example, a `firearm` cell is:

```text
"{""id"":""example-firearm"",""name"":""Example firearm""}"
```

An array cell can be `"[0,10,20]"`. Separate series and shots files are required for CSV. Standard comma-separated output is recommended. Duplicate headers, malformed quoting and inconsistent column counts are rejected. Additional point-by-point CSV files are not imported.

### Catalogs and removing sources

**Automatically update catalogs** creates missing firearm/projectile names and updates source-managed names. With it off, an unknown entry fails the whole import with an error such as `Value "Example firearm" is not in the firearms catalog.` Open **Local catalogs** beside Refresh, add the name and retry.

Known source identifiers take precedence. A unique, unlinked manual catalog name can resolve a new reference. Existing entries from different sources are not automatically merged. Manual renames survive refresh; mapping and merging will be added later.

You can rename a source or exclude it from all-source Refresh. **Remove source and data** signs out a connected source and permanently removes its local measurements, annotations and photos after confirmation. Catalog names remain. Nothing is deleted from Caldwell. Removal cannot be undone within VelociTrack.

## Filters and selection

Select one or more sources, firearms, projectiles and tags. Choices inside a filter combine as alternatives; different filters combine together. An empty filter means all. Date ranges include entire local days; relative week/month windows remain relative. Filters save automatically in the local profile and return on your next visit.

Select one or more series on the left. The chart appears above the shot table. All shots start checked; uncheck individual shots in the table to omit them from charts and summary statistics. Unchecked rows remain visible as **Not selected**, so they can be selected again. A source-excluded shot can be selected for inspection in the table but remains excluded from charts/statistics.

Shot choices remain in page memory while you deselect/reselect series, change filters or refresh data. Newly imported shots start checked. Reloading or closing the page resets these temporary choices. No provider record or persisted exclusion flag changes. A series hidden by a filter leaves the active comparison.

Hover over a shot in the table or chart to highlight it in the other view. Keyboard focus on a shot checkbox/table row also highlights it. A hovered shot on a later table page is brought into view. Unchecked shots remain in the table but do not enter chart/statistical analysis, and the existing 100-trace chart limit still applies.

Hover or tap a measured chart point to see its series, shot number, original sample number, distance and velocity in your selected units. Table and tooltip readings show up to six decimal places; stored values remain unchanged. The tooltip reports an actual sample, never an interpolated value between points.

Use the bottom slider to zoom the distance/shot-number axis and the right slider to zoom velocity. Drag the range or either end handle. Both work in either chart mode. Zoom affects the visible range, not selected shots or summary statistics.

## Analysis and table columns

Choose **Analysis** between Filters and Tools:

- **Simple chart** shows one quantity. **By shot** combines selected strings into one sequence, ordered by string start time and then shot number/identity. **Over distance** retains individual measured shot traces.
- **Dual chart** uses the same sequence for two chosen quantities, with separate labeled Y axes. Missing readings leave gaps and do not shift the other quantity's X positions. Over distance has only recorded velocity; the second quantity is unavailable there. Choose By shot for two quantities.
- **String compare** plots a separate curve per string. By shot uses each string's own shot numbers. Over distance shows each string's mean velocity at observed distances, with linear interpolation inside each shot's measured range and no extrapolation. The tooltip reports how many shots contribute at that distance. Disconnected measured ranges remain disconnected. For very large grids, at most 5,000 observed-distance positions are rendered per string; all eligible selected shots contribute to those means.
- **String info** shows the selected string's dates, firearm/projectile, source notes, recorded conditions, original source statistics, tags and custom values. If several strings are selected, choose one in the String control. Original provider metadata and shot notes/times are expandable. **Edit details / Photos** opens its local context and photos. Zero-shot strings can still show their metadata.

Each chart has an independent saved horizontal-axis and quantity choice. Available scalar choices include velocity, **G1 (Caldwell)**, **G7 (Caldwell)**, known projectile mass, recorded weather/conditions, original Caldwell string statistics and numeric/dimensional custom fields. String-level values are inherited by each shot. Only quantities with usable readings are offered. A temporarily unavailable saved quantity is retained with a no-readings label; selecting another string does not silently overwrite it. Changing to Over distance replaces an incompatible quantity with Velocity and saves that choice. Technical identifiers and unit/type enum codes are metadata, not plotted physical quantities.

Velocity/distance/temperature display units follow the local profile; the stored originals are preserved. G1/G7 stay unchanged. A quantity labeled **source units** has not been assigned an unverified physical-unit conversion. Source statistics are displayed as provided and may differ from the workspace summary, which uses the current selected, non-excluded shots.

Comparison colors alternate strongly separated hue families, starting blue/orange and then purple/magenta. The dark theme uses brighter variants. The full workspace's stable string-ID ordering assigns colors, so changing the active selection does not recolor the remaining strings. Symbols and line dashes provide additional distinctions when colors repeat. Importing new strings can change the ordering; colors themselves are not user preferences.

**Columns** controls every data column in the shot table. Select columns, drag selected rows to reorder, or use their arrow buttons. These edits save immediately, survive restart and round-trip through ZIP backups. The Analyze checkbox is fixed at the start. Existing custom-column/tag preferences are retained until the first edit of the new ordered-column configuration.

## Custom fields, tags and photos

A series is the imported string. Open **Profile → Custom fields** to define named optional fields shared across the workspace. Add, edit, reorder with the arrow buttons, or remove definitions. These changes save immediately, independently of **Save profile** in General.

| Type | Entry and display |
| --- | --- |
| Short text | One line, up to 100 characters |
| Note | Long multiline text |
| Number | A finite decimal number, without units; negative values allowed |
| Weight | Nonnegative; gr in Imperial, g in Metric |
| Speed | Nonnegative; ft/s in Imperial, m/s in Metric |
| Distance | Nonnegative; ft in Imperial, m in Metric |

Names must be unique within custom fields (1–100 characters). There is no fixed field-count limit. Empty is different from zero. Dimensional values follow General's saved unit preference; changing units preserves the physical value. A field with values cannot change type. Renaming retains values. Removing a field requires confirmation and removes its values from every series.

Open **Profile → Tags** to create named colored tags. Names must be unique within tags; you may reuse an existing name in custom fields. Use **Details & photos** under a series to assign multiple tags and enter custom values, then **Save details**. These values belong to the series and survive import/refresh. Tag changes in Profile save immediately. Removing a tag requires confirmation, removes its assignments and clears it from saved filters; measurements remain.

Use **Columns** above the shot table to choose standard readings, source metadata, custom fields and Tags. Drag selected rows to reorder columns, or use the Up/Down buttons for keyboard/touch input. Selection and order persist in the profile. The Analyze checkbox stays at the start of each row. Every shot row displays its parent series' values; edit those values in series details. **Tags** filtering matches at least one selected tag, together with all other filter groups.

The **Photos** section in series details accepts multiple JPEG, PNG or WebP files, up to 20 MiB and 60 megapixels each. Original bytes remain on this device. Photo additions and caption saves take effect immediately, even if you close without saving field edits. Click a thumbnail to open full size in a new tab. Removing a photo requires confirmation. Earlier successful additions remain if a later file in a batch fails. Target/group analysis is planned separately and is not included yet.

## Backup and restore

Open **Backup / Restore** in the toolbar. **Download backup ZIP** saves all measurements (including raw records), catalogs, source settings/account bindings, annotations, custom-field definitions/values, tags, profile/filter/column preferences and original photos. The archive contains **manifest.json**, structured **data/*.json** files and **attachments/** images. It never contains Firebase SDK authentication sessions or passwords. The ZIP is not encrypted and can contain private data: store it securely.

To restore:

1. Download and keep a backup of the current workspace first. Close other VelociTrack tabs and wait for active imports to finish.
2. Choose a VelociTrack backup ZIP. The app validates the version, contents, checksums and references without changing the workspace.
3. Review the displayed counts, then check the explicit replacement confirmation.
4. Select **Replace workspace from backup**. This replaces the entire local workspace; it does not merge records. It does not change Caldwell cloud data.
5. Sign in again when you next want to refresh a connected source. File sources retain their measurements and request files for the next refresh.

A failed validation or database write does not replace the workspace. Sign-in cleanup happens before the database transaction and may still sign you out if a later write fails. On a quota error, retain both backups and use a browser profile with enough storage; do not clear the existing workspace as a troubleshooting step.

Archives and expanded content are limited to 256 MiB; at most 10,000 entries and a 2 MiB manifest are accepted. Restore requires a modern browser supporting Web Locks. Approximate browser storage usage/quota is shown when available. Photos consume local storage and increase backup sizes. Offline caching alone is not a backup.

## Profile and offline use

For troubleshooting, include the version shown in the footer, for example `v0.1.0 · abc1234`. It identifies the application currently loaded in the browser, including offline use. A `-dirty` suffix means a local build includes uncommitted changes; `local` means its source commit is unavailable. After accepting an app update, the footer identifies the newly loaded build.

The profile icon opens your local nickname and startup/sign-in preferences. There is no VelociTrack server account. **Refresh all enabled sources after startup** refreshes signed-in online sources and marks file sources as awaiting files. Missing sign-in waits for you to open Sources.

**Units** selects **Imperial — ft/s, ft, °F** (default) or **Metric — m/s, m, °C**. After **Save profile**, the workspace updates its chart axes/points/tooltips, shot table, summary statistics and dimensional custom fields. The choice survives reopening the app. Original measurements are never converted in storage. Recorded temperatures are also converted in String info and scalar charts. Other weather dimensions keep explicit source-unit labels until their provider semantics are confirmed.

**Profile → Display** contains **Projectile weight** and **Theme**. Enable Projectile weight to append the mass in the original provider unit, such as `Example projectile 150grs` or `Example projectile 2g`. Each string uses its own recorded projectile snapshot, even if a shared catalog name is later edited. The supported recorded weightUnit codes are 0 = grains and 1 = grams; unrecognized codes are shown explicitly rather than guessed. Theme offers **Light**, **Dark** and **Auto — follow system**; Auto reacts to operating-system changes while the app is open. Save with **Save display**. These choices persist locally and are included in backups.

For local work, development and production preview both use `http://127.0.0.1:4180/velocitrack/` and fail rather than silently choosing another port. Use the same browser profile and exact address every time. Enable remembered sign-in once on a trusted device to retain the Caldwell session across reloads and browser restarts. Signing out, clearing site data, or provider session invalidation can require another login.

Measurements and settings belong to this browser profile and site address. Changing port, hostname or browser creates a separate workspace. Clearing site data or browser eviction can remove it. Keep your original exports and download regular workspace ZIP backups, especially after adding notes or photos.

After its assets are cached, the application shell and imported measurements work offline. Online refresh and GitHub-hosted help require a connection. Updates offer a reload prompt. Reloading ends in-memory sign-in, so finish an active import before accepting an update.

**Reload** activates the downloaded update and reopens this tab. Other open tabs keep their current view until you choose Reload there. Saved measurements and profile settings stay on the device. The button shows **Reloading…** while the update activates; if it cannot finish, a message lets you retry. If an older version's Reload button appears unresponsive, refresh the browser tab once to pick up the corrected update handling. Do not clear site data.

## Measurement interpretation

The supported raw input contract is ft/s, ft and °F, based on the owner's confirmation. Metric display multiplies velocities/distances by exactly 0.3048 and converts temperature using `(F − 32) × 5/9`. Mean, sample SD and extreme spread use the velocity conversion too. G1/G7 coefficients are not converted. Provider enum meanings, remaining atmospheric metadata and distance origin still need validation; no trajectory predictions are made.

Charts/statistics combine only one source/raw-unit group. Source-excluded shots remain in the table but do not enter charts or statistics. Positive finite muzzle readings contribute to the mean, sample standard deviation (`n − 1`) and extreme spread. Inspect **Data quality** for padding, invalid points and unequal arrays.
