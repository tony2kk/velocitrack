# Measurement units

This reference describes the supported Caldwell/VelociRadar import contract and local custom-function inputs. It distinguishes confirmed units from unresolved provider semantics. The owner confirmed **ft/s, ft and °F** for supported measurements (decision 006), the projectile mass codes (decision 008), and, on 2026-10-20, **hPa reduced to sea level** for `weatherData.pressure`, **ft** for `altitude` and **diameterUnit 0 = inches / 1 = mm** (decision 013). These confirmations are not a complete vendor specification.

The adapter preserves imported values. Imperial/Metric profile preferences affect presentation only; they never change a custom function's input. Arbitrary extra raw attributes have no inferred units.

## Recorded shot and string attributes

| Attribute                                                                                              | Input unit / interpretation                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `shot.muzzleVelocity`, `shot.velocities[]`                                                             | **ft/s**. Metric display multiplies by exactly 0.3048 to obtain m/s.                                                                                                                                               |
| `shot.distances[]`                                                                                     | **ft**. Metric display multiplies by exactly 0.3048 to obtain m. Original order, length and padding remain stored.                                                                                                 |
| `samples[].distance`, `samples[].value`                                                                | **ft**, **ft/s** respectively. These are the usable measured pairs, independently of raw array preservation.                                                                                                       |
| `maxDistance`                                                                                          | **ft**, regardless of display preference.                                                                                                                                                                          |
| `shot.ballisticCoefficientG1`, `shot.ballisticCoefficientG7`                                           | Original coefficients in the provider's G1/G7 convention. No profile-unit conversion or substitution between them.                                                                                                 |
| `string.raw.statistics.minimum`, `maximum`, `average`, `muzzleVelocity`, `standardDeviation`, `spread` | **ft/s**, all under `statistics`. They are provider summaries, not summaries of the current selection.                                                                                                             |
| `string.raw.weatherData.temperature`, `temperatureMin`, `temperatureMax`, `feelsLikeTemperature`       | **°F**, all under `weatherData`. Metric display uses `(F − 32) × 5/9`.                                                                                                                                             |
| `string.raw.weatherData.pressure`                                                                      | **hPa**, confirmed by the owner. **1 hPa = 100 Pa**. **Reduced to sea level**, confirmed by the owner; this field is not station pressure.                                                                         |
| `string.raw.weatherData.humidity`                                                                      | Existing provider/UI interpretation: **% relative humidity**. Preserved as supplied; no new independent validation is claimed.                                                                                     |
| `string.raw.weatherData.windDegrees`                                                                   | Existing display interpretation: **degrees**. The provider's direction/reference convention remains unconfirmed.                                                                                                   |
| `string.raw.projectile.weight`                                                                         | Determined by `projectile.weightUnit`: supported numeric **0 = grains**, **1 = grams**. Unknown codes are unresolved. `projectileWeight` returns canonical grains when the unit is known; **1 gr = 0.06479891 g**. |
| `string.raw.projectile.diameter`, `string.raw.projectile.diameterUnit`                                 | Owner-confirmed numeric unit codes: **0 = inches**, **1 = millimeters (mm)**. Read value and code together. **1 in = 25.4 mm**. Unknown codes remain unresolved.                                                   |
| `string.raw.altitude`                                                                                  | **ft**, confirmed by the owner. Conversion to m multiplies by exactly 0.3048.                                                                                                                                      |
| `string.raw.distanceToChronograph` | **Always 0 for VelociRadar**, confirmed by the owner on 2026-10-21. The muzzle must be beside the radar, aligned or at most 5 cm ahead. Preserve the raw field but do not apply a distance correction. Revisit units/sign/origin only for data from another device type. |
| `string.raw.weatherData.windSpeed`, `windGust`, `visibility`                                           | **Unconfirmed source units**, all under `weatherData`. Do not guess a conversion from the profile setting.                                                                                                         |
| `string.startedAt`                                                                                     | Normalized UTC ISO timestamp or null. Raw timestamps can use supported ISO, seconds, milliseconds or provider seconds-object forms; use `providerTimestamp` instead of assuming one numeric time unit.             |
| Shot numbers, counts, IDs, flags, text, `rawUnit` and provider enum codes                              | Ordinal/count, identity or metadata values, not physical quantities. `rawUnit` is not a conversion instruction.                                                                                                    |

The tables document known paths, not a whitelist of exposed attributes. Both full `shot.raw` and `string.raw` are available in the custom-function context, including future imported keys. Validate their types and missing values before use. Missing is not zero.

## Derived string atmosphere

`input.string?.airDensity` is **kg/m³**; `input.string?.soundSpeed` is **m/s**.
Both are optional estimates computed together on import/reimport from confirmed
°F, % RH, sea-level hPa and ft inputs. Null/absent values mean unavailable, not zero.
Metric display uses kg/m³ and m/s; Imperial uses lb/ft³ (multiply by
`0.3048³ / 0.45359237`) and ft/s (divide by `0.3048`).
See [atmosphere contract](ATMOSPHERE.md) for Magnus coefficients, pressure reduction,
ideal-mixture sound speed, bounds and backup semantics.

## Local custom fields and annotations

Field definitions are in `input.fields`; values are in `input.shotAnnotation` and `input.stringAnnotation`. Imported metadata and local values are kept separate.

| Field type                                | Stored/callback value                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `number`                                  | Finite number with no implicit physical unit. Its meaning belongs to the field definition/use case.                                                |
| `weight`, `weight-grams`, `weight-grains` | **grains (gr)** in storage for all three types. The fixed-grams variant changes the editor/display to grams, not the canonical value.              |
| `speed`                                   | **ft/s**.                                                                                                                                          |
| `distance`                                | **ft**.                                                                                                                                            |
| `short-text`, `note`                      | Text, no unit.                                                                                                                                     |
| Legacy `annotation.fields` values         | Original typed value and optional `unit` string are preserved. Do not infer a unit from a field name or reinterpret it as a modern `values` entry. |

Tags and notes have no physical units. Definition IDs, rather than editable display names, join definitions to values.

## Target measurements

`input.stringAnnotation?.target.values` contains optional `horizontalOffset`,
`verticalOffset` and `groupSize`, all in canonical **mm**, regardless of the profile.
Null means absent. H is positive right; V is positive up; group size is a nonnegative
circle diameter. Display divides by **10** for cm in Metric or **25.4** for inches
in Imperial. Existing recorded/custom distance values remain in ft and display in m/ft.

Target `geometry` uses decoded original-image **pixels**: width, height, center,
optional POA and radius. Image Y increases downwards. `mmPerPixel` is **mm/pixel**.
Neither viewport zoom nor display-unit changes modify those values.
See [target measurement contract](TARGET_MEASUREMENTS.md) for calibration and manual overrides.

## Custom-function output

`DistanceSample.distance` is finite non-negative **ft**. `DistanceSample.value` uses the custom definition's chosen canonical unit, declared through its `axisKey`, label and `displayScale`. Do not apply profile conversion in the calculation and again in the renderer. The adapter does not automatically interpret weather, coefficients or other raw fields.

[Data access](DATA_ACCESS.md) · [Custom distance functions](DISTANCE_CURVES.md) · [Import format](IMPORT_FORMAT.md)
