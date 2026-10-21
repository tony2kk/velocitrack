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

## Compare experimental local velocity

In **Dual chart → Over distance**, keep **Velocity** as the measured quantity and
select **Calculated velocity (G1, local)** or **Calculated velocity (G7, local)**
as the second quantity. The original **Calculated velocity (G1)/(G7)** choices
still use standard atmosphere. You can also compare a standard and local variant
directly; both share the velocity scale and retain your zoom.

Local variants use each string's saved **Air density** and **Sound speed** throughout
the curve. They keep the shot's original muzzle velocity and matching BC. Refresh
or reimport older strings first if these quantities are missing. A local choice is
offered when at least one selected shot has the required inputs; unsupported shots
are omitted with an explanation. Missing weather never silently selects standard
conditions. A saved local selection survives temporarily unavailable weather.

These variants are **experimental**. They do not force the prediction through the
recorded samples or change their values. A smaller difference is not guaranteed.
They assume constant BC and still air; no wind, gravity or distance-offset correction
is added to velocity. Existing calculated drop remains a standard-atmosphere model.

The owner identified `distanceToChronograph` as the axial muzzle displacement
relative to the radar. Its unit, sign and any correction already performed by the
provider are pending field verification; it is preserved but not applied here.
Hover a curve to inspect its values and standard/local label. The plot no longer
opens a second general browser tooltip over the point-details window.

Local-curve choices and their atmosphere inputs round-trip through workspace
backups. Curves are recalculated from the restored values when viewed.

[Equations, assumptions and source units](../docs/ATMOSPHERE.md) · [Backup](backup.md)
