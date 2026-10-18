# Browser-only Firebase feasibility — future work

**Status: not executed.** No login, CORS behavior, web key restriction, hosted origin or Firestore permission has been verified for this project. The repository deliberately includes no Firebase SDK, private test implementation, project ID or API key.

## Prerequisites

Agree on architecture scope first. Obtain configuration the owner is permitted to use for a web client and establish the relevant service terms. A customer account does not confer administrative access to the provider's Firebase project. The earlier Python exporter is not evidence that a browser client is supported.

Firebase client keys identify a project; access control depends on rules and other controls. An Android client key may have incompatible restrictions. Do not extract and publish provider configuration or treat visibility of a key as permission. See [Firebase API keys](https://firebase.google.com/docs/projects/api-keys).

## Proposed private test protocol

1. Serve an isolated test on a loopback origin. Do not include it in the production app or public repository.
2. Let the owner enter approved web configuration and their own email/password directly in the local form. Never ask for a password in chat.
3. Use the modular Firebase browser SDK with **in-memory authentication persistence** for the test. Do not enable persistent Firestore caching or record network bodies.
4. Sign in through the permitted provider flow. Derive the UID only from the authenticated SDK user.
5. Read bounded collections under `Users/{uid}/Strings`, then that user's `Strings/{id}/Shots`. No writes, deletion, account enumeration or arbitrary UID entry.
6. Keep requests small, stop on denial and report sanitized result codes and counts. Report truncation explicitly. A full future sync needs pagination and retry design.
7. Sign out and dispose of the SDK instance on both success and failure. Verify local/session storage, IndexedDB and caches contain no test credentials or records.
8. Test the intended hosted origin only after publication is authorized. Loopback success is not evidence of GitHub Pages compatibility.

[Firebase persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence) distinguishes memory, session and persistent state. Future application defaults and any “remember me” option still need a design decision. Passwords must not be stored by application code.

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
