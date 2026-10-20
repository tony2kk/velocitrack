# Add an Over distance curve

Curve definitions live in TypeScript and are compiled with the application. Both **Quantity** and **Second quantity** use the same registry. The renderer consumes canonical sample arrays and metadata through `dispatchDistanceCurve`; adding an extension does not require editing React or ECharts code.

## Files to use

| File | Responsibility |
| --- | --- |
| [types.ts](../src/domain/distanceCurves/types.ts) | Public extension input, output and definition contracts. |
| [template.ts](../src/domain/distanceCurves/template.ts) | Working example: subtract the first observed value from measured samples. |
| [customDistanceCurves.ts](../src/domain/distanceCurves/customDistanceCurves.ts) | Ordered list of your imported definitions. Empty by default. |
| [registry.ts](../src/domain/distanceCurves/registry.ts) | Built-in adapters, registration checks, availability and dispatch. |

## Register your first implementation

To try the included example, edit `customDistanceCurves.ts`:

```ts
import type { CustomDistanceCurve } from './types';
import { centeredSamplesCurve } from './template';

export const customDistanceCurves: readonly CustomDistanceCurve[] = [
  centeredSamplesCurve,
];
```

Run `npm.cmd run verify` and rebuild/reload your local application. Select a string with measured distance samples, then choose **Over distance**. **Measured change from first sample** is offered in both quantity menus. Its description appears below the chart when selected. Select it as the second quantity beside Velocity to see its independent vertical scale.

For a new function, copy `template.ts` to a new module, rename the exported function and definition, change the ID, then import that definition into the list above. List order is menu order, after the built-ins. There is no second list for Dual chart and no UI expression editor.

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

IDs must be unique. Definitions sharing `axisKey` must use the same transforms in both unit systems; registration rejects inconsistent scales. Compatible quantities share one Y axis. Other quantities get the right Y axis in Dual, and the vertical slider controls both. The viewport keeps independent numerical ranges by axis meaning.

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

`DistanceCurveInput` contains:

- `samples`: detached readonly measured pairs, with `distance` in **ft**, `value` in **ft/s**, and the original optional `sampleIndex`. Input has already omitted paired `[0, 0]` padding, invalid pairs and unmatched tails. A zero-distance sample with positive recorded velocity remains valid. Original order and duplicate distances are retained.
- `maxDistance`: the current requested horizon in **ft**, default 1,000 ft, with the existing maximum of 1 km. `available` receives the default horizon and must decide availability from samples, independently of the horizon. `calculate` receives the selected horizon.

Custom functions receive this generic sample contract, not mutable Shot/Series objects, raw provider metadata, profile records or a database handle. The built-in adapters privately read their existing domain inputs. Extend domain adapters deliberately when a new, validated contract is required; do not make the renderer inspect raw fields.

The function runs separately for each eligible shot. The framework attaches shot/string identities after dispatch, so the implementation does not generate UI IDs or chart-series objects. Input objects and arrays are frozen; outputs are copied. Selection, measurements and annotations are never written by dispatch.

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

Keep the built-in IDs `velocity`, `calculated:g1` and `calculated:g7` unchanged. Their numerical implementations remain in their existing modules; the registry supplies adapters, presentation metadata and dispatch.

Run:

```powershell
npm.cmd run verify
```

Add synthetic behavior tests for your function: known input/output, missing data, bounds, unit conversion, gaps and unchanged inputs. See [distance-curves.test.ts](../tests/distance-curves.test.ts) for dispatch/trace examples, [analysis-ui.test.tsx](../tests/analysis-ui.test.tsx) for saved-menu/description checks and [chart-interaction.test.tsx](../tests/chart-interaction.test.tsx) for separate axes and retained zoom. Mock registration is test-only and does not add the sample function to normal installations.

[Chart help](../help/analysis.md) · [Architecture](../ARCHITECTURE.md)

For every normalized record, provider path, unit caveat and local read/write API, see [Workspace data and access](DATA_ACCESS.md). That reference also distinguishes the complete workspace from the narrower curve callback input.
