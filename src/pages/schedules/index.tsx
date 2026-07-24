import { CalendarClock, CheckCircle, Clock, Loader2, Play, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  type ScheduledTask,
  addScheduledTask,
  deleteScheduledTask,
  getScheduledTasks,
  runScheduledTaskNow,
  toggleScheduledTask,
} from './services';

export default function Schedules() {
  const { t } = useTranslation();

  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [remotes, setRemotes] = useState<RcloneConfig[]>([]);

  // Dialog States
  const [isNewSchedOpen, setIsNewSchedOpen] = useState(false);
  const [schedName, setSchedName] = useState('');
  const [schedType, setSchedType] = useState<'copy' | 'sync' | 'move' | 'bisync' | 'check' | 'cleanup'>('sync');
  const [schedSrcRemote, setSchedSrcRemote] = useState('');
  const [schedSrcPath, setSchedSrcPath] = useState('');
  const [schedDstRemote, setSchedDstRemote] = useState('');
  const [schedDstPath, setSchedDstPath] = useState('');
  const [schedCron, setSchedCron] = useState('1h');
  const [schedDryRun, setSchedDryRun] = useState(false);
  const [creatingSched, setCreatingSched] = useState(false);

  const loadData = () => {
    setScheduledTasks(getScheduledTasks());
  };

  useEffect(() => {
    loadData();
    getAllConfigs().then(setRemotes).catch(console.error);
  }, []);

  const handleToggleSched = (id: string) => {
    const updated = toggleScheduledTask(id);
    setScheduledTasks(updated);
    toast.success('定时任务状态已更新');
  };

  const handleDeleteSched = (id: string) => {
    if (!window.confirm('确认删除此定时任务吗？')) return;
    const updated = deleteScheduledTask(id);
    setScheduledTasks(updated);
    toast.success('定时任务已删除');
  };

  const handleRunSchedNow = async (task: ScheduledTask) => {
    try {
      const res = await runScheduledTaskNow(task);
      toast.success(`手动触发定时任务，作业已在后台启动 (ID: ${res.jobid})`);
    } catch {
      toast.error('触发定时任务失败');
    }
  };

  const handleSaveSched = () => {
    if (!schedName.trim() || (!schedSrcRemote && schedType !== 'cleanup')) {
      toast.error('请填写完整任务名称及存储参数');
      return;
    }
    setCreatingSched(true);
    try {
      const formattedSrc = schedSrcRemote ? `${schedSrcRemote}:${schedSrcPath}` : '';
      const formattedDst = schedDstRemote ? `${schedDstRemote}:${schedDstPath}` : '';

      addScheduledTask({
        name: schedName.trim(),
        type: schedType,
        srcFs: formattedSrc,
        dstFs: formattedDst,
        cronExpr: schedCron,
        enabled: true,
        dryRun: schedDryRun,
      });

      toast.success('成功新建定时任务');

      loadData();
      setIsNewSchedOpen(false);
      setSchedName('');
      setSchedSrcPath('');
      setSchedDstPath('');
    } catch {
      toast.error('保存定时任务失败');
    } finally {
      setCreatingSched(false);
    }
  };

  const activeCount = scheduledTasks.filter(t => t.enabled).length;
  const pausedCount = scheduledTasks.filter(t => !t.enabled).length;

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <CalendarClock className="text-primary size-7" />
            {t('scheduledTasks')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            设置预设周期或自定义 Cron 规则，实现跨云盘、多源端的自动后台增量同步与备份。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => loadData()} variant="outline" size="icon" className="h-9 w-9 rounded-lg">
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={() => setIsNewSchedOpen(true)} className="cursor-pointer rounded-lg font-bold shadow-md">
            <Plus className="mr-2 size-4" />
            {t('newScheduledTask')}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-background/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              运行中规则
            </CardTitle>
            <CheckCircle className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <p className="text-muted-foreground/80 mt-1 text-xs font-medium">后台轻量引擎按计划轮询触发</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-background/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              已暂停规则
            </CardTitle>
            <Power className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-2xl font-black">{pausedCount}</div>
            <p className="text-muted-foreground/80 mt-1 text-xs font-medium">随时开启一键激活</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-background/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">规则总计</CardTitle>
            <Clock className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-primary text-2xl font-black">{scheduledTasks.length}</div>
            <p className="text-muted-foreground/80 mt-1 text-xs font-medium">支持自定义 Cron 5 段表达式</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-border/50 bg-background/50 shadow-sm backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b p-4">
          <div>
            <CardTitle className="text-base font-bold">定时任务列表</CardTitle>
            <CardDescription className="text-xs">管理全部已配置的自动备份与传输计划。</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {scheduledTasks.length === 0 ? (
            <div className="text-muted-foreground/60 flex flex-col items-center justify-center gap-3 py-20">
              <CalendarClock className="size-12 opacity-30" />
              <p className="text-sm font-semibold">暂无任何定时任务</p>

              <p className="text-xs">点击右上角“{t('newScheduledTask')}”创建周期性后台同步规则。</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border/40 bg-muted/20 text-muted-foreground border-b font-bold">
                    <th className="p-3.5 pl-6">{t('scheduleName')}</th>
                    <th className="p-3.5">{t('Task Type')}</th>
                    <th className="p-3.5">源端 (Source)</th>
                    <th className="p-3.5">目的端 (Destination)</th>
                    <th className="p-3.5">{t('scheduleCron')}</th>
                    <th className="p-3.5">状态</th>
                    <th className="p-3.5 pr-6 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-border/40 divide-y">
                  {scheduledTasks.map(task => (
                    <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                      <td className="text-foreground p-3.5 pl-6 font-bold">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${task.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                          />
                          {task.name}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="bg-primary/10 text-primary border-primary/20 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                          {task.type}
                        </span>
                      </td>
                      <td className="text-muted-foreground max-w-[180px] truncate p-3.5 font-mono">
                        {task.srcFs || '-'}
                      </td>
                      <td className="text-muted-foreground max-w-[180px] truncate p-3.5 font-mono">
                        {task.dstFs || '-'}
                      </td>
                      <td className="text-foreground p-3.5 font-mono font-semibold">{task.cronExpr}</td>
                      <td className="p-3.5">
                        {task.enabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="size-3" />
                            {t('enabled')}
                          </span>
                        ) : (
                          <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold">
                            <Power className="size-3" />
                            {t('disabled')}
                          </span>
                        )}
                      </td>
                      <td className="space-x-1.5 p-3.5 pr-6 text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          title={t('runNow')}
                          onClick={() => handleRunSchedNow(task)}
                          className="cursor-pointer font-semibold">
                          <Play className="mr-1 size-3 fill-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
                          {t('runNow')}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleToggleSched(task.id)}
                          className="cursor-pointer font-semibold">
                          {task.enabled ? t('disabled') : t('enabled')}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleDeleteSched(task.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer">
                          <Trash2 className="size-3" />
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

      {/* New Scheduled Task Dialog */}
      <Dialog open={isNewSchedOpen} onOpenChange={setIsNewSchedOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <CalendarClock className="text-primary size-5" />
              {t('newScheduledTask')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80 text-[11px] leading-normal">
              设置周期性后台备份或同步规则。在到达指定间隔时间时，程序将自动在后台触发作业。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid gap-2">
              <Label htmlFor="sched-name" className="text-xs font-bold">
                {t('scheduleName')}
              </Label>
              <Input
                id="sched-name"
                value={schedName}
                onChange={e => setSchedName(e.target.value)}
                placeholder={t('scheduleNamePlaceholder')}
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-bold">{t('Task Type')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['copy', 'sync', 'move', 'bisync', 'check', 'cleanup'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSchedType(type)}
                    className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold capitalize transition-all duration-200 ${
                      schedType === type
                        ? 'border-primary bg-primary/10 text-primary shadow-primary/5 shadow-xs'
                        : 'border-border/60 hover:bg-muted/30 text-muted-foreground'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sched-cron" className="text-xs font-bold">
                {t('scheduleCron')}
              </Label>
              <Select value={schedCron} onValueChange={setSchedCron}>
                <SelectTrigger id="sched-cron" className="w-full font-semibold">
                  <SelectValue placeholder="选择周期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m" className="font-semibold">
                    每 15 分钟 (Every 15m)
                  </SelectItem>
                  <SelectItem value="30m" className="font-semibold">
                    每 30 分钟 (Every 30m)
                  </SelectItem>
                  <SelectItem value="1h" className="font-semibold">
                    每 1 小时 (Every 1 hour)
                  </SelectItem>
                  <SelectItem value="6h" className="font-semibold">
                    每 6 小时 (Every 6 hours)
                  </SelectItem>
                  <SelectItem value="12h" className="font-semibold">
                    每 12 小时 (Every 12 hours)
                  </SelectItem>
                  <SelectItem value="24h" className="font-semibold">
                    每天一次 (Daily / 24h)
                  </SelectItem>
                  <SelectItem value="0 2 * * *" className="font-semibold">
                    每天凌晨 2 点 (Cron: 0 2 * * *)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="border-border/40 bg-muted/10 space-y-2 rounded-xl border p-3">
                <Label htmlFor="sched-src-remote" className="text-xs font-bold">
                  源存储 (Source Remote)
                </Label>
                <Select value={schedSrcRemote} onValueChange={setSchedSrcRemote}>
                  <SelectTrigger id="sched-src-remote" className="w-full font-semibold">
                    <SelectValue placeholder="选择源盘" />
                  </SelectTrigger>
                  <SelectContent>
                    {remotes.map(remote => (
                      <SelectItem key={remote.name} value={remote.name} className="font-semibold">
                        {remote.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={schedSrcPath}
                  onChange={e => setSchedSrcPath(e.target.value)}
                  placeholder="源路径 (可选)"
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="border-border/40 bg-muted/10 space-y-2 rounded-xl border p-3">
                <Label htmlFor="sched-dst-remote" className="text-xs font-bold">
                  目标存储 (Destination Remote)
                </Label>
                <Select value={schedDstRemote} onValueChange={setSchedDstRemote}>
                  <SelectTrigger id="sched-dst-remote" className="w-full font-semibold">
                    <SelectValue placeholder="选择目标盘" />
                  </SelectTrigger>
                  <SelectContent>
                    {remotes.map(remote => (
                      <SelectItem key={remote.name} value={remote.name} className="font-semibold">
                        {remote.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={schedDstPath}
                  onChange={e => setSchedDstPath(e.target.value)}
                  placeholder="目标路径 (可选)"
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="sched-dry-run"
                checked={schedDryRun}
                onChange={e => setSchedDryRun(e.target.checked)}
                className="accent-primary size-4 cursor-pointer rounded"
              />
              <Label htmlFor="sched-dry-run" className="cursor-pointer text-xs font-semibold">
                {t('dryRun')}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewSchedOpen(false)}
              disabled={creatingSched}
              className="cursor-pointer">
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveSched}
              disabled={creatingSched || !schedName.trim() || (!schedSrcRemote && schedType !== 'cleanup')}
              className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer font-bold">
              {creatingSched ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在创建
                </>
              ) : (
                '保存规则'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
