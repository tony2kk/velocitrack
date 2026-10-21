# 023 — Publish every verified batch

Accepted 2026-10-21. Supersedes the separate Pages approval requirement in earlier
decisions and release notes.

The owner explicitly requested that every completed batch go directly to the web.
The standing main-branch workflow is now: implement, verify, review public content,
commit, push, deploy and check the live release. No repeat deployment approval is
needed for ordinary verified maintenance and feature batches.

The Pages workflow runs on pushes to `main` and keeps manual dispatch for retries.
The build job still runs `npm ci` and `npm run verify`; only a successful build can
deploy its `dist/` artifact. Existing job permissions, deployment environment and
concurrency rules remain unchanged. Pull requests do not deploy.

This changes release delivery, not data boundaries: browser records, preferences,
credentials, private reports and photos must never become hosted assets. Review
staged content before pushing and resolve failed checks before declaring success.

Version 0.17.2 is the first release delivered under this standing authorization.
