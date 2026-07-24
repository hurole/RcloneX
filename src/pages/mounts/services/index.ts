import { net } from '@/shared/utils/net';

export interface RcloneMountItem {
  Fs: string;
  MountPoint: string;
  MountedOn?: string; // 部分版本返回该属性
}

export interface MountListResponse {
  mounts?: RcloneMountItem[];
}

export interface MountTypesResponse {
  types?: string[];
}

/**
 * 获取当前所有正在运行的 Rclone 挂载列表
 */
export const getMountList = async (): Promise<RcloneMountItem[]> => {
  try {
    const response = await net.post<MountListResponse>({
      url: '/mount/mounts',
      data: {},
    });
    return response.mounts || [];
  } catch (error) {
    console.error('获取挂载列表失败:', error);
    // 挂载可能因为某些操作系统配置不支持导致 API 报错，这里优雅地返回空数组
    return [];
  }
};

/**
 * 获取支持的挂载选项/类型（例如 mount, cmount, fuse, etc.）
 */
export const getMountTypes = async (): Promise<string[]> => {
  try {
    const response = await net.post<MountTypesResponse>({
      url: '/mount/types',
      data: {},
    });
    return response.types || ['mount'];
  } catch (error) {
    console.error('获取挂载类型失败:', error);
    return ['mount'];
  }
};

/**
 * 挂载一个远程存储到本地目录
 * @param fs 远程存储名称加路径，如 "drive:folder"
 * @param mountPoint 本地挂载路径，如 "/Users/hurole/mount-dir" 或 "D:\\mount-dir"
 * @param mountType 挂载方式，默认 "mount"
 */
export const createMount = async (fs: string, mountPoint: string, mountType = 'mount'): Promise<void> => {
  try {
    const formattedFs = fs.includes(':') ? fs : `${fs}:`;
    await net.post({
      url: '/mount/mount',
      data: {
        fs: formattedFs,
        mountPoint,
        mountType,
      },
    });
  } catch (error) {
    console.error(`挂载远程云盘失败 ${fs} -> ${mountPoint}:`, error);
    throw error;
  }
};

/**
 * 卸载某个挂载点
 * @param mountPoint 本地挂载路径
 */
export const deleteMount = async (mountPoint: string): Promise<void> => {
  try {
    await net.post({
      url: '/mount/unmount',
      data: {
        mountPoint,
      },
    });
  } catch (error) {
    console.error(`卸载挂载点失败 ${mountPoint}:`, error);
    throw error;
  }
};

/**
 * 刷新 VFS 目录/文件缓存 (vfs/refresh)
 */
export const refreshVfsCache = async (fs: string, dir = ''): Promise<void> => {
  try {
    const formattedFs = fs.includes(':') ? fs : `${fs}:`;
    await net.post({
      url: '/vfs/refresh',
      data: {
        fs: formattedFs,
        dir,
        recursive: true,
      },
    });
  } catch (error) {
    console.error(`刷新 VFS 缓存失败 ${fs}:`, error);
    throw error;
  }
};

/**
 * 清除 VFS 缓存 (vfs/forget)
 */
export const forgetVfsCache = async (fs: string): Promise<void> => {
  try {
    const formattedFs = fs.includes(':') ? fs : `${fs}:`;
    await net.post({
      url: '/vfs/forget',
      data: {
        fs: formattedFs,
      },
    });
  } catch (error) {
    console.error(`清除 VFS 缓存失败 ${fs}:`, error);
    throw error;
  }
};

export interface RcloneServeItem {
  id?: string;
  type: string;
  addr: string;
  fs: string;
}

export interface ServeListResponse {
  list?: RcloneServeItem[];
}

/**
 * 获取当前正在运行的外部共享服务列表 (serve/list)
 */
export const getServeList = async (): Promise<RcloneServeItem[]> => {
  try {
    const response = await net.post<ServeListResponse>({
      url: '/serve/list',
      data: {},
    });
    return response.list || [];
  } catch (error) {
    console.error('获取服务共享列表失败:', error);
    return [];
  }
};

/**
 * 开启一个网络协议共享服务 (WebDAV / HTTP / FTP / DLNA)
 */
export const startServe = async (
  type: 'webdav' | 'http' | 'ftp' | 'dlna',
  fs: string,
  addr: string,
  user = '',
  pass = '',
): Promise<void> => {
  try {
    const formattedFs = fs.includes(':') ? fs : `${fs}:`;
    const data: Record<string, unknown> = {
      fs: formattedFs,
      addr,
      _async: true,
    };
    if (user && pass) {
      data.user = user;
      data.pass = pass;
    }

    await net.post({
      url: `/serve/${type}`,
      data,
    });
  } catch (error) {
    console.error(`启动共享服务失败 (${type}):`, error);
    throw error;
  }
};

/**
 * 停止指定网络协议共享服务
 */
export const stopServe = async (type: string, addr: string): Promise<void> => {
  try {
    await net.post({
      url: '/serve/stop',
      data: {
        type,
        addr,
      },
    });
  } catch (error) {
    console.error(`停止共享服务失败 ${type}@${addr}:`, error);
    throw error;
  }
};
