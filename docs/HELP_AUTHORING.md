# Maintaining the visual guide

The public entry is `/velocitrack/help/`, built from `help/index.html` and
`src/help/`. The header question mark opens it in a new tab. Content lives in
`src/help/content.ts`; reusable layout/player logic lives in `HelpApp.tsx`.
The plain Markdown guide remains available for readers browsing the repository.

Group by user outcomes: get started, understand results, keep context, share,
protect the workspace. A topic must include a title, one-sentence description,
captioned visual sequence, short numbered steps and useful highlighted tips.
Keep format details and edge cases in optional disclosures. Related links should
suggest a useful next task. Search includes instructions and tips, not just titles.

## Recording workflow

1. Use a fresh isolated browser origin; never clear or inspect the owner's daily
   workspace to obtain illustrations.
2. Capture the new-workspace invitation before installing anything. Add Demo data
   through Sources using the same installer as an ordinary visitor.
3. Use a neutral nickname such as Demo, no connected account, and only sample
   records. Empty Caldwell/file source forms may illustrate where data is entered.
4. Capture actual app controls and their resulting states. Inspect every frame
   for legibility, correctness, private details and misleading intermediate UI.
5. Save PNGs in `public/help/media/` and add descriptive captions. Reuse frames
   where the same action serves multiple goals. Never copy private screenshots.
6. Test topic navigation, search, manual steps, playback/end, enlargement/Escape,
   focus return and narrow layouts. Check every referenced image exists.

Walkthroughs are user-controlled screenshot sequences, not recordings of pointer
movement. They advance every 4.5 seconds only after Play; manual stepping pauses,
and changing topics resets the player. Clicking an image enlarges it. There is no
autoplay, external video service, tracking, workspace access or extra dependency.
CSS respects reduced-motion settings. Images download on demand and are excluded
from PWA precaching; text remains useful without them.

The canonical recording workspace for release 0.23 was a new loopback origin with
the curated public demo installed. This includes the empty-workspace invitation,
selection/filtering, charts/columns, profile, context, target measurement/crop,
Quick report, Report Builder and backup compatibility. Do not preserve that
temporary origin as an application requirement.
