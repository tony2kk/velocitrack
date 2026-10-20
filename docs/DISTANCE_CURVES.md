# Add an Over distance curve

Curve definitions live in TypeScript and are compiled with the application. Both **Quantity** and **Second quantity** use the same registry. The renderer consumes canonical sample arrays and metadata through `dispatchDistanceCurve`; adding an extension does not require editing React or ECharts code.

## Files to use

| File | Responsibility |
| --- | --- |
| [types.ts](../src/domain/distanceCurves/types.ts) | Public extension input, output and definition contracts. |
| [template.ts](../src/domain/distanceCurves/template.ts) | Working example: subtract the first observed value from measured samples. |
| [customDistanceCurves.ts](../src/domain/distanceCurves/customDistanceCurves.ts) | Ordered catalog, including Calculated velocity G1/G7 and optional additional definitions. |
| [registry.ts](../src/domain/distanceCurves/registry.ts) | Recorded-velocity adapter, registration checks, availability and dispatch. |

## Register your first implementation

To try the included example, edit `customDistanceCurves.ts`:

```ts
import type { CustomDistanceCurve } from './types';
import { calculatedVelocityG1Curve } from './calculatedVelocityG1';
import { calculatedVelocityG7Curve } from './calculatedVelocityG7';
import { centeredSamplesCurve } from './template';

export const customDistanceCurves: readonly CustomDistanceCurve[] = [
  calculatedVelocityG1Curve,
  calculatedVelocityG7Curve,
  centeredSamplesCurve,
];
```

Run `npm.cmd run verify` and rebuild/reload your local application. Select a string with measured distance samples, then choose **Over distance**. **Measured change from first sample** is offered in both quantity menus. Its description appears below the chart when selected. Select it as the second quantity beside Velocity to see its independent vertical scale.

For a new function, copy `template.ts` to a new module, rename the exported function and definition, change the ID, then import that definition into the list above. List order is menu order, after the built-in recorded Velocity. G1/G7 are ordinary catalog entries; keep them in the list to retain their menu choices. There is no second list for Dual chart and no UI expression editor.

## Definition contract

| Property | Meaning |
| --- | --- |
| `id` | Stable `curve:<name>` identity. Use ASCII letters, digits, `_` or `-`; maximum total length 200. Saved settings and backups contain this ID. Do not reuse it for a different meaning. |
| `label(units)` | English quantity name including the displayed Y unit. |
| `description` | Required English plain text explaining the transformation and assumptions. React displays it below the graph, once per selected definition. Dual shows both descriptions. |
| `axisKey` | Canonical numerical scale identity. Use a separate key for unrelated meanings, even if their units match. |
| `displayScale(units)` | `{ factor, offset }`, applied as `displayY = canonicalY * factor + offset`. Factor must be finite and positive; offset must be finite. |
| `available(input)` | Cheap, synchronous input check. It controls whether the option is offered for the current selected shots. |
| `calculate(input)` | Pure synchronous function returning `{ distance, value }[]`. |
| `usesForecast` | Optional, default false. True exposes the existing Forecast distance field and its slider linkage. |
| `unavailableReason` | Optional plain-text explanation for omitted shots. |

IDs must be unique. The existing `calculated:g1` and `calculated:g7` IDs are supported compatibility exceptions owned by their respective files; new functions use `curve:<name>`. Optional `model` metadata preserves the existing G1/G7 tooltip and coefficient display. Definitions sharing `axisKey` must use the same transforms in both unit systems; registration rejects inconsistent scales. Compatible quantities share one Y axis. Other quantities get the right Y axis in Dual, and the vertical slider controls both. The viewport keeps independent numerical ranges by axis meaning.

The template uses `centered-velocity`, rather than `velocity`, because a change from a reference value has a different scale meaning from an absolute reading. Its Imperial factor is 1 and Metric factor is exactly 0.3048. No conversion belongs in `calculate` itself.

## Input and data dispatch

```text
selected, valid shot records in table order
  -> input adapter: inspect measured samples; detach and freeze input
  -> registry: choose available definition by saved quantity ID
  -> calculate(input): return canonical points
  -> dispatcher: check output and retain shot identity
  -> trace builder: convert units / aggregate String compare
  -> generic ECharts renderer
```

`DistanceCurveContext` extends the minimal `DistanceCurveInput` sample contract:

- `samples`: detached readonly measured pairs, with `distance` in **ft**, `value` in **ft/s**, and the original optional `sampleIndex`. Input has already omitted paired `[0, 0]` padding, invalid pairs and unmatched tails. A zero-distance sample with positive recorded velocity remains valid. Original order and duplicate distances are retained.
- `maxDistance`: the current requested horizon in **ft**, default 1,000 ft, with the existing maximum of 1 km. `available` receives the default horizon and must decide availability from samples/record attributes, independently of the horizon. `calculate` receives the selected horizon.

The context additionally contains:

- `shot`: the full normalized Shot record, including every `raw` attribute and the original arrays, padding and metadata.
- `string`: the full matching Series record and its `raw` object, or `null`. The adapter matches both `shot.seriesId === string.id` and `shot.sourceId === string.sourceId`.
- `shotAnnotation`, `stringAnnotation`: the corresponding local annotation or `null`, with notes, legacy fields, typed values, tag IDs and any saved invalidation flag. These never overwrite imported attributes.
- `fields`: local custom-field definitions, keyed by the IDs used in annotation `values`.
- `tags`: definitions for tags assigned to either annotation; unrelated tags are omitted.

Use `DistanceCurveContext` to type a callback that reads these attributes. Existing sample-only helpers can keep accepting `DistanceCurveInput`. Both `available` and `calculate` receive full context in the application, including Simple, Dual and Compare. No profile, source configuration, authentication state, database handle or photo bytes are supplied.

