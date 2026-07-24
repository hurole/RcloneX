import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type RcloneConfig, getAllRemotesAbout, getRemoteAbout } from '@/pages/config/services';
import { net } from '@/shared/utils/net';

vi.mock('@/shared/utils/net', () => ({
  net: {
    post: vi.fn(),
  },
}));

describe('Quota / About Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch remote about info via operations/about for supported remotes', async () => {
    const mockAbout = {
      total: 107374182400,
      used: 42949672960,
      free: 64424509440,
    };
    vi.mocked(net.post).mockResolvedValueOnce(mockAbout);

    const config: RcloneConfig = {
      id: 'gdrive',
      name: 'gdrive',
      type: 'drive',
      createdAt: new Date().toISOString(),
    };

    const res = await getRemoteAbout('gdrive', config);
    expect(net.post).toHaveBeenCalledWith({
      url: '/operations/about',
      data: { fs: 'gdrive:' },
    });
    expect(res).toEqual(mockAbout);
  });

  it('should skip calling operations/about for S3 remotes to prevent Rclone backend log errors', async () => {
    const s3Config: RcloneConfig = {
      id: 'my-rustfs',
      name: 'my-rustfs',
      type: 's3',
      createdAt: new Date().toISOString(),
      config: {
        provider: 'RustFS',
        bucket: 'my-bucket',
      },
    };

    const res = await getRemoteAbout('my-rustfs', s3Config);
    // 验证：对 S3 绝对不发起 net.post 请求，从而彻底防止 Rclone 控制台刷 ERROR 日志
    expect(net.post).not.toHaveBeenCalled();
    expect(res).toBeNull();
  });

  it('should skip calling operations/about for HTTP remotes', async () => {
    const httpConfig: RcloneConfig = {
      id: 'my-http',
      name: 'my-http',
      type: 'http',
      createdAt: new Date().toISOString(),
    };

    const res = await getRemoteAbout('my-http', httpConfig);
    expect(net.post).not.toHaveBeenCalled();
    expect(res).toBeNull();
  });

  it('should handle mixed config types correctly in getAllRemotesAbout', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({ total: 100, used: 40 });

    const mixedConfigs: RcloneConfig[] = [
      { id: 'drive1', name: 'drive1', type: 'drive', createdAt: '' },
      { id: 'rustfs1', name: 'rustfs1', type: 's3', createdAt: '' },
      { id: 'http1', name: 'http1', type: 'http', createdAt: '' },
    ];

    const map = await getAllRemotesAbout(mixedConfigs);

    // 验证：只对 drive1 发起了 1 次 HTTP post 请求，S3 和 HTTP 被优雅跳过
    expect(net.post).toHaveBeenCalledTimes(1);
    expect(map).toHaveProperty('drive1');
    expect(map).not.toHaveProperty('rustfs1');
    expect(map).not.toHaveProperty('http1');
  });
});
