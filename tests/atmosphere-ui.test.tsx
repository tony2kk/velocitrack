// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StringInfo } from '../src/components/StringInfo';
import { ShotTable } from '../src/components/ShotTable';
import { availableQuantities } from '../src/domain/analysis';
import { buildAnalysisTraces } from '../src/domain/chart';
import { defaultProfile } from '../src/domain/model';
import { series, shot } from './fixtures/synthetic';

afterEach(cleanup);

describe('string atmosphere display', () => {
  it('offers density and sound speed in the table, with explicit estimated provenance', () => {
    const session = series({ airDensity: 1.2, soundSpeed: 340 });
    render(
      <ShotTable
        shots={[shot()]}
        series={[session]}
        activeShotId={null}
        onHoverShot={vi.fn()}
        unitSystem="metric"
        columnIds={['airDensity', 'soundSpeed']}
      />,
    );
    expect(
      within(screen.getByRole('columnheader', { name: 'Air density (kg/m³)' })).getByText('kg/m³'),
    ).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Sound speed (m/s)' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '1.2' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '340' })).toBeTruthy();
  });

  it.each(['metric', 'imperial'] as const)(
    'converts derived attributes and exposes source units for %s charts',
    (units) => {
      const session = series({
        airDensity: 1.2,
        soundSpeed: 340,
        raw: { altitude: 1000, weatherData: { pressure: 1013.25 } },
      });
      const rows = [shot(), shot({ id: 'second', number: 2 })];
      const definitions = availableQuantities(rows, [session], [], [], units);
      const density = definitions.find((item) => item.id === 'airDensity')!;
      const sound = definitions.find((item) => item.id === 'soundSpeed')!;
      expect(density.read(rows[0]!)).toBeCloseTo(units === 'metric' ? 1.2 : 0.074913552691374, 12);
      expect(sound.read(rows[0]!)).toBeCloseTo(units === 'metric' ? 340 : 1115.485564304462, 10);
      expect(definitions.find((item) => item.id === 'source:weatherData.pressure')!.unit).toBe(
        'hPa',
      );
      expect(definitions.find((item) => item.id === 'source:altitude')!.read(rows[0]!)).toBe(
        units === 'metric' ? 304.8 : 1000,
      );
      const traces = buildAnalysisTraces(
        rows,
        [session],
        'dual',
        { axis: 'shot', quantity: 'airDensity', secondary: 'soundSpeed' },
        units,
        false,
        definitions,
      );
      expect(traces).toHaveLength(2);
      expect(traces[0]!.data.map((point) => point.value[1])).toEqual([
        density.read(rows[0]!),
        density.read(rows[1]!),
      ]);
      expect(traces[1]!.data[0]!.value[1]).toBe(sound.read(rows[0]!));
      expect(session.airDensity).toBe(1.2);
      expect(session.soundSpeed).toBe(340);
    },
  );

  it('shows unavailable values in String info with a reimport explanation for older records', () => {
    const props = {
      series: series(),
      shots: [],
      profile: defaultProfile(),
      catalog: [],
      annotations: [],
      fields: [],
      tags: [],
      photos: [],
    };
    const { rerender } = render(<StringInfo {...props} />);
    const density = screen.getByText('Air density (lb/ft³)');
    expect(density.nextElementSibling?.textContent).toBe('—');
    expect(density.getAttribute('title')).toContain('refresh or reimport');
    expect(screen.getByText('Sound speed (ft/s)').nextElementSibling?.textContent).toBe('—');
    rerender(
      <StringInfo
        {...props}
        series={series({ airDensity: 1.2, soundSpeed: 340 })}
        profile={{ ...defaultProfile(), unitSystem: 'metric' }}
      />,
    );
    expect(screen.getByText('Air density (kg/m³)').nextElementSibling?.textContent).toBe('1.2');
    expect(screen.getByText('Sound speed (m/s)').nextElementSibling?.textContent).toBe('340');
  });
});
