import {
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  Cloud,
  FolderOpen,
  Gauge,
  Loader2,
  PieChart,
  RefreshCw,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type RcloneConfig, type RcloneAboutInfo, getAllConfigs, getAllRemotesAbout } from '@/pages/config/services';
import { getScheduledTasks } from '@/pages/schedules/services';
import { type RcloneCoreStats, getCoreStats } from '@/pages/tasks/services';

export default function Dashboard() {
  const { t } = useTranslation();

  const [configs, setConfigs] = useState<RcloneConfig[]>([]);
  const [quotaMap, setQuotaMap] = useState<Record<string, RcloneAboutInfo>>({});
  const [stats, setStats] = useState<RcloneCoreStats | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s (空闲)';
    return `${formatBytes(bytesPerSec)}/s`;
  };

  const loadDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [fetchedConfigs, coreStats] = await Promise.all([getAllConfigs(), getCoreStats().catch(() => null)]);
      setConfigs(fetchedConfigs);
      setStats(coreStats);
      setScheduledCount(getScheduledTasks().length);

      const abouts = await getAllRemotesAbout(fetchedConfigs);
      setQuotaMap(abouts);
    } catch (err) {
      console.error('加载 Dashboard 数据失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <PieChart className="text-primary size-7" />
            {t('Dashboard')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">远程存储配置状态、实时传输流速与磁盘容量占比概览。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => loadDashboardData(true)}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="cursor-pointer rounded-lg font-semibold">
            <RefreshCw className={`mr-2 size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </Button>
          <Button asChild size="sm" className="cursor-pointer rounded-lg font-bold shadow-md">
            <Link to="/configs">
              <Settings className="mr-2 size-3.5" />
              管理存储配置
            </Link>
          </Button>
        </div>
      </div>

      {/* Optimized High-Value Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Card 1: Cloud Remotes Count */}
        <Card className="border-border/50 bg-background/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              已配置存储源
            </CardTitle>
            <Cloud className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-black">{configs.length}</div>
            <p className="text-muted-foreground/80 mt-1 text-xs font-medium">包含 S3/WebDAV/SFTP 等各种远端</p>
          </CardContent>
        </Card>

        {/* Card 2: Live Speed */}
        <Card className="border-border/50 bg-background/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              实时传输流速
            </CardTitle>
            <Gauge className="size-4 animate-pulse text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatSpeed(stats?.speed)}
            </div>
            <p className="text-muted-foreground/80 mt-1 text-xs font-medium">
              {stats?.transfers && stats.transfers.length > 0
                ? `${stats.transfers.length} 个文件正在传输中`
                : '当前无活跃文件传输'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Scheduled Tasks */}
        <Card className="border-border/50 bg-background/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              定时任务规则
            </CardTitle>
            <CalendarClock className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{scheduledCount}</div>
            <p className="text-muted-foreground/80 mt-1 text-xs font-medium">已配置的周期性后台同步规则</p>
          </CardContent>
        </Card>

        {/* Card 4: Engine Status */}
        <Card className="border-border/50 bg-background/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              引擎服务状态
            </CardTitle>
            <CheckCircle className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              <span className="size-2.5 animate-ping rounded-full bg-emerald-500" />
              在线运行
            </div>
            <p className="text-muted-foreground/80 mt-1 text-xs font-medium">Rclone RC 控制引擎连接正常</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Storage Quota Overview Section */}
      <Card className="border-border/50 bg-background/60 shadow-md backdrop-blur-sm">
        <CardHeader className="border-b p-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <PieChart className="text-primary size-5" />
                {t('quotaOverview')}
              </CardTitle>
              <CardDescription className="mt-1 text-xs">监控各个已配置远程云盘的空间容量与使用详情。</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="text-primary size-8 animate-spin" />
              <span className="text-muted-foreground text-xs font-semibold">正在计算各云盘存储容量与空间占用...</span>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-muted-foreground/60 flex flex-col items-center justify-center gap-3 py-16">
              <Cloud className="size-12 opacity-30" />
              <p className="text-sm font-semibold">尚未添加任何存储配置</p>
              <Button asChild size="sm" className="mt-2 font-bold">
                <Link to="/configs">立即添加网盘</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {configs.map(config => {
                const about = quotaMap[config.name];
                const used = about?.used || 0;
                const total = about?.total || 0;
                const free = about?.free;
                const trashed = about?.trashed;

                const hasPercentage = total > 0;
                const percentage = hasPercentage ? Math.min(100, Math.round((used / total) * 100)) : 0;

                // Warning colors for quota-constrained remotes
                let progressColor = 'bg-primary';
                let textColor = 'text-primary';
                if (percentage >= 95) {
                  progressColor = 'bg-red-500';
                  textColor = 'text-red-600 dark:text-red-400';
                } else if (percentage >= 80) {
                  progressColor = 'bg-amber-500';
                  textColor = 'text-amber-600 dark:text-amber-400';
                }

                return (
                  <div
                    key={config.id}
                    className="border-border/50 bg-background/80 hover:border-border/90 flex flex-col justify-between rounded-xl border p-4.5 shadow-xs transition-all">
                    <div className="space-y-3">
                      {/* Item Top info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-primary/10 border-primary/20 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg border">
                            <Cloud className="size-4" />
                          </div>
                          <div>
                            <h3 className="text-foreground text-sm leading-none font-extrabold">{config.name}</h3>
                            <span className="text-muted-foreground/80 font-mono text-[10px] font-semibold uppercase">
                              {config.type}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge: Only show percentage if total quota exists */}
                        {hasPercentage ? (
                          <div className={`flex items-center gap-1 font-mono text-xs font-black ${textColor}`}>
                            {percentage >= 95 && <ShieldAlert className="size-3.5" />}
                            {percentage >= 80 && percentage < 95 && <AlertTriangle className="size-3.5" />}
                            <span>{percentage}%</span>
                          </div>
                        ) : (
                          <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-[10px] font-semibold">
                            {used > 0 ? `已用 ${formatBytes(used)}` : '按量存储 / 无容量限制'}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar: Only for remotes with quota */}
                      {hasPercentage && (
                        <div className="space-y-1 pt-1">
                          <div className="bg-muted/60 h-2.5 w-full overflow-hidden rounded-full p-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Disk details Grid */}
                      <div className="border-border/30 bg-muted/20 grid grid-cols-2 gap-2 rounded-lg border p-2.5 text-xs">
                        <div>
                          <span className="text-muted-foreground/80 text-[10px] font-medium">{t('usedSpace')}</span>
                          <p className="text-foreground font-mono text-xs leading-tight font-bold">
                            {used > 0 ? formatBytes(used) : '0 B'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground/80 text-[10px] font-medium">{t('freeSpace')}</span>
                          <p className="text-foreground font-mono text-xs leading-tight font-bold">
                            {free !== undefined && free > 0 ? formatBytes(free) : hasPercentage ? '0 B' : '按量扩展'}
                          </p>
                        </div>
                        {total > 0 && (
                          <div>
                            <span className="text-muted-foreground/80 text-[10px] font-medium">{t('totalSpace')}</span>
                            <p className="text-foreground font-mono text-xs leading-tight font-bold">
                              {formatBytes(total)}
                            </p>
                          </div>
                        )}
                        {trashed !== undefined && trashed > 0 && (
                          <div>
                            <span className="text-muted-foreground/80 text-[10px] font-medium">
                              {t('trashedSpace')}
                            </span>
                            <p className="font-mono text-xs leading-tight font-bold text-amber-600 dark:text-amber-400">
                              {formatBytes(trashed)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer link to Explorer */}
                    <div className="mt-3 flex items-center justify-between pt-1">
                      <Button
                        asChild
                        size="xs"
                        variant="ghost"
                        className="text-primary hover:text-primary/80 font-bold">
                        <Link to={`/explorer?remote=${encodeURIComponent(config.name)}`}>
                          进入该盘浏览 <FolderOpen className="ml-1 size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
