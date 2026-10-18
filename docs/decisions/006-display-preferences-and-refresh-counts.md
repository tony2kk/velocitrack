# 006 — Display preferences, vertical zoom and new-import counts

Accepted on 2026-10-18. The owner explicitly started the previously deferred batch and added unit and navigation preferences. This authorizes implementation, verification and the standing commit/push workflow; Pages deployment remains a separate action.

## Measurement and profile contract

The owner reports that the supported Caldwell/VelociRadar inputs contain ft/s, ft and °F. Treat that as the current adapter contract, including matching JSON/text exports, while retaining original values and raw provider fields. This is owner-provided evidence, not a new vendor specification or proof of enum/atmosphere semantics. Future adapters must declare/normalize their measurement contract before sharing these views.

The local profile stores `unitSystem` (`imperial` by default, or `metric`) and `shotDetail` (`muzzleVelocity` by default, or `g1`/`g7`). Older profiles receive missing defaults when read; no schema/index change or destructive migration is needed. Preferences persist across reloads and do not alter transient shot selection.

Conversions happen only when displaying measurements. Metric velocity/distance use the exact factor 0.3048, and Fahrenheit converts with `(F - 32) × 5/9`. Chart coordinates and statistics keep full calculation precision; table/tooltip text rounds to at most six decimals and navigation/statistics to two. G1/G7 retain their supplied coefficient values and are never converted. Temperature conversion is covered in the common unit utility; there is no atmosphere panel in this batch. Existing source/unit-code comparison guards remain unchanged. Missing values show an em dash.

## Chart interaction

Both chart modes have horizontal and vertical sliders bound explicitly to their respective axes. Neither filters records out of the chart model (`filterMode: none`), statistics or shot selection. The existing internal gesture zoom remains horizontal. Reserve space for the right-side slider and clear stale tooltip details when the visible range changes. Hover emphasis must still avoid reconstructing the canvas or resetting zoom.

## Import feedback

Count incoming identities absent from storage inside the same transaction that performs upserts and catalog resolution. Failed imports return no counts; concurrent imports cannot count one identity twice. Existing records are still updated, but updates are not newly added records. Zero additions produce **No new data detected**; this does not mean existing records were not updated.

Use one formatter for file imports, direct sign-in/import and refresh. A batch notification sums successful sources so a final unchanged source does not hide earlier additions; separately note sources still requiring attention. The existing ten-second notification lifetime and source progress dialog remain unchanged.
