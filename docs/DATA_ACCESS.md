# Workspace data and access

This is the contributor reference for data already stored or exposed by VelociTrack. All examples refer to local application modules and contain no real records. [model.ts](../src/domain/model.ts) is the authoritative normalized type contract; [database.ts](../src/storage/database.ts) defines the indexes.

## Read a consistent snapshot

From a module under `src/`:

```ts
import { loadWorkspace } from './storage/workspace';
import { inspectPoints } from './domain/measurements';

const workspace = await loadWorkspace();
const stringById = new Map(workspace.series.map((item) => [item.id, item]));
const annotationById = new Map(workspace.annotations.map((item) => [item.entityId, item]));

const rows = workspace.shots.map((shot) => ({
  shot,
  string: stringById.get(shot.seriesId),
  localShotAnnotation: annotationById.get(shot.id),
  localStringAnnotation: annotationById.get(shot.seriesId),
  measuredPoints: inspectPoints(shot).points,
}));
```

`loadWorkspace()` reads a consistent transaction snapshot containing `sources`, `catalog`, `series`, `shots`, `annotations`, `fieldDefinitions` in definition order, `tags`, `attachments` metadata and `profile` with top-level defaults. It does **not** include photo bytes or authentication sessions. It returns the entire workspace, not the currently filtered/selected rows.

React's existing [App.tsx](../src/App.tsx) subscribes with `useLiveQuery` from `dexie-react-hooks`. Prefer passing its snapshot/derived props to child components over taking unrelated reads during rendering. Use read transactions for related direct queries:

```ts
import { db } from './storage/database';

async function readString(stringId: string) {
  return db.transaction('r', [db.series, db.shots, db.annotations], async () => ({
    string: await db.series.get(stringId),
    shots: await db.shots.where('seriesId').equals(stringId).toArray(),
    annotation: await db.annotations.get(stringId),
  }));
}
```

An ID is an opaque local identity. Imported string IDs encode `(sourceId, remoteId)` and shot IDs encode `(sourceId, stringRemoteId, remoteId)` through `entityId`. Never join on a display name, shot number or bare provider ID. A shot's `seriesId` joins `Series.id`; a local annotation's `entityId` joins either a string or shot ID.

## Stored records

### String: `Series`, table `series`

The UI calls it a String; the domain/storage type remains `Series`.

| Field | Type / meaning |
| --- | --- |
| `id`, `sourceId`, `remoteId` | Local identity, owning source and source-scoped provider identity. |
| `name` | Display name. |
| `startedAt` | Normalized UTC ISO string or null. |
| `firearmId`, `projectileId` | Local `CatalogItem.id` references. |
| `raw` | Original provider/string object, `Record<string, unknown>`. |

Indexes: `id`, `sourceId`, `firearmId`, `projectileId`. Empty strings with zero shots can still have context, annotations and photos.

### Shot: `Shot`, table `shots`

| Field | Type / canonical meaning |
| --- | --- |
| `id`, `sourceId`, `seriesId`, `remoteId` | Local shot/source/parent identities and original provider identity. |
| `number` | Recorded number or importer fallback. Not globally unique. |
| `muzzleVelocity` | Finite source number or null; supported inputs use **ft/s**. Views additionally require positive values. |
| `ballisticCoefficientG1`, `ballisticCoefficientG7` | Source coefficient number or null. Stored separately; do not substitute one for the other. |
| `distances` | Original numeric array in **ft**, including original padding/order. |
| `velocities` | Original numeric array in **ft/s**, aligned by array index where present. |
| `excluded` | Imported provider exclusion flag. |
| `rawUnit` | Provider enum/code as a string; metadata, not a conversion instruction. |
| `raw` | Original provider shot object. |

Indexes: `id`, `sourceId`, `seriesId`. Import does not trim arrays, drop invalid samples or delete records absent from a subsequent import. Local invalidation is a separate annotation, not `Shot.excluded`.

`inspectPoints(shot)` returns `{ points, padding, invalid, unpaired }`. Each usable point has `{ distance, velocity, index }` in canonical ft/ft/s. It excludes paired `[0, 0]`, negative/non-finite distance, non-positive/non-finite velocity and unmatched tails. Distance zero with positive velocity is valid. Call this helper instead of silently zipping arrays or treating every zero distance as padding.

### Local annotations: `Annotation`, table `annotations`

| Field | Meaning |
| --- | --- |
| `entityId` | String or shot identity, primary key. |
| `notes` | Local free text, separate from provider notes. |
| `values?` | Current custom values keyed by `FieldDefinition.id`: string or canonical number. |
| `tagIds?` | Assigned `Tag.id` values, normally on strings. |
| `invalid?` | Persistent local shot invalidation. |
| `fields` | Preserved legacy values; each entry has a tagged type and value. |

