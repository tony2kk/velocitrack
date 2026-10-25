/** Guides follow user goals. Captured steps are real UI states from an isolated demo workspace. */
export interface Guide {
  id: string;
  group: string;
  title: string;
  description: string;
  minutes: number;
  frames: { image: string; caption: string }[];
  steps: string[];
  tips: { title: string; text: string; kind?: 'note' }[];
  details?: { title: string; text: string[] }[];
  related: string[];
}

export const groups = [
  'Get started',
  'Understand your results',
  'Keep the full story',
  'Share your results',
  'Look after your workspace',
];

export const guides: Guide[] = [
  {
    id: 'welcome',
    group: groups[0]!,
    title: 'Take a first look',
    minutes: 2,
    description: 'Try a complete range session before connecting an account.',
    frames: [
      { image: 'welcome', caption: 'New here? The blue invitation points you to Sources.' },
      {
        image: 'add-demo',
        caption: 'Choose Demo data and add the source. No sign-in or files needed.',
      },
      {
        image: 'workspace',
        caption:
          'Select a string on the left. Its shots, chart and statistics appear on the right.',
      },
    ],
    steps: [
      'Open Sources → choose Demo data → Add source.',
      'Close Sources and select a string. Read its chart above the individual Shot records.',
      'Try another view in Analysis, open a target icon, or choose the included report profile in Tools.',
    ],
    tips: [
      {
        title: 'A safe place to explore',
        text: 'The demo is a local copy of five example strings and 50 shots, with target photos, fields, tags and a report profile. Change it freely. It never connects to Caldwell.',
      },
      {
        title: 'Start fresh whenever you like',
        text: 'Remove Demo data in Sources, then add it again. Choose whether to keep its custom fields, tags and report profiles. Anything reused in your own data is protected.',
      },
    ],
    details: [
      {
        title: 'What is a string?',
        text: [
          'A string is a recorded session or group of shots. It keeps a firearm, projectile, date and conditions together. Each shot may contain several velocity measurements at different distances.',
          'The demo is downloaded only on request (about 3.5 MB). Your units, nickname, filters and sign-in choices stay unchanged. Refresh does not reset your practice edits. The welcome invitation stays dismissed after you close it.',
        ],
      },
    ],
    related: ['profile', 'sources', 'find'],
  },
  {
    id: 'profile',
    group: groups[0]!,
    title: 'Make it comfortable',
    minutes: 2,
    description: 'Choose familiar units and the details you want to see.',
    frames: [
      {
        image: 'profile-general',
        caption: 'General sets your nickname, display units and sign-in preference.',
      },
      {
        image: 'profile-display',
        caption: 'Display controls the theme, chart height and information on string cards.',
      },
    ],
    steps: [
      'Open the profile icon at the top right.',
      'In General, enter a nickname and choose Metric or Imperial. Save profile.',
      'In Display, choose your theme, chart height and card details. Save display.',
    ],
    tips: [
      {
        title: 'One measurement, two ways to read it',
        text: 'Metric uses m/s, m, cm and °C. Imperial uses ft/s, ft, in and °F. Changing units never changes the original readings. G1/G7 have no unit; fixed grams/grains fields keep their unit.',
      },
      {
        title: 'Your own workspace',
        text: 'There is no VelociTrack login. Your profile belongs to this browser and address. Another browser or device starts separately.',
      },
    ],
    details: [
      {
        title: 'Display and sign-in choices',
        text: [
          'Chart height ranges from 70% to 200%. It affects the screen only; PDF charts fit their paper. Group size, original Caldwell notes, projectile weight and custom fields can make string cards more informative.',
          'Remembered sign-in keeps provider session tokens only with your consent. Passwords are never saved. Without it, sign in again after a reload or close. A remembered session may still expire. Startup refresh includes every enabled source.',
        ],
      },
    ],
    related: ['welcome', 'reports', 'backup'],
  },
  {
    id: 'sources',
    group: groups[0]!,
    title: 'Bring in your measurements',
    minutes: 3,
    description: 'Connect Caldwell, import files, or explore the built-in demo.',
    frames: [
      {
        image: 'caldwell-source',
        caption: 'Caldwell needs only your own email and password. Setup is automatic.',
      },
      {
        image: 'file-source',
        caption: 'For a file source, select a combined export or its matching strings and shots.',
      },
      {
        image: 'remove-demo',
        caption:
          'Finished exploring? Remove the demo and choose which reusable definitions to keep.',
      },
    ],
    steps: [
      'Open Sources. Choose Caldwell, JSON / text, or Demo data; give it a name and add it.',
      'For Caldwell, enter your email and password and choose Sign in and import. For files, choose the combined export or both matching files together.',
      'Select a string when the import finishes. Next time, use Refresh to bring in new readings.',
    ],
    tips: [
      {
        title: 'Your Caldwell account stays unchanged',
        text: 'The connector reads your own account directly. No configuration file or project number is needed. It does not change cloud measurements.',
      },
      {
        title: 'Refresh is broader than your filters',
        text: 'Every enabled source participates. Reimports update matching records without duplicates and preserve local annotations. “No new data detected” means no new identities; existing readings may have changed.',
      },
    ],
    details: [
      {
        title: 'Catalogs, errors and removing a source',
        text: [
          'Automatically update catalogs adds missing firearm/projectile names. When off, a missing name stops the entire import; add it through the book icon in Data or enable catalog updates. Catalogs from separate sources are not silently merged.',
          'A source is bound to its original Caldwell account. For another account, add another source. File sources ask for current files because a browser cannot reread arbitrary local files on its own.',
          'Remove asks for confirmation, then deletes this source’s measurements, annotations and photos locally. Caldwell cloud data is untouched. Ordinary sources retain catalog names. Demo removal also removes its unused catalog entries and lets you keep its fields, tags and reports.',
          'Demo refresh leaves practice edits intact. Adding it again after removal creates a new sample; existing definitions with matching names are kept separately.',
        ],
      },
    ],
    related: ['file-import', 'find', 'troubleshooting'],
  },
  {
    id: 'find',
    group: groups[1]!,
    title: 'Find the shots that matter',
    minutes: 2,
    description: 'Narrow your session and choose what enters the analysis.',
    frames: [
      {
        image: 'filters',
        caption: 'Use source, firearm, projectile, tag and date filters to narrow the list.',
      },
      {
        image: 'selected-shots',
        caption: 'Uncheck Analyze in Shot records for a temporary comparison.',
      },
    ],
    steps: [
      'Use the toolbar filters to find the session you want. Several choices in one filter match any; different filters narrow the result together.',
      'Select one or more string cards. Ctrl + click selects just that string.',
      'In Shot records below the chart, use Analyze to include only the shots you want.',
    ],
    tips: [
      {
        title: 'Quick solo selection',
        text: 'Ctrl + click a string card to turn all others off. The pencil opens details without changing selection; the target icon opens a read-only preview.',
      },
      {
        title: 'Temporary versus lasting exclusion',
        text: 'Analyze choices last for this page session. The red × in Shot records marks a reading invalid across visits; Undo restores it. Provider-excluded shots can be inspected but never enter analysis.',
      },
    ],
    details: [
      {
        title: 'Selections, filters and highlights',
        text: [
          'Filters save automatically and are restored on your next visit. A string hidden by a filter leaves the active chart. Changing the string selection fits chart scales to the new data.',
          'Hover a shot in the left list, table or chart to highlight it in the other places. Hovering an average can highlight several contributing shots.',
          'The Analyze checkbox in the table heading applies to eligible rows on every table page, not just the visible page.',
        ],
      },
    ],
    related: ['charts', 'compare', 'records'],
  },
  {
    id: 'charts',
    group: groups[1]!,
    title: 'Read a measurement curve',
    minutes: 3,
    description: 'See how velocity changes, inspect a point and compare a model.',
    frames: [
      {
        image: 'single-chart',
        caption: 'Simple chart shows one quantity. Over distance follows the measured samples.',
      },
      {
        image: 'dual-chart',
        caption: 'Dual chart places recorded velocity beside a calculated curve.',
      },
      {
        image: 'chart-zoom',
        caption: 'Use the bottom and right sliders. Reset fits the data again.',
      },
    ],
    steps: [
      'Choose Simple chart or Dual chart in Analysis.',
      'Choose Over distance or By shot, then your quantity. Dual also has a second quantity.',
      'Hover a point for its value. Use the horizontal and vertical sliders to zoom, or the reset icon at the lower right.',
      'For a calculated distance curve, edit Forecast distance to set the visible right edge. Moving the horizontal slider updates the same value.',
    ],
    tips: [
      {
        title: 'Measured and calculated are different',
        text: 'Solid traces are recorded readings. Dashed curves are estimates using the shot’s matching G1 or G7 coefficient. The description below each chart states its assumptions.',
      },
      {
        title: 'Keep your place',
        text: 'With the same string selection, changing compatible quantities retains your zoom. Changing strings fits their data. PDF Quick report keeps the current zoom.',
      },
    ],
    details: [
      {
        title: 'Models and conditions',
        text: [
          'Calculated velocity uses the string’s air density and sound speed when both are available; otherwise it uses standard atmosphere. The note identifies the selected conditions. Local pressure is estimated station pressure, while original Caldwell weather pressure is reduced to sea level.',
          'Air density and sound speed require temperature, humidity, sea-level pressure and elevation. Refresh or reimport older strings to derive missing values. Restore preserves existing estimates. Missing inputs are never invented.',
          'G1 uses the shot’s G1 coefficient; G7 uses G7. Constant BC, still air and a straight path are assumed. No VelociRadar distance offset is applied. The model is not fitted to force agreement with measurements.',
          'Calculated drop uses standard atmosphere and a small-deflection gravity estimate. It is positive downward from the horizontal muzzle axis, with zero at the top. This is separate from the measured target’s vertical offset relative to aim.',
          'Recorded traces and calculated curves are bounded to 100 eligible shots per quantity; predictions are limited to 1 km. These are display limits, not accuracy guarantees. Unsupported or missing muzzle speed/BC omits a prediction. Summary cards always describe recorded muzzle readings.',
        ],
      },
    ],
    related: ['compare', 'records', 'reports'],
  },
  {
    id: 'compare',
    group: groups[1]!,
    title: 'Compare sessions at a glance',
    minutes: 2,
    description: 'Compare individual shots, whole curves or one value per string.',
    frames: [
      {
        image: 'compare-distance',
        caption: 'Velocity detail keeps each shot trace, with one color per string.',
      },
      {
        image: 'compare-string',
        caption: 'By string turns group size and other string attributes into colored bars.',
      },
      {
        image: 'string-info',
        caption: 'String info shows the full context and original record for each selected string.',
      },
    ],
    steps: [
      'Select several strings and choose String compare.',
      'Use Over distance → Velocity detail for individual shot curves, or Velocity for averages within each string.',
      'Use By shot for muzzle velocity or G1/G7. Use By string for group size, weather or numeric custom fields.',
      'Choose String info to read all selected strings’ details and expand their complete JSON records.',
    ],
    tips: [
      {
        title: 'Color tells you which string',
        text: 'Comparison colors remain consistent across views, legends and PDFs. Recorded curves are solid. By string uses a colored bar for each string and initially includes zero.',
      },
      {
        title: 'Choose the right level',
        text: 'Group size belongs to a string, not a shot. By string works even without selected shots. Text and List values are available in details and tables rather than numeric charts.',
      },
    ],
    details: [
      {
        title: 'Averages and original data',
        text: [
          'Over distance → Velocity averages the contributing traces within their valid returned ranges. Velocity detail does not average. Hover averages to see contributor counts.',
          'String info includes original provider data, local annotations and definitions. JSON retains original units and full precision; the visible table follows your display units. Missing readings remain missing.',
        ],
      },
    ],
    related: ['find', 'charts', 'report-builder'],
  },
  {
    id: 'records',
    group: groups[1]!,
    title: 'Arrange your shot records',
    minutes: 2,
    description: 'Keep useful columns together and make individual readings easy to follow.',
    frames: [
      {
        image: 'shot-records',
        caption: 'Analyze controls inclusion; sorting arrows change row order.',
      },
      { image: 'columns', caption: 'Choose columns and drag their handles to arrange them.' },
    ],
    steps: [
      'Scroll to Shot records. Use the arrow beside a heading to sort.',
      'Open Columns and enable the values you want.',
      'Drag a column by its grip, or use its up/down buttons. Close Columns when done.',
      'Hover or focus a row to find its trace in the chart.',
    ],
    tips: [
      {
        title: 'Visibility does not change order',
        text: 'Hiding and restoring a column keeps its place. Only your explicit move changes the order. Columns, order and sort are saved and used by reports.',
      },
      {
        title: 'Compact names, full explanations',
        text: 'V₀ is muzzle velocity. Hover, focus or tap a heading for its full name, source and meaning. Units appear below it.',
      },
    ],
    details: [
      {
        title: 'Reading larger tables',
        text: [
          'Tables show 100 rows per page; reports include all selected valid rows. The Analyze heading controls every eligible row, including other pages.',
          'String / Shot sorting keeps related rows together and draws a stronger separator between strings. Missing values sort last. By shot charts follow table order; distance charts retain physical distance coordinates.',
          'A report keeps all visible columns together. If too many columns or very long notes cannot fit legibly, hide some columns and generate again rather than losing content.',
        ],
      },
    ],
    related: ['find', 'context', 'reports'],
  },
  {
    id: 'context',
    group: groups[2]!,
    title: 'Keep notes, fields and tags',
    minutes: 3,
    description: 'Turn measurements into a useful record of your session.',
    frames: [
      {
        image: 'string-details',
        caption: 'The pencil opens context, local fields, tags and photos for one string.',
      },
      {
        image: 'custom-fields',
        caption: 'Create reusable typed fields in Profile. A List offers consistent choices.',
      },
      {
        image: 'list-options',
        caption: 'The + beside a List opens its options without losing your unsaved details.',
      },
    ],
    steps: [
      'Open a string’s pencil button. Its firearm, projectile and original note appear under the title.',
      'Create reusable fields in Profile → Custom fields and colored labels in Profile → Tags.',
      'Fill the string’s fields, choose tags and select Save details.',
      'For a List field, use + to add or rename options directly from the string editor.',
    ],
    tips: [
      {
        title: 'Use a type that fits the information',
        text: 'Choose Short text, Note, Number, List, fixed grams/grains, Speed or Distance. Numeric values can enter charts; text and List values are useful in tables and reports.',
      },
      {
        title: 'A shortcut to useful cards',
        text: 'Enable Show on string panel for a field. Display can also show group size, projectile weight and Caldwell notes. Empty values stay hidden; zero remains visible.',
      },
    ],
    details: [
      {
        title: 'Safe edits and reusable lists',
        text: [
          'Field and option names must be unique. Renaming preserves assignments. A populated field cannot switch to an unrelated type; changing weight units preserves its physical values.',
          'List options have stable identities. Renaming updates labels everywhere. Removing an option shows how many saved records use it and asks before clearing those assignments. Options save immediately; string values save with Save details.',
          'Deleting a field removes its values and saved table/chart references after confirmation. A report profile that refers to a missing quantity explains that it is unavailable rather than substituting another value.',
          'Photos and captions save immediately. Local annotations remain separate from provider records, so reimport does not erase your work.',
        ],
      },
    ],
    related: ['targets', 'records', 'backup'],
  },
  {
    id: 'targets',
    group: groups[2]!,
    title: 'Measure your target',
    minutes: 4,
    description: 'Use a known length to measure a group and its offset from aim.',
    frames: [
      {
        image: 'target-photo',
        caption: 'Choose a target photo in string details, then open Measure photo.',
      },
      {
        image: 'target-calibration',
        caption: 'Calibrate: place A and B across a known length and enter that length.',
      },
      {
        image: 'target-measure',
        caption:
          'Group + offset: move the point of aim, circle center and edge; the dimensions follow.',
      },
    ],
    steps: [
      'Attach a JPEG, PNG or WebP in string details. Choose Target photo → Measure photo.',
      'Choose Calibrate. Drag the two arrow endpoints across a known length, enter Reference length and press Enter.',
      'Choose Group + offset. Draw from the point of aim to the group center, then adjust the circle edge.',
      'Choose Save measurement. Reopen the photo any time to refine the drawing.',
    ],
    tips: [
      {
        title: 'Move the image, not the measurement',
        text: 'Ctrl + drag pans; Ctrl + wheel zooms around the pointer. On touch screens, use two fingers to pan or pinch. The hand tool and magnifiers offer the same controls.',
      },
      {
        title: 'H, V and G',
        text: 'H is horizontal: positive right. V is vertical: positive up. G is the circle diameter. Values use cm or in. Use an upright, front-facing photo; the editor does not correct perspective or detect holes automatically.',
      },
    ],
    details: [
      {
        title: 'Manual values and calibration',
        text: [
          'You can enter group size and offsets directly, without a photo, then Save target values. Empty means unknown; zero is valid.',
          'Without a reference arrow, enter any known nonzero H, V or G dimension to set the drawing scale. Signs must agree with the geometry. With Link dimensions to drawing enabled, the other represented dimensions follow.',
          'Typing a group/offset dimension clears the independent reference calibration. Turn off Link dimensions to drawing for independent manual overrides; the next geometry edit recalculates represented dimensions. Undo restores the last completed edit.',
          'Calibrate endpoints can be fine-tuned with arrow keys; Shift moves ten image pixels. Group size draws from center to edge. Group + offset draws from point of aim to center; drag the circle edge afterward.',
          'The trash icon clears group geometry while keeping numeric values; independent calibration stays. Cancel leaves the saved measurement unchanged. Each string has one active measurement and can use a different part of the same target sheet.',
          'Images may be up to 20 MiB and 60 megapixels. Removing the active photo preserves numeric values but removes its drawing. This circle diameter is not an automatically measured center-to-center extreme spread.',
        ],
      },
    ],
    related: ['target-report', 'compare', 'backup'],
  },
  {
    id: 'target-report',
    group: groups[2]!,
    title: 'Frame a target for sharing',
    minutes: 2,
    description: 'Choose the part of a target sheet that belongs in the report.',
    frames: [
      {
        image: 'target-crop',
        caption: 'Enable report crop, then move and resize the square around this string’s target.',
      },
      {
        image: 'target-preview',
        caption:
          'The small target icon on a measured string opens the finished figure without editing.',
      },
    ],
    steps: [
      'Open Measure photo and enable Use report crop, or use the crop icon.',
      'Drag inside the square to move it. Drag its lower-right corner to change its size.',
      'Save measurement. Click the target icon on the string card to preview the report figure.',
    ],
    tips: [
      {
        title: 'Framing leaves the measurement alone',
        text: 'A report crop changes neither the original photo nor the group geometry, calibration or offsets. Disable it to use the full image.',
      },
      {
        title: 'Ready to read on paper',
        text: 'Figures use thick outlined measurement lines, H/V/G labels and a calibrated ruler below the image. Strings without photos are skipped in Targets.',
      },
    ],
    details: [
      {
        title: 'One photo, several strings',
        text: [
          'Attach the same target sheet to each relevant string and save its own circle and crop. Only the active measurement appears for that string. Without an active photo, the first attached image is used.',
          'Calibration and crops are included in backups. A crop can be saved before a group is drawn. The read-only preview does not change string selection.',
        ],
      },
    ],
    related: ['targets', 'reports', 'report-builder'],
  },
  {
    id: 'reports',
    group: groups[3]!,
    title: 'Save a clear PDF report',
    minutes: 2,
    description: 'Archive the current selection with the chart you are looking at.',
    frames: [
      {
        image: 'report-settings',
        caption: 'Choose A4 or Letter and the Quick report sections in Profile → Report.',
      },
      { image: 'quick-report', caption: 'Choose Quick report beside the PDF button in Tools.' },
      {
        image: 'report-ready',
        caption: 'Rename the finished report, save it, or open it for printing.',
      },
    ],
    steps: [
      'Select the strings and shots to include. Arrange table columns and set the chart’s zoom.',
      'Choose Quick report in Tools and press the PDF icon.',
      'When ready, edit the suggested file name. Choose Save as… or Open / print PDF.',
    ],
    tips: [
      {
        title: 'The view you see is the view you save',
        text: 'Quick report uses the current chart and zoom. Records use your selected columns and sort order. Screen chart height does not affect the PDF.',
      },
      {
        title: 'Paper that fits the content',
        text: 'Profile → Report chooses A4 or Letter. All sections start on. Charts and shot tables use landscape; targets have their own section. Long tables continue by whole rows.',
      },
    ],
    details: [
      {
        title: 'What the PDF includes',
        text: [
          'The shared introduction summarizes dates, firearm/projectile, conditions, notes, tags and fields. Statistics are recalculated from the selected valid shots: count, mean, minimum, maximum, sample SD and extreme spread.',
          'Targets include each selected string’s active image once, with crop and measurements. Without images the entire Targets section is omitted. Large string overviews use landscape and separate groups of columns.',
          'String info includes every selected string’s complete record and JSON. JSON retains original precision and may include source identifiers. Review the content before sharing; sign-in sessions and connection settings are excluded.',
          'The file name starts VelociTrack_YYYY-MM-DD, followed by the string name or N-strings; saved profiles also include their name. The footer records app version, revision and generation time.',
          'Save as opens a native picker where supported; elsewhere the browser downloads using your chosen name. A PDF is a readable archive, not a restorable workspace backup.',
        ],
      },
    ],
    related: ['report-builder', 'target-report', 'backup'],
  },
  {
    id: 'report-builder',
    group: groups[3]!,
    title: 'Build a report you can reuse',
    minutes: 3,
    description: 'Combine separate velocity charts and a session summary in one PDF.',
    frames: [
      {
        image: 'report-profiles',
        caption: 'Profile → Report Builder keeps your named report profiles.',
      },
      {
        image: 'report-builder',
        caption: 'Choose sections, add views, then order them with drag handles or arrows.',
      },
      {
        image: 'saved-report',
        caption:
          'Pick the saved profile in Tools; the adjacent PDF button generates all its views.',
      },
    ],
    steps: [
      'Open Profile → Report Builder → Add report profile. Give it a unique name.',
      'Choose the sections, then Add view for each chart or String info page you want.',
      'Choose Analysis, axis and quantity. Dual also has a second quantity. Simple/Dual can use Combined strings or One chart per string.',
      'Drag views into order and Save report profile. Select it in Tools and press the PDF icon.',
    ],
    tips: [
      {
        title: 'A useful first template',
        text: 'Try one Dual velocity/G1 chart per string, then a String compare / By string / Group size view. The demo includes a ready-made variation to explore.',
      },
      {
        title: 'Automatic distance',
        text: 'Leave Forecast distance blank to fit each generated chart to its measured data. Enter a value for a fixed horizon. Saved report views fit their own data; Quick report keeps screen zoom.',
      },
    ],
    details: [
      {
        title: 'Templates remain flexible',
        text: [
          'Zero chart views is valid: use a profile for details, targets and records alone. String info and String compare always join all selected strings. Only Simple/Dual offer one view per string.',
          'Saved reports use current selection, units, paper size, columns and sorting. Missing readings or unavailable fields get an explanation instead of replacement data.',
          'Save explicitly to keep edits; Cancel discards the draft. Deleting the selected profile returns Tools to Quick report. Profiles and the selected choice are included in backups.',
          'Up to 50 views can be saved per profile and expanded into up to 200 views per PDF. A no-distance string uses the existing 1000 ft model default when an automatic forecast is needed.',
        ],
      },
    ],
    related: ['reports', 'compare', 'backup'],
  },
  {
    id: 'backup',
    group: groups[4]!,
    title: 'Protect or move your workspace',
    minutes: 3,
    description: 'Save a complete copy you can restore in another browser.',
    frames: [
      { image: 'backup', caption: 'The archive icon in Tools opens Backup / Restore.' },
      {
        image: 'backup-compatibility',
        caption: 'Review versions, conversions and counts before confirming replacement.',
      },
    ],
    steps: [
      'Open the archive icon in Tools → Download backup ZIP.',
      'Keep the ZIP somewhere private. Make a new copy after important imports, notes or photos.',
      'To restore, choose the ZIP in Backup / Restore and read its Compatibility preview.',
      'Back up the current workspace, finish imports and close other app tabs before confirming Replace workspace from backup.',
    ],
    tips: [
      {
        title: 'A backup is more than a PDF',
        text: 'It includes measurements, photos, target geometry, fields, tags, report profiles and saved settings. Passwords and sign-in sessions are excluded. The ZIP is not encrypted.',
      },
      {
        title: 'Restore replaces, it does not merge',
        text: 'Checking a ZIP changes nothing. Confirming replaces this browser’s workspace atomically. Invalid data or failed writes leave the previous workspace intact; cloud measurements are never changed.',
        kind: 'note',
      },
    ],
    details: [
      {
        title: 'Versions and what follows you',
        text: [
          'Older supported backups are upgraded with listed changes. Different app versions can still be compatible. Unknown newer formats or fields stop restoration rather than silently discarding data; update the app and retry.',
          'New archives use data version 4 and require VelociTrack 0.23 or later. Earlier versions 1–3 remain supported. Keep original older ZIPs if you need to open them with an older app.',
          'Saved units, filters, table order, columns, invalid-shot marks, templates and demo-source ownership are included. Hover, temporary Analyze selection and current zoom are session state and are not backed up.',
          'Measurements and original photo bytes retain their precision. Calculated curves and reports use the current app. Missing custom functions are reported in the preview.',
          'Offline caching is not a backup. Browser cleanup or storage eviction can remove local data. The maximum archive size is 256 MiB. If space is short, preserve your backups and use a browser profile with more room.',
        ],
      },
    ],
    related: ['privacy', 'troubleshooting', 'reports'],
  },
  {
    id: 'privacy',
    group: groups[4]!,
    title: 'Know where your data lives',
    minutes: 1,
    description: 'Your measurements and settings belong to this browser.',
    frames: [
      {
        image: 'workspace',
        caption: 'Saved on this device: each browser profile and address has its own workspace.',
      },
    ],
    steps: [
      'Use the same browser profile and app address to return to your data.',
      'Use a backup ZIP to move to another device or browser.',
      'Only enable remembered sign-in on a browser you trust. Review notes and photos before sharing reports.',
    ],
    tips: [
      {
        title: 'Local by design',
        text: 'VelociTrack has no application backend, analytics or hosted measurement database. Caldwell sign-in goes directly to its Firebase service for read-only access to your own account.',
      },
      {
        title: 'The demo is the exception you choose',
        text: 'The public demo is an owner-approved example session with location and private identifiers removed. Adding it downloads a copy. Your edits to it stay local and are never sent back.',
      },
    ],
    details: [
      {
        title: 'Offline and cleanup',
        text: [
          'After successful initial installation, the cached app and imported data work offline, including PDF generation. Online imports and first-time demo/help media downloads need a connection.',
          'Clearing browser site data, deleting a source or confirming restore can remove local records. Keep a ZIP backup before major changes. A different port, hostname or browser opens another workspace.',
          'VelociTrack is an unofficial community project, independent of Caldwell and American Outdoor Brands. Access depends on provider availability and permissions.',
        ],
      },
    ],
    related: ['backup', 'profile', 'troubleshooting'],
  },
  {
    id: 'troubleshooting',
    group: groups[4]!,
    title: 'Get unstuck',
    minutes: 2,
    description: 'Find missing readings, check updates and recover your bearings.',
    frames: [
      {
        image: 'updates',
        caption: 'The footer shows your version. Click it to check for an update.',
      },
      {
        image: 'filters',
        caption: 'Missing strings? Check filters and the browser/address before changing data.',
      },
    ],
    steps: [
      'For missing data, check your browser profile and exact address, clear filters, then select a string.',
      'For missing chart points, check Analyze, invalid marks and source exclusions. Calculated curves need a valid muzzle speed and matching BC.',
      'For an update, finish edits/imports, click the version in the footer, then Reload when ready.',
      'If reporting a problem, include the footer version/revision, steps and visible error. Leave out credentials and private exports.',
    ],
    tips: [
      {
        title: 'Do not clear site data to fix an update',
        text: 'That would remove your local workspace. Try the footer check or a browser refresh first. Unsaved edits and temporary shot choices can be lost on reload.',
        kind: 'note',
      },
      {
        title: 'No new data is a successful result',
        text: 'Existing records may still have been updated. File sources can need attention even after an online source finishes.',
      },
    ],
    details: [
      {
        title: 'When an import needs attention',
        text: [
          'Sign-in needed: open Sources and sign in to its original Caldwell account. Different account: create a separate source. Files needed: choose current exports.',
          'Missing catalog value: add the named item through Local catalogs or allow automatic updates. Unsupported file: check the format reference. A failed import never partly replaces your data.',
          'Connection denied or service unavailable: check connectivity and retry. If access is still denied, contact the provider; VelociTrack does not bypass access rules.',
          'The app checks updates on startup, returning to a visible tab, reconnecting and periodically while visible. Later dismisses the prompt; a manual footer check can show it again.',
          'A local preview needs its server running to download updates, even if an old offline copy still opens. A -dirty footer suffix identifies uncommitted source changes.',
        ],
      },
    ],
    related: ['sources', 'file-import', 'backup'],
  },
  {
    id: 'file-import',
    group: groups[0]!,
    title: 'Prepare an import file',
    minutes: 3,
    description: 'Use a combined JSON export or matching strings and shots files.',
    frames: [
      {
        image: 'file-source',
        caption: 'Add a JSON / text source and select all matching files together.',
      },
    ],
    steps: [
      'Use UTF-8 JSON, CSV or TXT. A TXT file must contain JSON or CSV, not free-form notes.',
      'Choose one JSON object with strings and shots arrays, or two files containing the respective arrays/tables.',
      'Keep stable string and shot IDs. Every shot must reference a string included in the same import.',
      'Add a JSON / text source and select the file or pair together. Up to two files and 20 MB combined are accepted.',
    ],
    tips: [
      {
        title: 'Keep input units unchanged',
        text: 'The supported VelociRadar contract uses ft/s, ft and °F, altitude in ft and sea-level pressure in hPa. Do not pre-convert files to Metric; change Profile units for display.',
      },
      {
        title: 'Arrays already contain the points',
        text: 'Distances and velocities pair by index. A [0, 0] pair is padding; distance zero with positive velocity is valid. Do not import a separate points export.',
      },
    ],
    details: [
      {
        title: 'Required fields and CSV rules',
        text: [
          'Strings need a stable _documentId (id or stringId are accepted aliases), firearm and projectile objects with names. A name and ISO startTimestamp with timezone are recommended; Unix seconds or recognizable milliseconds are also accepted.',
          'Shots need _documentId (or id), _stringId (or stringId) matching the parent and at least muzzleVelocity or velocities, even if unavailable. Optional fields include number, ballisticCoefficientG1/G7, distances, unit and exclude.',
          'Missing numeric readings can be null or blank. Duplicate IDs, orphan shots and invalid numbers reject the import. Unknown fields are kept in local raw data. Unequal point-array lengths are preserved and reported as data-quality issues.',
          'CSV uses a header row with the same names and one record per row. Nested objects and arrays are JSON inside quoted cells; double the inner quotation marks. Use separate strings and shots CSV files.',
          'Empty paired files must have strings and shots in their respective names. A combined object with both arrays empty is also valid. NDJSON and arbitrary prose are not supported.',
        ],
      },
    ],
    related: ['sources', 'profile', 'troubleshooting'],
  },
];
