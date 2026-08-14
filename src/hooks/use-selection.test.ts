import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSelection } from './use-selection';

describe('useSelection hook', () => {
  it('should toggle single item', () => {
    const { result } = renderHook(() => useSelection());

    act(() => result.current.toggle('a.txt'));
    expect(result.current.isSelected('a.txt')).toBe(true);
    expect(result.current.count).toBe(1);

    act(() => result.current.toggle('a.txt'));
    expect(result.current.isSelected('a.txt')).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('should toggle all items', () => {
    const { result } = renderHook(() => useSelection());
    const paths = ['a.txt', 'b.txt', 'c.txt'];

    act(() => result.current.toggleAll(paths, true));
    expect(result.current.count).toBe(3);
    expect(result.current.isAllSelected(paths)).toBe(true);

    act(() => result.current.toggleAll(paths, false));
    expect(result.current.count).toBe(0);
  });

  it('should report indeterminate state when partially selected', () => {
    const { result } = renderHook(() => useSelection());
    const paths = ['a.txt', 'b.txt'];

    act(() => result.current.toggle('a.txt'));
    expect(result.current.isIndeterminate(paths)).toBe(true);
    expect(result.current.isAllSelected(paths)).toBe(false);

    act(() => result.current.toggle('b.txt'));
    expect(result.current.isIndeterminate(paths)).toBe(false);
    expect(result.current.isAllSelected(paths)).toBe(true);
  });

  it('should clear selection and replace selection set', () => {
    const { result } = renderHook(() => useSelection());

    act(() => result.current.setSelection(['a.txt', 'b.txt']));
    expect(result.current.count).toBe(2);

    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });

  it('should keep selection independent across different paths', () => {
    const { result } = renderHook(() => useSelection());

    act(() => result.current.toggle('x/1.txt'));
    act(() => result.current.toggle('y/2.txt'));

    expect(result.current.isSelected('x/1.txt')).toBe(true);
    expect(result.current.isSelected('y/2.txt')).toBe(true);
    expect(result.current.isSelected('z/3.txt')).toBe(false);
  });
});
