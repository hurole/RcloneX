import { net } from '@/shared/utils/net';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './index';

// Mock net
vi.mock('@/shared/utils/net', () => ({
  net: {
    post: vi.fn(),
  },
}));

// Mock react-router
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  Outlet: () => <div data-testid="outlet" />,
}));

// Mock Header, AppSidebar, SidebarProvider, SidebarInset
vi.mock('@/components/Header', () => ({
  Header: () => <div data-testid="header" />,
}));
vi.mock('./AppSidebar', () => ({
  AppSidebar: () => <div data-testid="sidebar" />,
}));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-inset">{children}</div>
  ),
}));

describe('Home layout component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should redirect to /login immediately if no token exists', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should render children layout if connection verification succeeds', async () => {
    localStorage.setItem('rclone-rc', 'http://127.0.0.1:5572');
    localStorage.setItem('rclone-token', 'valid-token');
    vi.mocked(net.post).mockResolvedValueOnce({});

    render(<Home />);

    // Verify loading screen is shown first
    expect(screen.getByText('login.connecting')).toBeTruthy();

    // After loading succeeds, sidebar and header should be present
    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeTruthy();
      expect(screen.getByTestId('header')).toBeTruthy();
      expect(screen.getByTestId('outlet')).toBeTruthy();
    });
  });

  it('should clear tokens and redirect to /login if connection fails', async () => {
    localStorage.setItem('rclone-rc', 'http://127.0.0.1:5572');
    localStorage.setItem('rclone-token', 'valid-token');
    vi.mocked(net.post).mockRejectedValueOnce(new Error('Connection refused'));

    render(<Home />);

    await waitFor(() => {
      expect(localStorage.getItem('rclone-token')).toBeNull();
      expect(localStorage.getItem('rclone-rc')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
