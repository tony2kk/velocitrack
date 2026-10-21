[Help home](README.md) / Charts

# Explore your measurements

Choose a view in **Analysis**, between Filters and Tools.

| View               | Use it for                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Simple chart**   | One quantity across selected shots.                                                          |
| **Dual chart**     | Two quantities together, including recorded versus calculated velocity.                      |
| **String compare** | A separate curve for each string.                                                            |
| **String info**    | Dates, notes, conditions, original statistics, tags, and custom values. Works without shots. |

## Choose an axis and quantity

**String info** lists all selected strings, including strings without shots. Expand
**Complete string data (JSON)** for every stored attribute, original provider field
and local annotation in its stored units and precision. The PDF's **Chart / String
info** section includes these complete records for all selected strings as well.

**By shot** shows one reading per shot: velocity, Caldwell G1/G7, recorded conditions, known projectile mass, or a numeric custom field. Only supported choices are offered.

**Over distance** shows recorded velocity samples or a calculated G1/G7 velocity curve when inputs exist. A custom application build can also register additional curves. Each selected function has its own description below the chart; Dual shows both. Simple/Dual recorded views show the first 100 selected shot traces. String compare averages traces within their non-null returned ranges.

Each view remembers its axis and quantities. Changing to an incompatible axis selects a suitable quantity. A saved quantity temporarily missing from selected data stays saved with a no-readings label.

## Compare measured and calculated velocity

1. Choose **Dual chart** and **Over distance**.
2. Set **Quantity** to **Velocity**.
3. Set **Second quantity** to **Calculated velocity (G1)** or **Calculated velocity (G7)**.
4. Set **Forecast distance**, then leave the field or press Enter to save it. The field controls the right edge of the visible distance axis; horizontal zoom updates it too.

The model starts at the recorded muzzle velocity at distance zero. It uses that shot's matching Caldwell coefficient: G1 uses G1, G7 uses G7. Two downrange samples are not required. You can also compare G1 and G7 predictions directly.

> [!NOTE]
> Dashed calculated curves are estimates, including beyond measured distances. They assume 15 °C, 1013.25 hPa, dry still air, constant BC, and a straight path. They do not correct for gravity, wind, or recorded weather. Predicted zero is the muzzle; the origin of recorded distance samples has not yet been independently confirmed.

Shots without supported muzzle velocity or matching BC are omitted. Each calculated quantity uses at most the first 100 eligible shots in table order, including comparison means. Forecast distance is limited to 1 km; this is a display limit, not an accuracy guarantee. Supported BC values are 0.01–5 and muzzle speeds must be within Mach 0–5.

Original Caldwell G1/G7 values remain unchanged. VelociTrack does not claim a more accurate replacement coefficient. The reasoning and sources are in the separate [calculation research note](../docs/VELOCITY_RESEARCH.md).

## Read and explore

Hover or tap a point for its value and identity. Recorded traces identify the original sample; calculated tooltips identify the model. Mean tooltips show contributor counts. Hovering a mean highlights contributor rows; hovering a row highlights the mean values it contributes to.

Use the bottom slider to zoom distance/shot order and the right slider for the vertical axis. The chart updates continuously while dragging either slider. Zoom changes the view, not selection. Compatible quantities share a scale; unrelated quantities use separate labeled vertical axes in Dual, including Over distance. Recorded and calculated velocities still share one velocity scale.

Chart ranges stay in place when changing quantities, selection, table order or theme. Recorded and calculated velocities share a remembered numerical scale. Unrelated quantities have their own ranges; switching back restores the earlier view. Changing display units converts the retained bounds. These viewports last for the current page session; the existing forecast-distance preference is saved locally.

The **Reset chart scales** icon in the chart's bottom-right corner fits both axes to the currently available plotted data. Use it to bring newly selected data outside a previous zoom into view. It does not change filters or selected shots.

**Forecast distance** and the visible right edge are linked while a calculated distance quantity is selected. Changing the field preserves the left edge and vertical zoom; if the new right edge would cross the left edge, the left edge returns to zero. The slider retains its larger navigable domain when zooming in, so you can expand the view again. The existing forecast limit still applies.

Hover over chart controls, summary cards, the reset button and other workspace controls for short explanations. Point tooltips continue to show the selected sample's identity and values.

Summary cards always describe included valid recorded muzzle velocities, regardless of chart quantity. G1/G7 are not recalculated and predictions never replace stored measurements.

**Related:** [Select and sort shots](shots.md) · [Units and display](profile.md)

For code-defined functions, see the contributor [Over distance extension guide](../docs/DISTANCE_CURVES.md).

## Calculated drop

G1/G7 drop is available over distance with vertical units **cm/in** and fixed
standard atmosphere. Velocity selects local conditions automatically when available.
Drop is positive downward from the
horizontal muzzle axis and uses a small-deflection gravity approximation. See
[Calculated drop](drop.md) for the reference, controls and limitations.

For automatic local/standard velocity selection and the conditions shown below each chart, see [Air density and sound speed](atmosphere.md).
