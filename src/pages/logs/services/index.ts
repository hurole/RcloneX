import { net } from '@/shared/utils/net';

export interface RcloneVersionInfo {
  version: string;
  os: string;
  arch: string;
  goVersion: string;
  isBeta: boolean;
}

/**
 * 获取当前的 Rclone 版本与系统架构信息
 */
export const getRcloneVersion = async (): Promise<RcloneVersionInfo> => {
  try {
    const versionInfo = await net.post<RcloneVersionInfo>({
      url: '/core/version',
      data: {},
    });
    return versionInfo;
  } catch (error) {
    console.error('获取Rclone版本信息失败:', error);
    // 返回一个备用默认值以确保 UI 正常运行
    return {
      version: 'v1.66.0',
      os: 'darwin',
      arch: 'arm64',
      goVersion: 'go1.22.0',
      isBeta: false,
    };
  }
};
