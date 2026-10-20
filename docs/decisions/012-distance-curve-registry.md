# 012 — Registered Over distance functions

Requested on 2026-10-20. The owner wants code-defined functions behind a generic chart interface, one function list for both quantity menus, a template, data dispatch and per-function descriptions below the chart.

## Contract

An ordered compile-time registry owns the existing distance quantities and optional custom definitions. The custom list starts empty; a working sample-transformation template is supplied without adding an unsolicited everyday menu entry. No runtime code editor, dynamic code loading or expression evaluation is introduced.

Custom functions receive detached, frozen canonical measured samples and the requested horizon. They return canonical distance/value points; presentation belongs to the descriptor. Provider records and private string metadata are not passed to generic callbacks. Built-in quantities retain their existing private adapters and numerical code unchanged.

Metadata supplies stable ID, unit-aware label, required plain-text description, canonical axis key and explicit display transform, availability, and optional forecast-field participation. Both menus, axis compatibility, descriptions, normalization and dispatch use the same registry. New definitions require one registration entry, not conditional branches in React/ECharts.

## Rendering and limits

Distinct canonical meanings use distinct axes and viewport memory; compatible meanings share a scale. Dual can use separate left/right axes in Over distance as well as By shot. Descriptions follow selected definitions, including both in Dual. All text remains escaped React text.

Derived output supports finite zero/negative Y and null gaps. Validate strictly increasing non-negative finite X and at most 5,000 points; catch callback failures without exposing arbitrary exception text or breaking another curve. Callbacks remain trusted synchronous application code, not a sandbox. The existing 100 eligible-shot work limit applies before derived callbacks, including comparison means.

Compare averages non-null returned segments and preserves exact hover contributors. No model assumptions or extrapolation are inferred by the renderer. The existing raw-data preservation, source compatibility and analysis-selection rules remain in force.

## Compatibility

Retain the built-in IDs, profile/backup structure, local origin and live zoom. Quantity IDs persist; custom implementation code and outputs do not belong in browser settings or backups. No schema, cloud, atmosphere-model or new numerical solver change is included. Pages deployment remains separate.

See [the extension guide](../DISTANCE_CURVES.md) for the template, units, registration and testing workflow.
