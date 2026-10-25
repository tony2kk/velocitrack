[Help home](README.md) / String details

# Give each string context

Select the **pencil** beside its shot count to open details and photos. Opening details does not select or deselect the string.

Click a string card or its checkbox to add/remove it from the selection. **Ctrl + click** anywhere on a card selects only that string and deselects every other string. Ctrl-clicking an already selected string keeps it selected. The pencil continues to open details.

Original Caldwell string notes appear on cards by default. Hide them through **Profile → Display → Show Caldwell string notes on cards**. Blank notes are omitted; imported notes and local annotations remain separate.

## Add your own fields

Open **Profile → Custom fields**, enter a name, choose a type, and select **Add field**. Define as many as you need.

| Type                             | A good fit for                                |
| -------------------------------- | --------------------------------------------- |
| Short text                       | A label of up to 100 characters.              |
| Note                             | Longer, multiline observations.               |
| Number                           | Any finite number, including negative values. |
| Weight (grams) / Weight (grains) | A nonnegative mass in a fixed unit.           |
| Speed / Distance                 | A nonnegative value in your profile's units.  |

Earlier **Weight (profile units)** fields still follow profile units. Switching weight types preserves physical values. Other populated fields cannot change type. Names must be unique and at most 100 characters.

Enter a string's values in details, then **Save details**. They can appear on every shot through table **Columns**.

Enable **Show on string panel** on a definition to show assigned values on left-hand cards. Empty values and their names are hidden; zero is shown.

Renaming preserves values. Removing a field asks for confirmation and removes its values and saved table/chart references.

## Add colored tags

Create a name and color in **Profile → Tags**. Assign tags in string details and save. They appear inside the card and can be shown in the table or used in the Tags filter.

## Keep target photos

Add JPEG, PNG, or WebP photos in string details. Add several, give each a caption, and open thumbnails at full size. Each can be up to 20 MiB and 60 megapixels.

Photos and captions save immediately. Field/tag edits save with **Save details**. Removing a photo asks for confirmation. If it has the active target measurement, its numeric values remain as manual entries.

> [!TIP]
> Photos stay in this browser. Include them in a regular [workspace backup](backup.md).

## Measure group size and offsets

Use **Target measurement** to enter optional H/V offsets and group size, or choose an attached photo and select **Measure photo**. Values use cm/in from your profile. See the [target measurement guide](targets.md) for drawing, calibration, multi-target sheets and the optional group-size display on string cards.

**Related:** [Table columns](shots.md) · [Display preferences](profile.md)

## Reusable List fields

Choose **List** in Profile → Custom fields and enter initial options, one per line.
Select an option in string details, then Save details. The **+** beside the field
opens a list-management panel above the form; it preserves your unsaved details.
Add or rename options there, or edit the list in Profile. These option changes save
immediately. Names must be unique (ignoring case), with 1–100 characters, and each
list supports up to 1,000 options. Renaming updates labels without losing assignments.

Removing an option shows how many saved records use it. **Confirm removal** also
clears those assignments; **Keep option** cancels. If usage changes in another tab,
check removal again. A removed option cannot be saved from an older open form.
Lists, labels and assignments are included in workspace backups.

The string editor shows its firearm/projectile and original Caldwell note directly
below the heading. A small **target icon** before the shot count marks a photo with
saved group geometry and scale. Click it to view the report crop, dimensions and
ruler in a read-only popup. This does not change string selection or edit the photo.
