import {
  FolderSymlink,
  Globe,
  HardDrive,
  Info,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  RotateCw,
  StopCircle,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type RcloneConfig, getAllConfigs } from '@/pages/config/services';
import {
  type RcloneMountItem,
  type RcloneServeItem,
  createMount,
  deleteMount,
  forgetVfsCache,
  getMountList,
  getMountTypes,
  getServeList,
  refreshVfsCache,
  startServe,
  stopServe,
} from './services';

export default function Mounts() {
  const { t } = useTranslation();

  // Mount States
  const [mounts, setMounts] = useState<RcloneMountItem[]>([]);
  const [mountTypes, setMountTypes] = useState<string[]>(['mount']);
  const [remotes, setRemotes] = useState<RcloneConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Serve States
  const [serves, setServes] = useState<RcloneServeItem[]>([]);
  const [isServeOpen, setIsServeOpen] = useState(false);
  const [serveType, setServeType] = useState<'webdav' | 'http' | 'ftp' | 'dlna'>('webdav');
  const [serveRemote, setServeRemote] = useState('');
  const [serveAddr, setServeAddr] = useState('127.0.0.1:8080');
  const [startingServe, setStartingServe] = useState(false);

  // Dialog fields
  const [isMountOpen, setIsMountOpen] = useState(false);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [mountPath, setMountPath] = useState('');
  const [selectedType, setSelectedType] = useState('mount');
  const [mounting, setMounting] = useState(false);

  // Load mounts list & serves
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [mountData, serveData] = await Promise.all([getMountList(), getServeList()]);
      setMounts(mountData);
      setServes(serveData);
    } catch {
      // Ignore
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadData();

    // Fetch configurations and options
    getAllConfigs()
      .then(data => {
        setRemotes(data);
        const urlRemote = searchParams.get('remote');
        if (urlRemote && data.some(c => c.name === urlRemote)) {
          setSelectedRemote(urlRemote);
          setIsMountOpen(true);
        }
      })
      .catch(() => {});
    getMountTypes()
      .then(types => {
        setMountTypes(types);
        if (types.length > 0) setSelectedType(types[0]);
      })
      .catch(() => {});
  }, [loadData, searchParams]);

  // VFS Controls
  const handleRefreshVfs = async (fs: string) => {
    try {
      await refreshVfsCache(fs);
      toast.success(`${t('vfsRefresh')}: ${fs}`);
    } catch {
      toast.error('刷新 VFS 缓存失败');
    }
  };

  const handleForgetVfs = async (fs: string) => {
    try {
      await forgetVfsCache(fs);
      toast.success(`${t('vfsForget')}: ${fs}`);
    } catch {
      toast.error('清除 VFS 缓存失败');
    }
  };

  // Serve Controls
  const handleStartServe = async () => {
    if (!serveRemote || !serveAddr.trim()) {
      toast.error('请选择存储源并填写监听地址');
      return;
    }
    setStartingServe(true);
    try {
      await startServe(serveType, serveRemote, serveAddr.trim());
      toast.success(`成功开启 ${serveType.toUpperCase()} 网络共享服务 (${serveAddr})`);
      setIsServeOpen(false);
      loadData(true);
    } catch {
      toast.error('开启服务共享失败');
    } finally {
      setStartingServe(false);
    }
  };

  const handleStopServe = async (item: RcloneServeItem) => {
    try {
      await stopServe(item.type, item.addr);
      toast.success('服务共享已停止');
      loadData(true);
    } catch {
      toast.error('停止服务共享失败');
    }
  };

  // Handle mount creation
  const handleCreateMount = async () => {
    if (!selectedRemote || !mountPath.trim()) {
      toast.error('请选择远程存储并填写挂载路径');
      return;
    }
    setMounting(true);
    try {
      await createMount(selectedRemote, mountPath, selectedType);
      toast.success(t('Mount Successful') || '挂载成功');
      setIsMountOpen(false);
      setMountPath('');
      loadData(true);
    } catch {
      toast.error('挂载失败，请确保本地挂载路径合法、目录存在，且拥有 FUSE / WinFsp 驱动环境');
    } finally {
      setMounting(false);
    }
  };

  // Handle unmount
  const handleDeleteMount = async (mountPoint: string) => {
    if (!window.confirm(`确认要卸载挂载路径 ${mountPoint} 吗？`)) return;
    try {
      await deleteMount(mountPoint);
      toast.success(t('Unmount Successful') || '卸载挂载点成功');
      loadData(true);
    } catch {
      toast.error('卸载挂载点失败，可能有文件进程正在占用');
    }
  };

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">{t('Mounts')}</h1>
          <p className="text-muted-foreground text-sm">
            将云端网盘映射挂载到本地目录，在文件管理器中像本地盘符一样浏览。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsServeOpen(true)}
            className="cursor-pointer rounded-lg font-semibold shadow-sm">
            <Globe className="mr-2 size-4 text-blue-500" />
            {t('startServe')}
          </Button>
          <Button onClick={() => setIsMountOpen(true)} className="cursor-pointer rounded-lg font-semibold shadow-md">
            <Plus className="mr-2 size-4" />
            {t('Create Mount Point')}
          </Button>
        </div>
      </div>

      {/* Info Tips Alert */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs leading-normal font-semibold text-blue-600 dark:text-blue-400">
        <Info className="mt-0.5 size-4.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-bold">挂载环境说明：</p>
          <p>
            Rclone 挂载依赖操作系统底层的虚拟文件系统驱动。macOS 用户需要安装 **macFUSE**，Windows 用户需要安装
            **WinFsp**，Linux 用户需要配置 **FUSE**。若未配置驱动，可能会造成挂载失败。
          </p>
        </div>
      </div>

      {/* Mount points table */}
      <Card className="border-border/50 overflow-hidden border shadow-sm">
        <CardHeader className="bg-muted/20 border-border/40 flex flex-row items-center justify-between border-b p-4">
          <div>
            <CardTitle className="text-sm font-bold">{t('Mount Points')}</CardTitle>
            <CardDescription className="text-xs">系统当前已激活运行的 Rclone 挂载映射。</CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData()}
            className="h-8 w-8 cursor-pointer rounded-lg"
            disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>

        <CardContent className="flex min-h-[300px] flex-col justify-between p-0">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-14">
              <Loader2 className="text-primary size-7 animate-spin" />
              <span className="text-muted-foreground text-xs font-semibold">加载挂载列表中...</span>
            </div>
          ) : mounts.length === 0 ? (
            <div className="text-muted-foreground/50 flex flex-1 flex-col items-center justify-center gap-2.5 py-16 italic">
              <FolderSymlink className="text-muted-foreground size-11 opacity-30" />
              <span className="text-xs font-semibold">暂无任何活动的本地挂载点</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border/40 bg-muted/10 text-muted-foreground border-b font-bold tracking-wider uppercase">
                    <th className="p-3.5 pl-6">云端盘路径 (Remote Fs)</th>
                    <th className="p-3.5">{t('Local Mount Path')}</th>
                    <th className="p-3.5 pr-6 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-border/20 divide-y">
                  {mounts.map(mount => (
                    <tr key={mount.MountPoint} className="hover:bg-muted/20 font-medium transition-colors">
                      <td className="text-foreground flex items-center gap-2 p-3.5 pl-6 font-semibold">
                        <HardDrive className="text-primary size-4 shrink-0" />
                        {mount.Fs}
                      </td>
                      <td className="text-muted-foreground max-w-[350px] truncate p-3.5 font-mono font-semibold">
                        {mount.MountPoint}
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            title={t('vfsRefresh')}
                            onClick={() => handleRefreshVfs(mount.Fs)}
                            className="h-8 cursor-pointer rounded-lg px-2 text-xs">
                            <RotateCw className="mr-1 size-3 text-blue-500" />
                            {t('vfsRefresh')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('vfsForget')}
                            onClick={() => handleForgetVfs(mount.Fs)}
                            className="h-8 cursor-pointer rounded-lg px-2 text-xs">
                            {t('vfsForget')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMount(mount.MountPoint)}
                            className="h-8 cursor-pointer rounded-lg px-2 text-red-600 hover:bg-red-50/15">
                            <Trash2 className="mr-1 size-3" />
                            卸载
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Mount Wizard Dialog */}
      <Dialog open={isMountOpen} onOpenChange={setIsMountOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Link2 className="text-primary size-5" />
              {t('Create Mount Point')}
            </DialogTitle>
            <DialogDescription>配置云盘本地挂载映射。挂载后在电脑上可以直接读取云端文件。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="mount-remote" className="text-sm font-bold">
                选择云盘目录
              </Label>
              <Select value={selectedRemote} onValueChange={setSelectedRemote}>
                <SelectTrigger id="mount-remote" className="w-full font-semibold">
                  <SelectValue placeholder="选择云盘/目录" />
                </SelectTrigger>
                <SelectContent>
                  {remotes.map(remote => (
                    <SelectItem key={remote.name} value={remote.name} className="font-semibold">
                      {remote.name}:
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mount-path" className="text-sm font-bold">
                {t('Local Mount Path')}
              </Label>
              <Input
                id="mount-path"
                value={mountPath}
                onChange={e => setMountPath(e.target.value)}
                placeholder={t('Mount Path Placeholder')}
                disabled={mounting}
                className="font-medium"
              />
            </div>

            {mountTypes.length > 1 && (
              <div className="grid gap-2">
                <Label htmlFor="mount-type" className="text-sm font-bold">
                  {t('Mount Type')}
                </Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger id="mount-type" className="w-full font-semibold">
                    <SelectValue placeholder="挂载驱动类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {mountTypes.map(type => (
                      <SelectItem key={type} value={type} className="font-semibold">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMountOpen(false)}
              disabled={mounting}
              className="cursor-pointer">
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateMount}
              disabled={mounting || !selectedRemote || !mountPath.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer font-bold">
              {mounting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在挂载
                </>
              ) : (
                t('Confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Network Serves List Card */}
      <Card className="border-border/50 overflow-hidden border shadow-sm">
        <CardHeader className="bg-muted/20 border-border/40 flex flex-row items-center justify-between border-b p-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Globe className="text-primary size-4" />
              {t('activeServes')}
            </CardTitle>
            <CardDescription className="text-xs">
              将云盘一键广播发布为 WebDAV、HTTP 或 FTP 端口网络服务。
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData()}
            className="h-8 w-8 cursor-pointer rounded-lg"
            disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>

        <CardContent className="flex min-h-[160px] flex-col justify-between p-0">
          {serves.length === 0 ? (
            <div className="text-muted-foreground/50 flex flex-1 flex-col items-center justify-center gap-2 py-10 italic">
              <Globe className="text-muted-foreground size-8 opacity-30" />
              <span className="text-xs font-semibold">当前未运行任何网络协议共享服务</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border/40 bg-muted/10 text-muted-foreground border-b font-bold tracking-wider uppercase">
                    <th className="p-3.5 pl-6">{t('serveType')}</th>
                    <th className="p-3.5">云端盘路径 (Fs)</th>
                    <th className="p-3.5">{t('listenAddr')}</th>
                    <th className="p-3.5 pr-6 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-border/20 divide-y">
                  {serves.map((item, idx) => (
                    <tr
                      key={item.id || `${item.type}-${idx}`}
                      className="hover:bg-muted/20 font-medium transition-colors">
                      <td className="p-3.5 pl-6">
                        <span className="bg-primary/10 text-primary border-primary/20 rounded-md border px-2 py-0.5 font-mono text-xs font-bold uppercase">
                          {item.type}
                        </span>
                      </td>
                      <td className="text-foreground p-3.5 font-semibold">{item.fs}</td>
                      <td className="text-muted-foreground p-3.5 font-mono font-semibold">{item.addr}</td>
                      <td className="p-3.5 pr-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStopServe(item)}
                          className="h-8 cursor-pointer rounded-lg px-2 text-red-600 hover:bg-red-50/15">
                          <StopCircle className="mr-1 size-3.5" />
                          {t('stopServe')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Serve Dialog */}
      <Dialog open={isServeOpen} onOpenChange={setIsServeOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Globe className="text-primary size-5" />
              {t('startServe')}
            </DialogTitle>
            <DialogDescription>将远程存储暴露发布为 WebDAV、HTTP、FTP 端口共享。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label className="text-sm font-bold">{t('serveType')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {(['webdav', 'http', 'ftp', 'dlna'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setServeType(type)}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold uppercase transition-all duration-200 ${
                      serveType === type
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border/60 hover:bg-muted/30 text-muted-foreground'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="serve-remote" className="text-sm font-bold">
                选择共享存储源
              </Label>
              <Select value={serveRemote} onValueChange={setServeRemote}>
                <SelectTrigger id="serve-remote" className="w-full font-semibold">
                  <SelectValue placeholder="选择云盘/目录" />
                </SelectTrigger>
                <SelectContent>
                  {remotes.map(remote => (
                    <SelectItem key={remote.name} value={remote.name} className="font-semibold">
                      {remote.name}:
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="serve-addr" className="text-sm font-bold">
                {t('listenAddr')}
              </Label>
              <Input
                id="serve-addr"
                value={serveAddr}
                onChange={e => setServeAddr(e.target.value)}
                placeholder="例如 127.0.0.1:8080 或 :8080"
                disabled={startingServe}
                className="font-mono text-xs font-medium"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsServeOpen(false)}
              disabled={startingServe}
              className="cursor-pointer">
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleStartServe}
              disabled={startingServe || !serveRemote || !serveAddr.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer font-bold">
              {startingServe ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在启动
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
