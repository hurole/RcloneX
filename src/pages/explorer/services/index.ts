import { net } from '@/shared/utils/net';

export interface RcloneFileItem {
  Name: string;
  Path: string;
  Size: number;
  IsDir: boolean;
  MimeType: string;
  ModTime: string;
}

export interface ListResponse {
  list: RcloneFileItem[];
}

/**
 * 列出远程存储中的文件和目录
 * @param fs 远程存储名称，例如 "drive:"
 * @param remote 相对路径，例如 "documents/photos" (根目录传空字符串 "")
 */
export const listDirectory = async (fs: string, remote: string): Promise<RcloneFileItem[]> => {
  try {
    const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
    const response = await net.post<ListResponse>({
      url: '/operations/list',
      data: {
        fs: formattedFs,
        remote,
      },
    });
    return response.list || [];
  } catch (error) {
    console.error(`列出目录失败 ${fs}/${remote}:`, error);
    throw error;
  }
};

/**
 * 创建文件夹
 */
export const makeDirectory = async (fs: string, remote: string): Promise<void> => {
  try {
    const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
    await net.post({
      url: '/operations/mkdir',
      data: {
        fs: formattedFs,
        remote,
      },
    });
  } catch (error) {
    console.error(`创建文件夹失败 ${fs}/${remote}:`, error);
    throw error;
  }
};

/**
 * 删除单个文件
 */
export const deleteFile = async (fs: string, remote: string): Promise<void> => {
  try {
    const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
    await net.post({
      url: '/operations/deletefile',
      data: {
        fs: formattedFs,
        remote,
      },
    });
  } catch (error) {
    console.error(`删除文件失败 ${fs}/${remote}:`, error);
    throw error;
  }
};

/**
 * 删除文件夹及其内容
 */
export const purgeDirectory = async (fs: string, remote: string): Promise<void> => {
  try {
    const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
    await net.post({
      url: '/operations/purge',
      data: {
        fs: formattedFs,
        remote,
      },
    });
  } catch (error) {
    console.error(`清空删除文件夹失败 ${fs}/${remote}:`, error);
    throw error;
  }
};

/**
 * 触发复制任务 (Sync/Copy)
 */
export const copyJob = async (
  srcFs: string,
  srcRemote: string,
  dstFs: string,
  dstRemote: string,
): Promise<{ jobid: number }> => {
  try {
    const formattedSrcFs = srcFs.endsWith(':') ? srcFs : `${srcFs}:`;
    const formattedDstFs = dstFs.endsWith(':') ? dstFs : `${dstFs}:`;

    // 使用 _async: true 参数在后台启动任务，返回 jobid
    const response = await net.post<{ jobid: number }>({
      url: '/sync/copy',
      data: {
        srcFs: formattedSrcFs + srcRemote,
        dstFs: formattedDstFs + dstRemote,
        _async: true,
      },
    });
    return response;
  } catch (error) {
    console.error('启动复制任务失败:', error);
    throw error;
  }
};

export interface PublicLinkResponse {
  url: string;
}

/**
 * 生成文件/目录的公开分享链接 (Public Link)
 */
export const getPublicLink = async (fs: string, remote: string, unlink = false, expire = ''): Promise<string> => {
  try {
    const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
    const data: Record<string, unknown> = {
      fs: formattedFs,
      remote,
    };
    if (unlink) {
      data.unlink = true;
    }
    if (expire) {
      data.expire = expire;
    }

    const response = await net.post<PublicLinkResponse>({
      url: '/operations/publiclink',
      data,
    });
    return response.url || '';
  } catch (error) {
    console.error(`生成公开链接失败 (${fs}/${remote}):`, error);
    throw error;
  }
};

/**
 * 移动文件/目录（跨目录或跨盘），operations/moveto
 * @param srcFs 源远端，如 "drive"
 * @param srcRemote 源完整路径（含文件名），如 "photos/a.jpg"
 * @param dstFs 目标远端（同盘移动时与 srcFs 相同）
 * @param dstRemote 目标完整路径（含新文件名），如 "archive/a.jpg"
 */
export const moveItem = async (srcFs: string, srcRemote: string, dstFs: string, dstRemote: string): Promise<void> => {
  const formattedSrcFs = srcFs.endsWith(':') ? srcFs : `${srcFs}:`;
  const formattedDstFs = dstFs.endsWith(':') ? dstFs : `${dstFs}:`;
  await net.post({
    url: '/operations/moveto',
    data: {
      srcFs: formattedSrcFs,
      srcRemote,
      dstFs: formattedDstFs,
      dstRemote,
    },
  });
};

/**
 * 重命名文件/目录（同盘 moveto），新名称不得包含路径分隔符
 */
export const renameItem = async (fs: string, remote: string, newName: string): Promise<void> => {
  const parent = remote.includes('/') ? remote.slice(0, remote.lastIndexOf('/')) : '';
  const dstRemote = parent ? `${parent}/${newName}` : newName;
  await moveItem(fs, remote, fs, dstRemote);
};

/**
 * 递归搜索远端文件/目录
 * - 优先使用后端 filter（recurse + IncludeRule glob）
 * - 若后端不支持（低版本 rclone）则降级为全量递归 + 前端子串过滤
 * @param keyword 搜索关键字（大小写不敏感）
 * @param dir 搜索起始目录（默认远端根目录）
 */
export const searchFiles = async (
  fs: string,
  keyword: string,
  dir = '',
): Promise<{ results: RcloneFileItem[]; fallback: boolean }> => {
  const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
  const trimmed = keyword.trim();
  if (!trimmed) return { results: [], fallback: false };

  try {
    const response = await net.post<{ list: RcloneFileItem[] }>({
      url: '/operations/list',
      data: {
        fs: formattedFs,
        remote: dir,
        opt: {
          recurse: true,
          filter: {
            IncludeRule: [`*${trimmed}*`],
          },
        },
      },
    });
    return { results: response.list || [], fallback: false };
  } catch {
    // 降级：全量递归 + 前端过滤
    const response = await net.post<{ list: RcloneFileItem[] }>({
      url: '/operations/list',
      data: {
        fs: formattedFs,
        remote: dir,
        opt: { recurse: true },
      },
    });
    const list = response.list || [];
    const lower = trimmed.toLowerCase();
    const filtered = list.filter(item => item.Name.toLowerCase().includes(lower));
    return { results: filtered, fallback: true };
  }
};

export interface SizeInfo {
  count: number;
  bytes: number;
  sizeless: number;
}

/**
 * 统计目录（或整个远端）的总大小与文件数，operations/size
 */
export const getDirectorySize = async (fs: string, remote: string): Promise<SizeInfo> => {
  const formattedFs = fs.endsWith(':') ? fs : `${fs}:`;
  const response = await net.post<SizeInfo>({
    url: '/operations/size',
    data: {
      fs: formattedFs,
      remote,
    },
  });
  return response;
};

/**
 * 复制单个文件（跨盘/跨目录），operations/copyfile
 */
export const copyFileItem = async (
  srcFs: string,
  srcRemote: string,
  dstFs: string,
  dstRemote: string,
): Promise<void> => {
  const formattedSrcFs = srcFs.endsWith(':') ? srcFs : `${srcFs}:`;
  const formattedDstFs = dstFs.endsWith(':') ? dstFs : `${dstFs}:`;
  await net.post({
    url: '/operations/copyfile',
    data: {
      srcFs: formattedSrcFs,
      srcRemote,
      dstFs: formattedDstFs,
      dstRemote,
    },
  });
};
