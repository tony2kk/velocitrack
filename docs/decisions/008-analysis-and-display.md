# 008 — Analysis modes, ordered columns and display preferences

Accepted with the owner on 2026-10-19. This extends decisions 006 and 007. The owner also requested one stable local environment and remembered sign-in for their existing browser profile.

## Analysis

The toolbar places Analysis between Filters and Tools. Simple chart, Dual chart, String compare and String info are persistent choices. Simple, Dual and Compare each keep independent horizontal-axis, primary-quantity and secondary-quantity settings. Explicit edits save immediately. Changing an axis normalizes unsupported quantities; switching to distance selects Velocity. Temporarily missing readings do not overwrite a saved scalar choice. Selection of series/shots and zoom remain transient.

Simple and Dual scalar charts combine selected strings into one sequence, ordered by string start time/identity, then shot number/identity. Both quantities share the same X positions. Null readings break lines. Dual uses independently labeled left/right Y axes, with a shared vertical zoom control. Distance records contain velocity only, so the second quantity is unavailable in that mode and the UI explains how to use two quantities.

String compare plots one curve per string. By shot uses each string's own shot numbers. Over distance computes an arithmetic mean of linear interpolants inside each eligible shot's measured range, with no extrapolation. The grid contains observed distance positions, sampled evenly down to at most 5,000 for very large inputs. All eligible selected shots contribute at those positions. Difference arrays accumulate linear segments efficiently; duplicate distances within one shot use its last recorded sample. Disconnected ranges are separated by null markers. Tooltips disclose contributor counts; aggregate points do not pretend to identify one shot.

Simple/Dual distance views retain the existing first-100-shot-trace rendering bound. Source exclusions, deselection, paired-zero padding and source/unit-code comparison guards remain in force. Statistical summary cards continue to describe muzzle velocity rather than silently changing meaning with the selected scalar.

## Available quantities and information

Scalar readers include recorded velocity, G1/G7 explicitly attributed to Caldwell, interpretable projectile mass, weather/conditions, original provider string statistics and numeric/dimensional custom fields. Source string values are inherited onto shots. Technical IDs, device/unit/type enums and timestamps are context rather than physical chart quantities. Coefficients are never recomputed or relabeled as locally calculated results.

Known velocity/distance/temperature and custom-field conversions follow existing contracts. Other provider dimensions retain source-unit labels until validated. Original string statistics are source values and can differ from the application's selection-dependent summaries.

String info displays dates, notes, source conditions/statistics, firearm/projectile names, local fields/tags and access to photos/details. A persisted String selector resolves multiple selected strings. Zero-shot strings can show context without fabricating measurements. Expandable original metadata preserves access to fields not yet promoted into the structured view.

## Columns and display

Columns selects every data column and persists the visible IDs in display order. Native HTML drag and pointer-captured drag handles have Up/Down button alternatives. Pointer capture keeps the handle usable for touch/pointer input without relying on a native drag session. The Analyze checkbox remains fixed at the start. Old visibleFieldIds/showTags choices seed the first ordered-column configuration. Removing a custom field cleans its column and analysis references in the same transaction. New optional profile properties are validated in ZIP archives; older archives/profiles remain supported without a schema migration.

Profile adds Display with a projectile-weight toggle and Light/Dark/Auto theme. Projectile suffixes preserve the original recorded mass unit independently of the profile's dimensional-entry/display units. Each string uses its own projectile snapshot, avoiding name-based merging of distinct masses. Unknown codes remain explicit and cannot enter converted mass charts. Catalog filter names include mass only when linked string snapshots agree.

Auto observes the operating-system color preference while open. CSS variables cover application surfaces/controls and ECharts uses matching text/grid and brighter dark-mode trace colors. Contrasting hue families start blue/orange, then purple/magenta. Full-workspace sorted string IDs assign palette positions so selection changes do not recolor remaining strings. Symbols and line dashes supplement repeated colors; importing new IDs can change assignments. Color preferences are not persisted separately.

The redundant display-unit notice and General's Shot detail control are removed. Unit semantics remain in help. Old shotDetail values are retained for archive compatibility; the selected primary standard scalar now determines table emphasis.

## Stable local environment and authentication

Development and production preview both bind strictly to `127.0.0.1:4180`, preserving the same origin/path. They do not fall through to another port. Synthetic browser verification can use an isolated temporary origin without connected accounts, but the owner's daily environment remains on 4180.

The owner explicitly requested remembered sign-in for the existing local profile. The opt-in was enabled through the UI; the owner entered credentials directly. Remembered sign-in and a subsequent reload/startup refresh were verified. Passwords are not saved, global defaults stay memory-only, and SDK tokens remain outside application backups/repository data. Reused SDK handles reconcile persistence changes made in another tab before a refresh. Browser restarts and provider session invalidation remain separate from the verified reload case.

## Provider mass-unit evidence

The owner confirmed that their existing projectile entries were grains, and their recorded snapshots use weightUnit 0. After the owner changed a projectile to grams and explicitly reassigned it to an existing string, a new ordinary authenticated refresh changed that string's weightUnit from 0 to 1. The supported mapping is therefore 0 = grains and 1 = grams. A catalog-only edit had left existing string snapshots unchanged. This is observed owner-account evidence, not a vendor-wide enum specification. Textual gr/grs/grain/grains and g/gram/grams are also accepted for file adapters. No private identifiers, measurements or exports are included in this record or test fixtures. Unknown numeric codes must not be inferred from apparent weight magnitude.

The standing verified commit/push workflow applies. Pages deployment still needs a separate instruction.
