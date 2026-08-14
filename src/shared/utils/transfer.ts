import JSZip from 'jszip';
import { net } from './net';

/** 上传/下载进度回调 */
export interface TransferProgress {
  loaded: number;
  total?: number;
  percent: number;
}

/** 远端文件条目（供打包下载使用） */
export interface TransferFileEntry {
  path: string; // 相对路径（不含 fs 前缀）
  name: string;
  size: number;
  isDir: boolean;
}

/** 下载项（文件或目录） */
export interface DownloadItem {
  path: string;
  name: string;
  size: number;
  isDir: boolean;
}

/** 下载/打包进度回调 (done, total) */
export type DownloadProgress = (done: number, total: number) => void;

const CONCURRENCY = 3;

/**
 * 上传单个文件到远程目录（multipart/form-data 流式上传）
 * @param fs 远程存储，如 "drive"
 * @param remote 目标目录路径（须以 / 结尾），如 "photos/"
 * @param file 本地文件
 * @param onProgress 上传进度回调
 * @param signal AbortSignal（用于取消上传）
 */
export async function uploadFile(
  fs: string,
  remote: string,
  file: File,
  onProgress?: (progress: TransferProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
  const dirRemote = remote.endsWith('/') ? remote : remote ? `${remote}/` : '';
  // rclone RC 的 uploadfile：fs/remote 需通过 URL query 传递，file 走 multipart body
  const query = new URLSearchParams({ fs: formattedFs, remote: dirRemote }).toString();
  const formData = new FormData();
  formData.append('file', file);

  await net.post({
    url: `/operations/uploadfile?${query}`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
    timeout: 0, // 大文件上传不设超时
    onUploadProgress: (e: { loaded: number; total?: number }) => {
      if (onProgress && e.total && e.total > 0) {
        onProgress({ loaded: e.loaded, total: e.total, percent: (e.loaded / e.total) * 100 });
      }
    },
  });
}

/** 生成随机监听端口（避免与既有服务冲突） */
const randomServePort = (): number => 40000 + Math.floor(Math.random() * 10000);

/**
 * 通过 core/command 异步启动临时 rclone serve http（只读），返回 jobid 与 baseUrl
 * 说明：rclone RC 无通用下载接口，此处利用 serve http 提供通用二进制下载能力。
 */
async function startTempServe(fs: string): Promise<{ jobid: number; baseUrl: string }> {
  const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
  const port = randomServePort();
  const response = await net.post<{ jobid: number }>({
    url: '/core/command',
    data: {
      command: 'serve',
      arg: ['http', '--addr', `127.0.0.1:${port}`, formattedFs, '--read-only', '--allow-origin', '*'],
      _async: true,
    },
  });
  const jobid = response.jobid;
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServeReady(baseUrl);
  return { jobid, baseUrl };
}

/** 轮询等待 serve 端口就绪（最长 5s） */
async function waitForServeReady(baseUrl: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl, { method: 'GET' });
      // 200 / 404 均说明服务已就绪（路径是否存在无关紧要）
      if (res.status === 200 || res.status === 404 || res.status === 401) return;
    } catch {
      // 端口未就绪，继续轮询
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('临时下载服务启动超时');
}

/** 停止临时 serve job */
async function stopTempServe(jobid: number): Promise<void> {
  try {
    await net.post({
      url: '/job/stop',
      data: { jobid },
    });
  } catch {
    // 停止失败不影响主流程
  }
}

/** 尝试通过 operations/publiclink 获取下载链接（部分 backend 支持） */
async function tryPublicLink(fs: string, remote: string): Promise<string | null> {
  const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
  try {
    const response = await net.post<{ url?: string }>({
      url: '/operations/publiclink',
      data: { fs: formattedFs, remote },
    });
    return response.url || null;
  } catch {
    return null;
  }
}

/**
 * 下载单个文件为 Blob
 * 策略：publiclink（云盘类 backend）→ 临时 serve http（通用兜底）
 * @param fs 远程存储，如 "drive"
 * @param remote 文件完整路径，如 "photos/a.jpg"
 */
export async function downloadFileBlob(fs: string, remote: string): Promise<Blob> {
  const link = await tryPublicLink(fs, remote);
  if (link) {
    const res = await fetch(link);
    if (res.ok) return await res.blob();
  }

  const { jobid, baseUrl } = await startTempServe(fs);
  try {
    const url = `${baseUrl}/${remote.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`下载失败: HTTP ${res.status}`);
    }
    return await res.blob();
  } finally {
    await stopTempServe(jobid);
  }
}

/**
 * 递归列出远端目录（供打包下载使用，避免跨层依赖 pages 的 services）
 */
async function listDirRecursive(fs: string, remote: string): Promise<TransferFileEntry[]> {
  const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
  const response = await net.post<{ list: TransferFileEntry[] }>({
    url: '/operations/list',
    data: { fs: formattedFs, remote },
    timeout: 0,
  });
  return response.list || [];
}

/**
 * 将一组文件/目录打包为 zip Blob
 * - 目录自动递归展开
 * - 复用单个临时 serve 服务下载全部文件（并发 3）
 * - 失败文件跳过（不中断整体）
 */
export async function downloadItemsAsZip(
  fs: string,
  items: DownloadItem[],
  onProgress?: DownloadProgress,
): Promise<Blob> {
  const files: Array<{ path: string; size: number }> = [];

  const expand = async (item: DownloadItem): Promise<void> => {
    if (!item.isDir) {
      files.push({ path: item.path, size: item.size });
      return;
    }
    const children = await listDirRecursive(fs, item.path);
    for (const child of children) {
      await expand({ path: child.path, name: child.name, size: child.size, isDir: child.isDir });
    }
  };

  for (const item of items) {
    await expand(item);
  }

  if (files.length === 0) {
    // 空目录：返回空 zip
    const emptyZip = new JSZip();
    return emptyZip.generateAsync({ type: 'blob' });
  }

  const total = files.length;
  let done = 0;
  const zip = new JSZip();

  // 复用单次 serve 下载全部文件
  const { jobid, baseUrl } = await startTempServe(fs);
  try {
    const downloadOne = async (path: string): Promise<void> => {
      const url = `${baseUrl}/${path.split('/').map(encodeURIComponent).join('/')}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      zip.file(path, blob);
    };

    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, Math.max(1, files.length)) }, async () => {
      while (nextIndex < files.length) {
        const idx = nextIndex;
        nextIndex += 1;
        try {
          await downloadOne(files[idx].path);
        } catch {
          // 单个文件失败跳过，不中断整体打包
        }
        done += 1;
        onProgress?.(done, total);
      }
    });

    await Promise.all(workers);
    return await zip.generateAsync({ type: 'blob' });
  } finally {
    await stopTempServe(jobid);
  }
}

/**
 * 触发浏览器下载
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
