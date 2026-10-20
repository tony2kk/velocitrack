# 013 — Full record context for custom functions

Requested on 2026-10-20. Extend the domain adapter so code-defined distance functions can read every attribute of the current shot and its parent string. The owner also requested a unit reference and confirmed the metadata units below.

## Contract

`DistanceCurveContext` extends the existing sample/horizon input with the complete normalized `shot`, matching `string` (`Series`) and both original `raw` objects. A missing parent is null; join by local series identity and source identity, never name or bare provider ID. Expose separate shot/string annotations, field definitions and assigned tag definitions. Do not flatten local annotations into replaceable imports.

Availability, omission notices and calculation receive the same current workspace context. Simple, Dual and Compare all use the same domain adapter. Callers can still invoke sample-only helpers using `DistanceCurveInput`; existing callbacks that read only samples continue to work.

Clone before recursively freezing the input containers. Mutation must not alter workspace records, arrays, metadata or annotations. Unknown raw keys are preserved without a whitelist, conversion or type assumption. Missing local data is represented by null/empty arrays. No profile, authentication state, source configuration, database handle or photo bytes are added to the callback.

This remains trusted synchronous application code, not a security sandbox. Existing work/output limits and safe error categories remain in place. No new curve, numerical model, atmosphere correction or persistence schema is introduced by this batch.

## Units

Owner-confirmed on 2026-10-20:

- `weatherData.pressure`: **hPa, reduced to sea level**; not station pressure.
- `altitude`: **ft**.
- `projectile.diameterUnit`: **0 = inches**, **1 = mm**; read with `projectile.diameter`.
- `projectile.weightUnit`: **0 = grains**, **1 = grams**, reaffirming the earlier mass mapping.

Other unresolved metadata units are not inferred from the profile or the known ft/ft/s measurement-array contract. See [MEASUREMENT_UNITS.md](../MEASUREMENT_UNITS.md) for the full field/unit reference and confirmed versus unresolved distinctions. This batch documents the newly confirmed units; it does not change existing metadata display readers or add automatic conversions to custom callbacks.

This decision replaces decision 012's restriction to sample-only custom callback inputs. The sample-only type remains available for independent transformations. Pages deployment is separate.
