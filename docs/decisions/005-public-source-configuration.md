# 005 — Standard public Caldwell source configuration

Accepted on 2026-10-18. After the first Pages deployment, the owner requested the same functionality as the local installation and explicitly instructed adding the shared metadata as a standard configuration file for the Caldwell source type. This supersedes decision 003's local-only distribution boundary. The deferred import-count notification and vertical chart zoom changes are outside this batch.

## Configuration and ownership

- `public/sources/caldwell.json` contains exactly `projectId` and `apiKey`. These identify the shared Caldwell Firebase service, not an individual user. The same file is copied into the production build and served locally or on Pages. It is intentionally readable by visitors and repository users, with no obfuscation or claim of secrecy.
- No email, password, token, account identifier, measurement, user preference, endpoint override or other field belongs in this file. The publication guard validates the exact shape and allows the client-key pattern only in this file. Other credential checks remain active.
- Source setup reuses existing browser settings first; a fresh browser requests the standard file from the same origin without credentials or redirects. Invalid/oversized/unavailable configuration produces a safe retry state. Configuration is saved in the browser profile for reuse; configured/bound sources are never retargeted.
- The local Vite helper is removed. Ignored study files remain private and are never copied wholesale. No deployment secret, proxy or application backend is introduced.
- User sign-in and own-account reads still go directly to Firebase. Authentication persistence requires the existing explicit profile opt-in; passwords are never stored by the application. Measurements and every user setting remain local to the browser origin.

## Access and verification

[Firebase documents client API keys as project identifiers](https://firebase.google.com/docs/projects/api-keys), with access governed by authentication, service rules and other restrictions. Public visibility is not administrative access or permission to bypass those controls. The available configuration already passed ordinary browser sign-in and own-account reads on loopback. Publishing the configuration does not prove compatibility of authenticated requests from Pages; verify that with the owner entering their credentials directly on the published site.

The owner authorized this distribution and deployment after reviewing the earlier terms discussion. This is not provider endorsement, an audit of key restrictions or confirmation of server-side rule isolation. No third-party project settings are changed, no alternate-account reads are performed, and no restriction is bypassed. Record actual hosted results in `VERIFICATION.md`; do not equate displaying the sign-in form with a successful cloud import.