Legacy `fields` supports text, number with optional unit, boolean, date and choice. Do not confuse it with current `values`. An import never overwrites local annotations.

### Custom definitions: `FieldDefinition`, table `fieldDefinitions`

All fields: `id`, `name`, `type`, `order`, optional `showInNavigator`. Indexes: `id`, `order`. Values live in string annotations, not on the definition or each shot.

| Type | Stored value / display |
| --- | --- |
| `short-text` | String up to 100 characters. |
| `note` | Multiline string; the field validator has no per-field character cap. Archive/storage limits still apply. |
| `number` | Finite scalar. |
| `weight` | Canonical grains; profile units choose displayed grains or grams. |
| `weight-grams` | Canonical grains; always displayed as grams. |
| `weight-grains` | Canonical grains; always displayed as grains. |
| `speed` | Canonical ft/s; profile converts display. |
| `distance` | Canonical ft; profile converts display. |

Use `fieldUnit`, `fieldFactor`, `fieldDisplay`, `parseFieldInput` and `validFieldValue` from [customFields.ts](../src/domain/customFields.ts). Empty/unassigned is distinct from zero. Resolve a shot's inherited value through its **string** annotation:

```ts
const definition = workspace.fieldDefinitions.find((field) => field.id === fieldId);
const value = annotationById.get(shot.seriesId)?.values?.[fieldId];
```

### Tags: `Tag`, table `tags`

All fields: `id`, `name`, `color` (validated six-digit hex). Join `Annotation.tagIds` against these definitions. Color/name are presentation metadata, not numeric readings. Tag filters combine OR within selected tags and AND with other filter categories.

### Catalog: `CatalogItem`, table `catalog`

All fields: `id`, `kind` (`firearm` or `projectile`), `name`, `links: { sourceId, remoteId }[]`, optional `managedBySourceId`. Indexes: `id`, `kind`. Catalogs store local names and provenance, not a normalized duplicate of the full provider firearm/projectile object. String raw records retain provider snapshots. Do not automatically merge same-named entries across sources.

### Sources: `DataSource`, table `sources`

All fields: `id`, `name`, `kind` (`velociradar-export` or `caldwell`), `enabled`, `autoUpdateCatalogs`, `createdAt`, `status`, optional `lastAttemptAt`, `lastSuccessAt`, `error`, `connection`, `accountId`.

`status` is `ready`, `needs-files`, `needs-sign-in`, `needs-setup` or `error`. `connection` contains technical `projectId`/`apiKey` client configuration; `accountId` is a private binding. These are connection bookkeeping, not analysis quantities. Do not log or publish local source/account records. Passwords are never application records, and SDK authentication sessions are not part of `Workspace` or backups.

### Photos: `Attachment` and `AttachmentContent`

`attachments` metadata has `id`, `seriesId`, `name`, `caption`, `mime`, `size` in bytes, `createdAt`. Indexes: `id`, `seriesId`. Supported originals are JPEG, PNG and WebP; attachment limits are defined in [attachments.ts](../src/storage/attachments.ts).

`attachmentContents` has `{ id, blob }`, indexed by the same attachment ID. Read bytes lazily:

```ts
const metadata = workspace.attachments.filter((photo) => photo.seriesId === stringId);
const content = metadata[0]
  ? await db.attachmentContents.get(metadata[0].id)
  : undefined;
// content?.blob is the original image. Components own/revoke any temporary object URL.
```

There are no automatic target/group-analysis results in the current schema.

### Profile and filters: `Profile`, table `profiles`

The singleton ID is `local`.

| Fields | Meaning |
| --- | --- |
| `nickname`, `rememberSignIn`, `refreshOnStart`, `unitSystem` | Local preferences; units are `imperial` or `metric`. |
| `analysis?` | Active `mode` and independent `simple`, `dual`, `compare` settings. Each has `axis`, `quantity`, `secondary`, optional canonical-ft `forecastDistance`. |
| `tableColumns?`, `tableSort?` | Ordered column IDs and `{ columnId, direction }`; Shot is not independently sortable. |
| `infoSeriesId?`, `theme?`, `showProjectileWeight?` | Selected context string; Light/Dark/Auto preference; name decoration. |
| `visibleFieldIds?`, `showTags?` | Older/inherited table visibility preferences. |
| `shotDetail` | Preserved legacy preference, no longer an editable General control. |
| `caldwellConnection?` | Shared technical connection metadata. Not measurement data. |
| `filters` | The criteria below. |

