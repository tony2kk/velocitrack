# 009 — Shared table order, linked comparison and string-panel fields

Accepted with the owner on 2026-10-19. Extends decision 008.

The table labels Series as **String**. Every selectable data column except Shot has an adjacent sort button. The default is ascending natural string name, then shot number; ties use stable identities. Other columns sort their actual numeric/text values, never formatted cells. Missing values stay last in either direction. Sort column/direction persist locally and in backups, independently of visible column order. Deleting a field removes its sort reference transactionally.

Simple/Dual By shot use the sorted table's selected, source-included rows as one sequence. String compare preserves that same relative row order inside each string and uses consecutive positions within that curve; tooltips retain original shot numbers. Missing readings retain null positions. Over distance keeps physical distance coordinates; row sorting changes the order of individual traces but cannot change recorded distance positions or averaged values. This supersedes decision 008's start-time sequence and original-shot-number comparison axis.

Column dragging shows a floating card for pointer input, a faded source row and a labeled insertion gap. Native HTML dragging has the same gap feedback and its browser drag image. Dropping outside selected rows cancels. Arrow buttons remain available for keyboard input.

A comparison mean links to every selected shot whose measured interval covers the hovered distance. Hovering one table row highlights the mean points to which it contributes. Shot coverage is stored once per trace and resolved on demand, avoiding a shots-by-grid identity matrix. Null gap markers never identify contributors. Scalar comparisons retain exact per-shot identity.

Custom-field definitions optionally enable **Show on string panel**. Only assigned, nonempty values appear, with their name and applicable unit; numeric zero is defined and remains visible. Each string's bordered/selected card includes tags and custom values. An edit icon sits at the top right beside the shot count, independent of optional content, and opens details/photos. It stays outside the selection label so editing cannot toggle selection. Definitions and values remain separate from imported data.

**Weight (grams)** and **Weight (grains)** fix each field's input/display unit independently of General's units. Legacy **Weight (profile units)** remains compatible with older workspaces. All three store canonical grains. Switching between these weight types is allowed even for populated fields and changes presentation only, preserving stored precision. Other populated type changes remain forbidden. Speed/distance continue to follow General's units. New optional properties/types validate and round-trip through the existing backup format without a database migration.

The standing verified commit/push workflow applies. No Pages deployment is included.
