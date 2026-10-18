# Security and privacy

Measurements and all user settings live in local browser IndexedDB. File imports are never uploaded. Optional Caldwell sign-in and own-account reads go directly from the browser to Firebase; there is no VelociTrack backend, credential proxy or telemetry. Production caches contain static assets only.

Local storage is not separately encrypted and belongs to the browser profile/origin. Clearing site data or eviction can remove content. Keep original exports. Authentication stays in memory by default; remembered SDK sessions require explicit local opt-in and contain authentication tokens. VelociTrack never saves passwords.

`public/sources/caldwell.json` intentionally contains the common Firebase project ID and client API key, as requested by the owner. These are public service identifiers, not account credentials. The publication guard permits exactly these two fields in this file, while rejecting additional account fields and client keys elsewhere. Access still depends on Firebase authentication, rules and other service controls; the client cannot audit or override those controls. No real account IDs, tokens, passwords or measurements belong in repository files, build assets or reports. See [decision 005](docs/decisions/005-public-source-configuration.md).

Do not post vulnerabilities containing credentials or private measurements in public issues. If the repository's private vulnerability-reporting feature is enabled, use it. Otherwise first ask the maintainer for a private reporting channel without disclosing sensitive details. No private reporting feature is assumed to be enabled by this document.

For an accidental credential publication, revoke/rotate the credential with its provider promptly; removing the latest file does not remove Git history or copies. Do not upload additional copies while reporting the incident.

The `.gitignore` and public-content check are safeguards, not guarantees. Review candidate files, Git history, workflow output and built artifacts before publishing. Never use a service account in a browser app. Do not put secrets in Vite's client environment variables.
