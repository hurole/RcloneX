import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { type UploadQueueStats, type UploadTask } from '@/hooks/use-upload-queue';
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

interface UploadQueueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: UploadTask[];
  stats: UploadQueueStats;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClearFinished: () => void;
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSec: number): string => `${formatBytes(bytesPerSec)}/s`;

const STATUS_ICON: Record<UploadTask['status'], ReactNode> = {
  pending: <Loader2 className="text-muted-foreground size-3.5 animate-spin" />,
  uploading: <Loader2 className="text-primary size-3.5 animate-spin" />,
  success: <CheckCircle2 className="size-3.5 text-emerald-500" />,
  error: <AlertCircle className="size-3.5 text-red-500" />,
  cancelled: <X className="text-muted-foreground size-3.5" />,
};

export default function UploadQueueSheet({
  open,
  onOpenChange,
  tasks,
  stats,
  onCancel,
  onRetry,
  onClearFinished,
}: UploadQueueSheetProps) {
  const { t } = useTranslation();
  const hasRunning = stats.active > 0 || tasks.some(t => t.status === 'pending');
  const hasFinished = stats.success + stats.failed + stats.cancelled > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {t('Upload Queue')}
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-mono text-xs">{stats.total}</span>
          </SheetTitle>
          <SheetDescription>
            {t('Upload Summary', { success: stats.success, failed: stats.failed, cancelled: stats.cancelled })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4">
          {tasks.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-16 text-sm">
              <CheckCircle2 className="size-10 opacity-30" />
              <span>{t('No File Selected')}</span>
            </div>
          ) : (
            tasks.map(task => {
              const isUploading = task.status === 'uploading';
              const isError = task.status === 'error';
              return (
                <div
                  key={task.id}
                  className={cn(
                    'border-border/50 bg-background/80 space-y-2 rounded-lg border p-3',
                    isError && 'border-red-500/30 bg-red-500/5',
                  )}>
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0">{STATUS_ICON[task.status]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-xs leading-none font-bold" title={task.relativePath}>
                        {task.displayName}
                      </p>
                      <p className="text-muted-foreground mt-1 truncate font-mono text-[10px]">
                        {formatBytes(task.size)}
                        {isUploading && task.speed > 0 ? ` · ${formatSpeed(task.speed)}` : ''}
                        {isUploading && ` · ${Math.round(task.progress)}%`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {isUploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground h-7 w-7 cursor-pointer rounded-md hover:text-red-600"
                          title={t('Stop')}
                          onClick={() => onCancel(task.id)}>
                          <X className="size-3.5" />
                        </Button>
                      )}
                      {isError && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary h-7 w-7 cursor-pointer rounded-md"
                          title={t('Retry')}
                          onClick={() => onRetry(task.id)}>
                          <RotateCcw className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isUploading && <Progress value={task.progress} className="h-1.5" />}
                  {isError && task.error && (
                    <p className="truncate text-[10px] font-semibold text-red-500/90" title={task.error}>
                      {task.error}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-border/40 flex items-center justify-between gap-2 border-t p-4">
          <div className="text-muted-foreground text-[11px] font-semibold">
            {stats.bytesTotal > 0 ? `${formatBytes(stats.bytesUploaded)} / ${formatBytes(stats.bytesTotal)}` : '—'}
            {hasRunning && <span className="text-primary ml-1.5 animate-pulse">{t('Uploading')}…</span>}
          </div>
          <div className="flex items-center gap-2">
            {hasFinished && (
              <Button variant="outline" size="sm" className="h-8 cursor-pointer text-xs" onClick={onClearFinished}>
                <Trash2 className="mr-1.5 size-3" />
                {t('Clear Finished')}
              </Button>
            )}
            {!hasRunning && stats.total > 0 && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ {t('Upload All Done')}</span>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
