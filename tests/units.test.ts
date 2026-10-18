import { describe, expect, it } from 'vitest';
import { displayValue, formatValue } from '../src/domain/units';
import { buildChartTraces, formatPointTooltip } from '../src/domain/chart';
import { series, shot } from './fixtures/synthetic';

describe('display units', () => {
  it('converts imperial measurements using exact physical definitions', () => {
    expect(displayValue(1000, 'velocity', 'metric')).toBeCloseTo(304.8, 12);
    expect(displayValue(100, 'distance', 'metric')).toBeCloseTo(30.48, 12);
    expect(displayValue(32, 'temperature', 'metric')).toBe(0);
    expect(displayValue(212, 'temperature', 'metric')).toBe(100);
    expect(displayValue(-40, 'temperature', 'metric')).toBe(-40);
    expect(displayValue(0, 'distance', 'metric')).toBe(0);
    expect(displayValue(98.6, 'temperature', 'imperial')).toBe(98.6);
  });

  it('keeps unavailable measurements unavailable and rounds only their presentation', () => {
    expect(displayValue(null, 'velocity', 'metric')).toBeNull();
    expect(displayValue(Infinity, 'temperature', 'metric')).toBeNull();
    expect(formatValue(null)).toBe('—');
    expect(formatValue(displayValue(10, 'distance', 'metric'))).toBe('3.048');
    expect(formatValue(0.123456789)).toBe('0.123457');
  });

  it('converts both chart axes and tooltips without altering raw records, padding or shot numbers', () => {
    const record = shot({
      muzzleVelocity: 1000,
      distances: [0, 100, 0],
      velocities: [1000, 900, 0],
    });
    const original = structuredClone(record);
    const trace = buildChartTraces([record], [series()], 'distance', 'metric')[0]!;
    expect(trace.data).toHaveLength(2);
    expect(trace.data[0]!.value).toEqual([0, 304.8]);
    expect(trace.data[1]!.value[0]).toBeCloseTo(30.48);
    expect(formatPointTooltip(trace.data[1]!)).toContain('Distance: 30.48 m');
    expect(formatPointTooltip(trace.data[1]!)).toContain('Velocity: 274.32 m/s');
    expect(buildChartTraces([record], [series()], 'shot', 'metric')[0]!.data[0]!.value).toEqual([
      1, 304.8,
    ]);
    expect(
      buildChartTraces([record], [series()], 'distance', 'imperial')[0]!.data[1]!.value,
    ).toEqual([100, 900]);
    expect(record).toEqual(original);
  });
});
