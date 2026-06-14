import { net } from '@/shared/utils/net';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createConfig,
  deleteConfig,
  getAllConfigs,
  getConfigDetails,
  testConfig,
  updateConfig,
} from './index';

// Mock net
vi.mock('@/shared/utils/net', () => {
  return {
    net: {
      post: vi.fn(),
    },
  };
});

describe('Config services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllConfigs', () => {
    it('should fetch all configs successfully via listremotes and details', async () => {
      // Mock listremotes
      vi.mocked(net.post).mockResolvedValueOnce({
        remotes: ['remote1', 'remote2'],
      });

      // Mock details for remote1 and remote2
      vi.mocked(net.post)
        .mockResolvedValueOnce({
          type: 'webdav',
          url: 'https://example.com/webdav',
        })
        .mockResolvedValueOnce({
          type: 'sftp',
          host: '127.0.0.1',
        });

      const configs = await getAllConfigs();

      expect(configs).toHaveLength(2);
      expect(configs[0]).toEqual(
        expect.objectContaining({
          id: 'remote1',
          name: 'remote1',
          type: 'webdav',
          config: expect.objectContaining({
            type: 'webdav',
            url: 'https://example.com/webdav',
          }),
        }),
      );
      expect(configs[1]).toEqual(
        expect.objectContaining({
          id: 'remote2',
          name: 'remote2',
          type: 'sftp',
          config: expect.objectContaining({
            type: 'sftp',
            host: '127.0.0.1',
          }),
        }),
      );
    });

    it('should fallback to config/dump if listremotes fails', async () => {
      // Mock listremotes to throw
      vi.mocked(net.post).mockRejectedValueOnce(new Error('listremotes error'));

      // Mock config/dump backup
      vi.mocked(net.post).mockResolvedValueOnce({
        result: {
          remoteDump: {
            type: 's3',
            provider: 'AWS',
          },
        },
      });

      const configs = await getAllConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0]).toEqual(
        expect.objectContaining({
          id: 'remoteDump',
          name: 'remoteDump',
          type: 's3',
          config: expect.objectContaining({
            type: 's3',
            provider: 'AWS',
          }),
        }),
      );
    });
  });

  describe('getConfigDetails', () => {
    it('should return config details', async () => {
      vi.mocked(net.post).mockResolvedValueOnce({
        type: 'ftp',
        host: 'ftp.example.com',
      });

      const detail = await getConfigDetails('my-ftp');
      expect(detail).toEqual(
        expect.objectContaining({
          id: 'my-ftp',
          name: 'my-ftp',
          type: 'ftp',
          config: expect.objectContaining({
            type: 'ftp',
            host: 'ftp.example.com',
          }),
        }),
      );
    });

    it('should return basic details if api fails', async () => {
      vi.mocked(net.post).mockRejectedValueOnce(new Error('API Error'));

      const detail = await getConfigDetails('failed-remote');
      expect(detail).toEqual(
        expect.objectContaining({
          id: 'failed-remote',
          name: 'failed-remote',
          type: 'unknown',
        }),
      );
    });
  });

  describe('createConfig', () => {
    it('should call api to create config', async () => {
      vi.mocked(net.post).mockResolvedValueOnce({ result: {} });

      await createConfig('new-remote', 'local', {});

      expect(net.post).toHaveBeenCalledWith({
        url: '/config/create',
        data: {
          name: 'new-remote',
          type: 'local',
          parameters: {},
        },
      });
    });
  });

  describe('updateConfig', () => {
    it('should call api to update config', async () => {
      vi.mocked(net.post).mockResolvedValueOnce({ result: {} });

      await updateConfig('remote1', { pass: 'newpass' });

      expect(net.post).toHaveBeenCalledWith({
        url: '/config/update',
        data: {
          name: 'remote1',
          parameters: { pass: 'newpass' },
        },
      });
    });
  });

  describe('deleteConfig', () => {
    it('should call api to delete config', async () => {
      vi.mocked(net.post).mockResolvedValueOnce({ result: {} });

      await deleteConfig('remote1');

      expect(net.post).toHaveBeenCalledWith({
        url: '/config/delete',
        data: {
          name: 'remote1',
        },
      });
    });
  });

  describe('testConfig', () => {
    it('should return connection success with storage capacity details', async () => {
      vi.mocked(net.post).mockResolvedValueOnce({
        total: 1000,
        used: 400,
        free: 600,
      });

      const result = await testConfig('remote1');

      expect(result).toEqual({
        success: true,
        total: 1000,
        used: 400,
        free: 600,
      });
    });

    it('should return success false if API returns error field', async () => {
      vi.mocked(net.post).mockResolvedValueOnce({
        error: 'Authorization failed',
      });

      const result = await testConfig('remote1');

      expect(result).toEqual({
        success: false,
        error: 'Authorization failed',
      });
    });

    it('should parse axios errors properly', async () => {
      // Create a mock AxiosError
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          data: {
            error: 'Connection timed out',
          },
        },
      };

      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      vi.mocked(net.post).mockRejectedValueOnce(mockAxiosError);

      const result = await testConfig('remote1');

      expect(result).toEqual({
        success: false,
        error: 'Connection timed out',
      });
    });
  });
});
