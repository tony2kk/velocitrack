# Compact column labels

Approved by the owner on 2026-10-20 and implemented in 0.13.1, with G1/G7 shown
without a BC prefix or Caldwell suffix. This changes presentation labels only;
record keys, column IDs, saved order and user-defined field names stay unchanged.

Short headings use a separate, subdued unit line. Full names, scope (shot/string),
provenance and unit explanations remain available on hover, keyboard focus or tap.
Escape, blur, an outside tap or scrolling dismisses the explanation. The Columns
picker retains full names, except the shortened G1/G7 labels. Source-unit wording
is preserved; this release does not change conversions or infer missing units.

| Original heading | Compact heading (unit on second line) |
| --- | --- |
| Muzzle velocity (m/s or ft/s) | V₀ |
| G1 (Caldwell) / G7 (Caldwell) | G1 / G7 |
| String group size (cm or in) | Group size |
| String horizontal offset (cm or in) | Offset H |
| String vertical offset (cm or in) | Offset V |
| Projectile weight (g or grs) | Proj. mass |
| Projectile diameter (source units) | Proj. diameter |
| Distance to chronograph (source units) | Chrono dist. |
| Source unit code | Unit code |
| Shot notes (Caldwell) / String notes (Caldwell) | Shot notes / String notes |
| Temperature / Temperature min / Temperature max | Temp. / Temp. min / Temp. max |
| Feels like temperature | Feels like |
| String average / minimum / maximum (Caldwell, velocity unit) | String mean / min / max |
| String standard deviation / spread (Caldwell, velocity unit) | String SD / ES |
| String ballistic coefficient G1 / G7 (Caldwell) | String G1 / G7 |

Retain the String prefix where removing it would confuse a summary with a shot
measurement. Keep Firearm, Projectile, Humidity, Pressure, Altitude, Tags and
Status as ordinary words. Avoid unexplained single-letter headings other than
the conventional V₀ and already accepted H/V directions. A native title alone
is insufficient for touch or keyboard users; the full picker label and a
focusable description must remain available.

Units are structured metadata on scalar quantities and columns, never extracted
from a field name. A custom name containing parentheses stays intact. Unitless
quantities, including G1/G7, have no unit line. The Analyze checkbox precedes its
label. Sorting remains a separate button with its original stable column ID.

There are no new persistent settings or measurement fields. Existing backups and
saved visibility/order restore without migration; label metadata is supplied by
the installed application version.
