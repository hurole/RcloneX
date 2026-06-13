import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorFallback from './ErrorFallback';

// Mock react-i18next to avoid complex locale setup
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const mockTranslations: Record<string, string> = {
        'errorBoundary.title': 'Mock Error Title',
        'errorBoundary.description': 'Mock Error Description',
        'errorBoundary.reload': 'Mock Reload Button',
        'errorBoundary.backToHome': 'Mock Back To Home Button',
      };
      return mockTranslations[key] || key;
    },
  }),
}));

describe('ErrorFallback Component', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock global window.location using Vitest stubGlobal API
    vi.stubGlobal('location', {
      ...originalLocation,
      reload: vi.fn(),
      href: '',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders title, description, illustration, and buttons', () => {
    render(<ErrorFallback />);

    // Check texts
    expect(screen.getByText('Mock Error Title')).toBeDefined();
    expect(screen.getByText('Mock Error Description')).toBeDefined();
    expect(screen.getByText('Mock Reload Button')).toBeDefined();
    expect(screen.getByText('Mock Back To Home Button')).toBeDefined();

    // Check SVG illustration presence
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('triggers window.location.reload() when reload button is clicked', () => {
    render(<ErrorFallback />);

    const reloadBtn = screen.getByText('Mock Reload Button');
    fireEvent.click(reloadBtn);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('sets window.location.href to "/" when back to home button is clicked', () => {
    render(<ErrorFallback />);

    const backBtn = screen.getByText('Mock Back To Home Button');
    fireEvent.click(backBtn);

    expect(window.location.href).toBe('/');
  });
});
