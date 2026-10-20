[Help home](README.md) / Calculated drop

# Compare theoretical drop over distance

Choose **Over distance**, then **Calculated drop (G1)** or **Calculated drop (G7)**
in Quantity or Second quantity. Each uses the shot's original muzzle velocity and
matching G1/G7 coefficient. Choose Dual to compare drop with velocity on separate
vertical axes, or compare G1 with G7 on a shared drop axis. String compare averages
the supported shots in each string.

Drop starts at zero at the muzzle and is **positive downward from a horizontal
axis through the muzzle**. The vertical unit is **cm** for Metric and **in** for
Imperial; horizontal distance remains m/ft. It is independent of the measured
vertical target offset, whose positive direction is upward from POA.

The model uses the same standard atmosphere as calculated velocity: 15 °C,
1013.25 hPa, dry air, no wind and a constant recorded BC. Standard gravity adds
a small-deflection estimate while leaving the existing horizontal speed model
unchanged. Local weather, sight zero, sight height, launch-angle adjustment and
large-deflection flight are not included. This is a theoretical curve, not a
prediction of a measured target offset.

Dashed styling and point tooltips identify the model. Forecast distance and chart
zoom work as for velocity; reset fits the current data. Up to 100 eligible shots
per quantity and a 1 km maximum forecast keep calculations bounded. These limits
do not establish physical accuracy over that range. If the matching BC or muzzle
velocity is missing or unsupported, that shot has no calculated curve.

Your chart choices are included in workspace backups. Curves are recomputed from
the restored records; source values and recorded summary statistics stay intact.

[Model, derivation and verification](../docs/DROP_MODEL.md) · [Charts](analysis.md) · [Backup](backup.md)
