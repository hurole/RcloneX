import { Gauge, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/hooks/use-user';
import { getBandwidthLimit, setBandwidthLimit } from '@/pages/tasks/services';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { user } = useUser();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [currentRate, setCurrentRate] = useState<string>('off');
  const [customRate, setCustomRate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchLimit = useCallback(async () => {
    try {
      const res = await getBandwidthLimit();
      setCurrentRate(res.rate || 'off');
    } catch {
      // 忽略
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchLimit();
    }
  }, [user, fetchLimit]);

  const handleSetLimit = async (rate: string) => {
    try {
      setLoading(true);
      const res = await setBandwidthLimit(rate);
      setCurrentRate(res.rate || rate);
      toast.success(`${t('setLimit')}: ${rate === 'off' ? t('unlimited') : rate}`);
      setOpen(false);
      window.dispatchEvent(new CustomEvent('rclone-bwlimit-updated', { detail: res.rate }));
    } catch {
      toast.error(t('config.testFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 如果用户未登录，不显示Header
  if (!user) {
    return null;
  }

  const presetRates = ['off', '500k', '1M', '5M', '10M', '50M'];

  return (
    <header className={`bg-background flex h-[58px] items-center justify-between border-b px-4 ${className || ''}`}>
      {/* 左侧收起按钮 */}
      <div className="flex items-center">
        <SidebarTrigger />
      </div>

      {/* 右侧系统控制与限速组件 */}
      <div className="flex items-center gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed font-mono text-xs">
              <Gauge className="size-3.5 text-blue-500" />
              <span>{t('Speed Limit')}:</span>
              <span className="text-primary font-bold">{currentRate === 'off' ? t('unlimited') : currentRate}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gauge className="text-primary size-5" />
                {t('bandwidthLimit')}
              </DialogTitle>
              <DialogDescription>
                {t('currentLimit')}:{' '}
                <strong className="text-foreground font-mono">
                  {currentRate === 'off' ? t('unlimited') : currentRate}
                </strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-3 gap-2">
                {presetRates.map(rate => (
                  <Button
                    key={rate}
                    variant={currentRate === rate ? 'default' : 'outline'}
                    size="sm"
                    disabled={loading}
                    onClick={() => handleSetLimit(rate)}
                    className="font-mono text-xs">
                    {rate === 'off' ? t('unlimited') : rate}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="例如 2.5M 或 800k"
                  value={customRate}
                  onChange={e => setCustomRate(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  disabled={loading || !customRate.trim()}
                  onClick={() => handleSetLimit(customRate.trim())}>
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : t('Confirm')}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t('Cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
