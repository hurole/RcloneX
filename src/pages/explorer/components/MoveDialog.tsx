import { Folder, Loader2, MoveRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
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
import { type RcloneConfig } from '@/pages/config/services';
import { type RcloneFileItem } from '@/pages/explorer/services';

export interface MoveTarget {
  remote: string;
  path: string;
  newName: string;
}

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetItem: RcloneFileItem | null;
  currentRemote: string;
  currentPath: string;
  remotes: RcloneConfig[];
  submitting: boolean;
  onSubmit: (target: MoveTarget) => void;
}

export default function MoveDialog({
  open,
  onOpenChange,
  targetItem,
  currentRemote,
  currentPath,
  remotes,
  submitting,
  onSubmit,
}: MoveDialogProps) {
  const { t } = useTranslation();
  const [targetRemote, setTargetRemote] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [targetName, setTargetName] = useState('');

  // 打开时初始化默认值
  useEffect(() => {
    if (open) {
      const defaultRemote = remotes.find(r => r.name !== currentRemote)?.name || currentRemote;
      setTargetRemote(defaultRemote);
      setTargetPath(currentPath);
      setTargetName(targetItem?.Name || '');
    }
  }, [open, targetItem, currentRemote, currentPath, remotes]);

  const canSubmit = Boolean(targetRemote && targetName.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold">
            <MoveRight className="text-primary size-5" />
            {t('Move To')}
          </DialogTitle>
          <DialogDescription>将文件/目录移动至目标位置（同盘移动时修改名称即重命名）。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/40 border-border/40 text-muted-foreground space-y-1 rounded-lg border p-3 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span>源盘:</span>
              <span className="text-foreground font-bold">{currentRemote}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>源路径:</span>
              <span className="text-foreground max-w-[280px] truncate font-bold">{targetItem?.Path || '/'}</span>
            </div>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="move-remote" className="text-sm font-bold">
              {t('Destination Remote')}
            </Label>
            <Select value={targetRemote} onValueChange={setTargetRemote} disabled={submitting}>
              <SelectTrigger id="move-remote" className="w-full font-semibold">
                <SelectValue placeholder={t('Select Remote')} />
              </SelectTrigger>
              <SelectContent>
                {remotes.map(remote => (
                  <SelectItem key={remote.name} value={remote.name} className="font-semibold">
                    {remote.name} ({remote.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="move-path" className="text-sm font-bold">
              {t('Destination Path')}
            </Label>
            <Input
              id="move-path"
              value={targetPath}
              onChange={e => setTargetPath(e.target.value)}
              placeholder="可选：目标云盘根目录或相对路径"
              className="font-medium"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-3">
            <Label htmlFor="move-name" className="text-sm font-bold">
              {t('Move Target Name')}
            </Label>
            <Input
              id="move-name"
              value={targetName}
              onChange={e => setTargetName(e.target.value)}
              placeholder={targetItem?.Name || ''}
              className="font-medium"
              disabled={submitting}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <Folder className="size-3.5 shrink-0" />
            <span>{t('Move Overwrite Warning')}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="cursor-pointer">
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit({ remote: targetRemote, path: targetPath, newName: targetName })}
            disabled={submitting || !canSubmit}
            className="cursor-pointer font-bold">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('Move')}…
              </>
            ) : (
              t('Move')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
