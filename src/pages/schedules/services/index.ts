import { createAdvancedTask } from '@/pages/tasks/services';

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

/**
 * 触发一次定时任务
 */
export const runScheduledTaskNow = async (task: ScheduledTask): Promise<{ jobid?: number }> => {
  const formattedSrcFs = task.srcFs ? (task.srcFs.endsWith(':') ? task.srcFs : `${task.srcFs}:`) : undefined;
  const formattedDstFs = task.dstFs ? (task.dstFs.endsWith(':') ? task.dstFs : `${task.dstFs}:`) : undefined;

  return createAdvancedTask({
    type: task.type,
    srcFs: formattedSrcFs,
    dstFs: formattedDstFs,
    dryRun: task.dryRun,
  });
};
