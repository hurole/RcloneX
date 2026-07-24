import { beforeEach, describe, expect, it, vi } from 'vitest';
import { net } from '@/shared/utils/net';
import {
  addScheduledTask,
  createAdvancedTask,
  deleteScheduledTask,
  getBandwidthLimit,
  getCoreStats,
  getJobList,
  getScheduledTasks,
  setBandwidthLimit,
  toggleScheduledTask,
} from './index';

vi.mock('@/shared/utils/net', () => ({
  net: {
    post: vi.fn(),
  },
}));

describe('Tasks Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch core stats correctly', async () => {
    const mockStats = { speed: 1024, bytes: 2048, errors: 0, checks: 0, elapsedTime: 10 };
    vi.mocked(net.post).mockResolvedValueOnce(mockStats);

    const stats = await getCoreStats();
    expect(net.post).toHaveBeenCalledWith({ url: '/core/stats', data: {} });
    expect(stats).toEqual(mockStats);
  });

  it('should fetch job list correctly', async () => {
    const mockJobs = {
      jobs: {
        '1': {
          id: 1,
          duration: 5,
          endTime: '',
          error: '',
          finished: true,
          group: '',
          output: null,
          startTime: '',
          success: true,
        },
      },
    };
    vi.mocked(net.post).mockResolvedValueOnce(mockJobs);

    const jobs = await getJobList();
    expect(net.post).toHaveBeenCalledWith({ url: '/job/list', data: {} });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe(1);
  });

  it('should create advanced task', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({ jobid: 42 });

    const res = await createAdvancedTask({
      type: 'sync',
      srcFs: 'drive:src',
      dstFs: 's3:dst',
      dryRun: true,
    });

    expect(net.post).toHaveBeenCalledWith({
      url: '/sync/sync',
      data: {
        _async: true,
        srcFs: 'drive:src',
        dstFs: 's3:dst',
        _config: { DryRun: true },
      },
    });
    expect(res).toEqual({ jobid: 42 });
  });

  it('should get and set bandwidth limit', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({ rate: '1M', bytesPerSecond: 1048576 });
    const getRes = await getBandwidthLimit();
    expect(getRes.rate).toBe('1M');

    vi.mocked(net.post).mockResolvedValueOnce({ rate: '5M', bytesPerSecond: 5242880 });
    const setRes = await setBandwidthLimit('5M');
    expect(net.post).toHaveBeenCalledWith({ url: '/core/bwlimit', data: { rate: '5M' } });
    expect(setRes.rate).toBe('5M');
  });

  it('should manage scheduled tasks in localStorage', () => {
    localStorage.clear();
    const initial = getScheduledTasks();
    expect(initial).toEqual([]);

    const created = addScheduledTask({
      name: 'Test Schedule',
      type: 'sync',
      srcFs: 'local:/src',
      dstFs: 's3:/dst',
      cronExpr: '1h',
      enabled: true,
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Test Schedule');

    const tasks = getScheduledTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].enabled).toBe(true);

    const toggled = toggleScheduledTask(created.id);
    expect(toggled[0].enabled).toBe(false);

    const afterDelete = deleteScheduledTask(created.id);
    expect(afterDelete).toEqual([]);
  });
});
