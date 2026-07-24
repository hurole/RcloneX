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

export interface CreateTaskParams {
  type: 'sync' | 'copy' | 'move' | 'bisync' | 'check' | 'cleanup';
  srcFs?: string;
  dstFs?: string;
  dryRun?: boolean;
}

/**
 * 更加灵活的高级任务创建 API (支持 sync, copy, move, bisync, check, cleanup)
 */
export const createAdvancedTask = async (params: CreateTaskParams): Promise<{ jobid?: number }> => {
  const { type, srcFs, dstFs, dryRun } = params;

  try {
    let url = `/sync/${type}`;
    if (type === 'check' || type === 'cleanup') {
      url = `/operations/${type}`;
    }

    const data: Record<string, unknown> = {
      _async: true,
    };

    if (srcFs) {
      data.srcFs = srcFs;
    }
    if (dstFs) {
      data.dstFs = dstFs;
    }
    if (type === 'cleanup' && srcFs && !dstFs) {
      // operations/cleanup 可传入 fs 参数
      data.fs = srcFs;
    }
    if (dryRun) {
      data._config = { DryRun: true };
    }

    const response = await net.post<{ jobid?: number }>({
      url,
      data,
    });
    return response;
  } catch (error) {
    console.error(`创建高级任务失败 (${type}):`, error);
    throw error;
  }
};

export interface BandwidthLimitInfo {
  rate: string;
  bytesPerSecond: number;
}

/**
 * 查询全局当前带宽限制速率
 */
export const getBandwidthLimit = async (): Promise<BandwidthLimitInfo> => {
  try {
    const response = await net.post<BandwidthLimitInfo>({
      url: '/core/bwlimit',
      data: {},
    });
    return response;
  } catch (error) {
    console.error('获取带宽限制失败:', error);
    return { rate: 'off', bytesPerSecond: 0 };
  }
};

/**
 * 设置全局带宽限制速率 (如 '1M', '500k', 'off')
 */
export const setBandwidthLimit = async (rate: string): Promise<BandwidthLimitInfo> => {
  try {
    const response = await net.post<BandwidthLimitInfo>({
      url: '/core/bwlimit',
      data: {
        rate,
      },
    });
    return response;
  } catch (error) {
    console.error(`设置带宽限制失败 (${rate}):`, error);
    throw error;
  }
};

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'sync' | 'copy' | 'move' | 'bisync' | 'check' | 'cleanup';
  srcFs?: string;
  dstFs?: string;
  cronExpr: string; // 例如 '30m', '1h', '24h' 或 '0 2 * * *'
  enabled: boolean;
  dryRun?: boolean;
  lastRunAt?: string;
  lastRunSuccess?: boolean;
  createdAt: string;
}

const SCHEDULED_TASKS_KEY = 'rclone-scheduled-tasks';

/**
 * 获取本地保存的所有定时同步任务
 */
export const getScheduledTasks = (): ScheduledTask[] => {
  try {
    const raw = localStorage.getItem(SCHEDULED_TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

/**
 * 保存定时同步任务列表
 */
export const saveScheduledTasks = (tasks: ScheduledTask[]): void => {
  try {
    localStorage.setItem(SCHEDULED_TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('保存定时任务失败:', err);
  }
};

/**
 * 添加一个新的定时同步任务
 */
export const addScheduledTask = (task: Omit<ScheduledTask, 'id' | 'createdAt'>): ScheduledTask => {
  const current = getScheduledTasks();
  const newTask: ScheduledTask = {
    ...task,
    id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newTask, ...current];
  saveScheduledTasks(updated);
  return newTask;
};

/**
 * 切换定时任务的激活/禁用状态
 */
export const toggleScheduledTask = (id: string): ScheduledTask[] => {
  const current = getScheduledTasks();
  const updated = current.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t));
  saveScheduledTasks(updated);
  return updated;
};

/**
 * 删除指定的定时同步任务
 */
export const deleteScheduledTask = (id: string): ScheduledTask[] => {
  const current = getScheduledTasks();
  const updated = current.filter(t => t.id !== id);
  saveScheduledTasks(updated);
  return updated;
};
