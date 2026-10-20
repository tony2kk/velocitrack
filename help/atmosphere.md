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
preserves them; reimport recalculates them. This release does not change the
standard atmosphere used by the existing calculated G1/G7 curves.

[Equations, assumptions and source units](../docs/ATMOSPHERE.md) · [Backup](backup.md)
