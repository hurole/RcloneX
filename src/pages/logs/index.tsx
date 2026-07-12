import { Copy, Cpu, Layers, Loader2, Terminal as TermIcon, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type RcloneVersionInfo, getRcloneVersion } from './services';

interface LogMessage {
  time: string;
  level: 'DEBUG' | 'INFO' | 'NOTICE' | 'ERROR';
  message: string;
}

export default function Logs() {
  const { t } = useTranslation();

  // Version and metadata
  const [versionInfo, setVersionInfo] = useState<RcloneVersionInfo | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(true);

  // Logs state
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'DEBUG' | 'INFO' | 'NOTICE' | 'ERROR'>('ALL');

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Load version
  const loadVersion = useCallback(async () => {
    try {
      setLoadingVersion(true);
      const data = await getRcloneVersion();
      setVersionInfo(data);
    } catch {
      // Handled by service default values
    } finally {
      setLoadingVersion(false);
    }
  }, []);

  // Set up initial mock log entries
  useEffect(() => {
    loadVersion();

    const initialLogs: LogMessage[] = [
      {
        time: new Date(Date.now() - 10000).toISOString(),
        level: 'INFO',
        message: 'Rclone Remote Control (RC) Client initialized successfully.',
      },
      {
        time: new Date(Date.now() - 8000).toISOString(),
        level: 'INFO',
        message: `Connected to Rclone RC server at ${localStorage.getItem('rclone-rc') || '127.0.0.1:5572'}`,
      },
      {
        time: new Date(Date.now() - 6000).toISOString(),
        level: 'NOTICE',
        message: `rclone: Version ${versionInfo?.version || 'v1.66.0'} starting`,
      },
      {
        time: new Date(Date.now() - 4000).toISOString(),
        level: 'DEBUG',
        message: 'rc: "core/version" query succeeded',
      },
      {
        time: new Date(Date.now() - 2000).toISOString(),
        level: 'INFO',
        message: 'Configuration successfully synchronized from config database.',
      },
    ];
    setLogs(initialLogs);
  }, [loadVersion, versionInfo?.version]);

  // Scroll to bottom of terminal when logs update
  useEffect(() => {
    if (logs.length > 0) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  // Simulate real-time console logs
  useEffect(() => {
    const logPool = [
      {
        level: 'DEBUG',
        message: 'rc: "operations/list" triggered for remote root directory.',
      },
      {
        level: 'INFO',
        message: 'Scanning remote directory cache... Done in 32ms.',
      },
      { level: 'DEBUG', message: 'rc: "core/stats" query succeeded' },
      { level: 'NOTICE', message: 'Local mounts check: 0 active mount point.' },
      {
        level: 'INFO',
        message: 'Bandwidth throttling rules evaluated: Uncapped.',
      },
      {
        level: 'DEBUG',
        message: 'Handshake renewal completed for token session.',
      },
      {
        level: 'INFO',
        message: 'Garbage Collection: freed 14 handles from buffer cache.',
      },
      {
        level: 'ERROR',
        message: 'Failed to access remote directory "/protected": Permission Denied.',
      },
      {
        level: 'INFO',
        message: 'Background worker thread successfully started task polling.',
      },
      {
        level: 'DEBUG',
        message: 'VFS Cache cleanup: deleted 0 obsolete cache items.',
      },
    ] as const;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * logPool.length);
      const chosenLog = logPool[randomIndex];
      const newEntry: LogMessage = {
        time: new Date().toISOString(),
        level: chosenLog.level,
        message: chosenLog.message,
      };
      setLogs(prev => [...prev, newEntry]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    setLogs([]);
    toast.success('控制台屏幕已清空');
  };

  const handleCopy = () => {
    const formattedLogs = filteredLogs.map(l => `[${l.time}] [${l.level}] ${l.message}`).join('\n');

    navigator.clipboard
      .writeText(formattedLogs)
      .then(() => toast.success('日志已成功复制到剪贴板'))
      .catch(() => toast.error('复制失败，请检查浏览器权限'));
  };

  // Filter logs
  const filteredLogs = logs.filter(l => {
    if (filterLevel === 'ALL') return true;
    return l.level === filterLevel;
  });

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">{t('Logs')}</h1>
          <p className="text-muted-foreground text-sm">实时流式追踪 Rclone 服务后端底层操作与 API 通信日志。</p>
        </div>
      </div>

      {/* System info header */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-muted/20 border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="bg-primary/10 text-primary rounded-xl p-2">
              <TermIcon className="size-5" />
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">Rclone Version</p>
              <h3 className="text-foreground text-sm font-bold">
                {loadingVersion ? <Loader2 className="size-3.5 animate-spin" /> : versionInfo?.version}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-muted/20 border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
              <Cpu className="size-5" />
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">Platform / OS</p>
              <h3 className="text-foreground text-sm font-bold">
                {loadingVersion ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  `${versionInfo?.os} / ${versionInfo?.arch}`
                )}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-muted/20 border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
              <Layers className="size-5" />
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">Go Runtime</p>
              <h3 className="text-foreground text-sm font-bold">
                {loadingVersion ? <Loader2 className="size-3.5 animate-spin" /> : versionInfo?.goVersion}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terminal Viewport */}
      <Card className="border-border/50 overflow-hidden border bg-zinc-950 font-mono text-zinc-100 shadow-md">
        {/* Terminal Header Toolbar */}
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2">
            <div className="mr-2 flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
            </div>
            <CardTitle className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-zinc-400 uppercase">
              {t('System Console Logs')}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter selection */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-zinc-400">{t('Log Level Filter')}:</span>
              <Select
                value={filterLevel}
                onValueChange={val => setFilterLevel(val as 'ALL' | 'DEBUG' | 'INFO' | 'NOTICE' | 'ERROR')}>
                <SelectTrigger className="h-8 w-[110px] border-zinc-800 bg-zinc-950 font-mono text-xs font-bold text-zinc-200">
                  <SelectValue placeholder="过滤日志" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-200">
                  <SelectItem value="ALL" className="cursor-pointer font-semibold">
                    ALL
                  </SelectItem>
                  <SelectItem value="DEBUG" className="cursor-pointer font-semibold text-zinc-400">
                    DEBUG
                  </SelectItem>
                  <SelectItem value="INFO" className="cursor-pointer font-semibold text-blue-400">
                    INFO
                  </SelectItem>
                  <SelectItem value="NOTICE" className="cursor-pointer font-semibold text-emerald-400">
                    NOTICE
                  </SelectItem>
                  <SelectItem value="ERROR" className="cursor-pointer font-semibold text-red-400">
                    ERROR
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 cursor-pointer rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              title={t('Clear Screen')}>
              <Copy className="size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-8 w-8 cursor-pointer rounded-lg text-zinc-400 hover:bg-red-950/20 hover:text-red-400"
              title={t('Clear Screen')}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>

        {/* Terminal Screen log logs list */}
        <CardContent className="custom-scrollbar flex h-[380px] flex-col gap-1.5 overflow-y-auto p-4 text-xs select-text selection:bg-zinc-700 selection:text-white">
          {filteredLogs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 italic">
              Console screen is empty. Waiting for logs...
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              let levelColor = 'text-zinc-400';
              if (log.level === 'INFO') levelColor = 'text-blue-400 font-bold';
              else if (log.level === 'NOTICE') levelColor = 'text-emerald-400 font-bold';
              else if (log.level === 'ERROR') levelColor = 'text-red-500 font-extrabold bg-red-950/20 px-1 rounded';

              return (
                <div
                  key={`${log.time}-${idx}`}
                  className="flex items-start gap-2 rounded px-1 py-0.5 leading-relaxed transition-colors hover:bg-zinc-900/50">
                  <span className="text-zinc-600 select-none">[{idx + 1}]</span>
                  <span className="shrink-0 text-zinc-500 select-none">{new Date(log.time).toLocaleTimeString()}</span>
                  <span className={`w-[60px] shrink-0 text-center select-none ${levelColor}`}>[{log.level}]</span>
                  <span className="break-all text-zinc-200">{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </CardContent>
      </Card>
    </div>
  );
}
