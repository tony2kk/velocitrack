// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelpApp } from '../src/help/HelpApp';

beforeEach(() => {
  window.history.replaceState(null, '', '/help/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Navigate as an anchor would, including the browser's route notification. */
function navigate(hash: string) {
  act(() => {
    window.history.replaceState(null, '', `/help/${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

describe('visual user guide', () => {
  it('finds topics by their practical instructions and handles an unknown route', () => {
    render(<HelpApp />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search guides' }), {
      target: { value: 'calibrate' },
    });
    expect(screen.getByRole('link', { name: /Measure your target/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Take a first look/ })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'All guides' }));
    expect(screen.getByRole('link', { name: /Take a first look/ })).toBeTruthy();
    navigate('#missing-topic');
    expect(screen.getByRole('heading', { name: 'Let’s find your guide' })).toBeTruthy();
    navigate('#welcome');
    expect(screen.getByRole('heading', { name: 'Take a first look' })).toBeTruthy();
  });

  it('plays only on request, stops at the end and resets on a different topic', () => {
    vi.useFakeTimers();
    render(<HelpApp />);
    navigate('#welcome');
    const next = screen.getByRole('button', { name: 'Next step' }) as HTMLButtonElement;
    act(() => vi.advanceTimersByTime(9000));
    expect(screen.getByRole('button', { name: 'Previous step' }).getAttribute('disabled')).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Play walkthrough' }));
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByRole('button', { name: /Step 2:/ }).getAttribute('aria-current')).toBe(
      'step',
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(next.disabled).toBe(true);
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByRole('button', { name: 'Play walkthrough' })).toBeTruthy();
    navigate('#profile');
    expect(screen.getByRole('button', { name: /Step 1:/ }).getAttribute('aria-current')).toBe(
      'step',
    );
  });

  it('keeps lightbox keyboard focus inside and returns to the image on Escape', () => {
    render(<HelpApp />);
    navigate('#welcome');
    const image = screen.getByRole('button', { name: 'Enlarge walkthrough image' });
    fireEvent.click(image);
    const close = screen.getByRole('button', { name: 'Close enlarged image' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(image);
  });
});
