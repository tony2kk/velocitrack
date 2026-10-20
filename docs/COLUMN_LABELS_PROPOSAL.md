# Compact column labels — proposal

Proposed for review, not implemented in 0.13.0. Change presentation labels only;
keep record keys, column IDs, saved order and user-defined field names unchanged.

Use a short heading on the first line and its unit in smaller text on a second
line. Keep the full name, scope (shot/string), provenance and unit explanation in
a hover/focus tooltip and accessible label. The Columns picker can retain full
names, making abbreviations discoverable. Do not remove unknown-unit wording
until the unit has been validated.

| Current heading | Proposed heading (unit on second line) |
| --- | --- |
| Muzzle velocity (m/s or ft/s) | V₀ |
| G1 (Caldwell) / G7 (Caldwell) | BC G1 / BC G7 |
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
| String ballistic coefficient G1 / G7 (Caldwell) | String BC G1 / G7 |

Retain the String prefix where removing it would confuse a summary with a shot
measurement. Keep Firearm, Projectile, Humidity, Pressure, Altitude, Tags and
Status as ordinary words. Avoid unexplained single-letter headings other than
the conventional V₀ and already accepted H/V directions. A native title alone
is insufficient for touch or keyboard users; the full picker label and a
focusable description must remain available.

The proposal does not change conversion behavior or resolve unvalidated units.
