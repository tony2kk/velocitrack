# VelociTrack help

VelociTrack is a local workspace for recorded measurements. It is an unofficial community project, independent of Caldwell and American Outdoor Brands. Your workspace, settings and imported measurements stay in your browser.

- [Sources](#sources)
- [Filters and selection](#filters-and-selection)
- [Profile and offline use](#profile-and-offline-use)
- [Measurement interpretation](#measurement-interpretation)

## Sources

Open **Sources**, choose **Source type**, give the source a name and select **Add source**. Each source has independent measurements, account/session state and catalog links. Source type is fixed after creation; create another source to use a different type.

**Refresh** includes all sources with **Include in Refresh** enabled, regardless of display filters. Caldwell sources refresh online when signed in. JSON / text sources ask you to select their latest files. You can close Sources while a connected source is refreshing; its progress remains visible in the toolbar.

Refresh updates matching records without adding duplicates. Measurements absent from a later import are retained. One source's failed refresh does not undo another source's successful refresh. A failed download, malformed input or missing catalog entry leaves previously imported measurements intact.

### Caldwell

This source signs in directly with Firebase for your Caldwell account and reads your own series and shots. There is no VelociTrack server or credential proxy, and the connector does not change or delete Caldwell cloud data.

1. Add a source of type **Caldwell**.
2. Select **Add connection settings** and choose a local JSON file containing configuration you are permitted to use with this service. This is a one-time setup for that source and browser.
3. Enter your **Caldwell email** and **Password**, then select **Sign in and import**.
4. After a successful import, select series in the workspace. Use **Refresh** or the source's **Refresh now** to fetch current data.
5. **Sign out** clears this source's SDK session; already imported measurements remain available locally.

Connection settings have this shape. The values below are placeholders, not a working configuration:

```json
{
  "projectId": "your-permitted-project-id",
  "apiKey": "your-permitted-web-api-key"
}
```

Use only configuration for the intended Caldwell service. No provider project, API key, password or token is distributed with VelociTrack. A new browser or source needs its own local setup. A separate Firebase project does not grant access to Caldwell data. The application accepts only the two connection fields above; custom server URLs, passwords and account IDs in this file are ignored. The file must be smaller than 16 KB.

The first signed-in account binds the source to that account. To import a different account, create another source; this prevents measurements from two accounts being mixed accidentally. Source settings are not a credential export or a workspace backup.

Sign-in lasts until the page closes or reloads by default. To keep the SDK session between visits, explicitly enable **Allow sign-in to be remembered on this device** in your local profile. Turning it off moves sessions back to memory. VelociTrack never saves passwords. Remembered sessions contain authentication tokens in browser storage; use the preference only on a device/browser profile you trust.

#### Connection status and troubleshooting

| Status or problem | Action |
| --- | --- |
| Setup needed | Add permitted connection settings to this source. |
| Sign-in needed | Enter your own account credentials. |
| Sign-in failed | Check email/password; no account registration or password reset is performed here. |
| Browser connection not allowed | Check supported web configuration and service access with the provider. VelociTrack stops on denial. |
| Service could not be reached | Check connectivity and retry later. Imported data is still available offline. |
| Different account | Sign in with the source's original account or create another source. |
| Missing catalog value | Add the missing name in Local catalogs, or enable automatic catalog updates, then retry. |
| Unsupported format or size limit | No partial import is committed. Keep the existing local workspace and report the error category without private exports or credentials. |

The connector reads `Users/{authenticated uid}/Strings/{series id}/Shots`. It uses pagination and the same validation/atomic storage rules as file imports. Limits are 10,000 series, 50,000 shots, 20 MB of normalized records and the point limits described below. This is a cumulative refresh, not a live subscription or deletion mirror.

Browser-only authentication and reads were verified on loopback with the owner's account. GitHub Pages origin compatibility, future service restrictions and third-party distribution permission are separate questions. This is not an official Caldwell API or a provider-supported integration. See the [feasibility record](../docs/FIREBASE_POC.md) and [terms review](../docs/TERMS_REVIEW.md). No restrictions, App Check requirements or service rules are bypassed.

### JSON / text

Choose **JSON / text** for local files. Nothing from these files is uploaded. Select either:

- One combined JSON object with `strings` and `shots` arrays.
- Two files: one array of series and one array of shots, in JSON or CSV form. Select both together; their order does not matter.

Extensions `.json`, `.csv` and `.txt` are supported. A `.txt` file must contain the same JSON or CSV structure; arbitrary prose, column-free text and NDJSON are not supported. Files use UTF-8, with an optional BOM. Do not select the separate points export: distance/velocity arrays are already in the shots.

For a non-empty pair, content identifies each collection. Empty paired arrays/files need names containing `strings` and `shots` respectively. A combined object with both empty arrays is also valid. At most two files and 20 MB combined are accepted.

#### Combined JSON example

This example is invented, not an actual account export. Its numeric values do not assert physical units.

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
| `unit` | Optional raw string/numeric code; missing becomes `unknown`. No conversion is performed. |
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

You can rename a source or exclude it from all-source Refresh. **Remove source and data** signs out a connected source and permanently removes its local measurements and annotations after confirmation. Catalog names remain. Nothing is deleted from Caldwell. Removal cannot be undone within VelociTrack.

## Filters and selection

Select one or more sources, firearms and projectiles. Choices inside a filter combine as alternatives; different filters combine together. An empty filter means all. Date ranges include entire local days; relative week/month windows remain relative. Filters save automatically in the local profile and return on your next visit.

Select one or more series to view charts or the shot table. A series hidden by a filter leaves the active comparison. Selection itself is temporary.

## Profile and offline use

The profile icon opens your local nickname and startup/sign-in preferences. There is no VelociTrack server account. **Refresh all enabled sources after startup** refreshes signed-in online sources and marks file sources as awaiting files. Missing sign-in waits for you to open Sources.

Measurements and settings belong to this browser profile and site address. Changing port, hostname or browser creates a separate workspace. Clearing site data or browser eviction can remove it. Keep your original exports; full workspace backup/restore is not yet available.

After its assets are cached, the application shell and imported measurements work offline. Online refresh and GitHub-hosted help require a connection. Updates offer a reload prompt. Reloading ends in-memory sign-in, so finish an active import before accepting an update.

**Reload** activates the downloaded update and reopens this tab. Other open tabs keep their current view until you choose Reload there. Saved measurements and profile settings stay on the device. The button shows **Reloading…** while the update activates; if it cannot finish, a message lets you retry. If an older version's Reload button appears unresponsive, refresh the browser tab once to pick up the corrected update handling. Do not clear site data.

## Measurement interpretation

Units, atmospheric metadata and distance origin remain unvalidated. Treat raw unit codes as labels, not proof of m/s, fps, metres or feet. No physical conversions or trajectory predictions are made.

Charts/statistics combine only one source/raw-unit group. Source-excluded shots remain in the table but do not enter charts or statistics. Positive finite muzzle readings contribute to the mean, sample standard deviation (`n − 1`) and extreme spread. Inspect **Data quality** for padding, invalid points and unequal arrays.
