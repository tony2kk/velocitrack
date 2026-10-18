# Browser-only Firebase feasibility

**Status: private loopback test passed on 2026-10-18.** The owner entered credentials directly into an isolated local form. Ordinary Firebase browser SDK authentication and own-account Firestore Lite reads succeeded from `http://127.0.0.1:4181`. The bounded sample contained 5 series and 42 shots, all with recognized measurement fields, without truncation. The test reported completed sign-out/disposal and did not write credentials or measurements to application storage. Configuration stayed in ignored local experiment files, with values excluded from this report and the build.

This confirms the tested requests from that origin, not unrestricted API-key use, server-side rule isolation, App Check policy, GitHub Pages compatibility or distribution permission. The configuration came from the owner's earlier local study; its availability and successful requests are not evidence of public redistribution rights. No CORS proxy, forged Android headers, rule changes or alternate-account path was used. The isolated test is not versioned or included in the production build.

The product connector now uses Firebase Auth plus Firestore Lite, paginated reads and the shared atomic import. Under the owner's later explicit instruction (decision 005), local and hosted setup reuse browser metadata or the standard two-field `public/sources/caldwell.json`. This intentionally public service metadata replaces the earlier loopback helper; user credentials and data remain private. Full application verification is recorded separately in `VERIFICATION.md`.

## Prerequisites

The original MVP used local files. For future accounts/origins, establish permitted configuration and relevant service terms before access. A customer account does not confer administrative access to the provider's Firebase project. A Python exporter alone is not evidence that a browser client is supported.

Firebase client keys identify a project; access control depends on rules and other controls. An Android client key may have incompatible restrictions. Do not publish additional provider configuration beyond the explicitly approved two-field source configuration or treat visibility of a key as permission. See [Firebase API keys](https://firebase.google.com/docs/projects/api-keys).

## Private test protocol

1. Serve an isolated test on a loopback origin. Do not include it in the production app or public repository.
2. Let the owner enter approved web configuration and their own email/password directly in the local form. Never ask for a password in chat.
3. Use the modular Firebase browser SDK with **in-memory authentication persistence** for the test. Do not enable persistent Firestore caching or record network bodies.
4. Sign in through the permitted provider flow. Derive the UID only from the authenticated SDK user.
5. Read bounded collections under `Users/{uid}/Strings`, then that user's `Strings/{id}/Shots`. No writes, deletion, account enumeration or arbitrary UID entry.
6. Keep requests small, stop on denial and report sanitized result codes and counts. Report truncation explicitly. A full future sync needs pagination and retry design.
7. Sign out and dispose of the SDK instance on both success and failure. Verify local/session storage, IndexedDB and caches contain no test credentials or records.
8. Test the intended hosted origin only after publication is authorized. Loopback success is not evidence of GitHub Pages compatibility.

[Firebase persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence) distinguishes memory, session and persistent state. The application defaults to memory; a persistent SDK session requires local opt-in. The profile preference now controls connected-source persistence. Passwords must not be stored by application code.

## What to distinguish

| Layer | Evidence needed | What must not be inferred |
| --- | --- | --- |
| Browser transport/CORS | A real browser request to the service succeeds from the tested origin | A terminal request or Python export proves CORS |
| API key restrictions | The permitted web key works for the intended API/origin | An Android key is suitable for public web use |
| Auth provider/domains | The selected provider and flow work from the actual origin | Password auth and redirect/OAuth have identical domain requirements |
| App Check | Supported permitted web behavior, if enforced | Missing attestation can be spoofed or bypassed |
| Firestore | Successful explicit server reads scoped to the authenticated UID | Client-side path construction proves server-side tenant isolation |
| Distribution rights | Applicable terms or permission cover the intended integration | A successful login authorizes a public integration |

Do not disable browser security, use a CORS bypass proxy, forge Android headers, modify provider rules or test another person's path. Denials become a feasibility finding. Security rule isolation can be validated in a project the developer owns or through evidence from the provider; customer credentials alone do not allow a full rules audit.

See [Firestore conditions](https://firebase.google.com/docs/firestore/security/rules-conditions), [password authentication](https://firebase.google.com/docs/auth/web/password-auth) and [redirect-origin considerations](https://firebase.google.com/docs/auth/web/redirect-best-practices).

## Sanitized report to record later

Date; browser version; tested origin; approved configuration provenance (without values); Auth success/failure; permitted read success/failure; bounded counts; truncation; cleanup result; safe error category; unresolved restrictions. Exclude user names, emails, UIDs, document IDs, tokens, passwords, raw documents and HAR files.
