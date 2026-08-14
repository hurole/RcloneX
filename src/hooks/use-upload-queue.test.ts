import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadFile } from '@/shared/utils/transfer';
import { useUploadQueue } from './use-upload-queue';

vi.mock('@/shared/utils/transfer', () => ({
  uploadFile: vi.fn(),
}));

const makeFile = (name: string, size = 100): File => new File([new Uint8Array(size)], name, { type: 'text/plain' });

/** 可控 promise，用于模拟未完成的上传 */
const deferred = () => {
  let resolve!: (value?: void | PromiseLike<void>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useUploadQueue hook', () => {
  beforeEach(() => {
    // resetAllMocks 同时清除 mockReturnValueOnce 队列，避免用例间泄漏
    vi.resetAllMocks();
  });

  it('should add files and start uploading with correct remote path', async () => {
    vi.mocked(uploadFile).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUploadQueue());
    await act(async () => {
      result.current.addFiles([makeFile('a.txt'), makeFile('b.txt')], 'drive', 'photos/');
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.tasks).toHaveLength(2);
    expect(uploadFile).toHaveBeenCalledTimes(2);
    // remote 为目录部分（不含文件名），保留 remoteBase
    expect(uploadFile).toHaveBeenCalledWith(
      'drive',
      'photos/',
      expect.any(File),
      expect.any(Function),
      expect.any(AbortSignal),
    );
    expect(result.current.stats.total).toBe(2);
    expect(result.current.stats.success).toBe(2);
  });

  it('should respect directory relative path for upload destination', async () => {
    vi.mocked(uploadFile).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUploadQueue());
    const file = makeFile('inner/a.jpg');
    Object.defineProperty(file, 'webkitRelativePath', { value: 'folder/inner/a.jpg' });

    await act(async () => {
      result.current.addFiles([file], 'drive', 'root/');
      await new Promise(r => setTimeout(r, 0));
    });

    expect(uploadFile).toHaveBeenCalledWith(
      'drive',
      'root/folder/inner/',
      expect.any(File),
      expect.any(Function),
      expect.any(AbortSignal),
    );
    expect(result.current.tasks[0].displayName).toBe('a.jpg');
  });

  it('should limit concurrency to 3', async () => {
    const d1 = deferred();
    const d2 = deferred();
    const d3 = deferred();
    const d4 = deferred();
    const d5 = deferred();
    vi.mocked(uploadFile)
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise)
      .mockReturnValueOnce(d3.promise)
      .mockReturnValueOnce(d4.promise)
      .mockReturnValueOnce(d5.promise);

    const { result } = renderHook(() => useUploadQueue());
    await act(async () => {
      result.current.addFiles(
        [makeFile('1.txt'), makeFile('2.txt'), makeFile('3.txt'), makeFile('4.txt'), makeFile('5.txt')],
        'drive',
        '',
      );
    });

    // 并发 3：前三个立即开始
    expect(uploadFile).toHaveBeenCalledTimes(3);
    expect(result.current.tasks.filter(t => t.status === 'uploading')).toHaveLength(3);

    // 完成前 2 个后，调度补充 2 个
    await act(async () => {
      d1.resolve();
      d2.resolve();
      await new Promise(r => setTimeout(r, 0));
    });
    expect(uploadFile).toHaveBeenCalledTimes(5);
    expect(result.current.tasks.filter(t => t.status === 'uploading')).toHaveLength(3);
  });

  it('should mark task as error when upload rejects and support retry', async () => {
    vi.mocked(uploadFile).mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useUploadQueue());
    await act(async () => {
      result.current.addFiles([makeFile('a.txt')], 'drive', '');
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.tasks[0].status).toBe('error');
    expect(result.current.tasks[0].error).toBe('network down');
    expect(result.current.stats.failed).toBe(1);

    // 重试成功
    vi.mocked(uploadFile).mockResolvedValue(undefined);
    await act(async () => {
      result.current.retry(result.current.tasks[0].id);
      await new Promise(r => setTimeout(r, 0));
    });
    expect(result.current.tasks[0].status).toBe('success');
    expect(result.current.stats.success).toBe(1);
  });

  it('should cancel pending and uploading tasks', async () => {
    const d1 = deferred();
    const d2 = deferred();
    const d3 = deferred();
    const d4 = deferred();
    const d5 = deferred();
    vi.mocked(uploadFile)
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise)
      .mockReturnValueOnce(d3.promise)
      .mockReturnValueOnce(d4.promise)
      .mockReturnValueOnce(d5.promise);

    const { result } = renderHook(() => useUploadQueue());
    await act(async () => {
      result.current.addFiles(
        [makeFile('1.txt'), makeFile('2.txt'), makeFile('3.txt'), makeFile('4.txt'), makeFile('5.txt')],
        'drive',
        '',
      );
    });

    // 并发 3：前 3 个上传中，后 2 个排队
    const uploading = result.current.tasks.find(t => t.status === 'uploading');
    const pending = result.current.tasks.find(t => t.status === 'pending');
    expect(uploading).toBeDefined();
    expect(pending).toBeDefined();
    const uploadingId = uploading!.id;
    const pendingId = pending!.id;

    // 取消上传中与排队中的任务
    await act(async () => {
      result.current.cancel(uploadingId);
      result.current.cancel(pendingId);
    });
    expect(result.current.tasks.filter(t => t.status === 'cancelled')).toHaveLength(2);

    // 模拟被取消的请求以 CanceledError 结束，状态不应被覆盖
    const cancelError = new Error('canceled');
    cancelError.name = 'CanceledError';
    await act(async () => {
      d1.reject(cancelError);
      await new Promise(r => setTimeout(r, 0));
    });

    // 被取消的任务保持 cancelled，不会被重新启动
    expect(result.current.tasks.find(t => t.id === uploadingId)?.status).toBe('cancelled');
    expect(result.current.tasks.find(t => t.id === pendingId)?.status).toBe('cancelled');
    expect(result.current.stats.cancelled).toBe(2);
  });

  it('should clear finished tasks and keep running ones', async () => {
    vi.mocked(uploadFile).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUploadQueue());
    await act(async () => {
      result.current.addFiles([makeFile('a.txt')], 'drive', '');
      await new Promise(r => setTimeout(r, 0));
      result.current.clearFinished();
    });

    expect(result.current.tasks).toHaveLength(0);
    expect(result.current.stats.total).toBe(0);
  });
});
