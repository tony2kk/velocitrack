// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileDialog } from '../src/components/ProfileDialog';
import { SeriesNavigator } from '../src/components/SeriesNavigator';
import { AnalysisPanel } from '../src/components/AnalysisPanel';
import { defaultProfile } from '../src/domain/model';
import { db } from '../src/storage/database';
import { loadWorkspace } from '../src/storage/workspace';
import { series, shot } from './fixtures/synthetic';

beforeEach(async () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
  await db.open();
});
afterEach(async () => {
  cleanup();
  await db.delete();
  vi.restoreAllMocks();
});

describe('display preferences', () => {
  it('saves units and shot detail from the profile without changing stored measurements', async () => {
    const record = shot({ muzzleVelocity: 1000 });
    await db.shots.put(record);
    const close = vi.fn();
    render(
      <ProfileDialog profile={defaultProfile()} sources={[]} refreshing={false} onClose={close} />,
    );
    const units = screen.getByRole('combobox', { name: /^Units/ });
    const detail = screen.getByRole('combobox', { name: /^Shot detail/ });
    expect((units as HTMLSelectElement).value).toBe('imperial');
    expect((detail as HTMLSelectElement).value).toBe('muzzleVelocity');
    fireEvent.change(units, { target: { value: 'metric' } });
    fireEvent.change(detail, { target: { value: 'g7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect((await loadWorkspace()).profile).toMatchObject({
      unitSystem: 'metric',
      shotDetail: 'g7',
    });
    expect(await db.shots.get(record.id)).toEqual(record);
  });

  it('switches navigation values independently of shot selection, preserving zero and missing coefficients', () => {
    const props = {
      series: [series()],
      shots: [
        shot({ muzzleVelocity: 1000, ballisticCoefficientG1: 0.123456, ballisticCoefficientG7: 0 }),
      ],
      selected: ['series'],
      hiddenShots: new Set<string>(),
      activeShotId: null,
      catalogNames: new Map<string, string>(),
      sourceNames: new Map<string, string>(),
      onToggleSeries: vi.fn(),
      onToggleShot: vi.fn(),
      onHoverShot: vi.fn(),
    };
    const { rerender } = render(<SeriesNavigator {...props} unitSystem="metric" />);
    expect(screen.getByTitle('Muzzle velocity').textContent).toBe('304.8 m/s');
    rerender(<SeriesNavigator {...props} unitSystem="metric" shotDetail="g1" />);
    expect(screen.getByTitle('G1').textContent).toBe('0.123456');
    rerender(<SeriesNavigator {...props} shotDetail="g7" />);
    expect(screen.getByTitle('G7').textContent).toBe('0');
    rerender(<SeriesNavigator {...props} shots={[shot()]} shotDetail="g7" />);
    expect(screen.getByTitle('G7').textContent).toBe('—');
    expect(
      (screen.getByLabelText('Select shot 1 in Synthetic series') as HTMLInputElement).checked,
    ).toBe(true);
    expect(props.onToggleShot).not.toHaveBeenCalled();
  });

  it('uses the same units for table readings, mean, standard deviation and spread', () => {
    const props = {
      series: [series()],
      shots: [
        shot({ id: 'one', muzzleVelocity: 1000 }),
        shot({ id: 'two', number: 2, muzzleVelocity: 1100 }),
      ],
      view: 'table' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
    };
    const { container, rerender } = render(<AnalysisPanel {...props} unitSystem="metric" />);
    expect(screen.getByRole('columnheader', { name: 'Muzzle velocity (m/s)' })).toBeTruthy();
    expect(
      within(screen.getByRole('row', { name: 'Shot 1 in Synthetic series' })).getByText('304.8'),
    ).toBeTruthy();
    const stats = within(container.querySelector('.statistics') as HTMLElement);
    expect(stats.getByText('320.04')).toBeTruthy();
    expect(stats.getByText('21.55')).toBeTruthy();
    expect(stats.getByText('30.48')).toBeTruthy();
    rerender(<AnalysisPanel {...props} unitSystem="imperial" />);
    expect(screen.getByRole('columnheader', { name: 'Muzzle velocity (ft/s)' })).toBeTruthy();
    expect(stats.getByText('1050')).toBeTruthy();
  });
});
