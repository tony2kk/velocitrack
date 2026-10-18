# Security and privacy

Measurements and all user settings live in local browser IndexedDB. No cloud connection, telemetry, credentials flow or backend exists. Imported files are never uploaded. Production caches contain static assets only.

Local storage is not separately encrypted and belongs to the browser profile/origin. Clearing site data or eviction can remove content. Keep original exports. Future remembered provider sessions require local opt-in; never persist passwords.

Do not post vulnerabilities containing credentials or private measurements in public issues. If the repository's private vulnerability-reporting feature is enabled, use it. Otherwise first ask the maintainer for a private reporting channel without disclosing sensitive details. No private reporting feature is assumed to be enabled by this document.

For an accidental credential publication, revoke/rotate the credential with its provider promptly; removing the latest file does not remove Git history or copies. Do not upload additional copies while reporting the incident.

The `.gitignore` and public-content check are safeguards, not guarantees. Review candidate files, Git history, workflow output and built artifacts before publishing. Never use a service account in a browser app. Do not put secrets in Vite's client environment variables.
