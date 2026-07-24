import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addScheduledTask,
  deleteScheduledTask,
  getScheduledTasks,
  runScheduledTaskNow,
  toggleScheduledTask,
} from './index';

vi.mock('@/pages/tasks/services', () => ({
  createAdvancedTask: vi.fn().mockResolvedValue({ jobid: 99 }),
}));

describe('Schedules Services', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should manage scheduled tasks via localStorage', () => {
    expect(getScheduledTasks()).toEqual([]);

    const task = addScheduledTask({
      name: 'Sync Photo Cloud',
      type: 'sync',
      srcFs: 'remote1:/photos',
      dstFs: 'remote2:/backup',
      cronExpr: '30m',
      enabled: true,
    });

    expect(task.id).toBeDefined();
    expect(getScheduledTasks()).toHaveLength(1);

    const toggled = toggleScheduledTask(task.id);
    expect(toggled[0].enabled).toBe(false);

    const afterDelete = deleteScheduledTask(task.id);
    expect(afterDelete).toEqual([]);
  });

  it('should run scheduled task immediately', async () => {
    const task = {
      id: 'sched_1',
      name: 'Instant Backup',
      type: 'copy' as const,
      srcFs: 'src:',
      dstFs: 'dst:',
      cronExpr: '1h',
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const res = await runScheduledTaskNow(task);
    expect(res).toEqual({ jobid: 99 });
  });
});
