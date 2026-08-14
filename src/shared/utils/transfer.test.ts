import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { net } from '@/shared/utils/net';
import { downloadFileBlob, downloadItemsAsZip, triggerBrowserDownload, uploadFile } from './transfer';

vi.mock('@/shared/utils/net', () => ({
  net: {
    post: vi.fn(),
  },
}));

const makeBlob = (text = 'data'): Blob => new Blob([text], { type: 'text/plain' });

describe('transfer utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uploadFile should send multipart form with file and query params', async () => {
    vi.mocked(net.post).mockResolvedValue({});
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' });

    await uploadFile('drive', 'photos/', file);

    const call = vi.mocked(net.post).mock.calls[0]?.[0];
    expect(call?.url).toContain('/operations/uploadfile?');
    expect(call?.url).toContain('fs=drive%3A');
    expect(call?.url).toContain('remote=photos%2F');
    expect(call?.timeout).toBe(0);
    const form = call?.data as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('fs')).toBeNull();
  });

  it('uploadFile should normalize remote without trailing slash and fs without colon', async () => {
    vi.mocked(net.post).mockResolvedValue({});
    const file = new File(['x'], 'b.txt', { type: 'text/plain' });

    await uploadFile('drive', 'docs', file);

    const call = vi.mocked(net.post).mock.calls[0]?.[0];
    expect(call?.url).toContain('remote=docs%2F');
    expect(call?.url).toContain('fs=drive%3A');
  });

  it('downloadFileBlob should use publiclink when supported', async () => {
    vi.mocked(net.post).mockResolvedValueOnce({ url: 'https://example.com/dl/1' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => makeBlob() });
    vi.stubGlobal('fetch', fetchMock);

    const blob = await downloadFileBlob('drive', 'a.txt');

    expect(blob).toBeInstanceOf(Blob);
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/dl/1');
    // 未启动 serve
    expect(net.post).toHaveBeenCalledTimes(1);
  });

  it('downloadFileBlob should fall back to temp serve when publiclink fails', async () => {
    vi.mocked(net.post)
      .mockRejectedValueOnce(new Error('unsupported')) // publiclink 失败
      .mockResolvedValueOnce({ jobid: 42 }) // core/command 启动 serve
      .mockResolvedValueOnce({}); // job/stop 停止

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 404 }) // waitForServeReady 探测
      .mockResolvedValueOnce({ ok: true, blob: async () => makeBlob('content') }); // 文件下载
    vi.stubGlobal('fetch', fetchMock);

    const blob = await downloadFileBlob('drive', 'photos/a.txt');

    expect(blob).toBeInstanceOf(Blob);
    const serveCall = vi.mocked(net.post).mock.calls[1]?.[0];
    expect(serveCall?.url).toBe('/core/command');
    expect(serveCall?.data.command).toBe('serve');
    expect(serveCall?.data.arg).toContain('drive:');
    expect(serveCall?.data._async).toBe(true);
    // 请求 URL 中的路径已编码
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/photos/a.txt');
    // 停止 serve
    expect(vi.mocked(net.post).mock.calls[2]?.[0]).toEqual({ url: '/job/stop', data: { jobid: 42 } });
  });

  it('downloadItemsAsZip should expand dirs, download via single serve and pack zip', async () => {
    // 递归 list：根目录下 1 个文件 + 1 个子目录
    vi.mocked(net.post)
      .mockResolvedValueOnce({
        list: [{ Name: 'dir1', Path: 'dir1', Size: 0, IsDir: true, MimeType: '', ModTime: '' }],
      }) // expand dir1
      .mockResolvedValueOnce({
        list: [{ Name: 'a.txt', Path: 'dir1/a.txt', Size: 4, IsDir: false, MimeType: '', ModTime: '' }],
      }) // expand dir1 内部
      .mockResolvedValueOnce({ jobid: 7 }) // serve 启动
      .mockResolvedValueOnce({}); // job/stop

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 404 }) // waitForServeReady
      .mockResolvedValueOnce({ ok: true, blob: async () => makeBlob('file1') }); // 下载 a.txt
    vi.stubGlobal('fetch', fetchMock);

    const blob = await downloadItemsAsZip(
      'drive',
      [{ path: 'dir1', name: 'dir1', size: 0, isDir: true }],
      () => undefined,
    );

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    // 只有一次 serve 启动（打包复用）
    const serveCalls = vi.mocked(net.post).mock.calls.filter(c => c[0]?.url === '/core/command');
    expect(serveCalls).toHaveLength(1);
  });

  it('downloadItemsAsZip should return empty zip for empty directory', async () => {
    vi.mocked(net.post)
      .mockResolvedValueOnce({ list: [] }) // 空目录
      .mockResolvedValueOnce({ jobid: 1 }) // serve（不会启动，因为 files 为空）
      .mockResolvedValueOnce({});

    const blob = await downloadItemsAsZip('drive', [{ path: 'empty', name: 'empty', size: 0, isDir: true }]);

    expect(blob).toBeInstanceOf(Blob);
  });

  it('triggerBrowserDownload should create an anchor, click and revoke object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    triggerBrowserDownload(makeBlob(), 'file.txt');

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(revokeObjectURL).toHaveBeenCalled();

    vi.useRealTimers();
    // 清理测试注入的 DOM
    document.body.innerHTML = '';
  });
});
