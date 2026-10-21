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
variables are not inputs to these ambient properties. G1/G7 velocity uses automatic selection below; drop retains fixed standard conditions.

## Automatic velocity atmosphere — 0.16.0

Only `calculated:g1` and `calculated:g7` are offered. Each definition stays in its own
catalog module and selects both saved string estimates together when positive and
finite. Missing/invalid values or a missing source-scoped parent select the complete
standard pair (density 1.225 kg/m³, sound speed 340.294 m/s). Unsupported muzzle/BC
inputs remain unavailable; changing atmosphere never substitutes another BC.
Raw weather is not recalculated into stored attributes while plotting. Older imports
still need refresh/reimport to populate these estimates.

The drag integrator accepts explicit fixed `FlightAtmosphere`. Local density sets the
drag multiplier and sound speed sets `Mach = v / soundSpeed` for the reference table
and input-domain check. Both properties remain constant along the curve. Standard
fallback preserves the original numerical path. The drag and acoustic relations
follow the [NASA drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/)
and [sound-speed derivation](https://www.grc.nasa.gov/www/k-12/BGP/snddrv.html),
reviewed 2026-10-21; reference provenance is in [velocity research](VELOCITY_RESEARCH.md).

The optional custom-curve `conditions(input)` callback uses the same selection policy.
Individual/mean tooltips and chart descriptions identify local or standard fallback.
The `Atmosphere: … °C, … hPa, … air` line reconstructs station pressure from original
weather using the same validation/equations as import; it does not display sea-level
pressure as station pressure. Humid air states % RH; pressure has two decimal places.
Different plotted string conditions are listed separately, never averaged. Only
eligible shots within the plotting cap contribute. An archive with valid saved
estimates but missing/invalid raw weather shows the actual density/sound speed and
states that weather details are unavailable. Source/derived data remain untouched.

Existing 0.15 local IDs normalize to their corresponding canonical G1/G7 choice in
saved profiles and restored archives. A former standard/local pair of the same family
collapses to one trace set. Forecast and unit/viewport behavior stay unchanged.

Muzzle velocity, source BC, coordinates, RK4 bounds and output units are unchanged.
No fitting, sample anchoring, wind, spin drift, Coriolis or radar offset is added.
G1/G7 drop retains standard conditions. Provider BC normalization is not fully
documented, so local inputs alone do not establish improved field accuracy.

On 2026-10-21 the owner clarified that `distanceToChronograph` is always zero for
VelociRadar. The muzzle must be beside the radar, aligned or at most 5 cm ahead.
The field is preserved but deliberately ignored by these models. No offset feature
is planned for VelociRadar; revisit the distance-origin contract only if another
device type supplies data that requires it.

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
