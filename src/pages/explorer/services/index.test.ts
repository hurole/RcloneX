import { beforeEach, describe, expect, it, vi } from 'vitest';
import { net } from '@/shared/utils/net';
import {
  copyFileItem,
  getDirectorySize,
  getPublicLink,
  listDirectory,
  moveItem,
  renameItem,
  searchFiles,
} from './index';

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

  it('should move item across remotes', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({});

    await moveItem('drive', 'photos/a.jpg', 's3', 'backup/a.jpg');
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/moveto',
      data: { srcFs: 'drive:', srcRemote: 'photos/a.jpg', dstFs: 's3:', dstRemote: 'backup/a.jpg' },
    });
  });

  it('should rename item in place', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({});

    await renameItem('drive', 'photos/old.jpg', 'new.jpg');
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/moveto',
      data: { srcFs: 'drive:', srcRemote: 'photos/old.jpg', dstFs: 'drive:', dstRemote: 'photos/new.jpg' },
    });
  });

  it('should rename item at root', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({});

    await renameItem('drive', 'old.jpg', 'new.jpg');
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/moveto',
      data: { srcFs: 'drive:', srcRemote: 'old.jpg', dstFs: 'drive:', dstRemote: 'new.jpg' },
    });
  });

  it('should search with backend filter', async () => {
    const mockList = {
      list: [{ Name: 'report.pdf', Path: 'docs/report.pdf', Size: 10, IsDir: false, MimeType: '', ModTime: '' }],
    };
    vi.mocked(net.post).mockResolvedValueOnce(mockList);

    const { results, fallback } = await searchFiles('drive', 'report');
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/list',
      data: {
        fs: 'drive:',
        remote: '',
        opt: { recurse: true, filter: { IncludeRule: ['*report*'] } },
      },
    });
    expect(results).toHaveLength(1);
    expect(fallback).toBe(false);
  });

  it('should fall back to local filtering when backend filter fails', async () => {
    const mockList = {
      list: [
        { Name: 'Report.pdf', Path: 'docs/Report.pdf', Size: 10, IsDir: false, MimeType: '', ModTime: '' },
        { Name: 'other.txt', Path: 'other.txt', Size: 10, IsDir: false, MimeType: '', ModTime: '' },
      ],
    };
    vi.mocked(net.post).mockRejectedValueOnce(new Error('filter unsupported')).mockResolvedValueOnce(mockList);

    const { results, fallback } = await searchFiles('drive', 'report');
    expect(net.post).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
    expect(results[0]?.Name).toBe('Report.pdf');
    expect(fallback).toBe(true);
  });

  it('should return empty result for blank keyword', async () => {
    const { results, fallback } = await searchFiles('drive', '   ');
    expect(results).toEqual([]);
    expect(fallback).toBe(false);
    expect(net.post).not.toHaveBeenCalled();
  });

  it('should get directory size', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({ count: 128, bytes: 1024, sizeless: 2 });

    const size = await getDirectorySize('drive', 'photos');
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/size',
      data: { fs: 'drive:', remote: 'photos' },
    });
    expect(size).toEqual({ count: 128, bytes: 1024, sizeless: 2 });
  });

  it('should copy single file', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({});

    await copyFileItem('drive', 'a.txt', 's3', 'backup/a.txt');
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/copyfile',
      data: { srcFs: 'drive:', srcRemote: 'a.txt', dstFs: 's3:', dstRemote: 'backup/a.txt' },
    });
  });
});
