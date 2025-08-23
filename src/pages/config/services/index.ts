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
      data: {}
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
          createdAt: new Date().toISOString()
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
        data: {}
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
          config: configDetails
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
        name: configName
      }
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
      config: response
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
      createdAt: new Date().toISOString()
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
        type
      }
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
  parameters: Record<string, unknown> = {}
): Promise<void> => {
  try {
    const response = await net.post<RcloneApiResponse>({
      url: '/config/create',
      data: {
        name,
        type,
        parameters
      }
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
export const updateConfig = async (
  name: string,
  parameters: Record<string, unknown>
): Promise<void> => {
  try {
    const response = await net.post<RcloneApiResponse>({
      url: '/config/update',
      data: {
        name,
        parameters
      }
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
        name
      }
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
export const getConfigProviders = async (): Promise<{ [key: string]: unknown }> => {
  try {
    const response = await net.post<RcloneApiResponse<{ [key: string]: unknown }>>({
      url: '/config/providers',
      data: {}
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

/**
 * 测试配置连接
 */
export const testConfig = async (name: string): Promise<boolean> => {
  try {
    const response = await net.post<RcloneApiResponse>({
      url: '/operations/about',
      data: {
        fs: `${name}:`
      }
    });

    return !response.error;
  } catch (error) {
    console.error('测试配置连接失败:', error);
    return false;
  }
};
