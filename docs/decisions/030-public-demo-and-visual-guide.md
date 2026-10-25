# 030 — Opt-in demonstration source and visual user guide

Accepted: 2026-10-25. Release: 0.23.0.

The owner requested a public demo made from the 2026-10-25 session, including
target photographs, custom fields, tags and the report profile. They supplied a
local backup and explicitly requested removing references to the session location.
This is a narrow exception to the private-data publication rule: only the curated
`public/demo/sample.json`, metadata-cleaned `public/demo/target-session.jpg` and
reviewed help captures are approved. The original ZIP, preparation script, account
information, settings and all other user exports remain private. Tests are invented
independently, never copied from this session. See [the data review](../DEMO_DATA.md).

Demo data is a third source type. Users explicitly add it through Sources; it has
no account, credentials or cloud refresh. Installation downloads a fixed snapshot
and its shared photo once, validates relationships and writes everything atomically.
Source-scoped IDs and a namespace for supporting definitions preserve ownership
across backups. Existing catalogs, names, preferences and data are never merged or
overwritten. Conflicting names gain a Demo suffix. Repeated adds are rejected.

Removing the source deletes its measurements, annotations and photos. Three
independent choices, initially enabled, retain its fields/list options, tags and
report profiles. Definitions used by remaining records or reports are protected.
Unused demo catalog entries are removed. Refresh leaves practice edits unchanged;
remove and add again to restart. The sample does not contain a user profile; its
requested report templates are appended explicitly to the local profile.

An empty workspace shows a colorful invitation pointing to Sources. Dismissal is
a local profile preference and survives reload and backup/restore. A populated
workspace is not interrupted. An absent dismissal preference is valid in older
backups. Backup data version 4 adds the demo kind and this optional flag without
changing old meanings or requiring a database migration; readers for 1–3 remain.

The header help icon opens `/velocitrack/help/` in a new tab. This is a separate
static Vite entry, with no workspace or authentication access. Sixteen guides are
grouped by user goals. Each topic has a short introduction, a captioned sequence
of actual UI captures, short steps, highlighted tips and optional detail. Playback
is opt-in, keyboard accessible and manually step-able. Captures were made after
installing the public sample into an isolated empty origin, not the owner's daily
workspace. The new-workspace invitation is part of the first walkthrough.

Demo files and help media are excluded from PWA precaching. They download only
when requested. Imported sample data then works locally/offline like other data.
The help shell/text are precached; media availability offline depends on the browser
HTTP cache and is not guaranteed. Existing Markdown help remains a plain-text
alternative and points to the visual guide. No new runtime dependency or backend.

Release procedure: verify, review public contents, commit, then build clean for
local preview. Push main, wait for Pages and verify the exact live revision. The
`-dirty` indicator remains truthful during development; it is never hidden to make
an uncommitted build appear clean.
