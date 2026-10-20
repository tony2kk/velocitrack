# 014 — Calculated velocity in the custom catalog

Requested on 2026-10-20 for minor release 0.11.0. Move the existing Calculated velocity functions into the ordinary custom-function catalog, with each quantity in its own file and documented declarations at the start of functions. Target-image connection/processing belongs to the following release and is not implemented here.

## Organization and compatibility

- `calculatedVelocityG1.ts` and `calculatedVelocityG7.ts` each own their quantity definition, availability check and callback.
- `customDistanceCurves.ts` explicitly lists both definitions in the desired menu order. Recorded velocity is the only implicit built-in.
- `velocityCalculation.ts` contains the existing shared calculation and helpers, moved beside the custom functions. Keep shared behavior in one implementation.
- `domain/calculatedVelocity.ts` remains a compatibility export path for existing consumers.
- Preserve `calculated:g1` and `calculated:g7` for saved preferences, backups and tooltip metadata. New user definitions still use `curve:<name>`. No migration is needed.

G1/G7 now use the same detached readonly context and validated output path as other custom functions. Existing numerical constants, operation order, limits, input validation, forecast behavior, unit conversions and outputs remain unchanged. No new model or atmospheric correction is included.

## Declaration convention

Put the quantity ID, English display name, description, unavailable-input text, axis key and display conversion constants at the start of its definition function. Put calculation constants and working-variable declarations at the start of their respective functions, with English purpose/unit comments. Guard-dependent assignments remain after validation; loop-dependent assignments remain inside their existing loops. This avoids evaluating invalid inputs merely to initialize a declaration early.

The shared calculation file has a documented `prefer-const` lint exception solely to allow leading `let` declarations whose single assignment must remain after validation or a completed search. Other lint rules and files retain the existing policy.

The existing numerical regression suite remains the behavior baseline. Add catalog tests for independent registration/removal, legacy ID uniqueness and parity between direct calculation and custom dispatch. Preserve unrelated local work and keep Pages deployment separate.
