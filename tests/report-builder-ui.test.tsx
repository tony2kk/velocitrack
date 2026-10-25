// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReportBuilder } from '../src/components/ReportBuilder';
import { ReportViewList } from '../src/components/ReportViewList';
import { ReportViewEditor } from '../src/components/ReportViewEditor';
import { newReportProfile, newReportView, type ReportView } from '../src/domain/reportProfiles';
import { defaultProfile } from '../src/domain/model';
import { saveReportProfile, deleteReportProfile } from '../src/storage/reportProfiles';

vi.mock('../src/storage/reportProfiles', () => ({
  saveReportProfile: vi.fn(async () => undefined),
  deleteReportProfile: vi.fn(async () => undefined),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('keeps a new template local to the draft until saved, including reordered views and section switches', async () => {
  render(<ReportBuilder profile={defaultProfile()} fields={[]} />);
  fireEvent.click(screen.getByText('Add report profile'));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Range review' } });
  fireEvent.click(screen.getByLabelText('Target'));
  fireEvent.click(screen.getByText('Add view'));
  fireEvent.change(screen.getByLabelText('Analysis'), { target: { value: 'info' } });
  fireEvent.click(screen.getByText('Add view'));
  fireEvent.click(screen.getByLabelText('Move view 2 up'));
  expect(saveReportProfile).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Save report profile'));
  await waitFor(() => expect(saveReportProfile).toHaveBeenCalledOnce());
  const saved = vi.mocked(saveReportProfile).mock.calls[0]![0];
  expect(saved.name).toBe('Range review');
  expect(saved.sections.target).toBe(false);
  expect(saved.views.map((view) => view.mode)).toEqual(['simple', 'info']);
  await screen.findByText('Add report profile');
  fireEvent.click(screen.getByText('Add report profile'));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Discarded' } });
  fireEvent.click(screen.getByText('Cancel'));
  expect(saveReportProfile).toHaveBeenCalledOnce();
});

it('retains a rejected edit and requires explicit template deletion without changing the measurements', async () => {
  const report = { ...newReportProfile(), name: 'Existing' };
  render(<ReportBuilder profile={{ ...defaultProfile(), reportProfiles: [report] }} fields={[]} />);
  fireEvent.click(screen.getByLabelText('Edit Existing'));
  vi.mocked(saveReportProfile).mockRejectedValueOnce(new Error('Choose a unique name.'));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Duplicate' } });
  fireEvent.click(screen.getByText('Save report profile'));
  expect((await screen.findByRole('alert')).textContent).toContain('unique name');
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Duplicate');
  fireEvent.click(screen.getByText('Cancel'));
  fireEvent.click(screen.getByLabelText('Delete Existing'));
  expect(deleteReportProfile).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Delete profile'));
  await waitFor(() => expect(deleteReportProfile).toHaveBeenCalledWith(report.id));
});

/** Use state as a real draft does so axis changes affect dependent selectors immediately. */
function Editor() {
  const [view, setView] = useState(newReportView('dual'));
  return (
    <>
      <ReportViewEditor view={view} fields={[]} units="metric" onChange={setView} />
      <output>{JSON.stringify(view)}</output>
    </>
  );
}
it('enforces quantity ownership, optional metric forecast and grouping without touching screen settings', () => {
  render(<Editor />);
  const forecast = screen.getByLabelText('Forecast distance (m)');
  expect((forecast as HTMLInputElement).value).toBe('');
  fireEvent.change(forecast, { target: { value: '30.48' } });
  expect(JSON.parse(screen.getByRole('status').textContent!).settings.forecastDistance).toBeCloseTo(
    100,
  );
  fireEvent.change(forecast, { target: { value: '' } });
  expect(
    JSON.parse(screen.getByRole('status').textContent!).settings.forecastDistance,
  ).toBeUndefined();
  fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: 'calculated:g1' } });
  expect((screen.getByLabelText('Second quantity') as HTMLSelectElement).value).not.toBe(
    'calculated:g1',
  );
  fireEvent.change(screen.getByLabelText('Analysis'), { target: { value: 'compare' } });
  expect(screen.queryByLabelText('Strings')).toBeNull();
  fireEvent.change(screen.getByLabelText('Horizontal axis'), { target: { value: 'string' } });
  expect(
    within(screen.getByLabelText('Quantity')).getByRole('option', {
      name: 'String group size (cm)',
    }),
  ).toBeTruthy();
  expect(
    within(screen.getByLabelText('Quantity')).queryByRole('option', { name: 'Velocity (m/s)' }),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText('Horizontal axis'), { target: { value: 'shot' } });
  expect(
    within(screen.getByLabelText('Quantity'))
      .getAllByRole('option')
      .map((item) => (item as HTMLOptionElement).value),
  ).toEqual(['velocity', 'g1', 'g7']);
  fireEvent.change(screen.getByLabelText('Analysis'), { target: { value: 'info' } });
  expect(screen.queryByLabelText('Horizontal axis')).toBeNull();
});

/** A controlled list exercises pointer insertion separately from persistence. */
function List() {
  const [views, setViews] = useState<ReportView[]>([
    newReportView('simple', 'first'),
    newReportView('info', 'second'),
  ]);
  return (
    <>
      <ReportViewList views={views} fields={[]} units="imperial" onChange={setViews} />
      <output>{views.map((view) => view.id).join(',')}</output>
    </>
  );
}
it('reorders through a pointer handle and cancels an interrupted drag', () => {
  // JSDOM needs a PointerEvent with actual coordinates; the browser uses its native implementation.
  vi.stubGlobal('PointerEvent', MouseEvent);
  render(<List />);
  const rows = screen.getAllByRole('region');
  rows.forEach((row, i) =>
    vi
      .spyOn(row, 'getBoundingClientRect')
      .mockReturnValue({ left: 0, right: 400, top: i * 100, bottom: (i + 1) * 100 } as DOMRect),
  );
  const handle = screen.getByLabelText('Drag view 1');
  fireEvent.pointerDown(handle, { clientX: 10, clientY: 10 });
  fireEvent.pointerMove(handle, { clientX: 10, clientY: 190 });
  fireEvent.pointerUp(handle, { clientX: 10, clientY: 190 });
  expect(screen.getByRole('status').textContent).toBe('second,first');
  fireEvent.pointerDown(screen.getByLabelText('Drag view 1'), { clientX: 10, clientY: 10 });
  fireEvent.pointerCancel(screen.getByLabelText('Drag view 1'));
  expect(screen.getByRole('status').textContent).toBe('second,first');
  vi.unstubAllGlobals();
});
