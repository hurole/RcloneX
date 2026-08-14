import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BatchActionBar from './BatchActionBar';

describe('BatchActionBar component', () => {
  it('should render selected count and trigger callbacks', () => {
    const onDelete = vi.fn();
    const onCopy = vi.fn();
    const onDownload = vi.fn();
    const onClear = vi.fn();

    render(<BatchActionBar count={3} onDelete={onDelete} onCopy={onCopy} onDownload={onDownload} onClear={onClear} />);

    expect(screen.getByText('Selected Count')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Copy/ }));
    expect(onCopy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Download/ }));
    expect(onDownload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Clear Selection' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
