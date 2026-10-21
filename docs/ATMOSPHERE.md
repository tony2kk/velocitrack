# String atmosphere

Version 0.14.0 adds optional derived string attributes `airDensity` (kg/m³) and
`soundSpeed` (m/s). Both are computed together during every successful import or
reimport. They are estimates from source weather, separate from `Series.raw` and
local annotations. No user data is shipped with the application.

## Required source inputs

| String raw path | Source unit and meaning | Calculation input |
| --- | --- | --- |
| `weatherData.temperature` | °F, actual temperature | `(F - 32) * 5 / 9` °C |
| `weatherData.humidity` | % relative humidity, interpreted over water | 0–100 % |
| `weatherData.pressure` | hPa reduced to sea level | multiply by 100 for Pa |
| `altitude` | ft above sea level | multiply by 0.3048 for m |

These are the supported Caldwell/export semantics, with the pressure and altitude
units confirmed by the owner. Do not substitute feels-like/minimum/maximum
temperature, wind, a provider unit enum or an assumed sea-level elevation.
Only finite numbers are accepted; strings, blanks and booleans are not coerced.
Zero humidity and zero/negative elevation are legitimate values, not missing data.

The calculation accepts temperature from −40 to +50 °C, humidity 0–100 %, and
elevation −500 to 11,000 m for the pressure estimate. Total pressure must be finite,
positive and greater than water-vapor partial pressure. These bounds define the
implemented approximation's input domain, not an accuracy guarantee.

Missing or invalid required input sets **both** attributes to `null`. It does not
fail an otherwise valid measurement import. No standard-atmosphere fallback is
used. A reimport replaces the previous result, including replacing stale numbers
with null; strings absent from the download remain unchanged.

## Pressure in the measurement location

