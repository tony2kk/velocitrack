# Calculated drop

Version 0.13.0 adds independent `curve:drop-g1` and `curve:drop-g7` entries to
`customDistanceCurves`. Each has its own implementation/metadata file. Both use
the existing shot muzzle velocity, matching BC, reference drag tables, input
bounds, standard atmosphere, forecast limit and sampling grid. See
[velocity research](VELOCITY_RESEARCH.md) for reference provenance and attribution.

## Meaning and units

- X: horizontal distance from the muzzle, canonical ft; display m/ft.
- Y: drop below the horizontal muzzle axis, positive downward, canonical mm;
  display cm/in. Both drop entries share axis key `drop`, separate from velocity.
- Initial drop and vertical slope: zero. Standard gravity: 9.80665 m/s²,
  the exact conventional value listed by [NIST](https://physics.nist.gov/cgi-bin/cuu/Value?gn).
- Standard conditions: 15 °C, 1013.25 hPa, dry still air; density 1.225 kg/m³ and
  sound speed 340.294 m/s. No local atmosphere adjustment is applied.

This value is not an observed target offset and has the opposite sign convention
to the target editor's V offset. It does not use a sight line or zeroing distance.

Since 0.13.2, the chart renders the shared `drop` axis inverted. Initial fitting
and reset put its canonical zero at the top, with padding only below the largest
drop. Values remain positive; no model, conversion or stored data changes are
involved. Simple, Dual and String compare use the same convention. A separate
velocity axis remains uninverted. Session zoom windows survive model/unit changes;
reset restores the zero baseline. Axis captions stay above the plot.

## Small-deflection model

The following is our derivation using the [NASA drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/)
and drag [opposing motion](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/what-is-drag/).
The approximation uses horizontal speed `v` for total speed and Mach, keeping
the existing velocity curve exactly unchanged. Let `w` be downward speed and
`q = w/v` the downward trajectory slope. With
`K(v) = rho*pi*Cd(v/a)/(8*BC_SI)`:

```text
dv/dt = -K(v)*v²
dw/dt = g - K(v)*v*w
dx/dt = v
d(log v)/dx = -K(v)
dq/dx = g/v²                  (the drag terms cancel in d(w/v)/dt)
dD/dx = q
D(0) = q(0) = 0
```

Equivalently, `D(x) = g * integral[0..x] (x-u)/v(u)² du`. We do not use
`D = g*t²/2` with drag-slowed flight time: that would omit the vertical component
of drag. With no drag the model reduces to the standard horizontal-launch
[vacuum result](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ballistic-flight-equations/).

The shared `calculatedFlight` kernel advances log speed, slope and displacement
at the same RK4 stages. Drop never feeds back into speed. Speed-only callers
skip drop work through the existing `calculatedVelocity` wrapper and retain its
original return shape and numerical results. Steps remain at most 1 m and 0.02
estimated log-speed change, with 10,000 internal steps and 201 output positions.
Non-finite drop terminates the curve at the last complete finite output.

The approximation assumes small vertical deflection. It does not solve a full
coupled trajectory with total-speed feedback, wind, changing atmosphere, lift or
Earth effects. The 1 km forecast cap is a work bound, not an accuracy guarantee.

## Verification and persistence

Independent analytic tests check the zero-drag parabola and constant-Cd case:
`D = g/v0² * [(exp(2kx)-1)/(4k²) - x/(2k)]`, where `v=v0*exp(-kx)`.
The latter includes vertical drag and is checked to within 0.002 mm at 1 km;
this is numerical tolerance for a synthetic model, not physical uncertainty.
Actual G1/G7-table checks verify identical speed output with/without drop, finite
monotonic drop, matching coefficients, missing/unsupported inputs, cm/in display,
separate/shared axes, tooltips, comparison contributors and work limits.

Chart quantity IDs and forecast distance use the existing profile/backup contract.
Curves are computed, never stored as source measurements. Round-trip tests restore
both drop choices and reproduce the curves from restored source records.

[User guide](../help/drop.md)
