import { useState } from 'react';
import { defaultReportSettings, type ReportSettings } from '../domain/model';
import { saveProfile } from '../storage/workspace';

/** Local report composition, saved independently of other profile tabs and included in backups. */
export function ReportPreferences({
  initial,
  onClose,
}: {
  initial?: ReportSettings;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState({ ...defaultReportSettings(), ...initial });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sections: { id: keyof ReportSettings; label: string; help: string }[] = [
    {
      id: 'details',
      label: 'String details',
      help: 'Date, place, firearm, projectile, weather, notes, tags and custom fields.',
    },
    {
      id: 'target',
      label: 'Target',
      help: 'The report crop or full photo, with saved group size and offsets.',
    },
    {
      id: 'statistics',
      label: 'String statistics',
      help: 'Included shots, mean, minimum, maximum, sample SD and extreme spread.',
    },
    {
      id: 'chart',
      label: 'Chart / String info',
      help: 'The current chart and zoom, or all selected string attributes and original JSON in String info mode.',
    },
    {
      id: 'records',
      label: 'Shot records',
      help: 'Selected valid shots in table order, using the visible columns.',
    },
  ];
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          await saveProfile({ report: settings });
          onClose();
        } catch {
          setError('Report preferences could not be saved.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        All sections are enabled by default. Reports are generated on this device.
      </p>
      {sections.map(({ id, label, help }) => (
        <label className="check-field" key={id}>
          <input
            type="checkbox"
            checked={settings[id]}
            onChange={(event) => setSettings({ ...settings, [id]: event.target.checked })}
            title={help}
          />
          <span>
            {label}
            <small>{help}</small>
          </span>
        </label>
      ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <footer className="dialog-actions">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          Save report preferences
        </button>
      </footer>
    </form>
  );
}
