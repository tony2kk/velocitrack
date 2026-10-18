# 003 — Automatic local Caldwell setup

Historical decision, superseded for installation setup by [decision 005](005-public-source-configuration.md). The standard public source-type file now replaces the loopback helper; existing browser/source bindings remain protected.

Requested by the owner on 2026-10-18. Selecting a connection JSON file is not an acceptable end-user sign-in flow. The user selects Caldwell and supplies only email/password. Technical configuration identifies the provider project; it is distinct from each user's account and authentication tokens.

## Implemented scope

- Keep existing source connections unchanged. Prepare new sources from the browser profile, an unambiguous existing source, or the configured loopback installation, in that order.
- Store shared technical settings in an optional local profile field and copy them into each source before authentication. Preserve profile preferences and never infer an account UID from configuration.
- The developer places permitted metadata in ignored `.local/caldwell-connection.json`. A Vite dev/preview helper reads it on demand, returns only `projectId` and `apiKey`, rejects cross-origin/non-loopback requests and writes, and disables caching. Raw private files are also denied by Vite's development file server.
- This helper is local development tooling, not an authentication proxy or deployed backend. Passwords go directly to Firebase. No helper endpoint or configuration is emitted into `dist/`, and no private settings are committed.
- Auth persistence still follows explicit profile consent: in-memory by default, SDK tokens in browser storage after opt-in. Passwords are never saved by VelociTrack.
- Setup failure produces an actionable retry state. Source/account data is not removed, retargeted or partially imported.

## Public deployment boundary

The owner is testing locally and has explicitly deferred deployment. The instruction excluding provider configuration from public content remains in force. Therefore automatic first use in a fresh publicly hosted browser is not claimed as solved by this local helper. It requires a reviewed distributable client configuration, either packaged in static assets or obtained from a provider-supported configuration endpoint; that decision remains separate.

[Firebase documents client keys as project identifiers](https://firebase.google.com/docs/projects/api-keys), with data access controlled through authentication/rules and other service controls. Suitability for public distribution depends on the actual key's restrictions and applicable service permissions, which customer access alone does not establish. Keeping a client configuration in browser storage does not make it secret. These facts must not be confused with the user's private credentials.
