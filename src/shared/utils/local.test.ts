import { beforeEach, describe, expect, it } from 'vitest';
import { setLocal } from './local';

describe('local utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save connection parameters and base64 credentials token to localStorage', () => {
    const rc = 'http://localhost:5572';
    const user = 'admin';
    const pass = 'password123';

    setLocal(rc, user, pass);

    expect(localStorage.getItem('rclone-rc')).toBe(rc);
    expect(localStorage.getItem('rclone-token')).toBe(btoa('admin:password123'));
  });
});
