# 002 — Connected sources and user help

Requested by the owner on 2026-10-18, after decision 001. Caldwell import is the immediate priority.

The manual connection-file setup below is superseded by [decision 003](003-automatic-local-setup.md). The remaining authentication, privacy and import boundaries still apply.

- Keep the local file adapter under the user-facing type **JSON / text**. Accept `.txt` only for the existing JSON/CSV formats, not arbitrary text.
- Add **Caldwell** as a separate online source. Source types are immutable after creation.
- Keep connection configuration local to each source. Never distribute extracted project configuration, account identifiers or credentials with the repository/build. The owner imports permitted connection JSON once in the local browser.
- Use Firebase's modular Auth SDK and Firestore Lite for direct browser requests. No backend, proxy, writes, Android impersonation or persistent Firestore cache.
- Default to in-memory sessions. Persistent SDK authentication requires the existing explicit local profile opt-in. Passwords are never saved.
- Bind each source to the UID returned by authentication and prevent cross-account refresh. Never accept arbitrary owner IDs from input files or URLs.
- Paginate reads, enforce bounded sizes, validate through the shared record parser, then use the existing atomic import. Preserve local annotations and retain records absent from later refreshes.
- Refresh all enabled sources independently of filters. Keep per-source progress/error state and prevent duplicate in-flight refreshes in one tab.
- Put user help in `help/README.md`, including a Sources chapter. Header help opens that page on GitHub in a new tab, not the project README.

The private loopback proof succeeded before product integration. This records the implementation scope, not provider endorsement, hosted-origin verification or distribution permission. See `FIREBASE_POC.md` and `TERMS_REVIEW.md` for those boundaries.

Full application import and repeat refresh subsequently passed on loopback. After reviewing the available terms and unresolved provider questions, the owner explicitly instructed publication on 2026-10-18. They plan to contact Caldwell themselves once the application is sufficiently functional. This decision permits the reviewed connector batch to follow the normal commit-and-push workflow; it does not authorize a Pages deployment or claim provider approval.
