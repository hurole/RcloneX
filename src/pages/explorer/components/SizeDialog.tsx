import { BarChart3, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type SizeInfo } from '@/pages/explorer/services';

interface SizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPath: string;
  loading: boolean;
  info: SizeInfo | null;
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export default function SizeDialog({ open, onOpenChange, targetPath, loading, info }: SizeDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!info) return;
    const text = `${targetPath}: ${formatBytes(info.bytes)} / ${info.count} files`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t('Copy Result'));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('Download Failed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold">
            <BarChart3 className="text-primary size-5" />
            {t('Directory Stats')}
          </DialogTitle>
          <DialogDescription className="truncate font-mono">{targetPath || '/'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {loading ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-sm font-semibold">
              <Loader2 className="text-primary size-6 animate-spin" />
              <span>{t('Packing')}…</span>
            </div>
          ) : info ? (
            <div className="border-border/40 bg-muted/20 grid grid-cols-3 gap-3 rounded-xl border p-4 text-center">
              <div>
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {t('Total Size')}
                </p>
                <p className="text-foreground mt-1 font-mono text-sm font-black">{formatBytes(info.bytes)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {t('File Count')}
                </p>
                <p className="text-foreground mt-1 font-mono text-sm font-black">{info.count.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {t('Sizeless Count')}
                </p>
                <p className="text-foreground mt-1 font-mono text-sm font-black">{info.sizeless ?? 0}</p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t('Cancel')}
          </Button>
          <Button type="button" onClick={handleCopy} disabled={!info || loading} className="cursor-pointer font-bold">
            <Copy className="mr-1.5 size-3.5" />
            {copied ? '✓' : t('Copy Result')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
