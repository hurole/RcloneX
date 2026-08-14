import { Copy, Download, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BatchActionBarProps {
  count: number;
  onDelete: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
}

export default function BatchActionBar({ count, onDelete, onCopy, onDownload, onClear }: BatchActionBarProps) {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center px-4">
      <div className="bg-foreground/95 text-background pointer-events-auto flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 shadow-xl backdrop-blur">
        <span className="text-xs font-bold">{t('Selected Count', { count })}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCopy}
          className="text-background hover:bg-background/10 hover:text-background h-8 cursor-pointer rounded-full text-xs font-semibold">
          <Copy className="mr-1.5 size-3.5" />
          {t('Batch Copy')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDownload}
          className="text-background hover:bg-background/10 hover:text-background h-8 cursor-pointer rounded-full text-xs font-semibold">
          <Download className="mr-1.5 size-3.5" />
          {t('Batch Download')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-8 cursor-pointer rounded-full text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300">
          <Trash2 className="mr-1.5 size-3.5" />
          {t('Batch Delete')}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClear}
          className="text-background hover:bg-background/10 hover:text-background h-7 w-7 cursor-pointer rounded-full"
          title={t('Clear Selection')}>
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
