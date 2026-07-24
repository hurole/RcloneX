import axios from 'axios';
import { net } from '@/shared/utils/net';

// Rclone 配置接口类型定义
export interface RcloneConfigResponse {
  [configName: string]: {
    type: string;
    [key: string]: unknown;
  };
}

// 转换后的配置类型
export interface RcloneConfig {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  lastUsed?: string;
  config?: Record<string, unknown>;
}

// API 响应类型
export interface RcloneApiResponse<T = unknown> {
  error?: string;
  result?: T;
}

/**
 * 获取所有 rclone 配置
 */
export const getAllConfigs = async (): Promise<RcloneConfig[]> => {
  try {
    console.log('开始获取配置列表...');

    // 使用 config/listremotes 接口获取配置列表
    const response = await net.post<{ remotes: string[] }>({
      url: '/config/listremotes',
      data: {},
    });

    console.log('listremotes API 响应:', response);

    // 直接从响应中获取 remotes 数组
    const remotes = response.remotes || [];
    console.log('获取到的远程配置列表:', remotes);

    const configs: RcloneConfig[] = [];

    // 对每个远程配置获取详细信息
    for (const remoteName of remotes) {
      console.log(`正在获取配置 ${remoteName} 的详细信息...`);
      try {
        const configDetail = await getConfigDetails(remoteName);
        if (configDetail) {
          configs.push(configDetail);
          console.log(`成功添加配置 ${remoteName} 到列表`);
        } else {
          console.warn(`配置 ${remoteName} 返回 null，跳过`);
        }
      } catch (error) {
        console.error(`获取配置 ${remoteName} 详情失败:`, error);
        // 即使获取详情失败，也要确保添加一个基本配置
        const basicConfig = {
          id: remoteName,
          name: remoteName,
          type: 'unknown',
          createdAt: new Date().toISOString(),
        };
        configs.push(basicConfig);
        console.log(`使用基本信息作为配置 ${remoteName}:`, basicConfig);
      }
    }

    console.log('最终的配置列表:', configs);
    return configs;
  } catch (error) {
    console.error('获取配置失败:', error);

    // 如果 listremotes 失败，尝试使用 config/dump 作为备用方案
    console.log('尝试使用 config/dump 作为备用方案...');
    try {
      const dumpResponse = await net.post<RcloneApiResponse<RcloneConfigResponse>>({
        url: '/config/dump',
        data: {},
      });

      if (dumpResponse.error) {
        throw new Error(dumpResponse.error);
      }

      console.log('config/dump API 响应:', dumpResponse);

      // 转换 config/dump 的响应格式
      const configs: RcloneConfig[] = [];
      const configData = dumpResponse.result || {};

      for (const [configName, configDetails] of Object.entries(configData)) {
        const config = {
          id: configName,
          name: configName,
          type: configDetails.type,
          createdAt: new Date().toISOString(),
          config: configDetails,
        };
        configs.push(config);
      }

      console.log('使用 config/dump 获取的配置列表:', configs);
      return configs;
    } catch (dumpError) {
      console.error('config/dump 也失败:', dumpError);
      throw new Error(`无法获取配置列表: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
};

/**
 * 获取单个配置详情
 */
export const getConfigDetails = async (configName: string): Promise<RcloneConfig | null> => {
  try {
    console.log(`开始获取配置 ${configName} 的详情...`);

    // 使用 config/get 接口获取配置详情
    const response = await net.post<{ [key: string]: unknown }>({
      url: '/config/get',
      data: {
        name: configName,
      },
    });

    console.log(`config/get API 响应 (${configName}):`, response);

    // 直接从响应中获取配置数据
    if (!response || Object.keys(response).length === 0) {
      console.warn(`配置 ${configName} 的响应为空`);
      return null;
    }

    // rclone config/get 返回的是配置的具体参数，需要从中提取 type
    const type = (response as { type?: string }).type || 'unknown';
    console.log(`配置 ${configName} 的类型: ${type}`);

    const config = {
      id: configName,
      name: configName,
      type: type,
      createdAt: new Date().toISOString(),
      config: response,
    };

    console.log(`成功创建配置对象 ${configName}:`, config);
    return config;
  } catch (error) {
    console.error(`获取配置 ${configName} 详情失败:`, error);

    // 即使获取详情失败，也返回一个基本的配置对象
    const basicConfig = {
      id: configName,
      name: configName,
      type: 'unknown',
      createdAt: new Date().toISOString(),
    };

    console.log(`使用基本配置对象 ${configName}:`, basicConfig);
    return basicConfig;
  }
};

/**
 * 获取配置选项（用于创建配置时获取必需参数）
 */
export const getConfigOptions = async (type: string): Promise<unknown> => {
  try {
    const response = await net.post<RcloneApiResponse>({
      url: '/config/get',
      data: {
        type,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return response.result || {};
  } catch (error) {
    console.error('获取配置选项失败:', error);
    throw error;
  }
};

/**
 * 创建新配置
 */
export const createConfig = async (
  name: string,
  type: string,
  parameters: Record<string, unknown> = {},
): Promise<void> => {
  try {
    const response = await net.post<RcloneApiResponse>({
      url: '/config/create',
      data: {
        name,
        type,
        parameters,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('创建配置失败:', error);
    throw error;
  }
};

/**
 * 更新配置
 */
export const updateConfig = async (name: string, parameters: Record<string, unknown>): Promise<void> => {
  try {
    const response = await net.post<RcloneApiResponse>({
      url: '/config/update',
      data: {
        name,
        parameters,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('更新配置失败:', error);
    throw error;
  }
};

/**
 * 删除配置
 */
export const deleteConfig = async (name: string): Promise<void> => {
  try {
    const response = await net.post<RcloneApiResponse>({
      url: '/config/delete',
      data: {
        name,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('删除配置失败:', error);
    throw error;
  }
};

/**
 * 获取配置提供商列表（用于创建配置时选择类型）
 */
export const getConfigProviders = async (): Promise<{
  [key: string]: unknown;
}> => {
  try {
    const response = await net.post<RcloneApiResponse<{ [key: string]: unknown }>>({
      url: '/config/providers',
      data: {},
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return response.result || {};
  } catch (error) {
    console.error('获取配置提供商失败:', error);
    throw error;
  }
};

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  total?: number;
  used?: number;
  free?: number;
}

/**
 * 测试配置连接 (使用 operations/list 试探通用连通性，防止 S3 报 operations/about 错误)
 */
export const testConfig = async (name: string): Promise<ConnectionTestResult> => {
  try {
    const formattedFs = name.endsWith(':') ? name : `${name}:`;

    // 1. 使用 operations/fsinfo 或 operations/list 探针通用测试连通性
    const listRes = await net.post<{ list?: unknown[]; error?: string }>({
      url: '/operations/list',
      data: {
        fs: formattedFs,
        remote: '',
        opt: {
          recurse: false,
        },
      },
    });

    if (listRes?.error) {
      return {
        success: false,
        error: listRes.error,
      };
    }

    // 2. 探针连通成功！尝试性静默获取空间配额（如 Google Drive / OneDrive）
    let aboutInfo: RcloneAboutInfo | null = null;
    try {
      // 只有支持 about 的类型才获取容量
      aboutInfo = await getRemoteAbout(name);
    } catch {
      // 忽略容量获取错误
    }

    return {
      success: true,
      total: aboutInfo?.total,
      used: aboutInfo?.used,
      free: aboutInfo?.free,
    };
  } catch (error) {
    console.error('测试配置连接失败:', error);
    let errorMsg = '连接失败，请检查网络或认证参数';
    if (axios.isAxiosError(error) && error.response?.data) {
      const responseData = error.response.data as { error?: string };
      if (responseData.error) {
        errorMsg = responseData.error;
      }
    } else if (error instanceof Error) {
      errorMsg = error.message;
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
};

export interface RcloneAboutInfo {
  total?: number;
  used?: number;
  free?: number;
  trashed?: number;
  other?: number;
}

/**
 * 获取指定远程存储 (Remote) 的磁盘空间配额与使用详情
 */
export const getRemoteAbout = async (
  remoteName: string,
  configDetail?: RcloneConfig,
): Promise<RcloneAboutInfo | null> => {
  try {
    const type = configDetail?.type?.toLowerCase();

    // Rclone 官方机制：S3 协议 (无论是 Root 还是 Bucket) 及 HTTP 等类型全量不支持 operations/about
    // 提前跳过，彻底防止服务端 rclone rc 控制台产生 ERROR 刷屏
    if (type === 's3' || type === 'http') {
      return null;
    }

    const targetFs = remoteName.endsWith(':') ? remoteName : `${remoteName}:`;

    const response = await net.post<RcloneAboutInfo>({
      url: '/operations/about',
      data: {
        fs: targetFs,
      },
    });
    return response || null;
  } catch (error) {
    console.warn(`获取远程存储 (${remoteName}) 空间配额失败:`, error);
    return null;
  }
};

/**
 * 批量并行获取所有远程存储的空间配额与使用数据
 */
export const getAllRemotesAbout = async (
  configsOrNames: (RcloneConfig | string)[],
): Promise<Record<string, RcloneAboutInfo>> => {
  const result: Record<string, RcloneAboutInfo> = {};
  await Promise.all(
    configsOrNames.map(async item => {
      const remoteName = typeof item === 'string' ? item : item.name;
      const configDetail = typeof item === 'string' ? undefined : item;

      const about = await getRemoteAbout(remoteName, configDetail);
      if (about) {
        result[remoteName] = about;
      }
    }),
  );
  return result;
};
