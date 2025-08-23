import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Server,
  Cloud,
  HardDrive,
  Globe,
  Database,
  Wifi,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 导入服务
import {
  getAllConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  type RcloneConfig,
} from './services';

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
const CONFIG_PARAMETER_TEMPLATES: Record<string, Array<{
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: Array<{ value: string; label: string }>;
}>> = {
  webdav: [
    { key: 'url', label: 'WebDAV 服务器地址', type: 'text', required: true, placeholder: 'https://example.com/webdav 或 https://example.com/dav' },
    { key: 'vendor', label: '服务商类型', type: 'select', required: false, defaultValue: 'other', options: [
      { value: 'other', label: '其他' },
      { value: 'nextcloud', label: 'Nextcloud' },
      { value: 'owncloud', label: 'OwnCloud' },
      { value: 'sharepoint', label: 'SharePoint' },
      { value: 'fastmail', label: 'Fastmail' }
    ]},
    { key: 'user', label: '用户名', type: 'text', required: true, placeholder: '输入您的用户名' },
    { key: 'pass', label: '密码', type: 'password', required: true, placeholder: '输入您的密码' },
    { key: 'bearer_token', label: 'Bearer Token', type: 'password', required: false, placeholder: '可选：使用 Bearer Token 代替用户名密码' }
  ],
  ftp: [
    { key: 'host', label: 'FTP Host', type: 'text', required: true, placeholder: 'ftp.example.com' },
    { key: 'user', label: 'Username', type: 'text', required: false, placeholder: '用户名', defaultValue: 'anonymous' },
    { key: 'pass', label: 'Password', type: 'password', required: false, placeholder: '密码' },
    { key: 'port', label: 'Port', type: 'number', required: false, placeholder: '21', defaultValue: '21' }
  ],
  sftp: [
    { key: 'host', label: 'SFTP Host', type: 'text', required: true, placeholder: 'sftp.example.com' },
    { key: 'user', label: 'Username', type: 'text', required: true, placeholder: '用户名' },
    { key: 'pass', label: 'Password', type: 'password', required: false, placeholder: '密码（可选）' },
    { key: 'port', label: 'Port', type: 'number', required: false, placeholder: '22', defaultValue: '22' },
    { key: 'key_file', label: 'Private Key File', type: 'text', required: false, placeholder: '私钥文件路径（可选）' }
  ],
  s3: [
    { key: 'provider', label: 'S3 Provider', type: 'select', required: true, defaultValue: 'AWS', options: [
      { value: 'AWS', label: 'Amazon S3' },
      { value: 'Alibaba', label: 'Alibaba Cloud OSS' },
      { value: 'Minio', label: 'MinIO' },
      { value: 'DigitalOcean', label: 'DigitalOcean Spaces' }
    ]},
    { key: 'access_key_id', label: 'Access Key ID', type: 'text', required: true, placeholder: 'Access Key ID' },
    { key: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true, placeholder: 'Secret Access Key' },
    { key: 'region', label: 'Region', type: 'text', required: false, placeholder: 'us-east-1', defaultValue: 'us-east-1' },
    { key: 'endpoint', label: 'Endpoint', type: 'text', required: false, placeholder: '自定义端点（可选）' }
  ],
  drive: [
    { key: 'scope', label: 'Scope', type: 'select', required: false, defaultValue: 'drive', options: [
      { value: 'drive', label: 'Full access' },
      { value: 'drive.readonly', label: 'Read-only access' },
      { value: 'drive.file', label: 'File access only' }
    ]}
  ],
  http: [
    { key: 'url', label: 'Base URL', type: 'text', required: true, placeholder: 'https://example.com' }
  ],
  local: [
    // Local 类型不需要额外参数
  ],
  dropbox: [
    // Dropbox 需要 OAuth授权，暂时不支持参数输入
  ],
  onedrive: [
    // OneDrive 需要 OAuth授权，暂时不支持参数输入
  ],
  box: [
    // Box 需要 OAuth授权，暂时不支持参数输入
  ]
};