Mean sea-level pressure is not station pressure. Its original reduction can depend
on a vertical temperature profile and time-averaged weather that the source does
not expose. Therefore it cannot be exactly inverted from these four fields alone.
See [NWS pressure definitions](https://www.weather.gov/bou/pressure_definitions).

Our explicit estimate uses the hypsometric relation, with a dry-column mean
temperature approximated from the current local temperature and a 0.0065 K/m
lapse rate. With local absolute temperature `T`, elevation `h`, dry-air gas
constant `Rd = 287.05 J/(kg·K)` and `g = 9.80665 m/s²`:

```text
Tmean = T + 0.0065 * h / 2
p = pSea * exp(-g * h / (Rd * Tmean))
```

The hydrostatic/hypsometric basis and standard lapse rate are described in
[Stull, Practical Meteorology, chapter 1, sections 1.5 and 1.8](https://www.eoas.ubc.ca/books/Practical_Meteorology/prmet102/Ch01-atmos-v102b.pdf).
Using the dry-column mean is our approximation; the actual vertical moisture and
temperature profiles are unavailable. Humidity is included in the local density
and sound-speed calculations below. At zero elevation, `p = pSea` exactly.
This is not the altimeter-setting conversion, nor an assumed standard pressure.

The reusable `calculateAtmosphere` function also accepts explicitly measured
`stationPressurePa` instead of `seaLevelPressurePa` plus `altitudeM`. Its tagged
`pressureSource` distinguishes the two routes. The import adapter always uses the
sea-level route because that is the confirmed meaning of the source field.

## Magnus vapor pressure and ideal-gas density

For `t` in °C, `T = t + 273.15` in K, RH in percent and pressures in Pa:

```text
es = 610.94 * exp(17.625 * t / (243.04 + t))
e = RH / 100 * es
rho = (p - e) / (Rd * T) + e / (Rv * T)
Rd = 287.05 J/(kg·K)
Rv = 461.495 J/(kg·K)
```

The saturation-pressure coefficients are the Alduchov–Eskridge Magnus water fit,
documented in [the 1996 paper](https://sce.nau.edu/capstone/projects/ME/2025/SP25toF25_SRPEvap/Documents/Evaporation%20Equations%20for%20data.pdf)
and reproduced in [Ferreira et al., Appendix D](https://rmets.onlinelibrary.wiley.com/doi/10.1002/qj.4609).
Below freezing it remains the liquid/supercooled-water convention, not an ice fit.
Density sums the two ideal-gas partial densities; see the ideal-gas and moist-air
discussion in [NWS/Bureau of Meteorology course notes](https://www.weather.gov/media/zhu/ZHU_Training_Page/winds/pressure_winds/Temp_Density_Pressure.pdf).
The compressibility factor is fixed at `Z = 1`; no real-gas or vapor-enhancement
correction is applied.

## Sound speed

The ambient sound-speed estimate uses the same local pressure, temperature and
vapor fraction. For an ideal mixture, `x = e/p` is the water-vapor mole fraction.
Use constant molar heat capacities `Cv/R = 2.5` for dry air and `3` for water vapor
(ideal diatomic and nonlinear triatomic approximations):

```text
gamma = 1 + 1 / ((1 - x) * 2.5 + x * 3)
c = sqrt(gamma * p / rho)
```

The acoustic relation is derived by [NASA](https://www.grc.nasa.gov/www/k-12/BGP/snddrv.html).
This implementation uses a simple constant-heat-capacity mixture, not temperature-
dependent thermodynamic tables. Dry air reduces to `sqrt(1.4 * Rd * T)`; humidity
changes both composition and the heat-capacity ratio. No real-gas, acoustic
relaxation or frequency-dependent correction is applied. Sound propagation itself
is a small pressure perturbation; `Z = 1` does not mean an incompressible medium.

Wind, spin drift, Coriolis effects, projectile configuration and other motion
variables are not inputs to these ambient properties. The original G1/G7 velocity
and drop curves retain their standard-atmosphere constants.

## Experimental local velocity — 0.15.0

Two additional custom catalog entries, `curve:velocity-g1-local` and
`curve:velocity-g7-local`, read the matching string's saved density and sound speed.
Each has its own definition/callback module. Both values must be positive finite
numbers; missing context or either missing estimate makes the local variant
unavailable. No raw-weather recomputation or standard fallback occurs during plotting.

The existing drag integrator accepts an explicit `FlightAtmosphere`. Standard
callers keep the same default constants and numerical path. Local density replaces
the drag multiplier's density; local sound speed sets `Mach = v / soundSpeed` for
the same G1/G7 reference table and input-domain check. Both properties are held
constant along the curve. The drag/density relation and acoustic interpretation
follow the [NASA drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/)
and [sound-speed derivation](https://www.grc.nasa.gov/www/k-12/BGP/snddrv.html),
reviewed 2026-10-21. The existing equation and reference-table provenance are in
[velocity research](VELOCITY_RESEARCH.md).

The muzzle velocity, matching source BC, distance coordinates, forecast limits,
RK4 bounds and output units remain unchanged. No sample anchoring, BC fitting,
wind, spin drift, Coriolis or radar/muzzle offset correction is introduced.
G1/G7 drop retains standard conditions. The new variants are explicitly
experimental: the provider's BC derivation and atmospheric normalization are not
fully documented, so using local inputs does not establish better field agreement.

Simple/Dual/Compare share the normal velocity axis, unit conversion and viewport
memory. Comparisons use each string's own atmosphere; unavailable shots are omitted
through the existing availability and contributor pipeline. Curve metadata labels
both individual and mean tooltips as local/experimental. Generic chart hover help
is an accessible description rather than a competing native browser tooltip.

On 2026-10-21 the owner confirmed `distanceToChronograph` means axial muzzle
displacement relative to the radar. Its units, sign convention and any prior
provider correction of exported distances remain unresolved. No distance correction
is applied before the owner's planned 2026-10-25 measurements.

## Display, custom functions and persistence

| Attribute | Stored / custom-function unit | Metric display | Imperial display |
| --- | --- | --- | --- |
| `Series.airDensity` | kg/m³ | kg/m³ | lb/ft³, factor `0.3048³ / 0.45359237` |
| `Series.soundSpeed` | m/s | m/s | ft/s, divide by `0.3048` |

The scalar IDs are `airDensity` and `soundSpeed`. They are available in By shot
charts, String compare, Columns and String info. Each shot inherits its string's
value; the table tooltip explains the estimate. String info shows an em dash for
unavailable values and explains the required source inputs. Pressure is labeled
hPa (sea-level); altitude displays m/ft using its confirmed input unit.

Custom distance callbacks can read `input.string?.airDensity` and
`input.string?.soundSpeed` from the existing detached readonly context. They must
handle both absent and null values; neither means zero or a standard atmosphere.

Existing stored strings and older archives may omit both properties. There is no
automatic historical backfill: refresh/reimport those strings to calculate them.
No IndexedDB schema change is needed. ZIP backups retain both values and their
raw inputs exactly; restore does not recalculate them under a newer model.
Validation accepts absent/null or positive finite values and rejects malformed
attributes before writing. Chart/column choices use the existing profile contract.

## Review and verification

The discarded Energy retention experiment, its disabled catalog import and tests
were removed. The standalone atmosphere experiment's ISA-only pressure fallback
was replaced with explicit measured/sea-level input contracts. Both results are
now calculated once per imported string within the existing atomic write path.

Synthetic tests cover dry-air reference values, humid density, independent
mass-weighted sound-speed heat capacities, pressure/temperature dependence,
sea-level equivalence, below-sea-level elevation, unsupported input, source-unit
conversion and raw preservation. Storage tests exercise both source types,
reimport invalidation, transaction rollback, ZIP round trips, legacy archives and
readonly custom access. Component tests cover units, scalar charts, table columns
and absent/present String info values. Numerical agreement does not validate the
source sensors or its undocumented sea-level reduction method.

[User guide](../help/atmosphere.md) · [Units](MEASUREMENT_UNITS.md)
