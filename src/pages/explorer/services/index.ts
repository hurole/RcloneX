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
