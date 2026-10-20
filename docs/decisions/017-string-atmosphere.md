# 017 — Derived string atmosphere

Owner requests accepted 2026-10-21; release 0.14.0.

- Remove the discarded Energy retention experiment and review the standalone
  atmosphere library before using it in imports.
- Add optional `Series.airDensity` in kg/m³ and `Series.soundSpeed` in m/s,
  separate from untouched source metadata and local annotations.
- Calculate both once per string during each successful import/reimport using
  available source temperature (°F), RH (%), sea-level pressure (hPa) and
  elevation (ft). All four inputs are required. Missing/unsupported input clears
  both derived values to null; it does not fail the measurement import.
- Use Magnus saturation pressure over water and an ideal dry-air/water-vapor
  mixture. Estimate station pressure with an explicitly documented dry-column
  hypsometric reduction; never use sea-level pressure as station pressure or
  silently substitute standard weather. Sound speed uses constant ideal-mixture
  heat capacities. See ATMOSPHERE.md for equations, bounds and limitations.
- No real-gas correction, wind, spin, Coriolis effects or inferred projectile
  variables. Existing G1/G7 curve computations remain unchanged.
- Display kg/m³ or lb/ft³ and m/s or ft/s according to the local profile. Make both
  attributes available to String info, tables, scalar charts and custom callbacks.
- Keep old stored records/archives valid without backfilling. Refresh/reimport
  computes absent values. Backups retain values and raw inputs exactly; restore
  validates but does not recompute. No schema/ZIP format migration is needed.

Pages deployment remains a separate instruction.
