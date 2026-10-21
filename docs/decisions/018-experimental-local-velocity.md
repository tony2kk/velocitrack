# 018 — Experimental local-atmosphere velocity

Accepted with the owner on 2026-10-21.

- Keep the original standard-atmosphere G1/G7 quantities and stable IDs.
- Add separate G1/G7 local velocity definitions to the custom distance catalog,
  each in its own file. Use the matching string's saved `airDensity` (kg/m³) and
  `soundSpeed` (m/s); require both and never silently fall back.
- Feed those fixed values into the shared drag calculation and Mach-domain check.
  Preserve muzzle velocity, original BC, sample coordinates and bounded integration.
- Label local curves and individual/mean tooltips as experimental. Do not fit BC,
  anchor curves to measured samples or claim better accuracy before field comparison.
- Preserve existing calculated drop under standard conditions in this batch.
- The owner confirmed `distanceToChronograph` means axial muzzle displacement
  relative to the radar for the string. Its source unit, sign and prior provider
  correction are pending verification with measurements planned for 2026-10-25.
  Preserve the field and do not apply an offset yet.
- Remove the general native tooltip from the chart surface so it cannot overlap
  point details; retain its instructions as an accessible description.
- Keep local-curve selection and atmosphere inputs in existing workspace backups.
  No schema migration or server infrastructure is needed. No Pages deployment.

See [atmosphere contract](../ATMOSPHERE.md) and [user guide](../../help/atmosphere.md).
