# 025 — Discover releases in long-lived tabs

Accepted 2026-10-25. Maintenance release 0.18.1.

## Problem

The existing PWA registration discovered updates when registering/navigating, but
did not explicitly check while a page stayed open. The local preview on port 4180
was also stopped: its cached application remained usable without a reachable server.
Both made a successful deployment look unavailable to the user.

## Implementation

Keep prompt-based activation and the existing per-tab Reload behavior. Add native
registration checks at startup, visible-tab resume, reconnect and five-minute visible
intervals. Coalesce overlapping requests, throttle repeated focus events for one minute,
skip hidden/offline automatic checks, and remove listeners/timers on unmount. Reconnect
and manual requests bypass the resume throttle. Failed checks are retryable.

Observe waiting/installing workers and controller changes directly as well as Workbox
notifications, covering rapid/external updates. A first installation is not a release
update. Another tab's activation offers Reload without interrupting this tab's form.
Clicking the footer version explicitly checks and displays a status; it can redisplay
a dismissed waiting update. No check activates a worker or clears any local storage.

An older already-running release needs one browser refresh to acquire the new logic.
Local previews need a running server. Neither situation requires clearing site data.
No schema, backup or connected-source behavior changes. Deferred feature requests in
PLAN.md remain deferred.

References: [Vite PWA periodic checks](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates)
and [native registration updates](https://developer.mozilla.org/docs/Web/API/ServiceWorkerRegistration/update).
