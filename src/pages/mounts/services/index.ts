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
export const createMount = async (
  fs: string,
  mountPoint: string,
  mountType = 'mount',
): Promise<void> => {
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
