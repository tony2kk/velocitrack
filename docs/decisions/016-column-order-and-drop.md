# 016 — Independent column visibility and theoretical drop

Accepted owner requests on 2026-10-20; release 0.13.0.

- Column visibility must not change column order. `Profile.tableColumnOrder` stores
  the complete order; `tableColumns` remains the visible identities for compatibility.
  Both are saved atomically on a picker edit. Hidden columns can also be moved.
- Older profiles retain their visible order, then append other definitions. New
  definitions append without disturbing saved order. Removing a custom field clears
  its identity from visibility, order and other referring preferences atomically.
- Backup validation and round trips include the additive order property; old backups
  without it remain valid. No IndexedDB schema or ZIP format version change is needed.
- Add G1/G7 calculated drop alongside velocity in the custom distance curve catalog,
  with one file per model. Use the existing standard atmosphere and matching shot
  inputs. Drop is positive down from a horizontal muzzle axis, canonical mm and
  displayed cm/in. This reference convention is an implementation assumption made
  explicit in the UI/help; it is separate from measured target offset.
- Use a documented small-deflection gravity approximation that preserves the
  existing speed model. No sight configuration or ammunition optimization is added.
- Shorter column titles are a separate [proposal](../COLUMN_LABELS_PROPOSAL.md);
  this release does not rename attributes or user-defined fields.

See [drop model](../DROP_MODEL.md) and [backup help](../../help/backup.md).
