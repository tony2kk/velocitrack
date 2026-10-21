# 019 — Automatic velocity atmosphere

Accepted with the owner on 2026-10-21; supersedes the separate choices in decision 018.

- Keep only Calculated velocity (G1)/(G7), with canonical IDs `calculated:g1/g7`.
- Use each source-scoped string's positive finite saved air density and sound speed
  together; otherwise use the original standard pair. Never mix a partial local pair
  with standard values. Import/reimport remains responsible for the saved estimates.
- Below the chart and in point/mean tooltips, disclose actual local/standard provenance.
  Show `Atmosphere: … °C, … hPa, … air`, with humidity and estimated station pressure
  for local conditions. Different strings' conditions remain separate. If saved
  estimates lack raw weather, identify the estimates without inventing source values.
- Map historical local selections to the matching canonical model on read/save,
  including old ZIP recovery. Collapse duplicate standard/local choices of one family
  to one trace set. Preserve all source data, forecast preferences and atmosphere inputs.
- Keep each model in its own catalog file. A shared resolver selects atmosphere for
  availability, calculation and the optional custom-curve `conditions` callback.
- Drop remains under its stated standard conditions. No numerical integration, BC
  fitting, sample anchoring or radar-distance correction changes are included.
- No database/backup format migration or Pages deployment is needed.

See [Atmosphere](../ATMOSPHERE.md) and [user help](../../help/atmosphere.md).

The owner subsequently clarified in this batch that VelociRadar always reports
`distanceToChronograph = 0` and requires the muzzle beside the radar, aligned or
at most 5 cm ahead. Keep this metadata unused. Distance correction is deferred
until a different device type requires its own verified contract.
