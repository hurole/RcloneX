import { beforeEach, describe, expect, it, vi } from 'vitest';
import { net } from '@/shared/utils/net';
import { forgetVfsCache, getMountList, getServeList, refreshVfsCache, startServe, stopServe } from './index';

vi.mock('@/shared/utils/net', () => ({
  net: {
    post: vi.fn(),
  },
}));

describe('Mounts Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get mount list', async () => {
    const mockMounts = { mounts: [{ Fs: 'drive:', MountPoint: '/mnt/drive' }] };
    vi.mocked(net.post).mockResolvedValueOnce(mockMounts);

    const mounts = await getMountList();
    expect(net.post).toHaveBeenCalledWith({ url: '/mount/mounts', data: {} });
    expect(mounts).toEqual(mockMounts.mounts);
  });

  it('should refresh and forget VFS cache', async () => {
    vi.mocked(net.post).mockResolvedValue({});

    await refreshVfsCache('drive');
    expect(net.post).toHaveBeenCalledWith({
      url: '/vfs/refresh',
      data: { fs: 'drive:', dir: '', recursive: true },
    });

    await forgetVfsCache('drive');
    expect(net.post).toHaveBeenCalledWith({
      url: '/vfs/forget',
      data: { fs: 'drive:' },
    });
  });

  it('should manage serve list and start/stop serve', async () => {
    const mockServes = { list: [{ type: 'webdav', addr: '127.0.0.1:8080', fs: 'drive:' }] };
    vi.mocked(net.post).mockResolvedValueOnce(mockServes);

    const serves = await getServeList();
    expect(serves).toEqual(mockServes.list);

    vi.mocked(net.post).mockResolvedValue({});
    await startServe('webdav', 'drive', '127.0.0.1:8080');
    expect(net.post).toHaveBeenCalledWith({
      url: '/serve/webdav',
      data: { fs: 'drive:', addr: '127.0.0.1:8080', _async: true },
    });

    await stopServe('webdav', '127.0.0.1:8080');
    expect(net.post).toHaveBeenCalledWith({
      url: '/serve/stop',
      data: { type: 'webdav', addr: '127.0.0.1:8080' },
    });
  });
});
