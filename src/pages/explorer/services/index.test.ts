import { beforeEach, describe, expect, it, vi } from 'vitest';
import { net } from '@/shared/utils/net';
import { getPublicLink, listDirectory } from './index';

vi.mock('@/shared/utils/net', () => ({
  net: {
    post: vi.fn(),
  },
}));

describe('Explorer Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list directory contents', async () => {
    const mockList = {
      list: [{ Name: 'test.txt', Path: 'test.txt', Size: 100, IsDir: false, MimeType: 'text/plain', ModTime: '' }],
    };
    vi.mocked(net.post).mockResolvedValueOnce(mockList);

    const files = await listDirectory('drive', 'docs');
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/list',
      data: { fs: 'drive:', remote: 'docs' },
    });
    expect(files).toEqual(mockList.list);
  });

  it('should fetch public link', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({ url: 'https://example.com/share/123' });

    const link = await getPublicLink('drive', 'shared/file.pdf');
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/publiclink',
      data: { fs: 'drive:', remote: 'shared/file.pdf' },
    });
    expect(link).toBe('https://example.com/share/123');
  });
});
