import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Copy,
  File,
  Folder,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { type RcloneConfig, getAllConfigs } from '@/pages/config/services';
import {
  type RcloneFileItem,
  copyJob,
  deleteFile,
  listDirectory,
  makeDirectory,
  purgeDirectory,
} from './services';

export default function Explorer() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // Remotes
  const [remotes, setRemotes] = useState<RcloneConfig[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string>('');

  // Navigation & Files
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<RcloneFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Dialogs
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyTargetItem, setCopyTargetItem] = useState<RcloneFileItem | null>(
    null,
  );
  const [targetRemote, setTargetRemote] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [copying, setCopying] = useState(false);

  // Initialize selected remote from URL search params
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const data = await getAllConfigs();
        setRemotes(data);

        // If searchParam passes a remote, select it
        const urlRemote = searchParams.get('search');
        if (urlRemote && data.some((c) => c.name === urlRemote)) {
          setSelectedRemote(urlRemote);
        } else if (data.length > 0) {
          setSelectedRemote(data[0].name);
        }
      } catch (err) {
        toast.error('获取存储源配置失败');
      }
    };
    fetchConfigs();
  }, [searchParams]);

  // Load directories
  const loadFiles = useCallback(async (remoteName: string, path: string) => {
    if (!remoteName) return;
    setLoading(true);
    try {
      const list = await listDirectory(remoteName, path);
      setFiles(list);
    } catch (err) {
      toast.error('加载文件列表失败，请检查 RC 服务连接或配置');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRemote) {
      loadFiles(selectedRemote, currentPath);
    }
  }, [selectedRemote, currentPath, loadFiles]);

  const handleRefresh = () => {
    loadFiles(selectedRemote, currentPath);
  };

  // Directory traversal
  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  // Breadcrumbs list
  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const list: Array<{ name: string; path: string }> = [
      { name: t('Root Directory'), path: '' },
    ];

    let tempPath = '';
    for (const part of parts) {
      tempPath = tempPath ? `${tempPath}/${part}` : part;
      list.push({ name: part, path: tempPath });
    }
    return list;
  };

  // Make new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const dirPath = currentPath
        ? `${currentPath}/${newFolderName}`
        : newFolderName;
      await makeDirectory(selectedRemote, dirPath);
      toast.success('文件夹创建成功');
      setNewFolderName('');
      setIsNewFolderOpen(false);
      handleRefresh();
    } catch (err) {
      toast.error('创建文件夹失败');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (item: RcloneFileItem) => {
    const confirmMsg = item.IsDir
      ? t('Delete Folder Confirm Msg')
      : t('Delete File Confirm Msg');
    if (!window.confirm(confirmMsg)) return;

    try {
      if (item.IsDir) {
        await purgeDirectory(selectedRemote, item.Path);
      } else {
        await deleteFile(selectedRemote, item.Path);
      }
      toast.success('删除成功');
      handleRefresh();
    } catch (err) {
      toast.error('删除失败');
    }
  };

  // Trigger copy
  const handleOpenCopyDialog = (item: RcloneFileItem) => {
    setCopyTargetItem(item);
    // Default target selection
    const defaultTarget =
      remotes.find((r) => r.name !== selectedRemote)?.name || selectedRemote;
    setTargetRemote(defaultTarget);
    setTargetPath(currentPath);
    setIsCopyDialogOpen(true);
  };

  const handleConfirmCopy = async () => {
    if (!copyTargetItem || !targetRemote) return;
    setCopying(true);
    try {
      // Build destination path
      const targetSubPath = targetPath
        ? `${targetPath}/${copyTargetItem.Name}`
        : copyTargetItem.Name;
      await copyJob(
        selectedRemote,
        copyTargetItem.Path,
        targetRemote,
        targetSubPath,
      );
      toast.success('后台复制任务已启动！可在“任务监控”中查看进度');
      setIsCopyDialogOpen(false);

      // Dispatch configurations updated event to notify sidebar about potential stats/active counters
      window.dispatchEvent(new Event('rclone-configs-updated'));
    } catch (err) {
      toast.error('启动复制任务失败，请检查路径');
    } finally {
      setCopying(false);
    }
  };

  // Helper to format bytes to human readable sizes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  // Format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('Explorer')}
          </h1>
          <p className="text-sm text-muted-foreground">
            浏览您的云端存储，管理文件与触发数据同步任务。
          </p>
        </div>

        {/* Remote selector dropdown */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Label
            htmlFor="remote-select"
            className="text-sm font-semibold shrink-0"
          >
            {t('Select Remote')}:
          </Label>
          <Select
            value={selectedRemote}
            onValueChange={(val) => {
              setSelectedRemote(val);
              setCurrentPath('');
            }}
          >
            <SelectTrigger className="w-[180px] font-medium">
              <SelectValue placeholder="选择存储源" />
            </SelectTrigger>
            <SelectContent>
              {remotes.map((remote) => (
                <SelectItem
                  key={remote.name}
                  value={remote.name}
                  className="font-semibold"
                >
                  {remote.name} ({remote.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Explorer Container */}
      <Card className="border border-border/50 shadow-md overflow-hidden">
        {/* Toolbar Header */}
        <CardHeader className="bg-muted/30 p-4 border-b border-border/40">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            {/* Breadcrumbs navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 font-medium text-sm no-scrollbar">
              {currentPath && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={navigateUp}
                  className="h-7 w-7 rounded-md"
                  title="返回上一级"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}

              {getBreadcrumbs().map((bc, idx, arr) => (
                <React.Fragment key={bc.path || 'root'}>
                  {idx > 0 && (
                    <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => navigateToFolder(bc.path)}
                    disabled={idx === arr.length - 1}
                    className={`hover:text-primary transition-colors cursor-pointer shrink-0 truncate max-w-[120px] ${
                      idx === arr.length - 1
                        ? 'font-bold text-foreground cursor-default'
                        : 'text-muted-foreground font-semibold'
                    }`}
                  >
                    {bc.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5">
              {/* View mode toggle */}
              <div className="flex items-center rounded-lg border border-border/50 bg-background p-0.5 shadow-sm">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="h-7 w-7 rounded-md"
                  title="列表视图"
                >
                  <List className="size-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="h-7 w-7 rounded-md"
                  title="网格视图"
                >
                  <LayoutGrid className="size-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-8 rounded-lg cursor-pointer"
                disabled={loading}
              >
                <RefreshCw
                  className={`size-3.5 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                {t('Refresh')}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsNewFolderOpen(true)}
                className="h-8 rounded-lg cursor-pointer"
                disabled={!selectedRemote || loading}
              >
                <Plus className="size-3.5 mr-2" />
                {t('New Folder')}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* File explorer content */}
        <CardContent className="p-0 min-h-[400px] flex flex-col justify-between">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <span className="text-sm font-semibold text-muted-foreground">
                正在加载云端文件列表...
              </span>
            </div>
          ) : !selectedRemote ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground gap-3">
              <AlertTriangle className="size-10 text-amber-500/80" />
              <span className="text-sm font-semibold">
                请先在右上角选择一个远程存储配置。
              </span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground/60 italic gap-2.5">
              <Folder className="size-12 opacity-40 text-muted-foreground" />
              <span className="text-sm font-semibold">该目录为空</span>
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20 font-semibold text-muted-foreground">
                    <th className="p-3.5 pl-6">{t('Configuration Name')}</th>
                    <th className="p-3.5">{t('Size')}</th>
                    <th className="p-3.5">{t('Type')}</th>
                    <th className="p-3.5">{t('Last Modified')}</th>
                    <th className="p-3.5 pr-6 text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {files.map((item) => (
                    <tr
                      key={item.Path}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="p-3 pl-6 font-semibold max-w-[280px] truncate">
                        {item.IsDir ? (
                          <button
                            type="button"
                            onClick={() => navigateToFolder(item.Path)}
                            className="flex items-center text-primary font-bold hover:underline text-left cursor-pointer"
                          >
                            <Folder className="size-4.5 mr-2.5 fill-primary/10 text-primary shrink-0" />
                            {item.Name}
                          </button>
                        ) : (
                          <div className="flex items-center text-foreground font-semibold">
                            <File className="size-4.5 mr-2.5 text-muted-foreground shrink-0" />
                            {item.Name}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">
                        {item.IsDir ? '-' : formatBytes(item.Size)}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs font-semibold">
                        {item.IsDir ? 'Directory' : item.MimeType || 'Unknown'}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {formatDate(item.ModTime)}
                      </td>
                      <td className="p-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="备份同步至其他存储"
                            onClick={() => handleOpenCopyDialog(item)}
                            className="h-8 w-8 rounded-lg cursor-pointer text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('Delete')}
                            onClick={() => handleDeleteItem(item)}
                            className="h-8 w-8 rounded-lg cursor-pointer text-muted-foreground hover:text-red-600 hover:bg-red-50/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {files.map((item) => (
                <div
                  key={item.Path}
                  className="group relative flex flex-col justify-between p-4 rounded-xl border border-border/40 hover:border-primary/40 hover:shadow-md hover:bg-muted/20 transition-all duration-300 min-h-[140px] text-center"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-0.5 bg-background/95 border border-border/40 rounded-lg p-0.5 shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenCopyDialog(item)}
                      className="h-7 w-7 rounded-md cursor-pointer text-muted-foreground hover:text-primary"
                    >
                      <Copy className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item)}
                      className="h-7 w-7 rounded-md cursor-pointer text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center gap-2.5">
                    {item.IsDir ? (
                      <button
                        type="button"
                        onClick={() => navigateToFolder(item.Path)}
                        className="flex flex-col items-center gap-2 hover:opacity-85 cursor-pointer text-primary"
                      >
                        <Folder className="size-11 fill-primary/10 text-primary transition-transform duration-300 group-hover:scale-105" />
                        <span className="text-xs font-bold truncate max-w-[130px]">
                          {item.Name}
                        </span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <File className="size-11 text-muted-foreground/80 transition-transform duration-300 group-hover:scale-105" />
                        <span className="text-xs font-bold text-foreground truncate max-w-[130px]">
                          {item.Name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-muted-foreground/80 font-mono mt-2 pt-2 border-t border-border/10">
                    {item.IsDir ? 'Directory' : formatBytes(item.Size)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Make Folder Dialog */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-bold">{t('New Folder')}</DialogTitle>
            <DialogDescription>
              在当前目录下创建一个新的文件夹。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name" className="font-semibold text-sm">
                {t('Folder Name')}
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t('Folder Name Placeholder')}
                disabled={creatingFolder}
                className="col-span-3 font-semibold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewFolderOpen(false)}
              disabled={creatingFolder}
              className="cursor-pointer"
            >
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateFolder}
              disabled={creatingFolder || !newFolderName.trim()}
              className="cursor-pointer font-semibold"
            >
              {creatingFolder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在创建
                </>
              ) : (
                t('Confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy / Sync Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Copy className="size-5 text-primary" />
              {t('Transfer Setup')}
            </DialogTitle>
            <DialogDescription>
              选择目标存储云盘与路径，在后台开启文件的复制备份任务。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1 bg-muted/40 p-3 rounded-lg border border-border/40 font-mono text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>源盘:</span>
                <span className="font-bold text-foreground">
                  {selectedRemote}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>源路径:</span>
                <span className="font-bold text-foreground truncate max-w-[280px]">
                  {copyTargetItem?.Path || '/'}
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="target-remote" className="font-bold text-sm">
                {t('Destination Remote')}
              </Label>
              <Select value={targetRemote} onValueChange={setTargetRemote}>
                <SelectTrigger
                  id="target-remote"
                  className="w-full font-semibold"
                >
                  <SelectValue placeholder="选择目标存储" />
                </SelectTrigger>
                <SelectContent>
                  {remotes.map((remote) => (
                    <SelectItem
                      key={remote.name}
                      value={remote.name}
                      className="font-semibold"
                    >
                      {remote.name} ({remote.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="target-path" className="font-bold text-sm">
                {t('Destination Path')}
              </Label>
              <Input
                id="target-path"
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                placeholder="可选：目标云盘根目录或相对路径"
                disabled={copying}
                className="font-medium"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCopyDialogOpen(false)}
              disabled={copying}
              className="cursor-pointer"
            >
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCopy}
              disabled={copying || !targetRemote}
              className="cursor-pointer font-bold bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {copying ? (
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