Filter fields: `sourceIds`, `firearmIds`, `projectileIds`, optional `tagIds`, `dateMode` (`all`, `range`, `weeks`, `months`), `dateFrom`, `dateTo`, `relativeAmount`. Use [filters.ts](../src/domain/filters.ts), including `filterSeries`, for their existing semantics. `saveProfile` merges top-level fields; `saveAnalysis` merges a particular chart transactionally. Do not overwrite a whole stale snapshot to save one chart choice.

## Original provider data

`Series.raw` and `Shot.raw` are open records. There cannot be a fixed exhaustive list of their keys across every import/provider version. All supplied keys remain available locally; the complete normalized fields above and the currently interpreted paths below are the supported access reference. Missing metadata is normal. Never assume a raw property's type or unit merely from its name.

Use `rawPath`/`finiteNumber` from [providerData.ts](../src/domain/providerData.ts):

```ts
import { rawPath, finiteNumber } from './domain/providerData';

const pressureValue = rawPath(string.raw, 'weatherData.pressure');
const pressureInSourceUnits = finiteNumber(pressureValue) ? pressureValue : null;
const rawKeys = Object.keys(string.raw); // Names only; do not log private values.
```

`rawPath` reads own properties along a dotted path and returns `unknown`/undefined. It does not evaluate provider content. Avoid `Number(undefined)`, coercing blank strings to zero, HTML injection, enum guesses or blanket conversion of every numeric field.

### String raw paths currently displayed/read

| Path(s) | Interpretation |
| --- | --- |
| `_documentId` / `id` / `stringId`, `name`, `startTimestamp` | Import identities/name/start. Normalized counterparts exist on Series. |
| `endTimestamp`, `lastModifiedTimestamp` | Provider end/change metadata. Use `providerTimestamp` for supported forms. |
| `notes` | Provider string notes, separate from local notes. |
| `firearm`, `projectile` | Original catalog snapshots; names/IDs are normalized separately. Other supplied nested properties remain raw. |
| `projectile.weight`, `projectile.weightUnit` | Use `projectileWeight(series)`: supported numeric code **0 = grains**, **1 = grams**; supported textual labels are handled too. Unknown codes remain unresolved. The helper also returns canonical grains when known. |
| `projectile.diameter`, `projectile.diameterUnit` | Owner-confirmed unit codes: **0 = inches**, **1 = mm**. Read value and code together; unknown codes remain unresolved. |
| `altitude` | **ft**, confirmed by the owner on 2026-10-20. |
| `distanceToChronograph` | Source units and distance origin remain unvalidated. |
| `weatherData.temperature`, `temperatureMin`, `temperatureMax`, `feelsLikeTemperature` | These are paths under `weatherData`; supported raw temperature is °F. Use display conversion, never rewrite raw data. |
| `weatherData.humidity` | Displayed as percent; full provider environmental semantics are not independently validated. |
| `weatherData.pressure` | **hPa, reduced to sea level**, confirmed by the owner on 2026-10-20. 1 hPa = 100 Pa; this field is not station pressure. |
| `weatherData.windSpeed`, `windGust`, `visibility` | Source units remain unvalidated. |
| `weatherData.windDegrees` | Displayed in degrees; reference/direction semantics remain unvalidated. |
| `weatherData.cityName`, `weatherDescription`, `windSpeedDirection` | Text under `weatherData`, shown when present. Not numerical inputs. |
| `statistics.minimum`, `maximum`, `average`, `muzzleVelocity`, `standardDeviation`, `spread` | All paths under `statistics`; original provider velocity summaries displayed using ft/s or profile conversion. They are not the currently selected-shot summaries. |
| `statistics.totalShots`, `ballisticCoefficientG1`, `ballisticCoefficientG7` | All under `statistics`; provider count/coefficients, not recomputed selected-shot results. |

### Shot raw paths currently displayed/read

`_documentId`/`id`, `_stringId`/`stringId`, `number`/`stringNumber`, `muzzleVelocity`, `ballisticCoefficientG1`, `ballisticCoefficientG7`, `distances`, `velocities`, `exclude`, `unit` feed their normalized Shot fields. Additional `timestamp` and `notes` are displayed in String info when supplied. Other imported keys remain in `shot.raw` without a guaranteed schema.

`providerTimestamp(value)` returns milliseconds or null for supported ISO/numeric/provider seconds-object forms. It is a presentation helper; do not apply it indiscriminately to arbitrary numeric metadata. Prefer normalized `Series.startedAt` for the imported string start time.

String info's **Original Caldwell information** section exposes the current string's original object locally. That is the way to inspect keys for the actual imported record; neither this documentation nor repository fixtures should contain real exports.

## Units and derived accessors

