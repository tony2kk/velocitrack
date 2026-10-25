// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReportPreferences } from '../src/components/ReportPreferences';
import { db } from '../src/storage/database';
import { saveReport } from '../src/reports/save';

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  await db.delete();
  vi.restoreAllMocks();
  delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker;
});

it('defaults all report sections on and persists only explicit local choices', async () => {
  const close = vi.fn();
  render(<ReportPreferences onClose={close} />);
  expect((screen.getByRole('combobox', { name: 'Paper size' }) as HTMLSelectElement).value).toBe(
    'A4',
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Paper size' }), {
    target: { value: 'LETTER' },
  });
  expect(
    screen.getAllByRole('checkbox').every((input) => (input as HTMLInputElement).checked),
  ).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: /Shot records/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save report preferences' }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect((await db.profiles.get('local'))!.reportPaperSize).toBe('LETTER');
  expect((await db.profiles.get('local'))!.report).toEqual({
    details: true,
    target: true,
    statistics: true,
    chart: true,
    records: false,
  });
});

it('restores the paper choice independently of section toggles', () => {
  render(<ReportPreferences initialPaperSize="LETTER" onClose={vi.fn()} />);
  expect((screen.getByRole('combobox', { name: 'Paper size' }) as HTMLSelectElement).value).toBe(
    'LETTER',
  );
  expect(
    screen.getAllByRole('checkbox').every((input) => (input as HTMLInputElement).checked),
  ).toBe(true);
});

it('saves the generated blob through the user file picker and treats cancellation as a normal outcome', async () => {
  const stream = { write: vi.fn(), close: vi.fn(), abort: vi.fn() };
  const picker = vi.fn().mockResolvedValue({ createWritable: async () => stream });
  Object.assign(window, { showSaveFilePicker: picker });
  const blob = new Blob(['synthetic PDF']);
  expect(await saveReport(blob, 'Report č. 1')).toBe('saved');
  expect(picker.mock.calls[0]![0].suggestedName).toBe('Report č. 1.pdf');
  expect(stream.write).toHaveBeenCalledWith(blob);
  expect(stream.close).toHaveBeenCalledOnce();
  picker.mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'));
  expect(await saveReport(blob, 'sample.pdf')).toBe('cancelled');
});

it('falls back to a named download when the browser does not support Save as', async () => {
  vi.useFakeTimers();
  URL.createObjectURL = vi.fn(() => 'blob:synthetic');
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  expect(await saveReport(new Blob(['synthetic']), 'sample.pdf')).toBe('downloaded');
  expect(click).toHaveBeenCalledOnce();
  expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('sample.pdf');
  vi.runAllTimers();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
});
