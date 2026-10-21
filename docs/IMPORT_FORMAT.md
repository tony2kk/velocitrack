# Import file reference

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

| Field            | Format and behavior                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_documentId`    | Required stable string or numeric ID. `id`, then `stringId`, are accepted aliases when earlier fields are absent.                                                                                                                  |
| `name`           | Optional string/number. Missing or empty becomes `Untitled series`.                                                                                                                                                                |
| `startTimestamp` | Optional Unix timestamp in seconds, recognizable Unix milliseconds (at least 100,000,000,000), or ISO date-time. Accepted range: 1970 through the start of 2100. Missing means date unavailable. Include a timezone in ISO values. |
| `firearm`        | Required object with `name`; optional `id`. Missing ID uses the name as the source reference.                                                                                                                                      |
| `projectile`     | Same shape as `firearm`.                                                                                                                                                                                                           |

Names and IDs must be non-empty and at most 500 characters. The date filter uses each series' start time, not the import time.

#### Shot fields

| Field                                              | Format and behavior                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `_documentId`                                      | Required stable ID; `id` is an alias. Unique within its series.                                                                      |
| `_stringId`                                        | Required parent series ID; `stringId` is an alias. Must match a series in this import.                                               |
| `number`                                           | Optional finite number; `stringNumber` is an alias. Missing uses input row position plus one.                                        |
| `muzzleVelocity`                                   | Optional finite number or numeric string; blank/null means unavailable.                                                              |
| `ballisticCoefficientG1`, `ballisticCoefficientG7` | Optional finite numbers or numeric strings; blank/null means unavailable.                                                            |
| `distances`, `velocities`                          | Arrays of finite numbers, paired by index. Missing/blank/null arrays become empty. Empty/null elements inside an array are rejected. |
| `unit`                                             | Optional raw provider code; missing becomes `unknown`. Retained as metadata, not used as a display-unit selector.                    |
| `exclude`                                          | Optional boolean. Also accepts `1`, `0`, and strings `true`, `false`, `True`, `False`, `1`, `0`. Missing means false.                |

Each shot must contain at least `muzzleVelocity` or `velocities`, even if that value is unavailable. Duplicate IDs, orphan shots and invalid numeric fields reject the import. Each distance/velocity array may have up to 5,000 elements. The total point limit is 1,000,000, counting the longer array in each shot. Unequal array lengths are preserved and reported as data-quality issues.

Unknown fields are preserved in each record's local raw data. Original array order is retained. A paired `[0, 0]` sample is omitted from charts as padding; `[0, positive velocity]` remains a valid measured point.

#### CSV format

Use a header row with the same field names as JSON, one record per row. Nested objects and arrays are JSON inside CSV cells. Quote such cells and double their inner quotation marks. For example, a `firearm` cell is:

```text
"{""id"":""example-firearm"",""name"":""Example firearm""}"
```

An array cell can be `"[0,10,20]"`. Separate series and shots files are required for CSV. Standard comma-separated output is recommended. Duplicate headers, malformed quoting and inconsistent column counts are rejected. Additional point-by-point CSV files are not imported.

[Back to user help](../help/getting-started.md)
