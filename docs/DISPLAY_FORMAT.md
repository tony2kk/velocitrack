# Measurement display precision

Readonly measurements share one policy in `src/domain/units.ts`, including cards,
tables, chart axes and point details, string information and PDF reports. Convert
to the selected display unit first, then format. Trailing zeroes are intentional.
Missing/non-finite values display an em dash; a rounded negative zero displays zero.

| Quantity / display unit | Decimal places | Example |
| --- | ---: | --- |
| Velocity, sound speed, velocity statistics; m/s or ft/s | 1 | `326.0` |
| G1 / G7 ballistic coefficients | 3 | `0.200` |
| Distance / elevation; m or ft | 1 | `100.0` |
| Temperature; °C or °F | 1 | `15.0` |
| Pressure; hPa | 2 | `1013.25` |
| Target H/V/group size and calculated drop; cm or in | 2 | `5.00` |
| Projectile diameter; mm / in | 2 / 3 | `9.00` / `0.355` |
| Mass; g / gr (grs) | 2 / 1 | `8.00` / `124.0` |
| Air density; kg/m³ / lb/ft³ | 3 / 5 | `1.225` / `0.07647` |
| Counts, humidity %, angles ° | 0 | `42` |
| Other numeric values, including unitless custom fields | 2 | `12.00` |

This is a presentation policy, not measurement accuracy. Source records, derived
calculations, statistics, sorting, chart coordinates, zoom ranges and ZIP backups
retain full numeric precision. Editable values retain their existing precision;
opening an editor or leaving an untouched input does not save a rounded value.

Custom scalar fields use their declared physical type/unit. Custom distance curves
can supply `unit(units)` metadata to share the same rules. Missing/unknown units use
the two-decimal default; labels are never parsed to guess physical units. A known
unit does not establish a source field's meaning or authorize a conversion.

[Measurement units](MEASUREMENT_UNITS.md) · [Reports](../help/reports.md)
