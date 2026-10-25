// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/storage/database';
import { saveField, saveSeriesDetails, saveTag } from '../src/storage/customization';
import { loadWorkspace } from '../src/storage/workspace';
import { SeriesDetails } from '../src/components/SeriesDetails';
import { ShotTable } from '../src/components/ShotTable';
import { CustomizationManager } from '../src/components/CustomizationManager';
import { SeriesNavigator } from '../src/components/SeriesNavigator';
import { series, shot } from './fixtures/synthetic';
import { emptyTarget } from '../src/domain/targetMeasurement';

vi.mock('../src/reports/renderTarget', () => ({
  renderTargetPhoto: vi.fn(async () => 'data:image/png;base64,c3ludGhldGlj'),
}));

beforeEach(async () => {
  await db.open();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  await db.series.put(series());
});
afterEach(async () => {
  cleanup();
  await db.delete();
  vi.restoreAllMocks();
});

describe('series context UI', () => {
  it('shows firearm/projectile and the source note above a List editor, with usage-aware removal', async () => {
    const field = {
      id: 'list',
      name: 'Category',
      type: 'list' as const,
      order: 0,
      options: [{ id: 'a', name: 'Alpha' }],
    };
    await saveField(field);
    await saveSeriesDetails('series', { list: 'a' }, undefined);
    render(
      <SeriesDetails
        series={series({ raw: { notes: 'Original plain note' } })}
        firearmName="Example firearm"
        projectileName="Example projectile"
        annotation={(await loadWorkspace()).annotations[0]}
        fields={[field]}
        tags={[]}
        photos={[]}
        units="metric"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Example firearm / Example projectile')).toBeTruthy();
    expect(screen.getByText('Original plain note').tagName).toBe('P');
    expect((screen.getByRole('combobox', { name: 'Category' }) as HTMLSelectElement).value).toBe(
      'a',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Manage Category options' }));
    const panel = screen.getByRole('region', { name: 'Options for Category' });
    expect(
      panel.compareDocumentPosition(screen.getByRole('combobox', { name: 'Category' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(within(panel).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getByText(/used in 1 saved record/)).toBeTruthy());
    expect((await loadWorkspace()).annotations[0]?.values?.list).toBe('a');
    fireEvent.click(screen.getByRole('button', { name: 'Keep option' }));
    expect((await loadWorkspace()).annotations[0]?.values?.list).toBe('a');
  });

  it('opens a read-only measured target without selecting its string, including Ctrl-click', async () => {
    const target = {
      ...emptyTarget(),
      photoId: 'photo',
      mmPerPixel: 1,
      values: { horizontalOffset: null, verticalOffset: null, groupSize: 20 },
      geometry: { width: 100, height: 100, center: { x: 50, y: 50 }, radius: 10, poa: null },
    };
    await db.attachmentContents.put({ id: 'photo', blob: new Blob(['synthetic']) });
    const onToggleSeries = vi.fn(),
      onSelectOnly = vi.fn();
    render(
      <SeriesNavigator
        series={[series()]}
        shots={[]}
        selected={[]}
        annotations={[{ entityId: 'series', notes: '', fields: {}, target }]}
        catalogNames={new Map()}
        sourceNames={new Map()}
        onToggleSeries={onToggleSeries}
        onSelectOnly={onSelectOnly}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'View target for Synthetic series' }), {
      ctrlKey: true,
    });
    await waitFor(() => expect(screen.getByRole('img', { name: /Measured target/ })).toBeTruthy());
    expect(onToggleSeries).not.toHaveBeenCalled();
    expect(onSelectOnly).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Save measurement/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('saves string-panel visibility and displays assigned values including zero in fixed weight units', async () => {
    const manager = render(<CustomizationManager kind="fields" fields={[]} tags={[]} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sample mass' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'weight-grams' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show on string panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    await waitFor(async () => expect(await db.fieldDefinitions.count()).toBe(1));
    const definition = (await db.fieldDefinitions.toArray())[0]!;
    expect(definition).toMatchObject({ type: 'weight-grams', showInNavigator: true });
    manager.unmount();
    const onDetails = vi.fn();
    const onToggleSeries = vi.fn();
    render(
      <SeriesNavigator
        series={[series()]}
        shots={[]}
        selected={[]}
        catalogNames={new Map()}
        sourceNames={new Map()}
        onToggleSeries={onToggleSeries}
        onDetails={onDetails}
        tags={[{ id: 'tag', name: 'Panel tag', color: '#123456' }]}
        fields={[
          definition,
          { id: 'hidden', name: 'Hidden field', type: 'number', order: 1 },
          { id: 'empty', name: 'Empty field', type: 'short-text', order: 2, showInNavigator: true },
          { id: 'unset', name: 'Unset field', type: 'number', order: 3, showInNavigator: true },
        ]}
        annotations={[
          {
            entityId: 'series',
            notes: '',
            fields: {},
            tagIds: ['tag'],
            values: { [definition.id]: 0, hidden: 42, empty: '' },
          },
        ]}
        unitSystem="imperial"
      />,
    );
    expect(screen.getByText('Sample mass')).toBeTruthy();
    expect(screen.getByText('0.00 g')).toBeTruthy();
    expect(screen.queryByText('Hidden field')).toBeNull();
    expect(screen.queryByText('Empty field')).toBeNull();
    expect(screen.queryByText('Unset field')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Details for Synthetic series' }));
    expect(onDetails).toHaveBeenCalledWith('series');
    expect(onToggleSeries).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole('button', { name: 'Details for Synthetic series' })
        .compareDocumentPosition(screen.getByText('Panel tag')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  it('edits dimensional values in profile units, preserves untouched precision and inherits values on each shot', async () => {
    await saveField({ id: 'mass', name: 'Sample mass', type: 'weight', order: 0 });
    await saveField({ id: 'speed', name: 'Reference speed', type: 'speed', order: 1 });
    await saveField({ id: 'note', name: 'Observation', type: 'note', order: 2 });
    await saveTag({ id: 'tag', name: 'Indoor', color: '#123456' });
    await saveSeriesDetails('series', { mass: 1, speed: 42.123456789123 }, []);
    const w = await loadWorkspace();
    const close = vi.fn();
    const { unmount, rerender } = render(
      <SeriesDetails
        series={series()}
        annotation={w.annotations[0]}
        fields={w.fieldDefinitions}
        tags={w.tags}
        photos={[]}
        units="metric"
        onClose={close}
      />,
    );
    expect((screen.getByLabelText('Sample mass (g)') as HTMLInputElement).value).toBe('0.06479891');
    fireEvent.change(screen.getByLabelText('Sample mass (g)'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Observation'), {
      target: { value: 'Line one\nLine two' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Indoor' }));
    rerender(
      <SeriesDetails
        series={series()}
        annotation={w.annotations[0]}
        fields={w.fieldDefinitions}
        tags={w.tags}
        photos={[]}
        units="imperial"
        onClose={close}
      />,
    );
    expect(screen.getByLabelText('Sample mass (g)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    const updated = await loadWorkspace();
    expect(updated.annotations[0]?.values).toEqual({
      mass: 0,
      speed: 42.123456789123,
      note: 'Line one\nLine two',
    });
    unmount();
    render(
      <ShotTable
        shots={[shot(), shot({ id: 'second', number: 2 })]}
        series={[series()]}
        activeShotId={null}
        onHoverShot={vi.fn()}
        fields={updated.fieldDefinitions}
        annotations={updated.annotations}
        tags={updated.tags}
        showTags
        unitSystem="metric"
      />,
    );
    for (const number of [1, 2]) {
      const row = within(screen.getByRole('row', { name: `Shot ${number} in Synthetic series` }));
      expect(row.getByText('Indoor')).toBeTruthy();
      expect(row.getAllByText('0').length).toBeGreaterThan(0);
      expect(row.getByText('Line one Line two')).toBeTruthy();
    }
  });
  it('does not remove a populated field until the explicit confirmation and preserves measurements', async () => {
    await saveField({ id: 'note', name: 'Observation', type: 'note', order: 0 });
    await saveSeriesDetails('series', { note: 'Retain until confirmed' }, []);
    const w = await loadWorkspace();
    render(<CustomizationManager kind="fields" fields={w.fieldDefinitions} tags={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await db.fieldDefinitions.count()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(await db.fieldDefinitions.count()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
    await waitFor(async () => expect(await db.fieldDefinitions.count()).toBe(0));
    expect((await db.annotations.get('series'))?.values).toEqual({});
    expect(await db.series.count()).toBe(1);
  });
});