export default function Configs() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<RcloneConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<RcloneConfig | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>({ name: '', type: '', parameters: {} });
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
      (config) =>
        config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered;
  }, [configs, searchTerm]);

  // 获取配置类型图标
  const getConfigTypeIcon = (type: string) => {
    const configType = CONFIG_TYPES.find((t) => t.value === type);
    return configType?.icon || Settings;
  };

  // 获取配置类型标签
  const getConfigTypeLabel = (type: string) => {
    const configType = CONFIG_TYPES.find((t) => t.value === type);
    return configType ? t(configType.label) : type;
  };

  // 获取配置的关键信息
  const getConfigKeyInfo = (config: RcloneConfig): Array<{key: string, value: string, title?: string}> => {
    if (!config.config) return [];

    const configData = config.config as Record<string, unknown>;
    const keyInfo: Array<{key: string, value: string, title?: string}> = [];

    // 根据不同类型显示不同的关键信息
    switch (config.type.toLowerCase()) {
      case 'webdav':
        if (configData.url) {
          keyInfo.push({ key: 'URL', value: String(configData.url), title: String(configData.url) });
        }
        if (configData.vendor) {
          keyInfo.push({ key: 'Vendor', value: String(configData.vendor) });
        }
        break;

      case 'ftp':
      case 'sftp':
        if (configData.host) {
          keyInfo.push({ key: 'Host', value: String(configData.host), title: String(configData.host) });
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
          keyInfo.push({ key: 'URL', value: String(configData.url), title: String(configData.url) });
        }
        break;

      default:
        // 对于未知类型，显示一些通用字段
        if (configData.url) {
          keyInfo.push({ key: 'URL', value: String(configData.url), title: String(configData.url) });
        }
        if (configData.host) {
          keyInfo.push({ key: 'Host', value: String(configData.host), title: String(configData.host) });
        }
        if (configData.endpoint) {
          keyInfo.push({ key: 'Endpoint', value: String(configData.endpoint), title: String(configData.endpoint) });
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
      parameters
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
        [key]: value
      }
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
      parameters: defaultParams
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
          <p className="text-muted-foreground mt-2">
            管理您的 Rclone 远程存储配置
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadConfigs}
            disabled={loading}
            className="h-9 w-9"
          >
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search configurations...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* 配置卡片网格 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, () => {
            const skeletonId = Math.random().toString(36).substr(2, 9);
            return (
              <Card key={`loading-skeleton-${skeletonId}`} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-muted rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                  <div className="h-3 bg-muted rounded w-3/5" />
                </div>
              </CardHeader>
            </Card>
            );
          })}
        </div>
      ) : filteredConfigs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConfigs.map((config) => {
            const IconComponent = getConfigTypeIcon(config.type);
            return (
              <Card key={config.id} className="group relative transition-all duration-200 hover:shadow-lg">
                {/* 右上角设置按钮 */}
                <div className="absolute top-4 right-4 z-10">
                  <DropdownMenu
                    key={`dropdown-${config.id}`}
                    open={openDropdownId === config.id}
                    onOpenChange={(open) => {
                      setOpenDropdownId(open ? config.id : null);
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setOpenDropdownId(null);
                          handleEditConfig(config);
                        }}
                        className="cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {t('Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setOpenDropdownId(null);
                          handleDeleteConfig(config);
                        }}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between pr-8">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg leading-none">{config.name}</CardTitle>
                        <CardDescription>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {getConfigTypeLabel(config.type)}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>

                  {/* 配置详情 */}
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {/* 显示关键配置信息 */}
                    {getConfigKeyInfo(config).map(({ key, value, title }) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="truncate max-w-[200px]" title={title || value}>
                          {value}
                        </span>
                      </div>
                    ))}

                    <div className="flex justify-between">
                      <span>{t('Created At')}:</span>
                      <span>{formatDate(config.createdAt)}</span>
                    </div>

                    {config.lastUsed && (
                      <div className="flex justify-between">
                        <span>最后使用:</span>
                        <span>{formatDate(config.lastUsed)}</span>
                      </div>
                    )}


                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('No configurations found')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? `没有找到匹配 "${searchTerm}" 的配置`
              : t('Click the button above to add your first configuration.')}
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
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancelAdd();
        } else {
          setIsAddDialogOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Add Configuration')}</DialogTitle>
            <DialogDescription>
              创建一个新的 Rclone 远程存储配置。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('Configuration Name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入配置名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">{t('Configuration Type')}</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择配置类型" />
                </SelectTrigger>
                <SelectContent>
                  {CONFIG_TYPES.map((type) => (
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
                  <h4 className="text-sm font-medium mb-3">配置参数</h4>
                  {getCurrentParameterTemplate().map((param) => (
                    <div key={param.key} className="grid gap-2 mb-3">
                      <Label htmlFor={`param-${param.key}`}>
                        {param.label}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {param.type === 'select' ? (
                        <Select
                          value={formData.parameters[param.key] || param.defaultValue || ''}
                          onValueChange={(value: string) => handleParameterChange(param.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`选择 ${param.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`param-${param.key}`}
                          type={param.type === 'password' ? 'password' : param.type === 'number' ? 'number' : 'text'}
                          value={formData.parameters[param.key] || ''}
                          onChange={(e) => handleParameterChange(param.key, e.target.value)}
                          placeholder={param.placeholder}
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
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  此类型需要 OAuth 授权，配置创建后将引导您完成授权流程。
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelAdd} disabled={submitting}>
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={!formData.name.trim() || !formData.type || submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                t('Save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑配置对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancelEdit();
        } else {
          setIsEditDialogOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Configuration')}</DialogTitle>
            <DialogDescription>
              修改现有的 Rclone 远程存储配置。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('Configuration Name')}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入配置名称"
                disabled={true}
              />
              <p className="text-xs text-muted-foreground">
                配置名称不可修改，如需修改请删除后重新创建
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">{t('Configuration Type')}</Label>
              <Select value={formData.type} onValueChange={handleTypeChange} disabled={true}>
                <SelectTrigger>
                  <SelectValue placeholder="选择配置类型" />
                </SelectTrigger>
                <SelectContent>
                  {CONFIG_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {t(type.label)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                配置类型不可修改，如需修改请删除后重新创建
              </p>
            </div>

            {/* 动态参数编辑字段 */}
            {formData.type && getCurrentParameterTemplate().length > 0 && (
              <div className="grid gap-4">
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">配置参数</h4>
                  {getCurrentParameterTemplate().map((param) => (
                    <div key={param.key} className="grid gap-2 mb-3">
                      <Label htmlFor={`edit-param-${param.key}`}>
                        {param.label}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {param.type === 'select' ? (
                        <Select
                          value={formData.parameters[param.key] || param.defaultValue || ''}
                          onValueChange={(value: string) => handleParameterChange(param.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`选择 ${param.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`edit-param-${param.key}`}
                          type={param.type === 'password' ? 'password' : param.type === 'number' ? 'number' : 'text'}
                          value={formData.parameters[param.key] || ''}
                          onChange={(e) => handleParameterChange(param.key, e.target.value)}
                          placeholder={param.placeholder}
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
            <Button
              onClick={handleSaveConfig}
              disabled={!formData.name.trim() || !formData.type || submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  更新中...
                </>
              ) : (
                t('Save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancelDelete();
        } else {
          setIsDeleteDialogOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('Delete Configuration')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to delete this configuration?')}
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="p-2 rounded-lg bg-primary/10">
                  {React.createElement(getConfigTypeIcon(selectedConfig.type), {
                    className: 'h-5 w-5 text-primary',
                  })}
                </div>
                <div>
                  <p className="font-medium">{selectedConfig.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getConfigTypeLabel(selectedConfig.type)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {t('This action cannot be undone.')}
              </p>
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
                  删除中...
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
