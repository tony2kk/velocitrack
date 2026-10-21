[Help home](README.md) / Air density and sound speed

# Air density and sound speed

Refresh your Caldwell source or reimport a JSON/text export to calculate these
two string attributes from its weather. Open **String info** to see them, enable
**Air density** / **Sound speed** in **Columns**, or select them for a **By shot**
chart or **String compare**. Every shot inherits its string's values.

Air density uses **kg/m³** in Metric or **lb/ft³** in Imperial. Sound speed uses
**m/s** or **ft/s**. Changing display units does not change the stored values.

Both estimates require source temperature, relative humidity, sea-level pressure
and elevation. Missing or unsupported input displays **—**. Older strings need a
refresh/reimport first. A later import with incomplete weather clears previous
estimates rather than retaining numbers from different conditions.

Caldwell pressure is reduced to sea level, so local pressure must be estimated
from elevation and temperature. Air density uses the Magnus water-vapor
approximation and ideal gases; sound speed uses an ideal moist-air mixture.
These are estimates, not additional device measurements. The supported temperature
range is −40 to +50 °C; humidity is 0–100 %, elevation −500 to 11,000 m.

The values and chart/column choices are included in workspace backups. Restore
preserves them; reimport recalculates them.

## Compare calculated velocity

In **Dual chart → Over distance**, keep **Velocity** as the measured quantity and
select **Calculated velocity (G1)** or **Calculated velocity (G7)** as the second
quantity. There is only one choice per drag family. Each shot automatically uses
its string's saved **Air density** and **Sound speed** when both are valid; otherwise
it uses the standard pair (1.225 kg/m³, 340.294 m/s). A partial local pair never mixes
with standard values. Refresh/reimport older strings to calculate missing estimates.

Below the chart and in point details, **Atmosphere: … °C, … hPa, … air** explains
which conditions were selected. Local pressure is the estimated station pressure,
not the sea-level pressure in the original weather record. Humid air includes % RH.
A standard fallback is explicitly labeled. Different conditions across selected
strings are listed with their string names. If an archive contains estimates without
raw weather, their density/sound speed are shown instead of inventing weather values.
The conditions note always uses °C and hPa; chart values follow profile units.

The original muzzle velocity and matching source BC remain unchanged. These are
model estimates, not fitted readings; a smaller difference is not guaranteed.
Velocity assumes constant BC, fixed conditions and still air, without gravity or
distance-offset correction. Calculated drop keeps its stated standard atmosphere.

For VelociRadar, the owner confirmed that `distanceToChronograph` is always zero.
The muzzle should be beside the radar, aligned or at most 5 cm ahead. No distance
correction is applied. A different device type would need its own validated convention.
Hover a curve to inspect its values and standard/local label. The plot no longer
opens a second general browser tooltip over the point-details window.

Current choices and atmosphere inputs round-trip through workspace backups.
Older separate local choices restore as the corresponding automatic G1/G7 model. Curves are recalculated from the restored values when viewed.

[Equations, assumptions and source units](../docs/ATMOSPHERE.md) · [Backup](backup.md)
