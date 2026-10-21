import { useEffect, useState } from 'react';
import { Download, ExternalLink, LoaderCircle } from 'lucide-react';
import { Modal } from './Modal';
import type { ReportInput } from '../reports/types';
import { reportFilename } from '../reports/content';
import { saveReport } from '../reports/save';
import { ReportLayoutError } from '../reports/recordTable';

/** Generate from one frozen selection; keep the result available after canceling a Save as dialog. */
export function ReportDialog({ input, onClose }: { input: ReportInput; onClose: () => void }) {
  const [result, setResult] = useState<{ blob: Blob; url: string }>();
  const [name, setName] = useState(() => reportFilename(input));
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let url = '';
    void import('../reports/generate')
      .then(({ generateReport }) => generateReport(input))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setResult({ blob, url });
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof ReportLayoutError
              ? cause.message
              : 'The report could not be generated. Check target photos and available browser memory, then try again.',
          );
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [input]);
  return (
    <Modal
      title="PDF report"
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      {!result && !error && (
        <p role="status">
          <LoaderCircle className="loading-spinner" size={20} /> Preparing your report…
        </p>
      )}
      {result && (
        <>
          <p>
            {input.series.length} string{input.series.length === 1 ? '' : 's'} ·{' '}
            {input.shots.length} included shot{input.shots.length === 1 ? '' : 's'} · Ready to save
          </p>
          <label className="field">
            File name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={180} />
          </label>
          <p className="muted">
            Save as opens a file dialog where supported. Other browsers download the PDF using this
            name. Open the PDF to preview or print it.
          </p>
          <a
            className="button"
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the generated local PDF to preview or print it."
          >
            <ExternalLink size={16} /> Open / print PDF
          </a>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      <footer className="dialog-actions">
        <button disabled={saving} onClick={onClose}>
          Close
        </button>
        <button
          className="primary"
          disabled={!result || saving || !name.trim()}
          onClick={async () => {
            if (!result) return;
            setSaving(true);
            setError('');
            try {
              const saved = await saveReport(result.blob, name);
              setStatus(
                saved === 'saved'
                  ? 'Report saved.'
                  : saved === 'downloaded'
                    ? 'Download requested. Check your browser downloads.'
                    : 'Save cancelled. Your report is still ready.',
              );
            } catch {
              setError(
                'The PDF could not be saved. Try another destination or open the PDF and save it there.',
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <Download size={16} /> Save as…
        </button>
      </footer>
    </Modal>
  );
}
