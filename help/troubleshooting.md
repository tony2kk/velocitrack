[Help home](README.md) / Troubleshooting

# Get back to your workspace

## I cannot find my measurements

Check the browser profile and exact address. Clear filters, then select a string. Data does not automatically follow you to another browser, hostname, or port. You can [restore a backup](backup.md).

## A shot is missing from the chart

Check **Analyze**. A dim row with Undo is marked invalid; Undo restores it. Source exclusions and missing/nonpositive readings also stay out of analysis.

Calculated velocity needs supported muzzle velocity and matching G1/G7. Missing inputs are never borrowed from another shot. Large selections can reach the 100-shot trace/prediction limit. See [Charts](analysis.md).

## Refresh needs attention

| What you see                            | What to try                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Sign-in needed                          | Open Sources and sign in to the original Caldwell account.                                                                 |
| Files needed                            | Select the latest strings/shots files for that source.                                                                     |
| Missing catalog value                   | Add the named value in Local catalogs, or allow source catalog updates, then retry.                                        |
| Service unavailable / connection denied | Check connectivity and retry. If still denied, check with the provider; VelociTrack does not bypass access controls.       |
| Different account                       | Use the original account or create another source.                                                                         |
| Unsupported file or size                | Keep the workspace and check the [file reference](../docs/IMPORT_FORMAT.md). Failed imports do not partially replace data. |

**No new data detected** is a successful result. Another file source can still need attention after Caldwell finishes.

## I have to sign in again

Check [Profile](profile.md). Without remembered sign-in, sessions end on reload/close. Even remembered sessions may need login after sign-out, browser cleanup, or provider invalidation.

## An update is ready

Finish imports, then select **Reload**. Saved data/preferences remain; temporary Analyze choices reset. Other tabs update when reloaded separately.

If Reload fails, retry or refresh the browser once. Do not clear site data to fix an update.

## Report a problem

Include the footer's version/revision, your steps, and the visible error category. Avoid credentials, private exports, or account identifiers. A `-dirty` suffix identifies a build with uncommitted changes.

**Related:** [Getting started](getting-started.md) · [Your data](privacy.md)
