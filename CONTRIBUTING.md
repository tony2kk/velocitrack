# Contributing

VelociTrack is currently at the repository-foundation stage. Discuss architecture and the first useful workflow before introducing product features or libraries.

1. Use Node 22.12+ and run `npm ci`.
2. Make a focused change on a branch.
3. Add meaningful tests when implementing behavior. Use synthetic data only.
4. Run `npm run verify` and inspect `git diff --cached` before committing.
5. Explain the concrete change, validation and remaining uncertainty in the pull request.

Do not attach private exports, account identifiers, authentication logs, tokens, API configuration, proprietary APKs or vendor code to issues or pull requests. A public repository's history, logs and artifacts are public too.

Dependency versions and Actions revisions are pinned. Update them intentionally with the lockfile, review upstream changes and rerun verification. Project contributions are provided under the MIT License.
