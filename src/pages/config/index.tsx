import {
  Activity,
  Cloud,
  Database,
  Edit,
  Globe,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Trash2,
  Wifi,
} from 'lucide-react';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// 导入服务
import { type RcloneConfig, createConfig, deleteConfig, getAllConfigs, testConfig, updateConfig } from './services';

// 配置类型定义
interface ConfigFormData {
  name: string;
  type: string;
  parameters: Record<string, string>;
}

// 配置类型选项
const CONFIG_TYPES = [
  { value: 'webdav', label: 'WebDAV', icon: Globe },
  { value: 'ftp', label: 'FTP', icon: Server },
  { value: 'sftp', label: 'SFTP', icon: Server },
  { value: 's3', label: 'S3', icon: Cloud },
  { value: 'drive', label: 'Google Drive', icon: Cloud },
  { value: 'dropbox', label: 'Dropbox', icon: Cloud },
  { value: 'onedrive', label: 'OneDrive', icon: Cloud },
  { value: 'box', label: 'Box', icon: Cloud },
  { value: 'local', label: 'Local', icon: HardDrive },
  { value: 'http', label: 'HTTP', icon: Wifi },
];

// 配置参数模板
const CONFIG_PARAMETER_TEMPLATES: Record<
  string,
  Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'number';
    required: boolean;
    placeholder?: string;
    defaultValue?: string;
    options?: Array<{ value: string; label: string }>;
  }>
> = {
  webdav: [
    {
      key: 'url',
      label: 'WebDAV Server Address',
      type: 'text',
      required: true,
      placeholder: 'https://example.com/webdav',
    },
    {
      key: 'vendor',
      label: 'Vendor Type',
      type: 'select',
      required: false,
      defaultValue: 'other',
      options: [
        { value: 'other', label: 'Other' },
        { value: 'nextcloud', label: 'Nextcloud' },
        { value: 'owncloud', label: 'OwnCloud' },
        { value: 'sharepoint', label: 'SharePoint' },
        { value: 'fastmail', label: 'Fastmail' },
      ],
    },
    {
      key: 'user',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'Username',
    },
    {
      key: 'pass',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: 'Password',
    },
    {
      key: 'bearer_token',
      label: 'Bearer Token',
      type: 'password',
      required: false,
      placeholder: 'Bearer Token',
    },
  ],
  ftp: [
    {
      key: 'host',
      label: 'Host',
      type: 'text',
      required: true,
      placeholder: 'ftp.example.com',
    },
    {
      key: 'user',
      label: 'Username',
      type: 'text',
      required: false,
      placeholder: 'Username',
      defaultValue: 'anonymous',
    },
    {
      key: 'pass',
      label: 'Password',
      type: 'password',
      required: false,
      placeholder: 'Password',
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      required: false,
      placeholder: '21',
      defaultValue: '21',
    },
  ],
  sftp: [
    {
      key: 'host',
      label: 'Host',
      type: 'text',
      required: true,
      placeholder: 'sftp.example.com',
    },
    {
      key: 'user',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'Username',
    },
    {
      key: 'pass',
      label: 'Password',
      type: 'password',
      required: false,
      placeholder: 'Password',
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      required: false,
      placeholder: '22',
      defaultValue: '22',
    },
    {
      key: 'key_file',
      label: 'Private Key File',
      type: 'text',
      required: false,
      placeholder: 'Private Key File',
    },
  ],
  s3: [
    {
      key: 'provider',
      label: 'S3 Provider',
      type: 'select',
      required: true,
      defaultValue: 'AWS',
      options: [
        { value: 'AWS', label: 'Amazon S3' },
        { value: 'Alibaba', label: 'Alibaba Cloud OSS' },
        { value: 'Minio', label: 'MinIO' },
        { value: 'DigitalOcean', label: 'DigitalOcean Spaces' },
      ],
    },
    {
      key: 'access_key_id',
      label: 'Access Key ID',
      type: 'text',
      required: true,
      placeholder: 'Access Key ID',
    },
    {
      key: 'secret_access_key',
      label: 'Secret Access Key',
      type: 'password',
      required: true,
      placeholder: 'Secret Access Key',
    },
    {
      key: 'region',
      label: 'Region',
      type: 'text',
      required: false,
      placeholder: 'us-east-1',
      defaultValue: 'us-east-1',
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      type: 'text',
      required: false,
      placeholder: 'Endpoint',
    },
  ],
  drive: [
    {
      key: 'scope',
      label: 'Scope',
      type: 'select',
      required: false,
      defaultValue: 'drive',
      options: [
        { value: 'drive', label: 'Full access' },
        { value: 'drive.readonly', label: 'Read-only access' },
        { value: 'drive.file', label: 'File access only' },
      ],
    },
  ],
  http: [
    {
      key: 'url',
      label: 'Base URL',
      type: 'text',
      required: true,
      placeholder: 'https://example.com',
    },
  ],
  local: [
    // Local types don't require parameters
  ],
  dropbox: [],
  onedrive: [],
  box: [],
};