Inside a callback, for example:

```ts
const stringName = input.string?.name;
const sourceNote = input.shot.raw.notes; // unknown: validate before using it
const localNote = input.shotAnnotation?.notes;
const definition = input.fields.find((field) => field.id === 'review-score');
const value = input.stringAnnotation?.values?.[definition?.id ?? ''];
// Zero is a valid assigned number; undefined means no value.
```

Use original values in their documented units. In particular, `input.string?.raw.weatherData` remains an unknown nested object; use `rawPath` and type checks before reading its properties. Pressure is **hPa** (owner-confirmed), temperature **°F**, and measured distance/velocity **ft / ft/s**. Unit conversion is not implicit. See the complete [measurement-unit reference](MEASUREMENT_UNITS.md), including custom-field units and unresolved provider metadata.

For a direct domain call outside the chart, supply the same local records:

```ts
const result = dispatchDistanceCurve(id, shot, undefined, undefined, {
  series: workspace.series,
  annotations: workspace.annotations,
  fields: workspace.fieldDefinitions,
  tags: workspace.tags,
});
```

The optional fifth argument is `DistanceCurveData`; the fourth remains the registry. `supportsDistanceCurve(curve, shot, data)` and `distanceQuantities(shots, units, data)` accept the same data. `buildAnalysisTraces` gets its strings from its existing second argument and optional local annotation/definition data in its tenth argument. React passes that context automatically. A direct call without data still supplies the complete shot, but string/annotations are null and definition arrays empty. Functions requiring that context should reject its absence in `available`.

The function runs separately for each eligible shot. The framework attaches shot/string identities after dispatch, so the implementation does not generate UI IDs or chart-series objects. Each callback receives a new detached copy; its input containers and arrays are recursively frozen, and outputs are copied. Original JSON-like raw metadata remains readonly without a whitelist; the source objects themselves are never frozen. Selection, measurements and annotations are never written by dispatch.

This is trusted application code, not a plugin sandbox. Keep callbacks deterministic, bounded and free of side effects. Do not read browser storage, fetch data, mutate imported values, or return a Promise. A synchronous infinite loop cannot be interrupted by the dispatcher. Load external input through the ordinary validated import flow.

## Output and missing data

- X is non-negative finite **feet**, strictly increasing, with no duplicates. Sort and resolve duplicates in your implementation if necessary; the example retains the last observation at each distance.
- Y is any finite number in your definition's canonical unit, including **zero and negative values**. Use `null` for a gap; never use NaN or Infinity for missing data.
- Return at most **5,000 points per shot**. Return `[]` when no curve can be produced, and make `available` reject missing inputs where possible.
- Only preserve `sampleIndex` for a direct original observation. Derived curves do not present their output positions as original sample numbers.

Missing inputs omit that shot. An exception or invalid derived output produces an empty result and a generic alert for the selected quantity, rather than breaking the other trace. Exception messages are not rendered or saved. Exceptions from `available` make its input unavailable. Invalid IDs, blank descriptions and incompatible axis transforms fail registration early during application startup; fix the definition and rebuild.

The first **100 eligible shots in table order** are evaluated per derived quantity, including String compare. Output length is checked after the function returns; it does not bound the function's internal CPU work. Ordinary recorded comparison keeps its existing behavior. Invalid/source-excluded/unselected shots do not enter the curves or their means.

String compare averages interpolated values only within each returned non-null segment. Null gaps remain disconnected; zero and negative values contribute normally. Mean hover links the exact contributors, and row hover highlights all relevant segments. Your function controls its own output range; the framework does not silently extrapolate it.

## Persistence and checks

Only quantity IDs and the existing forecast preference are saved. Function code and results are not browser settings and are not included in workspace backups. The receiving application build must register a restored ID to use it. A registered quantity with temporarily unavailable input stays saved and is shown as unavailable. Removing a definition makes the chart fall back to a supported choice; re-registering the same ID lets an unchanged saved preference resolve again. No database migration is needed.

Keep the existing IDs `velocity`, `calculated:g1` and `calculated:g7` unchanged. Recorded Velocity is the only implicit built-in. `calculatedVelocityG1.ts` and `calculatedVelocityG7.ts` each own a catalog definition, availability check and callback. The existing shared implementation is in `velocityCalculation.ts`; `domain/calculatedVelocity.ts` re-exports its public API for compatibility. No numerical behavior changes as part of this move.

Run:

```powershell
npm.cmd run verify
```

Add synthetic behavior tests for your function: known input/output, missing data, bounds, unit conversion, gaps and unchanged inputs. See [distance-curves.test.ts](../tests/distance-curves.test.ts) for dispatch/trace examples, [analysis-ui.test.tsx](../tests/analysis-ui.test.tsx) for saved-menu/description checks and [chart-interaction.test.tsx](../tests/chart-interaction.test.tsx) for separate axes and retained zoom. Mock registration is test-only and does not add the sample function to normal installations.

[Chart help](../help/analysis.md) · [Architecture](../ARCHITECTURE.md)

For every normalized record, provider path, unit caveat and local read/write API, see [Workspace data and access](DATA_ACCESS.md). That reference also distinguishes the complete workspace from the narrower curve callback input.

## Function organization

Each calculated quantity has a separate module beside `customDistanceCurves.ts`. At the start of its definition function, declare the stable ID, English display name, description, unavailable-input text, axis key and conversion constants with comments. At the start of calculation/helper functions, declare the constants and working variables with their purpose and units. Keep assignments that require validated inputs after the guard, and update loop-dependent values inside the loop. Keep the common calculation shared; separate quantity files own their selection-specific metadata and adapters.

The 0.11.0 catalog move preserves existing behavior and introduces no new model. See [decision 014](decisions/014-calculated-velocity-catalog.md).