[units.ts](../src/domain/units.ts) supplies `displayValue`, `unitLabels` and `formatValue`. Imperial-to-Metric distance/velocity multiply by exactly 0.3048; °F-to-°C is affine. [projectiles.ts](../src/domain/projectiles.ts) supplies `projectileWeight` and mass-aware names. [customFields.ts](../src/domain/customFields.ts) supplies typed field conversions. Display conversions never mutate storage.

`availableQuantities(shots, series, fields, annotations, units)` from [analysis.ts](../src/domain/analysis.ts) returns supported per-shot/inherited scalar readers `{ id, label, displayScale, read }`. These include Velocity, G1/G7, known projectile mass, the source numeric paths above and numeric custom fields. Its optional `includeUnavailable` argument supports retained table columns. Call `read(shot)` rather than reimplementing the joins and display conversions. Scalar table columns and distance functions use different contracts.

`summarizeShots` supplies count, mean, sample SD, spread and compatibility status from valid included **recorded muzzle readings**. `chartGroupsCompatible` retains the one-source/raw-unit-code grouping. Model/derived outputs never replace recorded statistics.

## Selection and page-memory data

Not everything visible is a stored record:

- Active selected strings, per-shot Analyze deselection exceptions and hover identities are page-memory state. `useShotSelection` produces `seriesShots` for the table and `selectedShots` for analysis. The latter removes hidden and locally invalid shot IDs; the domain layer also removes provider-excluded rows.
- Persistent invalidation is `Annotation.invalid`; build the invalid-shot ID set from shot annotations, as App does. Undo does not delete provider data.
- `sortShots` applies saved table sort before analysis. By shot follows this order; distance axes still represent physical X. Do not reorder samples to mimic table order.
- `ViewportMemory` holds canonical axis extents/windows in the mounted analysis panel. It is session-only. The chart's forecast-distance preference is stored separately.
- Import-progress and notification state are transient UI data, not measurements or curve parameters.

## Access inside a custom distance function

Custom callbacks receive `DistanceCurveContext`, extending the sample/horizon contract with full readonly `shot` and matching `string` records, including every imported `raw` key. `string` is null if no local ID/source ID match exists. `shotAnnotation` and `stringAnnotation` expose separate local notes, typed values and tag IDs; `fields` contains local field definitions and `tags` contains definitions assigned to those entities. All data are detached before their containers are recursively frozen. Availability, omission notices and calculations receive the same current workspace inputs.

Callbacks have no profile, source configuration, credentials, database handle or photo bytes. Unknown raw values still need type checks. They remain synchronous, pure and bounded; never perform an independent storage/network read inside a callback. Existing sample-only helpers can continue accepting `DistanceCurveInput`. See [DISTANCE_CURVES.md](DISTANCE_CURVES.md) for adapter call examples and [MEASUREMENT_UNITS.md](MEASUREMENT_UNITS.md) for every known unit and unresolved metadata unit.

## Write through existing operations

| Change | Existing module/API |
| --- | --- |
| Import measured records | `importBundle` in [workspace.ts](../src/storage/workspace.ts), after adapter validation. |
| General preferences / chart settings | `saveProfile` / `saveAnalysis`. |
| Local shot invalidation | `setShotInvalid` in [shots.ts](../src/storage/shots.ts). |
| Field/tag definitions and string details | `saveField`, `removeField`, `moveField`, `saveTag`, `removeTag`, `saveSeriesDetails` in [customization.ts](../src/storage/customization.ts). |
| Photos | `addPhoto`, `removePhoto` in [attachments.ts](../src/storage/attachments.ts); existing photo component handles captions. |
| Portable archive | `createBackup`, `prepareBackup`, `restoreBackup` in [backup.ts](../src/storage/backup.ts). Restore requires the existing validation/confirmation flow. |

Preserve transactional writes, annotations separate from imports, source-scoped identities and the existing local origin. There is no application backend, global dataset or cross-origin workspace access. Do not put measurements, profile values or sessions in code, documentation examples, logs, tests or build configuration.

[Curve extension guide](DISTANCE_CURVES.md) · [Architecture](../ARCHITECTURE.md) · [Import format](IMPORT_FORMAT.md)

## Target measurements (0.12.0)

String annotations may have `target`, with `values.horizontalOffset`, `values.verticalOffset` and `values.groupSize` in canonical **mm** (or null). Photo geometry is in original-image pixels and `mmPerPixel` is mm/pixel. The complete readonly result is also available through `input.stringAnnotation?.target`; photo bytes are not exposed to custom callbacks. Use `saveTargetValues` or `saveTargetMeasurement` in [targetMeasurement.ts](../src/storage/targetMeasurement.ts) for transactional edits, preserving unrelated annotation fields. Read the [target contract](TARGET_MEASUREMENTS.md) for ownership, calibration, lifecycle and backup invariants.
