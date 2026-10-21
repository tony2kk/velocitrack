# Velocity modelling research

Reviewed 2026-10-19 for the owner's request to compare recorded velocity with a calculated curve. The owner clarified that the curve should start at muzzle velocity, include extrapolation, and offer separate G1/G7 alternatives. They subsequently agreed to omit independently recalculated BC attributes.

## What inputs are sufficient?

Two points suffice for linear interpolation within their interval, or a straight-line extrapolation outside it. This does not establish physical accuracy or quantify fit noise. A regression needs more observations than fitted parameters to estimate residual variance; a two-parameter line with two points has zero residual degrees of freedom. More sampled points allow residual checks, but are not automatically independent observations. See [NIST's regression definitions](https://www.itl.nist.gov/div898/strd/lls/data/LINKS/PARTS/defs.shtml).

The requested model-based alternative is different: start from recorded muzzle velocity and the matching recorded G1 or G7 BC, then integrate the reference drag model. Downrange sample pairs are not required. They provide comparison data rather than model inputs. A G1 coefficient must use the G1 reference shape, never the G7 table or a fixed conversion ratio. BC can vary with speed, so a constant recorded coefficient is an approximation; see [Lapua's explanation](https://www.lapua.com/lapua-blog-ballistics-basics-how-to-get-started/).

## Implemented model and provenance

The independent TypeScript implementation is a one-dimensional, drag-only, still-air speed model. It does not predict aim, impact, weapon configuration or ammunition changes. Numerical reference data are the 79 G1 and 84 G7 Mach/Cd pairs from the MIT-licensed [BallisticsToolkit reference](https://github.com/chasep255/BallisticsToolkit/blob/a4a83e5cfe32de7ff8e5c955c21343443d0cdf6c/src/ballistics/simulator.cpp), pinned to commit `a4a83e5cfe32de7ff8e5c955c21343443d0cdf6c`. Only table numbers are transcribed; no simulator code is reused. The source identifies the McCoy/JBM reference tabulations. Its attribution and complete MIT notice are retained in [public/third-party-notices.txt](../public/third-party-notices.txt). Direct JBM table URLs were unavailable during this review; no claim is made that their current downloads were independently verified.

Starting from the [NASA drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/), `D = rho * Cd * A * v² / 2`, and conventional G-model `BC = m / (i*d²)`, the straight-path speed equation is:

```text
BC_SI = BC_lb_per_in2 * 0.45359237 / 0.0254²
dv/dx = -rho * pi * Cd(v/a) * v / (8 * BC_SI)
d(log v)/dx = -rho * pi * Cd(v/a) / (8 * BC_SI)
```

Cd is linearly interpolated by Mach. RK4 integrates logarithmic speed to avoid negative velocities, with internal steps at most 1 m and at most 0.02 estimated log-speed change. Output has at most 201 positions. Inputs outside positive muzzle velocity/Mach 0–5 or BC 0.01–5 are unavailable, never clamped into valid data. The integration only clamps floating-point roundoff at the valid Mach-5 endpoint. Results start at muzzle zero and use canonical ft and ft/s at the domain boundary; profile units apply only when rendering.

The standard fallback uses explicit conditions: 15 °C, 1013.25 hPa, dry still air,
density 1.225 kg/m³ and sound speed 340.294 m/s. A constant BC and straight path
omit gravity, wind and atmosphere changes along the path. Since version 0.16.0 the two G1/G7 velocity quantities automatically use the
string's saved density and sound speed together, with explicit standard fallback; see [atmosphere contract](ATMOSPHERE.md). They preserve muzzle zero and the
original source BC. The configurable horizon is at most 1 km, a bounded display
limit rather than a claim of real-world validity at that distance. The owner
confirmed `distanceToChronograph` is always zero for VelociRadar: the muzzle is
beside the radar, aligned or at most 5 cm ahead. This field is deliberately ignored.
Revisit distance offsets only for a different device type, with a validated convention.

Every model uses each shot's own matching source BC and muzzle velocity. Simple/Dual can compare recorded and calculated curves on one velocity scale. Compare averages eligible predictions with contributor identities. Work is limited to the first 100 eligible shots per calculated quantity in current table order, including means; this is disclosed. Predicted curves/tooltips are identified and dashed, retain hover linkage, and never enter recorded summary statistics or overwrite samples. Range/quantity settings persist and round-trip through backups.

## Why no replacement G1/G7 attributes?

Independent coefficient estimation would require a validated atmosphere model, reference drag convention, reliable distance origin, and a measurement-error/validation protocol. Uncertainty and the distinction between dense raw radar tracks and processed summary readings matter. A [primary Doppler study](https://arxiv.org/abs/1608.06500) compares endpoint and track-regression methods, estimates slope uncertainty, and discusses signal quality and environmental inputs. It does not establish that this application's Caldwell arrays outperform Caldwell's own calculation. Signal-to-noise and sample processing semantics are not verified here. A lower fit residual is not evidence of better absolute BC accuracy. The owner agreed to omit replacement BCs; original Caldwell G1/G7 remain unchanged.

## Numerical verification

Tests compare RK4 with an independently derived analytic solution within a linear-Cd low-Mach interval and with exact piecewise analytic integration plus distance bisection for a 900 m/s synthetic muzzle input. G1 BC 0.5 and G7 BC 0.25 are checked at 100, 300 and 1,000 m, including transonic table transitions. The acceptance tolerance is 0.002 m/s for these numerical references, not an uncertainty bound on real measurements or model assumptions. Tests also cover missing/mismatched BCs, source immutability, units, limits, shared plotting axes, contributor identity and settings persistence. No live shooting accuracy claim is made.

[Back to chart help](../help/analysis.md)