export default function Configs() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [configs, setConfigs] = useState<RcloneConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // 测试连接状态
  const [testStates, setTestStates] = useState<
    Record<
      string,
      {
        status: 'idle' | 'testing' | 'success' | 'failed';
        error?: string;
        total?: number;
        used?: number;
        free?: number;
      }
    >
  >({});

  // 格式化容量
  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  // 测试配置连接
  const handleTestConnection = async (configName: string) => {
    setTestStates(prev => ({
      ...prev,
      [configName]: { status: 'testing' },
    }));

    try {
      const result = await testConfig(configName);
      if (result.success) {
        setTestStates(prev => ({
          ...prev,
          [configName]: {
            status: 'success',
            total: result.total,
            used: result.used,
            free: result.free,
          },
        }));
        toast.success(`${t('config.testSuccess')}: ${configName}`);
      } else {
        setTestStates(prev => ({
          ...prev,
          [configName]: {
            status: 'failed',
            error: result.error,
          },
        }));
        toast.error(`${t('config.testFailed')}: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setTestStates(prev => ({
        ...prev,
        [configName]: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
      toast.error(t('config.testFailed'));
    }
  };

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<RcloneConfig | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>({
    name: '',
    type: '',
    parameters: {},
  });
  const [submitting, setSubmitting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // 用于防止重复请求的 ref
  const isLoadingRef = useRef(false);

  // 加载配置数据
  const loadConfigs = useCallback(async () => {
    // 防止重复请求
    if (isLoadingRef.current) {
      console.log('请求正在进行中，跳过重复请求');
      return;
    }

    console.log('开始加载配置列表...');
    isLoadingRef.current = true;
    setLoading(true);

    try {
      const configList = await getAllConfigs();
      console.log('成功获取配置列表:', configList);

      setConfigs(configList);
      window.dispatchEvent(new CustomEvent('rclone-configs-updated', { detail: configList }));

      if (configList.length === 0) {
        toast.info('当前没有配置，请添加您的第一个配置');
      } else {
        toast.success(`成功加载 ${configList.length} 个配置`);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      toast.error(`获取配置列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
      console.log('加载配置完成');
    }
  }, []);

  // 组件加载时获取配置
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // 过滤配置
  const filteredConfigs = useMemo(() => {
    const filtered = configs.filter(
      config =>
        config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.type.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    return filtered;
  }, [configs, searchTerm]);

  // 获取配置类型图标
  const getConfigTypeIcon = (type: string) => {
    const configType = CONFIG_TYPES.find(t => t.value === type);
    return configType?.icon || Settings;
  };

  // 获取配置类型标签
  const getConfigTypeLabel = (type: string) => {
    const configType = CONFIG_TYPES.find(t => t.value === type);
    return configType ? t(configType.label) : type;
  };

  // 获取配置的关键信息
  const getConfigKeyInfo = (config: RcloneConfig): Array<{ key: string; value: string; title?: string }> => {
    if (!config.config) return [];

    const configData = config.config as Record<string, unknown>;
    const keyInfo: Array<{ key: string; value: string; title?: string }> = [];

    // 根据不同类型显示不同的关键信息
    switch (config.type.toLowerCase()) {
      case 'webdav':
        if (configData.url) {
          keyInfo.push({
            key: 'URL',
            value: String(configData.url),
            title: String(configData.url),
          });
        }
        if (configData.vendor) {
          keyInfo.push({ key: 'Vendor', value: String(configData.vendor) });
        }
        break;

      case 'ftp':
      case 'sftp':
        if (configData.host) {
          keyInfo.push({
            key: 'Host',
            value: String(configData.host),
            title: String(configData.host),
          });
        }
        if (configData.user) {
          keyInfo.push({ key: 'User', value: String(configData.user) });
        }
        break;

      case 's3':
        if (configData.provider) {
          keyInfo.push({ key: 'Provider', value: String(configData.provider) });
        }
        if (configData.region) {
          keyInfo.push({ key: 'Region', value: String(configData.region) });
        }
        break;

      case 'drive':
      case 'dropbox':
      case 'onedrive':
      case 'box':
        if (configData.scope) {
          keyInfo.push({ key: 'Scope', value: String(configData.scope) });
        }
        break;

      case 'http':
        if (configData.url) {
          keyInfo.push({
            key: 'URL',
            value: String(configData.url),
            title: String(configData.url),
          });
        }
        break;

      default:
        // 对于未知类型，显示一些通用字段
        if (configData.url) {
          keyInfo.push({
            key: 'URL',
            value: String(configData.url),
            title: String(configData.url),
          });
        }
        if (configData.host) {
          keyInfo.push({
            key: 'Host',
            value: String(configData.host),
            title: String(configData.host),
          });
        }
        if (configData.endpoint) {
          keyInfo.push({
            key: 'Endpoint',
            value: String(configData.endpoint),
            title: String(configData.endpoint),
          });
        }
        break;
    }

    return keyInfo.slice(0, 2); // 最多显示两个关键信息
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 重置表单
  const resetForm = () => {
    setFormData({ name: '', type: '', parameters: {} });
    setSelectedConfig(null);
  };

  // 打开添加对话框
  const handleAddConfig = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEditConfig = (config: RcloneConfig) => {
    setSelectedConfig(config);
    const existingParams = (config.config as Record<string, unknown>) || {};
    const parameters: Record<string, string> = {};

    // 从现有配置中提取参数
    for (const key of Object.keys(existingParams)) {
      if (typeof existingParams[key] === 'string') {
        parameters[key] = existingParams[key] as string;
      } else if (existingParams[key] !== null && existingParams[key] !== undefined) {
        parameters[key] = String(existingParams[key]);
      }
    }

    setFormData({
      name: config.name,
      type: config.type,
      parameters,
    });
    setIsEditDialogOpen(true);
  };

  // 打开删除对话框
  const handleDeleteConfig = (config: RcloneConfig) => {
    setSelectedConfig(config);
    setIsDeleteDialogOpen(true);
  };

  // 处理参数变化
  const handleParameterChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }));
  };

  // 获取当前配置类型的参数模板
  const getCurrentParameterTemplate = () => {
    return CONFIG_PARAMETER_TEMPLATES[formData.type] || [];
  };

  // 初始化默认参数
  const initializeDefaultParameters = (type: string) => {
    const template = CONFIG_PARAMETER_TEMPLATES[type] || [];
    const parameters: Record<string, string> = {};

    for (const param of template) {
      if (param.defaultValue) {
        parameters[param.key] = param.defaultValue;
      }
    }

    return parameters;
  };

  // 处理配置类型变化
  const handleTypeChange = (type: string) => {
    const defaultParams = initializeDefaultParameters(type);
    setFormData(prev => ({
      ...prev,
      type,
      parameters: defaultParams,
    }));
  };

  // 取消添加配置
  const handleCancelAdd = () => {
    setIsAddDialogOpen(false);
    resetForm();
  };

  // 取消编辑配置
  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setOpenDropdownId(null); // 关闭所有下拉菜单
    resetForm();
  };

  // 取消删除配置
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setSelectedConfig(null);
  };

  // 保存配置
  const handleSaveConfig = async () => {
    if (!formData.name.trim() || !formData.type) return;

    setSubmitting(true);
    try {
      if (selectedConfig) {
        // 编辑配置（注意：rclone 不支持修改名称和类型，只能更新参数）
        if (selectedConfig.name !== formData.name || selectedConfig.type !== formData.type) {
          toast.error('无法修改配置名称和类型，请删除后重新创建');
          return;
        }

        // 传递表单中的参数
        await updateConfig(selectedConfig.name, formData.parameters);
        toast.success('配置更新成功');
        setIsEditDialogOpen(false);
      } else {
        // 添加配置 - 使用表单中收集的参数
        await createConfig(formData.name, formData.type, formData.parameters);
        toast.success('配置创建成功');
        setIsAddDialogOpen(false);
      }

      // 重新加载配置列表
      await loadConfigs();
      resetForm();
    } catch (error) {
      console.error('保存配置失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(selectedConfig ? `更新配置失败: ${errorMessage}` : `创建配置失败: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 确认删除配置
  const handleConfirmDelete = async () => {
    if (!selectedConfig) return;

    setSubmitting(true);
    try {
      await deleteConfig(selectedConfig.name);
      toast.success('配置删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedConfig(null);

      // 重新加载配置列表
      await loadConfigs();
    } catch (error) {
      console.error('删除配置失败:', error);
      toast.error('删除配置失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Configuration Management')}</h1>
          <p className="text-muted-foreground mt-2">{t('config.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadConfigs} disabled={loading} className="h-9 w-9">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleAddConfig} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('Add Configuration')}
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center space-x-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder={t('config.searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* 配置卡片网格 */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, () => {
            const skeletonId = Math.random().toString(36).substr(2, 9);
            return (
              <Card key={`loading-skeleton-${skeletonId}`} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-muted h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="bg-muted h-4 w-3/4 rounded" />
                      <div className="bg-muted h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="bg-muted h-3 rounded" />
                    <div className="bg-muted h-3 w-4/5 rounded" />
                    <div className="bg-muted h-3 w-3/5 rounded" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : filteredConfigs.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredConfigs.map(config => {
            const IconComponent = getConfigTypeIcon(config.type);
            const testState = testStates[config.name] || { status: 'idle' };
            return (
              <Card
                key={config.id}
                className="group hover:shadow-primary/5 border-border/50 bg-card/60 relative flex flex-col justify-between overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl">
                {/* 悬浮时的顶部柔和渐变背景，使卡片具有发光的生命感 */}
                <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

                {/* 装饰性背景柔和发光圆，随hover变化 */}
                <div className="bg-primary/10 group-hover:bg-primary/20 pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl transition-all duration-700 group-hover:scale-125" />

                <div className="relative z-10 flex flex-1 flex-col p-6">
                  {/* 卡片头部：图标、名称、状态与设置下拉菜单 */}
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center space-x-3.5">
                      {/* 渐变磨砂图标底色 */}
                      <div className="from-primary/10 to-primary/5 border-primary/15 group-hover:from-primary/20 group-hover:to-primary/10 rounded-2xl border bg-gradient-to-tr p-3 shadow-sm transition-colors duration-500">
                        <IconComponent className="text-primary h-6 w-6 transition-transform duration-500 group-hover:scale-110" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <CardTitle className="text-foreground/95 truncate text-lg font-bold tracking-tight">
                          {config.name}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-primary/10 text-primary border-primary/10 inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                            {getConfigTypeLabel(config.type)}
                          </span>

                          {/* 状态呼吸灯与文字 */}
                          {testState.status !== 'idle' && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors duration-300 ${
                                testState.status === 'testing'
                                  ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500'
                                  : testState.status === 'success'
                                    ? 'border-green-500/20 bg-green-500/10 text-green-500'
                                    : 'border-red-500/20 bg-red-500/10 text-red-500'
                              }`}
                              title={testState.error}>
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  testState.status === 'testing'
                                    ? 'animate-pulse bg-yellow-500'
                                    : testState.status === 'success'
                                      ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                                      : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                }`}
                              />
                              {testState.status === 'testing'
                                ? t('config.testing')
                                : testState.status === 'success'
                                  ? t('config.testSuccess')
                                  : t('config.testFailed')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 设置下拉按钮 */}
                    <div className="shrink-0">
                      <DropdownMenu
                        key={`dropdown-${config.id}`}
                        open={openDropdownId === config.id}
                        onOpenChange={open => {
                          setOpenDropdownId(open ? config.id : null);
                        }}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:border-border hover:bg-muted/50 animate-in fade-in h-8 w-8 rounded-full border border-transparent transition-all">
                            <Settings className="text-muted-foreground/80 group-hover:text-foreground h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-popover/95 border-border/60 border backdrop-blur-md">
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleEditConfig(config);
                            }}
                            className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" />
                            {t('Edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleDeleteConfig(config);
                            }}
                            className="cursor-pointer text-red-600 focus:bg-red-500/10 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* 中间配置详情：以极其雅致的参数卡形式呈现 */}
                  <div className="bg-muted/20 hover:bg-muted/30 border-border/30 flex-1 space-y-2.5 rounded-xl border p-3.5 text-sm transition-all duration-300">
                    {/* 显示关键配置信息 */}
                    {getConfigKeyInfo(config).map(({ key, value, title }) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground/85 shrink-0 text-[10px] font-semibold tracking-wider uppercase">
                          {key}
                        </span>
                        <span
                          className="text-foreground/90 truncate text-right font-mono text-xs font-semibold"
                          title={title || value}>
                          {value}
                        </span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground/85 shrink-0 text-[10px] font-semibold tracking-wider uppercase">
                        {t('Created At')}
                      </span>
                      <span className="text-foreground/80 text-right text-xs font-semibold">
                        {formatDate(config.createdAt)}
                      </span>
                    </div>

                    {config.lastUsed && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground/85 shrink-0 text-[10px] font-semibold tracking-wider uppercase">
                          {t('config.lastUsed')}
                        </span>
                        <span className="text-foreground/80 text-right text-xs font-semibold">
                          {formatDate(config.lastUsed)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部功能区：连接容量与测试连接按钮 */}
                <div className="relative z-10 mt-auto px-6 pt-0 pb-6">
                  {/* 容量进度条 */}
                  {testState.status === 'success' && testState.total !== undefined && testState.used !== undefined && (
                    <div className="from-primary/5 border-primary/10 animate-in slide-in-from-bottom-2 mb-4 space-y-2 rounded-xl border bg-gradient-to-r to-transparent p-3 shadow-sm duration-300">
                      <div className="text-muted-foreground flex justify-between text-[11px] font-bold">
                        <span className="flex items-center gap-1">
                          <Database className="text-primary h-3 w-3" />
                          {t('config.storageUsage')}
                        </span>
                        <span className="text-foreground/90 font-mono">
                          {formatBytes(testState.used)} / {formatBytes(testState.total)} (
                          {Math.round((testState.used / testState.total) * 100)}
                          %)
                        </span>
                      </div>
                      <progress
                        value={testState.used}
                        max={testState.total}
                        className="[&::-webkit-progress-bar]:bg-secondary/40 [&::-webkit-progress-value]:from-primary [&::-webkit-progress-value]:to-primary/65 [&::-moz-progress-bar]:bg-primary h-1.5 w-full overflow-hidden rounded-full shadow-inner transition-all duration-500 [&::-webkit-progress-value]:bg-gradient-to-r"
                      />
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(config.name)}
                    disabled={testState.status === 'testing'}
                    className="hover:bg-primary hover:text-primary-foreground group w-full gap-2 transition-all duration-300">
                    {testState.status === 'testing' ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t('config.testing')}</span>
                      </>
                    ) : (
                      <>
                        <Activity className="h-3.5 w-3.5 group-hover:animate-pulse" />
                        <span>{t('config.testConnection')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <Database className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="text-foreground mb-2 text-lg font-medium">{t('config.noConfigsFound')}</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? t('config.noMatchFound', { searchTerm }) : t('config.clickToAdd')}
          </p>
          {!searchTerm && (
            <Button onClick={handleAddConfig} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('Add Configuration')}
            </Button>
          )}
        </div>
      )}

      {/* 添加配置对话框 */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={open => {
          if (!open) {
            handleCancelAdd();
          } else {
            setIsAddDialogOpen(true);
          }
        }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('Add Configuration')}</DialogTitle>
            <DialogDescription>{t('config.addConfigDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('Configuration Name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('config.inputConfigName')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">{t('Configuration Type')}</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('config.selectConfigType')} />
                </SelectTrigger>
                <SelectContent>
                  {CONFIG_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {t(type.label)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 动态参数输入字段 */}
            {formData.type && getCurrentParameterTemplate().length > 0 && (
              <div className="grid gap-4">
                <div className="border-t pt-4">
                  <h4 className="mb-3 text-sm font-medium">{t('config.configParams')}</h4>
                  {getCurrentParameterTemplate().map(param => (
                    <div key={param.key} className="mb-3 grid gap-2">
                      <Label htmlFor={`param-${param.key}`}>
                        {t(param.label)}
                        {param.required && <span className="ml-1 text-red-500">*</span>}
                      </Label>
                      {param.type === 'select' ? (
                        <Select
                          value={formData.parameters[param.key] || param.defaultValue || ''}
                          onValueChange={(value: string) => handleParameterChange(param.key, value)}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('config.selectPlaceholder', {
                                label: t(param.label),
                              })}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options?.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {t(option.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`param-${param.key}`}
                          type={param.type === 'password' ? 'password' : param.type === 'number' ? 'number' : 'text'}
                          value={formData.parameters[param.key] || ''}
                          onChange={e => handleParameterChange(param.key, e.target.value)}
                          placeholder={param.placeholder ? t(param.placeholder) : ''}
                          required={param.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OAuth 类型的提示 */}
            {formData.type && ['drive', 'dropbox', 'onedrive', 'box'].includes(formData.type) && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">{t('config.oauthTip')}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelAdd} disabled={submitting}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleSaveConfig} disabled={!formData.name.trim() || !formData.type || submitting}>
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('config.saving')}
                </>
              ) : (
                t('Save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑配置对话框 */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={open => {
          if (!open) {
            handleCancelEdit();
          } else {
            setIsEditDialogOpen(true);
          }
        }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('Edit Configuration')}</DialogTitle>
            <DialogDescription>{t('config.editConfigDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('Configuration Name')}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('config.inputConfigName')}
                disabled={true}
              />
              <p className="text-muted-foreground text-xs">{t('config.nameCannotBeChanged')}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">{t('Configuration Type')}</Label>
              <Select value={formData.type} onValueChange={handleTypeChange} disabled={true}>
                <SelectTrigger>
                  <SelectValue placeholder={t('config.selectConfigType')} />
                </SelectTrigger>
                <SelectContent>
                  {CONFIG_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {t(type.label)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">{t('config.typeCannotBeChanged')}</p>
            </div>

            {/* 动态参数编辑字段 */}
            {formData.type && getCurrentParameterTemplate().length > 0 && (
              <div className="grid gap-4">
                <div className="border-t pt-4">
                  <h4 className="mb-3 text-sm font-medium">{t('config.configParams')}</h4>
                  {getCurrentParameterTemplate().map(param => (
                    <div key={param.key} className="mb-3 grid gap-2">
                      <Label htmlFor={`edit-param-${param.key}`}>
                        {t(param.label)}
                        {param.required && <span className="ml-1 text-red-500">*</span>}
                      </Label>
                      {param.type === 'select' ? (
                        <Select
                          value={formData.parameters[param.key] || param.defaultValue || ''}
                          onValueChange={(value: string) => handleParameterChange(param.key, value)}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('config.selectPlaceholder', {
                                label: t(param.label),
                              })}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options?.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {t(option.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`edit-param-${param.key}`}
                          type={param.type === 'password' ? 'password' : param.type === 'number' ? 'number' : 'text'}
                          value={formData.parameters[param.key] || ''}
                          onChange={e => handleParameterChange(param.key, e.target.value)}
                          placeholder={param.placeholder ? t(param.placeholder) : ''}
                          required={param.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit} disabled={submitting}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleSaveConfig} disabled={!formData.name.trim() || !formData.type || submitting}>
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('config.updating')}
                </>
              ) : (
                t('Save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={open => {
          if (!open) {
            handleCancelDelete();
          } else {
            setIsDeleteDialogOpen(true);
          }
        }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('Delete Configuration')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to delete this configuration?')}</DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="py-4">
              <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                <div className="bg-primary/10 rounded-lg p-2">
                  {React.createElement(getConfigTypeIcon(selectedConfig.type), {
                    className: 'h-5 w-5 text-primary',
                  })}
                </div>
                <div>
                  <p className="font-medium">{selectedConfig.name}</p>
                  <p className="text-muted-foreground text-sm">{getConfigTypeLabel(selectedConfig.type)}</p>
                </div>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">{t('This action cannot be undone.')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete} disabled={submitting}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('config.deleting')}
                </>
              ) : (
                t('Confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
