import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn utility', () => {
  it('should merge classes correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('should ignore falsy values', () => {
    expect(cn('bg-red-500', false, null, undefined, 'text-white')).toBe('bg-red-500 text-white');
  });

  it('should resolve conflicting Tailwind classes via tailwind-merge', () => {
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
