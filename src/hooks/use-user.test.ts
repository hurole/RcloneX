import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUser } from './use-user';

describe('useUser hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default Admin user when localStorage is empty', () => {
    const { result } = renderHook(() => useUser());

    expect(result.current.user).toEqual({ name: 'Admin' });
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('should initialize with saved user from localStorage', () => {
    const savedUser = { name: 'John Doe', email: 'john@example.com' };
    localStorage.setItem('rclone-user', JSON.stringify(savedUser));

    const { result } = renderHook(() => useUser());

    expect(result.current.user).toEqual(savedUser);
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('should fall back to Admin if parsing localStorage fails', () => {
    localStorage.setItem('rclone-user', 'invalid-json');

    const { result } = renderHook(() => useUser());

    expect(result.current.user).toEqual({ name: 'Admin' });
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('should update user and save to localStorage', () => {
    const { result } = renderHook(() => useUser());

    act(() => {
      result.current.updateUser({ name: 'Jane', email: 'jane@example.com' });
    });

    const expectedUser = { name: 'Jane', email: 'jane@example.com' };
    expect(result.current.user).toEqual(expectedUser);
    expect(JSON.parse(localStorage.getItem('rclone-user') || '')).toEqual(expectedUser);
  });

  it('should clear user and remove from localStorage', () => {
    const { result } = renderHook(() => useUser());

    act(() => {
      result.current.clearUser();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
    expect(localStorage.getItem('rclone-user')).toBeNull();
  });
});
