// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TargetEditor } from '../src/components/target/TargetEditor';
import { TargetMeasurementPanel } from '../src/components/TargetMeasurementPanel';
import { TargetValueInput } from '../src/components/TargetValueInput';
import { ShotTable } from '../src/components/ShotTable';
import { SeriesNavigator } from '../src/components/SeriesNavigator';
import { db } from '../src/storage/database';
import { emptyTarget, type TargetMeasurement } from '../src/domain/targetMeasurement';
import { type Attachment } from '../src/domain/model';
import { shot, series } from './fixtures/synthetic';

const photo: Attachment = {
  id: 'synthetic-photo',
  seriesId: 'series',
  name: 'six-panels.png',
  caption: '',
  mime: 'image/png',
  size: 8,
  createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(async () => {
  await db.open();
  await db.series.put(series());
  await db.attachments.put(photo);
  await db.attachmentContents.put({ id: photo.id, blob: new Blob(['invented']) });
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn();
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(
        type: string,
        init: MouseEventInit & { pointerId?: number; pointerType?: string } = {},
      ) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? 'mouse';
      }
    },
  );
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1200);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(800);
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  URL.createObjectURL = vi.fn(() => 'blob:synthetic-photo');
  URL.revokeObjectURL = vi.fn();
});
afterEach(async () => {
  cleanup();
  await db.delete();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Pointer events use the SVG fallback's original pixel coordinate system in this DOM test. */
async function draw(editor = 'group') {
  if (editor === 'offset')
    fireEvent.click(screen.getByRole('button', { name: 'Group size + offset' }));
  const canvas = await screen.findByRole('group', { name: 'Target photo measurement canvas' });
  fireEvent.pointerDown(canvas, { clientX: 400, clientY: 400, pointerId: 1, button: 0 });
  fireEvent.pointerMove(canvas, { clientX: 500, clientY: 300, pointerId: 1 });
  fireEvent.pointerUp(canvas, { clientX: 500, clientY: 300, pointerId: 1 });
  return canvas;
}
/** Commit a numeric field in the fixed panel without relying on photo-overlay positioning. */
function enter(label: string, value: string) {
  const input = within(screen.getByRole('complementary')).getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

describe('target editor interaction', () => {
  it('moves and saves a report crop without inventing or changing a group measurement', async () => {
    const saved = vi.fn();
    render(
      <TargetEditor
        photo={photo}
        initial={emptyTarget()}
        units="metric"
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    const canvas = await screen.findByRole('group', { name: 'Target photo measurement canvas' });
    fireEvent.click(screen.getByRole('checkbox', { name: /Use report crop/ }));
    const frame = document.querySelector('[data-handle="crop-move"]')!;
    fireEvent.pointerDown(frame, { clientX: 500, clientY: 400, pointerId: 1, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 600, clientY: 450, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 600, clientY: 450, pointerId: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Save measurement' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    const target = (await db.annotations.get('series'))!.target!;
    expect(target.values).toEqual(emptyTarget().values);
    expect(target.geometry).toBeUndefined();
    expect(target.mmPerPixel).toBeUndefined();
    expect(target.reportCrop).toMatchObject({
      x: 460,
      y: 210,
      size: 480,
      width: 1200,
      height: 800,
    });
  });
  it('shows group size on cards only when enabled, with correct units and no missing-value placeholder', () => {
    const props = {
      series: [series(), series({ id: 'missing', name: 'No target result' })],
      shots: [shot()],
      selected: [],
      catalogNames: new Map<string, string>(),
      sourceNames: new Map<string, string>(),
      onToggleSeries: vi.fn(),
      annotations: [
        {
          entityId: 'series',
          notes: '',
          fields: {},
          target: { ...emptyTarget(), values: { ...emptyTarget().values, groupSize: 25.4 } },
        },
      ],
    };
    const view = render(<SeriesNavigator {...props} />);
    expect(screen.queryByText('Group size')).toBeNull();
    view.rerender(<SeriesNavigator {...props} showGroupSize unitSystem="metric" />);
    expect(screen.getAllByText('Group size')).toHaveLength(1);
    expect(screen.getByText('2.54 cm')).toBeTruthy();
    view.rerender(<SeriesNavigator {...props} showGroupSize unitSystem="imperial" />);
    expect(screen.getByText('1 in')).toBeTruthy();
  });
  it('draws, calibrates, overrides, recalculates, undoes, saves and reopens the exact geometry', async () => {
    const saved = vi.fn();
    const view = render(
      <TargetEditor
        photo={photo}
        initial={emptyTarget()}
        units="metric"
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    const canvas = await draw('offset');
    enter('Horizontal offset (cm)', '10');
    const panel = within(screen.getByRole('complementary'));
    expect((panel.getByLabelText('Vertical offset (cm)') as HTMLInputElement).value).toBe('10');
    expect((panel.getByLabelText('Group size (cm)') as HTMLInputElement).value).toBe('16');
    enter('Group size (cm)', '99');
    expect((panel.getByLabelText(/Group size/) as HTMLInputElement).value).toBe('99');
    fireEvent.pointerDown(document.querySelector('[data-handle="edge"]')!, {
      clientX: 580,
      clientY: 300,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerUp(canvas, { clientX: 600, clientY: 300, pointerId: 1 });
    expect((panel.getByLabelText('Group size (cm)') as HTMLInputElement).value).toBe('20');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect((panel.getByLabelText(/Group size/) as HTMLInputElement).value).toBe('99');
    fireEvent.click(screen.getByRole('button', { name: 'Save measurement' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    const stored = (await db.annotations.get('series'))!.target!;
    expect(stored.geometry).toMatchObject({
      center: { x: 500, y: 300 },
      poa: { x: 400, y: 400 },
      radius: 80,
    });
    expect(stored.values.groupSize).toBe(990);
    expect(stored.manual).toContain('groupSize');
    view.unmount();
    render(
      <TargetEditor
        photo={photo}
        initial={stored}
        units="imperial"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await screen.findByRole('group', { name: 'Target photo measurement canvas' });
    expect(
      (within(screen.getByRole('complementary')).getByLabelText(/Group size/) as HTMLInputElement)
        .value,
    ).toBe('38.9764');
    expect(document.querySelector('.target-circle')?.getAttribute('r')).toBe('80');
  });

  it('cancels a handle drag and retains the viewport when changing tools', async () => {
    render(
      <TargetEditor
        photo={photo}
        initial={emptyTarget()}
        units="metric"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const canvas = await draw();
    enter('Group size (cm)', '10');
    const center = document.querySelector('[data-handle="center"]')!;
    fireEvent.pointerDown(center, { clientX: 400, clientY: 400, pointerId: 1, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 500, clientY: 400, pointerId: 1 });
    fireEvent.pointerCancel(canvas, { pointerId: 1 });
    expect(document.querySelector('.target-circle')?.getAttribute('cx')).toBe('400');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const viewBox = canvas.getAttribute('viewBox');
    fireEvent.click(screen.getByRole('button', { name: 'Pan image' }));
    expect(canvas.getAttribute('viewBox')).toBe(viewBox);
    fireEvent.click(screen.getByRole('button', { name: 'Group size + offset' }));
    expect(canvas.getAttribute('viewBox')).toBe(viewBox);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
    expect(canvas.querySelector('foreignObject')).toBeNull();
  });
  it('pans with Ctrl-drag, consumes only Ctrl-wheel, and saves unchanged calibrated geometry', async () => {
    const saved = vi.fn();
    render(
      <TargetEditor
        photo={photo}
        initial={emptyTarget()}
        units="metric"
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    const canvas = await draw('offset');
    enter('Group size (cm)', '10');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const before = canvas.getAttribute('viewBox')!.split(' ').map(Number);
    fireEvent.pointerDown(canvas, {
      clientX: 600,
      clientY: 400,
      ctrlKey: true,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerUp(canvas, { clientX: 650, clientY: 425, ctrlKey: true, pointerId: 1 });
    const after = canvas.getAttribute('viewBox')!.split(' ').map(Number);
    expect(after[0]).toBeCloseTo(before[0]! - 50 / 1.5);
    expect(after[1]).toBeCloseTo(before[1]! - 25 / 1.5);
    const panned = canvas.getAttribute('viewBox');
    expect(
      fireEvent.wheel(canvas, { deltaY: -100, clientX: 600, clientY: 400, cancelable: true }),
    ).toBe(true);
    expect(canvas.getAttribute('viewBox')).toBe(panned);
    expect(
      fireEvent.wheel(canvas, {
        deltaY: -100,
        ctrlKey: true,
        clientX: 600,
        clientY: 400,
        cancelable: true,
      }),
    ).toBe(false);
    expect(Number(canvas.getAttribute('viewBox')!.split(' ')[2])).toBeLessThan(after[2]!);
    fireEvent.click(screen.getByRole('button', { name: 'Fit image' }));
    expect(canvas.getAttribute('viewBox')).toBe('0 0 1200 800');
    fireEvent.click(screen.getByRole('button', { name: 'Save measurement' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    const target = (await db.annotations.get('series'))!.target!;
    expect(target.geometry).toMatchObject({
      center: { x: 500, y: 300 },
      poa: { x: 400, y: 400 },
      radius: 80,
    });
    expect(target.values.groupSize).toBe(100);
  });
  it('uses two fingers to pan and pinch without leaving a drawing or an undo step', async () => {
    const initial: TargetMeasurement = {
      values: { horizontalOffset: 10, verticalOffset: 5, groupSize: 10 },
      manual: [],
      photoId: photo.id,
      mmPerPixel: 0.1,
      geometry: {
        width: 1200,
        height: 800,
        center: { x: 600, y: 350 },
        poa: { x: 500, y: 400 },
        radius: 50,
      },
    };
    const saved = vi.fn();
    render(
      <TargetEditor
        photo={photo}
        initial={initial}
        units="metric"
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    const canvas = await screen.findByRole('group', { name: 'Target photo measurement canvas' });
    fireEvent.pointerDown(canvas, {
      clientX: 400,
      clientY: 400,
      pointerId: 10,
      pointerType: 'touch',
      button: 0,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 420,
      clientY: 380,
      pointerId: 10,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(canvas, {
      clientX: 600,
      clientY: 400,
      pointerId: 11,
      pointerType: 'touch',
      button: 0,
    });
    expect(document.querySelector('.target-circle')?.getAttribute('cx')).toBe('600');
    fireEvent.pointerMove(canvas, {
      clientX: 300,
      clientY: 400,
      pointerId: 10,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(canvas, {
      clientX: 700,
      clientY: 400,
      pointerId: 11,
      pointerType: 'touch',
    });
    const zoomed = canvas.getAttribute('viewBox')!.split(' ').map(Number);
    expect(zoomed[2]).toBeLessThan(1200);
    fireEvent.pointerMove(canvas, {
      clientX: 350,
      clientY: 400,
      pointerId: 10,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(canvas, {
      clientX: 750,
      clientY: 400,
      pointerId: 11,
      pointerType: 'touch',
    });
    const panned = canvas.getAttribute('viewBox')!.split(' ').map(Number);
    expect(panned[2]).toBeCloseTo(zoomed[2]!);
    expect(panned[0]).toBeLessThan(zoomed[0]!);
    fireEvent.pointerUp(canvas, {
      clientX: 350,
      clientY: 400,
      pointerId: 10,
      pointerType: 'touch',
    });
    const released = canvas.getAttribute('viewBox');
    fireEvent.pointerMove(canvas, {
      clientX: 800,
      clientY: 300,
      pointerId: 11,
      pointerType: 'touch',
    });
    expect(canvas.getAttribute('viewBox')).toBe(released);
    fireEvent.pointerCancel(canvas, { pointerId: 11, pointerType: 'touch' });
    expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save measurement' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect((await db.annotations.get('series'))!.target).toEqual(initial);
  });
  it('leaves the previous result untouched on Cancel and rejects a zero calibration', async () => {
    const initial = {
      ...emptyTarget(),
      values: { horizontalOffset: 12, verticalOffset: null, groupSize: null },
    };
    await db.annotations.put({ entityId: 'series', notes: '', fields: {}, target: initial });
    const close = vi.fn();
    render(
      <TargetEditor
        photo={photo}
        initial={initial}
        units="metric"
        onClose={close}
        onSaved={vi.fn()}
      />,
    );
    await draw();
    enter('Group size (cm)', '0');
    expect(screen.getByRole('alert').textContent).toContain('nonzero');
    expect(
      (screen.getByRole('button', { name: 'Save measurement' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledOnce();
    expect((await db.annotations.get('series'))?.target).toEqual(initial);
  });
  it('does not reuse another photo scale and offers its existing lengths explicitly for calibration', async () => {
    const initial: TargetMeasurement = {
      values: { horizontalOffset: null, verticalOffset: null, groupSize: 25.4 },
      manual: [],
      photoId: 'other-photo',
      mmPerPixel: 20,
      geometry: { width: 1200, height: 800, center: { x: 100, y: 100 }, radius: 5, poa: null },
    };
    render(
      <TargetEditor
        photo={photo}
        initial={initial}
        units="imperial"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await draw();
    expect(
      (screen.getByRole('button', { name: 'Save measurement' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Use this value for scale' }));
    expect(
      (screen.getByRole('button', { name: 'Save measurement' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
  it('commits typed values once on Enter, cancels on Escape and leaves untouched precision alone', () => {
    const commit = vi.fn();
    render(
      <TargetValueInput field="groupSize" value={12.3456789} units="metric" onCommit={commit} />,
    );
    const input = screen.getByLabelText('Group size (cm)');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(commit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(commit).toHaveBeenCalledExactlyOnceWith('groupSize', '2');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);
    expect(commit).toHaveBeenCalledOnce();
  });
  it('saves optional direct values without a photo and exposes inherited table columns', async () => {
    const view = render(<TargetMeasurementPanel seriesId="series" photos={[]} units="metric" />);
    fireEvent.change(screen.getByLabelText('Horizontal offset (cm)'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Vertical offset (cm)'), { target: { value: '-2' } });
    fireEvent.change(screen.getByLabelText('Group size (cm)'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save target values' }));
    await waitFor(async () =>
      expect((await db.annotations.get('series'))?.target?.values).toEqual({
        horizontalOffset: 0,
        verticalOffset: -20,
        groupSize: 30,
      }),
    );
    const annotation = (await db.annotations.get('series'))!;
    view.unmount();
    render(
      <ShotTable
        shots={[shot()]}
        series={[series()]}
        annotations={[annotation]}
        unitSystem="metric"
        activeShotId={null}
        onHoverShot={vi.fn()}
        columnIds={['shot', 'target:horizontalOffset', 'target:verticalOffset', 'target:groupSize']}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'String group size (cm)' })).toBeTruthy();
    const row = within(screen.getByRole('row', { name: 'Shot 1 in Synthetic series' }));
    expect(row.getByText('0')).toBeTruthy();
    expect(row.getByText('-2')).toBeTruthy();
    expect(row.getByText('3')).toBeTruthy();
  });
});
