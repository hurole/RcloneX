import { useCallback, useMemo, useRef, useState } from 'react';
import { uploadFile } from '@/shared/utils/transfer';

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';

export interface UploadTask {
  id: string;
  fs: string; // 目标远端，如 "drive"
  remoteBase: string; // 目标目录（不含文件名），以 / 结尾，如 "photos/"
  relativePath: string; // 相对 base 的路径（含文件名），目录上传时含层级
  displayName: string; // 展示名称（末段文件名）
  file: File;
  size: number;
  status: UploadStatus;
  progress: number; // 0-100
  bytesUploaded: number;
  speed: number; // bytes/s
  error?: string;
}

export interface UploadQueueStats {
  total: number;
  success: number;
  failed: number;
  cancelled: number;
  active: number;
  bytesTotal: number;
  bytesUploaded: number;
}

const CONCURRENCY = 3;

/** 提取路径中的目录部分（不含文件名），如 "a/b/c.jpg" -> "a/b/" */
const dirOf = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(0, idx + 1) : '';
};

/**
 * 上传队列 Hook
 * - 支持并发上传（默认 3）
 * - 任务状态机：pending -> uploading -> success | error | cancelled
 * - 失败可重试，上传中可取消
 */
export function useUploadQueue() {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const tasksRef = useRef<UploadTask[]>([]);
  const runningRef = useRef<Set<string>>(new Set());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const schedulerRef = useRef<() => void>(() => {});

  const updateTask = (id: string, patch: Partial<UploadTask>): void => {
    tasksRef.current = tasksRef.current.map(t => (t.id === id ? { ...t, ...patch } : t));
    setTasks(tasksRef.current);
  };

  const startTask = async (id: string): Promise<void> => {
    const task = tasksRef.current.find(t => t.id === id);
    if (!task || runningRef.current.has(id)) return;
    runningRef.current.add(id);
    updateTask(id, { status: 'uploading', progress: 0, error: undefined });

    let lastBytes = 0;
    let lastTime = Date.now();
    const controller = new AbortController();
    controllersRef.current.set(id, controller);

    try {
      await uploadFile(
        task.fs,
        task.remoteBase + dirOf(task.relativePath),
        task.file,
        p => {
          const now = Date.now();
          const dt = (now - lastTime) / 1000;
          const speed = dt > 0 ? (p.loaded - lastBytes) / dt : 0;
          lastBytes = p.loaded;
          lastTime = now;
          updateTask(id, { progress: p.percent, bytesUploaded: p.loaded, speed });
        },
        controller.signal,
      );
      updateTask(id, { status: 'success', progress: 100, bytesUploaded: task.size, speed: 0 });
    } catch (err) {
      const current = tasksRef.current.find(t => t.id === id);
      // 已被用户取消：保持 cancelled 状态，不被后续结果覆盖
      if (current?.status === 'cancelled') {
        // no-op
      } else {
        const isCancel = err instanceof Error && err.name === 'CanceledError';
        updateTask(id, {
          status: isCancel ? 'cancelled' : 'error',
          error: isCancel ? undefined : err instanceof Error ? err.message : '上传失败',
          speed: 0,
        });
      }
    } finally {
      controllersRef.current.delete(id);
      runningRef.current.delete(id);
      schedulerRef.current();
    }
  };

  const schedule = (): void => {
    const pending = tasksRef.current.filter(t => t.status === 'pending');
    const available = Math.max(0, CONCURRENCY - runningRef.current.size);
    for (const task of pending.slice(0, available)) {
      void startTask(task.id);
    }
  };

  schedulerRef.current = schedule;

  /** 添加文件到上传队列 */
  const addFiles = useCallback((files: File[], fs: string, remoteBase: string): void => {
    const newTasks: UploadTask[] = files.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fs,
      remoteBase,
      relativePath: file.webkitRelativePath || file.name,
      displayName: file.webkitRelativePath ? (file.webkitRelativePath.split('/').pop() ?? file.name) : file.name,
      file,
      size: file.size,
      status: 'pending',
      progress: 0,
      bytesUploaded: 0,
      speed: 0,
    }));
    tasksRef.current = [...tasksRef.current, ...newTasks];
    setTasks(tasksRef.current);
    schedulerRef.current();
  }, []);

  /** 取消任务（上传中或排队中） */
  const cancel = useCallback((id: string): void => {
    const task = tasksRef.current.find(t => t.id === id);
    if (!task) return;
    if (task.status === 'pending') {
      updateTask(id, { status: 'cancelled' });
    } else if (task.status === 'uploading') {
      controllersRef.current.get(id)?.abort();
      updateTask(id, { status: 'cancelled', speed: 0 });
    }
  }, []);

  /** 重试失败任务 */
  const retry = useCallback((id: string): void => {
    updateTask(id, { status: 'pending', progress: 0, bytesUploaded: 0, speed: 0, error: undefined });
    schedulerRef.current();
  }, []);

  /** 清除所有已结束（成功/失败/取消）的任务 */
  const clearFinished = useCallback((): void => {
    tasksRef.current = tasksRef.current.filter(t => t.status === 'pending' || t.status === 'uploading');
    setTasks(tasksRef.current);
  }, []);

  const stats = useMemo<UploadQueueStats>(() => {
    let success = 0;
    let failed = 0;
    let cancelled = 0;
    let active = 0;
    let bytesTotal = 0;
    let bytesUploaded = 0;
    for (const t of tasks) {
      if (t.status === 'success') success += 1;
      else if (t.status === 'error') failed += 1;
      else if (t.status === 'cancelled') cancelled += 1;
      if (t.status === 'uploading') active += 1;
      bytesTotal += t.size;
      bytesUploaded += t.bytesUploaded;
    }
    return { total: tasks.length, success, failed, cancelled, active, bytesTotal, bytesUploaded };
  }, [tasks]);

  return { tasks, stats, addFiles, cancel, retry, clearFinished };
}
