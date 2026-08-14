import { Loader2, Pencil } from 'lucide-react';
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
import { type RcloneFileItem } from '@/pages/explorer/services';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetItem: RcloneFileItem | null;
  submitting: boolean;
  onSubmit: (newName: string) => void;
}

export default function RenameDialog({ open, onOpenChange, targetItem, submitting, onSubmit }: RenameDialogProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open) {
      setNewName(targetItem?.Name || '');
    }
  }, [open, targetItem]);

  const trimmed = newName.trim();
  const invalid = trimmed === '' || trimmed.includes('/') || trimmed.includes('\\');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold">
            <Pencil className="text-primary size-5" />
            {t('Rename')}
          </DialogTitle>
          <DialogDescription>修改文件/目录名称。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/40 border-border/40 text-muted-foreground space-y-1 rounded-lg border p-3 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span>当前路径:</span>
              <span className="text-foreground max-w-[280px] truncate font-bold">{targetItem?.Path || '/'}</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rename-input" className="text-sm font-bold">
              {t('New Name')}
            </Label>
            <Input
              id="rename-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={targetItem?.Name || ''}
              disabled={submitting}
              className="font-semibold"
            />
            {invalid && trimmed !== '' && (
              <p className="text-[11px] font-semibold text-red-500/90">{t('Name Invalid')}</p>
            )}
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
            onClick={() => onSubmit(trimmed)}
            disabled={submitting || invalid}
            className="cursor-pointer font-bold">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('Rename')}…
              </>
            ) : (
              t('Confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
