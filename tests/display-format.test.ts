import { describe, expect, it } from 'vitest';
import { formatFixed, formatQuantity, displayValue } from '../src/domain/units';
import { fieldDisplay, fieldText } from '../src/domain/customFields';
import { targetText, targetDisplay } from '../src/domain/targetMeasurement';

describe('consistent display precision without lossy writes', () => {
  it('retains zeroes, rounds only converted output and distinguishes missing readings', () => {
    expect(formatQuantity(326, 'velocity')).toBe('326.0');
    expect(formatQuantity(0, 'velocity')).toBe('0.0');
    expect(formatQuantity(0.2, 'g1')).toBe('0.200');
    expect(formatQuantity(0.1236, 'source:statistics.ballisticCoefficientG7')).toBe('0.124');
    expect(formatQuantity(displayValue(1001.23456, 'velocity', 'metric'), 'velocity')).toBe(
      '305.2',
    );
    expect(formatQuantity(null, 'velocity')).toBe('—');
    expect(formatFixed(NaN, 1)).toBe('—');
    expect(formatFixed(-0.0001, 2)).toBe('0.00');
    expect(formatQuantity(5, 'count')).toBe('5');
  });
  it('uses physical units consistently while editable values keep additional precision', () => {
    expect(formatQuantity(20, '', '°C')).toBe('20.0');
    expect(formatQuantity(1005, '', 'hPa')).toBe('1005.00');
    expect(formatQuantity(0.075123, '', 'lb/ft³')).toBe('0.07512');
    expect(formatQuantity(1.225, '', 'kg/m³')).toBe('1.225');
    expect(targetDisplay(12.3456, 'metric')).toBe('1.23');
    expect(targetText(12.3456, 'metric')).toBe('1.2346');
    expect(fieldText(1001.23456, 'speed', 'metric')).toBe('305.2');
    expect(Number(fieldDisplay(1001.23456, 'speed', 'metric'))).toBeCloseTo(305.176293888, 8);
    expect(fieldText(12, 'number', 'metric')).toBe('12.00');
  });
});
