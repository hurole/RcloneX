import { net } from '@/shared/utils/net';

export interface RcloneTransferItem {
  name: string;
  size: number;
  bytes: number;
  speed: number;
  speedAvg: number;
  eta: number;
  percentage: number;
}

export interface RcloneCoreStats {
  speed: number;
  bytes: number;
  errors: number;
  checks: number;
  transfers?: RcloneTransferItem[];
  elapsedTime: number;
}

export interface RcloneJobItem {
  id: number;
  duration: number;
  endTime: string;
  error: string;
  finished: boolean;
  group: string;
  output: unknown;
  startTime: string;
  success: boolean;
}

export interface JobListResponse {
  jobs: {
    [key: string]: RcloneJobItem;
  };
}

/**
 * 获取 Rclone 全局实时传输速度和当前活跃任务统计
 */
export const getCoreStats = async (): Promise<RcloneCoreStats> => {
  try {
    const stats = await net.post<RcloneCoreStats>({
      url: '/core/stats',
      data: {},
    });
    return stats;
  } catch (error) {
    console.error('获取核心状态失败:', error);
    throw error;
  }
};

/**
 * 获取所有 Rclone 后台 Job 列表
 */
export const getJobList = async (): Promise<RcloneJobItem[]> => {
  try {
    const response = await net.post<JobListResponse>({
      url: '/job/list',
      data: {},
    });

    const jobsMap = response.jobs || {};
    return Object.values(jobsMap).sort((a, b) => b.id - a.id); // 降序排列，新创建的在前面
  } catch (error) {
    console.error('获取Job列表失败:', error);
    throw error;
  }
};

/**
 * 获取特定后台 Job 的执行状态
 */
export const getJobStatus = async (jobid: number): Promise<RcloneJobItem> => {
  try {
    const response = await net.post<RcloneJobItem>({
      url: '/job/status',
      data: {
        jobid,
      },
    });
    return response;
  } catch (error) {
    console.error(`获取Job状态失败 (${jobid}):`, error);
    throw error;
  }
};

/**
 * 停止某个运行中的后台任务
 */
export const stopJob = async (jobid: number): Promise<void> => {
  try {
    await net.post({
      url: '/job/stop',
      data: {
        jobid,
      },
    });
  } catch (error) {
    console.error(`停止任务失败 (${jobid}):`, error);
    throw error;
  }
};

/**
 * 触发一个全新的后台同步、复制或剪切移动任务
 */
export const startTransfer = async (
  type: 'copy' | 'sync' | 'move',
  srcFs: string,
  srcRemote: string,
  dstFs: string,
  dstRemote: string,
): Promise<{ jobid: number }> => {
  try {
    const formattedSrcFs = srcFs.endsWith(':') ? srcFs : `${srcFs}:`;
    const formattedDstFs = dstFs.endsWith(':') ? dstFs : `${dstFs}:`;

    const response = await net.post<{ jobid: number }>({
      url: `/sync/${type}`,
      data: {
        srcFs: formattedSrcFs + srcRemote,
        dstFs: formattedDstFs + dstRemote,
        _async: true, // 以异步后台方式运行
      },
    });
    return response;
  } catch (error) {
    console.error(`创建后台传输任务失败 (${type}):`, error);
    throw error;
  }
};
