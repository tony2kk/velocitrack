import { describe, expect, it } from 'vitest';
import { importMessage } from '../src/sources/feedback';

describe('new-import feedback', () => {
  it('reports only nonzero new record counts and handles singular shots', () => {
    expect(importMessage('Caldwell', { series: 2, shots: 4 })).toBe(
      'Caldwell: 2 new series and 4 new shots imported.',
    );
    expect(importMessage('Caldwell', { series: 0, shots: 1 })).toBe(
      'Caldwell: 1 new shot imported.',
    );
    expect(importMessage('Files', { series: 1, shots: 0 })).toBe('Files: 1 new series imported.');
    expect(importMessage('Files', { series: 0, shots: 0 })).toBe('Files: No new data detected.');
  });
});
