# Contributing

VelociTrack has a local-first measurement MVP. Read the architecture decision before extending it. Discuss workflows or dependencies that change its scope. UI, documentation and comments are English; keep modules readable and automatically formatted.

1. Use Node 22.12+ and run `npm ci`.
2. Make a focused change on a branch.
3. Add meaningful tests when implementing behavior. Use synthetic data only.
4. Run `npm run verify` and inspect `git diff --cached` before committing.
5. Explain the concrete change, validation and remaining uncertainty in the pull request.

Do not attach private exports, account identifiers, authentication logs, tokens, private API configuration, proprietary APKs or vendor code to issues or pull requests. The standard two-field Caldwell client configuration is intentionally public under decision 005; this exception does not extend to any user credentials or settings. A public repository's history, logs and artifacts are public too.

Dependency versions and Actions revisions are pinned. Update them intentionally with the lockfile, review upstream changes and rerun verification. Project contributions are provided under the MIT License.

## Code documentation

Use concise English JSDoc for classes, named functions/methods and domain contracts. Describe purpose, important assumptions, side effects and error/return behavior when it is not obvious from the signature. Add inline comments for transaction boundaries, asynchronous races, privacy decisions and data interpretation. Explain why, rather than restating syntax. Update comments with the implementation; trivial event callbacks do not need boilerplate.

## Version identification

The footer shows `v<package version> · <short commit>`, embedded at build time so it identifies the running offline application as well. `-dirty` indicates uncommitted checkout changes; `local` indicates a source archive/build without Git metadata. No paths, remote URLs, environment variables or user settings are included.

Use semantic package versions: patch for fixes, minor for new backwards-compatible features, and major for incompatible releases once stable. The initial MVP is `0.1.0`; pre-1.0 breaking changes use a minor increment and must be documented. Update `package.json` and `package-lock.json` together (`npm version <version> --no-git-tag-version`), then commit before producing the clean handoff build. Tags and deployment are separate actions. Restart the development server to refresh build metadata after a commit/version change.
