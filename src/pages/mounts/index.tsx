import { FolderSymlink, HardDrive, Info, Link2, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { type RcloneMountItem, createMount, deleteMount, getMountList, getMountTypes } from './services';

export default function Mounts() {
  const { t } = useTranslation();

  // States
  const [mounts, setMounts] = useState<RcloneMountItem[]>([]);
  const [mountTypes, setMountTypes] = useState<string[]>(['mount']);
  const [remotes, setRemotes] = useState<RcloneConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog fields
  const [isMountOpen, setIsMountOpen] = useState(false);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [mountPath, setMountPath] = useState('');
  const [selectedType, setSelectedType] = useState('mount');
  const [mounting, setMounting] = useState(false);

  // Load mounts list
  const loadMounts = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await getMountList();
      setMounts(data);
    } catch (err) {
      console.error('Failed to get mounts list', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMounts();

    // Fetch configurations and options
    getAllConfigs()
      .then(setRemotes)
      .catch(() => {});
    getMountTypes()
      .then(types => {
        setMountTypes(types);
        if (types.length > 0) setSelectedType(types[0]);
      })
      .catch(() => {});
  }, [loadMounts]);

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
      loadMounts(true);
    } catch (err) {
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
      loadMounts(true);
    } catch (err) {
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
        <Button onClick={() => setIsMountOpen(true)} className="cursor-pointer rounded-lg font-semibold shadow-md">
          <Plus className="mr-2 size-4" />
          {t('Create Mount Point')}
        </Button>
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
            onClick={() => loadMounts()}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMount(mount.MountPoint)}
                          className="h-8 cursor-pointer rounded-lg px-2.5 text-red-600 hover:bg-red-50/15">
                          <Trash2 className="mr-1.5 size-3.5" />
                          卸载挂载
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
    </div>
  );
}
