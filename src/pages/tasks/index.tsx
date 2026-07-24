import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Gauge,
  HardDrive,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
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
import {
  type RcloneCoreStats,
  type RcloneJobItem,
  createAdvancedTask,
  getCoreStats,
  getJobList,
  stopJob,
} from './services';

export default function Tasks() {
  const { t } = useTranslation();

  // Metrics & Stats
  const [stats, setStats] = useState<RcloneCoreStats | null>(null);
  const [jobs, setJobs] = useState<RcloneJobItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Remotes for task creator
  const [remotes, setRemotes] = useState<RcloneConfig[]>([]);

  // Dialog state for standard new task
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskType, setTaskType] = useState<'copy' | 'sync' | 'move' | 'bisync' | 'check' | 'cleanup'>('copy');
  const [srcRemote, setSrcRemote] = useState('');
  const [srcPath, setSrcPath] = useState('');
  const [dstRemote, setDstRemote] = useState('');
  const [dstPath, setDstPath] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [starting, setStarting] = useState(false);

  // Load metrics & jobs list
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [statsData, jobsData] = await Promise.all([getCoreStats(), getJobList()]);
      setStats(statsData);
      setJobs(jobsData);

      // Update sidebar badge if there are active transfers (can notify standard badge handlers if any)
    } catch (err) {
      console.error('Failed to load tasks telemetry data', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Poll stats and list of background jobs
  useEffect(() => {
    loadData();

    // Fetch remotes once
    getAllConfigs()
      .then(setRemotes)
      .catch(() => {});

    // Polling interval for live status update
    const timer = setInterval(() => {
      loadData(true);
    }, 2500);

    return () => clearInterval(timer);
  }, [loadData]);

  // Cancel task / stop job
  const handleStopJob = async (jobid: number) => {
    if (!window.confirm('您确定要取消此传输任务吗？')) return;
    try {
      await stopJob(jobid);
      toast.success('任务已取消停止');
      loadData(true);
    } catch (err) {
      toast.error('取消任务失败');
    }
  };

  // Run new transfer task
  const handleStartTask = async () => {
    if (taskType !== 'cleanup' && (!srcRemote || (!dstRemote && taskType !== 'check'))) {
      toast.error('请正确选择源存储与目标存储');
      return;
    }
    setStarting(true);

    try {
      const formattedSrcFs = srcRemote ? (srcRemote.endsWith(':') ? srcRemote : `${srcRemote}:`) + srcPath : undefined;
      const formattedDstFs = dstRemote ? (dstRemote.endsWith(':') ? dstRemote : `${dstRemote}:`) + dstPath : undefined;

      const res = await createAdvancedTask({
        type: taskType,
        srcFs: formattedSrcFs,
        dstFs: formattedDstFs,
        dryRun,
      });

      toast.success(`传输任务已成功在后台启动 ${res.jobid ? `(ID: ${res.jobid})` : ''}`);
      setIsNewTaskOpen(false);

      // Clear wizard
      setSrcPath('');
      setDstPath('');
      setDryRun(false);

      loadData(true);
    } catch {
      toast.error('任务启动失败，请检查远程配置和路径参数');
    } finally {
      setStarting(false);
    }
  };

  // Format bytes and speeds
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return `${Number.parseFloat((bytesPerSec / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatEta = (seconds: number) => {
    if (seconds === -1 || seconds === Number.POSITIVE_INFINITY || !seconds) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">{t('Tasks')}</h1>
          <p className="text-muted-foreground text-sm">监控实时传输流速，管理后台备份与同步作业历史。</p>
        </div>
        <Button onClick={() => setIsNewTaskOpen(true)} className="cursor-pointer rounded-lg font-semibold shadow-md">
          <Plus className="mr-2 size-4" />
          {t('Transfer Setup')}
        </Button>
      </div>

      {/* Stats Cards Row */}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 bg-muted/20 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {t('Global Speed')}
            </CardTitle>
            <Gauge className="text-primary size-4.5 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-black">{stats ? formatSpeed(stats.speed) : '0 B/s'}</div>
            <p className="text-muted-foreground mt-1 text-[10px]">全局实时网速监控</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-muted/20 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {t('Transferred Bytes')}
            </CardTitle>
            <HardDrive className="text-muted-foreground size-4.5" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-black">{stats ? formatBytes(stats.bytes) : '0 B'}</div>
            <p className="text-muted-foreground mt-1 text-[10px]">本次连接累计传输量</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-muted/20 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              进行中文件
            </CardTitle>
            <Loader2
              className={`size-4.5 text-blue-500 ${stats?.transfers && stats.transfers.length > 0 ? 'animate-spin' : ''}`}
            />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-black">{stats?.transfers ? stats.transfers.length : 0}</div>
            <p className="text-muted-foreground mt-1 text-[10px]">并发活跃文件写入计数</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-muted/20 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              任务异常率
            </CardTitle>
            <AlertCircle className={`size-4.5 ${stats && stats.errors > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-black">{stats ? stats.errors : 0}</div>
            <p className="text-muted-foreground mt-1 text-[10px]">累计报错故障点</p>
          </CardContent>
        </Card>
      </div>

      {/* Active transfers grid progress */}
      {stats?.transfers && stats.transfers.length > 0 && (
        <Card className="border-border/50 overflow-hidden border shadow-sm">
          <CardHeader className="bg-primary/5 border-primary/10 border-b p-4">
            <CardTitle className="text-primary flex items-center gap-2 text-sm font-bold">
              <Activity className="text-primary size-4.5 animate-pulse" />
              {t('Active Transfers')}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-border/20 divide-y p-0">
            {stats.transfers.map(item => (
              <div key={item.name} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-foreground max-w-[280px] truncate font-semibold sm:max-w-[400px]">
                    {item.name}
                  </span>
                  <span className="text-muted-foreground/80 shrink-0 font-mono font-bold">
                    {formatSpeed(item.speed)} | ETA: {formatEta(item.eta)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="bg-muted border-border/20 h-2 w-full flex-1 overflow-hidden rounded-full border shadow-inner">
                    <div
                      className="from-primary h-full rounded-full bg-gradient-to-r to-blue-500 transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-foreground w-8 shrink-0 text-right font-mono text-[10px] font-bold">
                    {item.percentage}%
                  </span>
                </div>

                <div className="text-muted-foreground/70 font-mono text-[9px]">
                  Transferred: {formatBytes(item.bytes)} of {formatBytes(item.size)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Historical background jobs list */}
      <Card className="border-border/50 overflow-hidden border shadow-sm">
        <CardHeader className="bg-muted/20 border-border/40 flex flex-row items-center justify-between border-b p-4">
          <div>
            <CardTitle className="text-sm font-bold">{t('Background Jobs')}</CardTitle>
            <CardDescription className="text-xs">Rclone 异步作业调度记录与运行反馈。</CardDescription>
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
              <span className="text-muted-foreground text-xs font-semibold">加载历史任务列表中...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-muted-foreground/50 flex flex-1 flex-col items-center justify-center gap-2 py-16 italic">
              <Clock className="text-muted-foreground size-10 opacity-30" />
              <span className="text-xs font-semibold">暂无任何后台异步作业记录</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border/40 bg-muted/10 text-muted-foreground border-b font-bold tracking-wider uppercase">
                    <th className="p-3 pl-6">{t('Job ID')}</th>
                    <th className="p-3">{t('Task Type')}</th>
                    <th className="p-3">{t('Duration')}</th>
                    <th className="p-3">启动时间</th>
                    <th className="p-3">{t('Status')}</th>
                    <th className="p-3 pr-6 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-border/20 divide-y">
                  {jobs.map(job => {
                    const statusClass = job.finished
                      ? job.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 animate-pulse';

                    const StatusIcon = job.finished ? (job.success ? CheckCircle : AlertCircle) : Loader2;

                    return (
                      <tr key={job.id} className="hover:bg-muted/20 font-medium transition-colors">
                        <td className="p-3 pl-6 font-mono font-bold">{job.id}</td>
                        <td className="p-3">
                          <span className="text-foreground bg-muted/65 rounded px-1.5 py-0.5 text-xs font-semibold uppercase">
                            {job.group ? job.group.split('/')[0] : 'transfer'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-semibold">{formatDuration(job.duration)}</td>
                        <td className="text-muted-foreground p-3">{new Date(job.startTime).toLocaleString()}</td>
                        <td className="p-3">
                          <div
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>
                            <StatusIcon className={`size-3 shrink-0 ${!job.finished ? 'animate-spin' : ''}`} />
                            {job.finished ? (job.success ? t('Success') : t('Failed')) : t('Running')}
                          </div>
                        </td>
                        <td className="p-3 pr-6 text-right">
                          {!job.finished && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStopJob(job.id)}
                              className="h-7 cursor-pointer rounded-md px-2.5 text-red-600 hover:bg-red-50/15">
                              <XCircle className="mr-1.5 size-3" />
                              {t('Action Stop')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Task Creator Wizard Dialog */}

      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Play className="text-primary size-5" />
              {t('Transfer Setup')}
            </DialogTitle>
            <DialogDescription>配置远程云盘之间的数据同步任务。Rclone 会自动在后台处理大文件传输。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Task Type selector */}
            <div className="grid gap-2">
              <Label className="text-sm font-bold">{t('Task Type')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['copy', 'sync', 'move', 'bisync', 'check', 'cleanup'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTaskType(type)}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold capitalize transition-all duration-200 ${
                      taskType === type
                        ? 'border-primary bg-primary/10 text-primary shadow-primary/5 shadow-sm'
                        : 'border-border/60 hover:bg-muted/30 text-muted-foreground'
                    }`}>
                    {type === 'copy'
                      ? t('Task Copy')
                      : type === 'sync'
                        ? t('Task Sync')
                        : type === 'move'
                          ? t('Task Move')
                          : type === 'bisync'
                            ? t('taskBisync')
                            : type === 'check'
                              ? t('taskCheck')
                              : t('taskCleanup')}
                  </button>
                ))}
              </div>
            </div>

            {/* Dry run option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="dry-run"
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                className="accent-primary size-4 cursor-pointer rounded"
              />
              <Label htmlFor="dry-run" className="cursor-pointer text-xs font-semibold">
                {t('dryRun')}
              </Label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Source configuration */}
              <div className="border-border/40 bg-muted/10 space-y-2.5 rounded-xl border p-3.5">
                <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-black tracking-widest uppercase">
                  <span className="size-2 rounded-full bg-blue-500" />
                  数据源端 (Source)
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="src-remote" className="text-xs font-semibold">
                    选择源存储
                  </Label>
                  <Select value={srcRemote} onValueChange={setSrcRemote}>
                    <SelectTrigger id="src-remote" className="w-full font-semibold">
                      <SelectValue placeholder="源云盘" />
                    </SelectTrigger>
                    <SelectContent>
                      {remotes.map(remote => (
                        <SelectItem key={remote.name} value={remote.name} className="font-semibold">
                          {remote.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="src-path" className="text-xs font-semibold">
                    {t('Source Path')}
                  </Label>
                  <Input
                    id="src-path"
                    value={srcPath}
                    onChange={e => setSrcPath(e.target.value)}
                    placeholder="源目录，空代表根目录"
                    disabled={starting}
                    className="h-9 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Destination configuration */}
              <div className="border-border/40 bg-muted/10 space-y-2.5 rounded-xl border p-3.5">
                <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-black tracking-widest uppercase">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  目的接收端 (Destination)
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="dst-remote" className="text-xs font-semibold">
                    选择目标存储
                  </Label>
                  <Select value={dstRemote} onValueChange={setDstRemote}>
                    <SelectTrigger id="dst-remote" className="w-full font-semibold">
                      <SelectValue placeholder="目标云盘" />
                    </SelectTrigger>
                    <SelectContent>
                      {remotes.map(remote => (
                        <SelectItem key={remote.name} value={remote.name} className="font-semibold">
                          {remote.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dst-path" className="text-xs font-semibold">
                    {t('Destination Path')}
                  </Label>
                  <Input
                    id="dst-path"
                    value={dstPath}
                    onChange={e => setDstPath(e.target.value)}
                    placeholder="目标目录，空代表根目录"
                    disabled={starting}
                    className="h-9 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Quick alert details */}
            {taskType === 'sync' && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-normal font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>重要提示：</strong>同步操作 (Sync)
                  会使目标目录的数据结构与源目录完全一致。如果目标目录存在非源目录含有的多余文件，这些文件会被
                  <strong>永久删除</strong>。请谨慎运行。
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewTaskOpen(false)}
              disabled={starting}
              className="cursor-pointer">
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleStartTask}
              disabled={starting || !srcRemote || !dstRemote}
              className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer font-bold">
              {starting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在启动
                </>
              ) : (
                t('Run Task')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
