import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RenameDialog from './RenameDialog';

const item = { Name: 'old.txt', Path: 'docs/old.txt', Size: 10, IsDir: false, MimeType: '', ModTime: '' };

describe('RenameDialog component', () => {
  it('should render with target name prefilled', () => {
    render(<RenameDialog open targetItem={item} submitting={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText('New Name') as HTMLInputElement;
    expect(input.value).toBe('old.txt');
  });

  it('should disable submit for empty or path-separator names', () => {
    render(<RenameDialog open targetItem={item} submitting={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText('New Name') as HTMLInputElement;
    const submit = screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement;

    // 空名称
    fireEvent.change(input, { target: { value: '  ' } });
    expect(submit.disabled).toBe(true);

    // 含路径分隔符
    fireEvent.change(input, { target: { value: 'a/b.txt' } });
    expect(submit.disabled).toBe(true);
    expect(screen.getByText('Name Invalid')).toBeTruthy();
  });

  it('should call onSubmit with trimmed valid name', () => {
    const onSubmit = vi.fn();
    render(<RenameDialog open targetItem={item} submitting={false} onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('New Name'), { target: { value: 'new-name.txt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onSubmit).toHaveBeenCalledWith('new-name.txt');
  });
});
