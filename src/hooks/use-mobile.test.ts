import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

describe('useIsMobile hook', () => {
  const originalInnerWidth = window.innerWidth;
  let changeListener: (() => void) | null = null;

  beforeEach(() => {
    changeListener = null;

    // Mock window.matchMedia since jsdom does not implement it fully
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: window.innerWidth < 768,
      media: query,
      onchange: null,
      addListener: vi.fn(), // legacy
      removeListener: vi.fn(), // legacy
      addEventListener: vi.fn().mockImplementation((event, callback) => {
        if (event === 'change') {
          changeListener = callback;
        }
      }),
      removeEventListener: vi.fn().mockImplementation((event, callback) => {
        if (event === 'change' && changeListener === callback) {
          changeListener = null;
        }
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    vi.restoreAllMocks();
  });

  it('should return true if window width is smaller than 768px (mobile)', () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('should return false if window width is 768px or larger (desktop)', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('should update mobile state dynamically when a media query change event is fired', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate window resizing to mobile and dispatching the event listener
    act(() => {
      window.innerWidth = 500;
      if (changeListener) {
        changeListener();
      }
    });

    expect(result.current).toBe(true);
  });
});
