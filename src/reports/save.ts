import { safeFilename } from './filename';

/** Optional browser API, deliberately requested only by the user's Save as click. */
interface SavePickerWindow extends Window {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    createWritable: () => Promise<{
      write: (blob: Blob) => Promise<void>;
      close: () => Promise<void>;
      abort: () => Promise<void>;
    }>;
  }>;
}

/** Prefer native Save as; other browsers download the same PDF with the user-edited suggestion. */
export async function saveReport(
  blob: Blob,
  name: string,
): Promise<'saved' | 'downloaded' | 'cancelled'> {
  const filename = (safeFilename(name) || 'VelociTrack-report').replace(/(?:\.pdf)?$/i, '.pdf');
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker.call(window, {
        suggestedName: filename,
        types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const stream = await handle.createWritable();
      try {
        await stream.write(blob);
        await stream.close();
      } catch (error) {
        await stream.abort().catch(() => {});
        throw error;
      }
      return 'saved';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Embedded browsers may expose the API but deny it; the ordinary download remains usable.
      if (
        !(error instanceof DOMException) ||
        !['SecurityError', 'NotAllowedError'].includes(error.name)
      )
        throw error;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}
