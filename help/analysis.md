[Help home](README.md) / Charts

# Explore your measurements

Choose a view in **Analysis**, between Filters and Tools.

| View | Use it for |
| --- | --- |
| **Simple chart** | One quantity across selected shots. |
| **Dual chart** | Two quantities together, including recorded versus calculated velocity. |
| **String compare** | A separate curve for each string. |
| **String info** | Dates, notes, conditions, original statistics, tags, and custom values. Works without shots. |

## Choose an axis and quantity

**By shot** shows one reading per shot: velocity, Caldwell G1/G7, recorded conditions, known projectile mass, or a numeric custom field. Only supported choices are offered.

**Over distance** shows recorded velocity samples or a calculated G1/G7 velocity curve when inputs exist. Simple/Dual recorded views show the first 100 selected shot traces. String compare averages measured traces within their measured ranges without extrapolation.

Each view remembers its axis and quantities. Changing to an incompatible axis selects a suitable quantity. A saved quantity temporarily missing from selected data stays saved with a no-readings label.

## Compare measured and calculated velocity

1. Choose **Dual chart** and **Over distance**.
2. Set **Quantity** to **Velocity**.
3. Set **Second quantity** to **Calculated velocity (G1)** or **Calculated velocity (G7)**.
4. Set **Forecast distance**, then leave the field or press Enter to save it.

The model starts at the recorded muzzle velocity at distance zero. It uses that shot's matching Caldwell coefficient: G1 uses G1, G7 uses G7. Two downrange samples are not required. You can also compare G1 and G7 predictions directly.

> [!NOTE]
> Dashed calculated curves are estimates, including beyond measured distances. They assume 15 °C, 1013.25 hPa, dry still air, constant BC, and a straight path. They do not correct for gravity, wind, or recorded weather. Predicted zero is the muzzle; the origin of recorded distance samples has not yet been independently confirmed.

Shots without supported muzzle velocity or matching BC are omitted. Each calculated quantity uses at most the first 100 eligible shots in table order, including comparison means. Forecast distance is limited to 1 km; this is a display limit, not an accuracy guarantee. Supported BC values are 0.01–5 and muzzle speeds must be within Mach 0–5.

Original Caldwell G1/G7 values remain unchanged. VelociTrack does not claim a more accurate replacement coefficient. The reasoning and sources are in the separate [calculation research note](../docs/VELOCITY_RESEARCH.md).

## Read and explore

Hover or tap a point for its value and identity. Recorded traces identify the original sample; calculated tooltips identify the model. Mean tooltips show contributor counts. Hovering a mean highlights contributor rows; hovering a row highlights the mean values it contributes to.

Use the bottom slider to zoom distance/shot order and the right slider for the vertical axis. Zoom changes the view, not selection. Dual By shot uses separate labeled vertical axes; distance velocities share one velocity scale.

Summary cards always describe included valid recorded muzzle velocities, regardless of chart quantity. G1/G7 are not recalculated and predictions never replace stored measurements.

**Related:** [Select and sort shots](shots.md) · [Units and display](profile.md)
