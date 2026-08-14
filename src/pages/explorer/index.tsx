import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Copy,
  Download,
  File,
  Folder,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  MoveRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useSelection } from '@/hooks/use-selection';
import { useUploadQueue } from '@/hooks/use-upload-queue';
import { type RcloneConfig, getAllConfigs } from '@/pages/config/services';
import { downloadFileBlob, downloadItemsAsZip, triggerBrowserDownload } from '@/shared/utils/transfer';
import BatchActionBar from './components/BatchActionBar';
import MoveDialog, { type MoveTarget } from './components/MoveDialog';
import RenameDialog from './components/RenameDialog';
import SizeDialog from './components/SizeDialog';
import UploadQueueSheet from './components/UploadQueueSheet';
import {
  type RcloneFileItem,
  copyFileItem,
  deleteFile,
  getDirectorySize,
  getPublicLink,
  listDirectory,
  makeDirectory,
  moveItem,
  purgeDirectory,
  renameItem,
  searchFiles,
  type SizeInfo,
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
  const [targetRemote, setTargetRemote] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [copying, setCopying] = useState(false);

  // Delete Dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState<RcloneFileItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload Queue
  const uploadQueue = useUploadQueue();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Multi-select
  const selection = useSelection();

  // Search mode
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<RcloneFileItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFallback, setSearchFallback] = useState(false);
  const searchTimerRef = useRef<number | null>(null);

  // Move / Rename / Size dialogs
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveTargetItem, setMoveTargetItem] = useState<RcloneFileItem | null>(null);
  const [moving, setMoving] = useState(false);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTargetItem, setRenameTargetItem] = useState<RcloneFileItem | null>(null);
  const [renaming, setRenaming] = useState(false);

  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [sizeTargetPath, setSizeTargetPath] = useState('');
  const [sizeLoading, setSizeLoading] = useState(false);
  const [sizeInfo, setSizeInfo] = useState<SizeInfo | null>(null);

  // Batch delete confirmation
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Drag & drop upload overlay
  const [dragOver, setDragOver] = useState(false);

  // Batch copy mode flag + hidden file input
  const [isBatchCopy, setIsBatchCopy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected remote from URL search params
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const data = await getAllConfigs();
        setRemotes(data);

        // If searchParam passes a remote parameter (e.g. ?remote=S3 or ?search=S3), select it
        const urlRemote = searchParams.get('remote') || searchParams.get('search');
        if (urlRemote && data.some(c => c.name === urlRemote)) {
          setSelectedRemote(urlRemote);
          setCurrentPath('');
        } else if (data.length > 0 && !selectedRemote) {
          setSelectedRemote(data[0].name);
        }
      } catch {
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
    selection.clear();
    exitSearch();
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
    const list: Array<{ name: string; path: string }> = [{ name: t('Root Directory'), path: '' }];

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
      const dirPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
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

  // Open Delete confirmation dialog
  const handleOpenDeleteDialog = (item: RcloneFileItem) => {
    setDeleteTargetItem(item);
    setIsDeleteDialogOpen(true);
  };

  // Confirm Delete execution
  const handleConfirmDelete = async () => {
    if (!deleteTargetItem) return;
    setDeleting(true);
    try {
      if (deleteTargetItem.IsDir) {
        await purgeDirectory(selectedRemote, deleteTargetItem.Path);
      } else {
        await deleteFile(selectedRemote, deleteTargetItem.Path);
      }
      toast.success('删除成功');
      setIsDeleteDialogOpen(false);
      handleRefresh();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmCopy = async () => {
    if (!targetRemote) return;
    if (!isBatchCopy || selection.count === 0) {
      toast.error('请先选择要复制的文件');
      return;
    }
    setCopying(true);
    try {
      // 批量复制：逐项同步 copyfile
      let success = 0;
      let failed = 0;
      for (const path of Array.from(selection.selected)) {
        const item = files.find(f => f.Path === path);
        const name = item?.Name ?? path.split('/').pop() ?? path;
        const dstPath = targetPath ? `${targetPath}/${name}` : name;
        try {
          await copyFileItem(selectedRemote, path, targetRemote, dstPath);
          success += 1;
        } catch {
          failed += 1;
        }
      }
      toast.success(t('Batch Done', { success, failed }));
      selection.clear();
      setIsCopyDialogOpen(false);
      setIsBatchCopy(false);

      // Dispatch configurations updated event to notify sidebar about potential stats/active counters
      window.dispatchEvent(new Event('rclone-configs-updated'));
      handleRefresh();
    } catch {
      toast.error('启动复制任务失败，请检查路径');
    } finally {
      setCopying(false);
    }
  };

  // Public link share
  const handleGetPublicLink = async (item: RcloneFileItem) => {
    try {
      const url = await getPublicLink(selectedRemote, item.Path);
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success(`${t('publicLinkSuccess')}: ${url}`);
      } else {
        toast.info('未能获取到公开外链');
      }
    } catch {
      toast.error('生成公开链接失败，当前存储 Backend 可能不支持公开外链');
    }
  };

  // ===== Upload =====
  const handleFilesSelected = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0 || !selectedRemote) return;
    const base = currentPath ? `${currentPath}/` : '';
    uploadQueue.addFiles(files, selectedRemote, base);
    setIsUploadOpen(true);
    setDragOver(false);
  };

  // ===== Download =====
  const handleDownloadFile = async (item: RcloneFileItem) => {
    if (item.IsDir) {
      await handleDownloadFolder(item);
      return;
    }
    try {
      const blob = await downloadFileBlob(selectedRemote, item.Path);
      triggerBrowserDownload(blob, item.Name);
      toast.success(t('Download'));
    } catch {
      toast.error(t('Download Failed'));
    }
  };

  const handleDownloadFolder = async (item: RcloneFileItem) => {
    const toastId = toast.loading(t('Packaging Progress', { done: 0, total: 0 }));
    try {
      const blob = await downloadItemsAsZip(
        selectedRemote,
        [{ path: item.Path, name: item.Name, size: item.Size, isDir: true }],
        (done, total) => {
          toast.loading(t('Packaging Progress', { done, total }), { id: toastId });
        },
      );
      if (blob.size === 0) {
        toast.info(t('Empty Folder No Download'), { id: toastId });
        return;
      }
      triggerBrowserDownload(blob, `${item.Name}.zip`);
      toast.success(t('Package Done'), { id: toastId });
    } catch {
      toast.error(t('Download Failed'), { id: toastId });
    }
  };

  // ===== Move =====
  const handleOpenMove = (item: RcloneFileItem) => {
    setMoveTargetItem(item);
    setIsMoveOpen(true);
  };

  const handleConfirmMove = async (target: MoveTarget) => {
    if (!moveTargetItem) return;
    setMoving(true);
    try {
      const dstRemote = target.path ? `${target.path}/${target.newName}` : target.newName;
      await moveItem(selectedRemote, moveTargetItem.Path, target.remote, dstRemote);
      toast.success(t('Move Success'));
      setIsMoveOpen(false);
      if (target.remote === selectedRemote) {
        handleRefresh();
      }
    } catch {
      toast.error(t('Move Failed'));
    } finally {
      setMoving(false);
    }
  };

  // ===== Rename =====
  const handleOpenRename = (item: RcloneFileItem) => {
    setRenameTargetItem(item);
    setIsRenameOpen(true);
  };

  const handleConfirmRename = async (newName: string) => {
    if (!renameTargetItem) return;
    setRenaming(true);
    try {
      await renameItem(selectedRemote, renameTargetItem.Path, newName);
      toast.success(t('Rename Success'));
      setIsRenameOpen(false);
      handleRefresh();
    } catch {
      toast.error(t('Rename Failed'));
    } finally {
      setRenaming(false);
    }
  };

  // ===== Directory Stats =====
  const handleOpenSize = async (item: RcloneFileItem) => {
    setSizeTargetPath(item.Path);
    setSizeInfo(null);
    setSizeLoading(true);
    setIsSizeOpen(true);
    try {
      const info = await getDirectorySize(selectedRemote, item.Path);
      setSizeInfo(info);
    } catch {
      toast.error('获取目录统计失败');
    } finally {
      setSizeLoading(false);
    }
  };

  // ===== Batch operations =====
  const handleOpenBatchDelete = () => {
    setIsBatchDeleteOpen(true);
  };

  const handleConfirmBatchDelete = async () => {
    const paths = Array.from(selection.selected);
    if (paths.length === 0) return;
    setBatchDeleting(true);
    let success = 0;
    let failed = 0;
    for (const path of paths) {
      const item = files.find(f => f.Path === path);
      try {
        if (item?.IsDir) {
          await purgeDirectory(selectedRemote, path);
        } else {
          await deleteFile(selectedRemote, path);
        }
        success += 1;
      } catch {
        failed += 1;
      }
    }
    toast.success(t('Batch Done', { success, failed }));
    setIsBatchDeleteOpen(false);
    selection.clear();
    handleRefresh();
    setBatchDeleting(false);
  };

  const handleBatchCopy = () => {
    if (selection.count === 0) return;
    setIsBatchCopy(true);
    const defaultTarget = remotes.find(r => r.name !== selectedRemote)?.name || selectedRemote;
    setTargetRemote(defaultTarget);
    setTargetPath(currentPath);
    setIsCopyDialogOpen(true);
  };

  const handleBatchDownload = async () => {
    const paths = Array.from(selection.selected);
    if (paths.length === 0) return;
    const items = paths.map(path => {
      const f = files.find(x => x.Path === path);
      return { path, name: f?.Name ?? path, size: f?.Size ?? 0, isDir: f?.IsDir ?? false };
    });
    const toastId = toast.loading(t('Packaging Progress', { done: 0, total: 0 }));
    try {
      const blob = await downloadItemsAsZip(selectedRemote, items, (done, total) => {
        toast.loading(t('Packaging Progress', { done, total }), { id: toastId });
      });
      if (blob.size === 0) {
        toast.info(t('Empty Folder No Download'), { id: toastId });
        return;
      }
      triggerBrowserDownload(blob, `${selectedRemote}-download.zip`);
      toast.success(t('Package Done'), { id: toastId });
      selection.clear();
    } catch {
      toast.error(t('Download Failed'), { id: toastId });
    }
  };

  // ===== Search =====
  const runSearch = async (keyword: string) => {
    if (!selectedRemote) return;
    const kw = keyword.trim();
    if (kw.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const { results, fallback } = await searchFiles(selectedRemote, kw, currentPath);
      setSearchResults(results);
      setSearchFallback(fallback);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchKeyword(value);
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      void runSearch(value);
    }, 400);
  };

  const exitSearch = () => {
    setSearchKeyword('');
    setSearchResults([]);
    setSearching(false);
    setSearchFallback(false);
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  };

  // 搜索结果定位：目录直接进入；文件进入所在目录
  const handleSearchResultClick = (item: RcloneFileItem) => {
    if (item.IsDir) {
      setCurrentPath(item.Path);
    } else {
      const parent = item.Path.includes('/') ? item.Path.slice(0, item.Path.lastIndexOf('/')) : '';
      setCurrentPath(parent);
    }
    exitSearch();
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
    <div className="animate-fade-in space-y-4 pb-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">{t('Explorer')}</h1>
          <p className="text-muted-foreground text-sm">浏览您的云端存储，管理文件与触发数据同步任务。</p>
        </div>

        {/* Remote selector dropdown */}
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Label htmlFor="remote-select" className="shrink-0 text-sm font-semibold">
            {t('Select Remote')}:
          </Label>
          <Select
            value={selectedRemote}
            onValueChange={val => {
              setSelectedRemote(val);
              setCurrentPath('');
              selection.clear();
              exitSearch();
            }}>
            <SelectTrigger className="w-[180px] font-medium">
              <SelectValue placeholder="选择存储源" />
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
      </div>

      {/* Explorer Container */}
      <Card className="border-border/50 overflow-hidden border shadow-md">
        {/* Toolbar Header */}
        <CardHeader className="bg-muted/30 border-border/40 border-b p-4">
          <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
            {/* Breadcrumbs navigation */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1 text-sm font-medium">
              {currentPath && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={navigateUp}
                  className="h-7 w-7 rounded-md"
                  title="返回上一级">
                  <ArrowLeft className="size-4" />
                </Button>
              )}

              {getBreadcrumbs().map((bc, idx, arr) => (
                <React.Fragment key={bc.path || 'root'}>
                  {idx > 0 && <ChevronRight className="text-muted-foreground/60 size-3.5 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => navigateToFolder(bc.path)}
                    disabled={idx === arr.length - 1}
                    className={`hover:text-primary max-w-[120px] shrink-0 cursor-pointer truncate transition-colors ${
                      idx === arr.length - 1
                        ? 'text-foreground cursor-default font-bold'
                        : 'text-muted-foreground font-semibold'
                    }`}>
                    {bc.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5">
              {/* Search input */}
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  value={searchKeyword}
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder={t('Search Placeholder')}
                  className="h-8 w-44 pr-7 pl-8 text-xs sm:w-56"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={exitSearch}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
                    aria-label={t('Clear') ?? 'clear'}>
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Upload button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedRemote || loading}
                className="h-8 cursor-pointer rounded-lg">
                <Upload className="mr-2 size-3.5" />
                {t('Upload')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files) {
                    handleFilesSelected(e.target.files);
                    e.target.value = '';
                  }
                }}
              />

              {/* View mode toggle */}
              <div className="border-border/50 bg-background flex items-center rounded-lg border p-0.5 shadow-sm">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="h-7 w-7 rounded-md"
                  title="列表视图">
                  <List className="size-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="h-7 w-7 rounded-md"
                  title="网格视图">
                  <LayoutGrid className="size-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-8 cursor-pointer rounded-lg"
                disabled={loading}>
                <RefreshCw className={`mr-2 size-3.5 ${loading ? 'animate-spin' : ''}`} />
                {t('Refresh')}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsNewFolderOpen(true)}
                className="h-8 cursor-pointer rounded-lg"
                disabled={!selectedRemote || loading}>
                <Plus className="mr-2 size-3.5" />
                {t('New Folder')}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* File explorer content */}
        <CardContent
          className="relative flex min-h-[400px] flex-col justify-between p-0"
          onDragOver={e => {
            if (!selectedRemote) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            if (!selectedRemote) return;
            e.preventDefault();
            handleFilesSelected(e.dataTransfer.files);
          }}>
          {dragOver && (
            <div className="bg-primary/10 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
              <Upload className="text-primary size-12" />
              <span className="text-primary text-lg font-bold">{t('Drag Upload Active')}</span>
            </div>
          )}
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="text-primary size-8 animate-spin" />
              <span className="text-muted-foreground text-sm font-semibold">正在加载云端文件列表...</span>
            </div>
          ) : !selectedRemote ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 py-20">
              <AlertTriangle className="size-10 text-amber-500/80" />
              <span className="text-sm font-semibold">请先在右上角选择一个远程存储配置。</span>
            </div>
          ) : searchKeyword.trim() ? (
            /* Search Results View */
            <div className="flex flex-1 flex-col">
              <div className="bg-muted/20 text-muted-foreground flex flex-wrap items-center gap-2 border-b px-6 py-2.5 text-xs font-semibold">
                <Search className="size-3.5" />
                {searching
                  ? t('Search') + '…'
                  : t('Search Summary', { keyword: searchKeyword.trim(), count: searchResults.length })}
                {searchFallback && !searching && <span className="text-amber-500">⚠ {t('Local Filter Fallback')}</span>}
              </div>

              {searching ? (
                <div className="flex flex-1 items-center justify-center gap-3 py-20">
                  <Loader2 className="text-primary size-7 animate-spin" />
                  <span className="text-muted-foreground text-sm font-semibold">{t('Search')}…</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2.5 py-20">
                  <Search className="size-10 opacity-40" />
                  <span className="text-sm font-semibold">{t('Search Empty')}</span>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-border/40 bg-muted/20 text-muted-foreground border-b font-semibold">
                        <th className="p-3 pl-6">{t('Name')}</th>
                        <th className="p-3">{t('Size')}</th>
                        <th className="p-3">{t('Type')}</th>
                        <th className="p-3 pr-6 text-right">{t('Last Modified')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/20 divide-y">
                      {searchResults.map(item => (
                        <tr
                          key={item.Path}
                          onClick={() => handleSearchResultClick(item)}
                          className="hover:bg-muted/30 group cursor-pointer transition-colors">
                          <td className="max-w-[320px] truncate p-3 pl-6 font-semibold">
                            <div className="text-foreground flex items-center">
                              {item.IsDir ? (
                                <Folder className="fill-primary/10 text-primary mr-2.5 size-4.5 shrink-0" />
                              ) : (
                                <File className="text-muted-foreground mr-2.5 size-4.5 shrink-0" />
                              )}
                              <span className="truncate">{item.Name}</span>
                            </div>
                            <p className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]">{item.Path}</p>
                          </td>
                          <td className="text-muted-foreground p-3 font-mono text-xs">
                            {item.IsDir ? '-' : formatBytes(item.Size)}
                          </td>
                          <td className="text-muted-foreground p-3 text-xs font-semibold">
                            {item.IsDir ? 'Directory' : item.MimeType || 'Unknown'}
                          </td>
                          <td className="text-muted-foreground p-3 pr-6 text-right text-xs">
                            {formatDate(item.ModTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : files.length === 0 ? (
            <div className="text-muted-foreground/60 flex flex-1 flex-col items-center justify-center gap-2.5 py-20 italic">
              <Folder className="text-muted-foreground size-12 opacity-40" />
              <span className="text-sm font-semibold">该目录为空</span>
              <span className="text-xs">💡 {t('Drag Upload Hint')}</span>
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border/40 bg-muted/20 text-muted-foreground border-b font-semibold">
                    <th className="w-10 p-3.5 pl-6">
                      <Checkbox
                        checked={
                          selection.isAllSelected(files.map(f => f.Path))
                            ? true
                            : selection.isIndeterminate(files.map(f => f.Path))
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={checked =>
                          selection.toggleAll(
                            files.map(f => f.Path),
                            checked === true,
                          )
                        }
                        aria-label="select all"
                      />
                    </th>
                    <th className="p-3.5">{t('Name')}</th>
                    <th className="p-3.5">{t('Size')}</th>
                    <th className="p-3.5">{t('Type')}</th>
                    <th className="p-3.5">{t('Last Modified')}</th>
                    <th className="p-3.5 pr-6 text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-border/20 divide-y">
                  {files.map(item => (
                    <tr
                      key={item.Path}
                      className={`hover:bg-muted/30 group transition-colors ${selection.isSelected(item.Path) ? 'bg-primary/5' : ''}`}>
                      <td className="w-10 p-3 pl-6">
                        <Checkbox
                          checked={selection.isSelected(item.Path)}
                          onCheckedChange={() => selection.toggle(item.Path)}
                          aria-label={`select ${item.Name}`}
                        />
                      </td>
                      <td className="max-w-[280px] truncate p-3 font-semibold">
                        {item.IsDir ? (
                          <button
                            type="button"
                            onClick={() => navigateToFolder(item.Path)}
                            className="text-primary flex cursor-pointer items-center text-left font-bold hover:underline">
                            <Folder className="fill-primary/10 text-primary mr-2.5 size-4.5 shrink-0" />
                            {item.Name}
                          </button>
                        ) : (
                          <div className="text-foreground flex items-center font-semibold">
                            <File className="text-muted-foreground mr-2.5 size-4.5 shrink-0" />
                            {item.Name}
                          </div>
                        )}
                      </td>
                      <td className="text-muted-foreground p-3 font-mono text-xs">
                        {item.IsDir ? '-' : formatBytes(item.Size)}
                      </td>
                      <td className="text-muted-foreground p-3 text-xs font-semibold">
                        {item.IsDir ? 'Directory' : item.MimeType || 'Unknown'}
                      </td>
                      <td className="text-muted-foreground p-3 text-xs">{formatDate(item.ModTime)}</td>
                      <td className="p-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('Download')}
                            onClick={() => void handleDownloadFile(item)}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 cursor-pointer rounded-lg">
                            <Download className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('getPublicLink')}
                            onClick={() => handleGetPublicLink(item)}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 cursor-pointer rounded-lg">
                            <Link2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('Move')}
                            onClick={() => handleOpenMove(item)}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 cursor-pointer rounded-lg">
                            <MoveRight className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('Rename')}
                            onClick={() => handleOpenRename(item)}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 cursor-pointer rounded-lg">
                            <Pencil className="size-3.5" />
                          </Button>
                          {item.IsDir && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('Statistic')}
                              onClick={() => void handleOpenSize(item)}
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 cursor-pointer rounded-lg">
                              <BarChart3 className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('Delete')}
                            onClick={() => handleOpenDeleteDialog(item)}
                            className="text-muted-foreground h-8 w-8 cursor-pointer rounded-lg hover:bg-red-50/10 hover:text-red-600">
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
            <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {files.map(item => (
                <div
                  key={item.Path}
                  className={`group border-border/40 hover:border-primary/40 hover:bg-muted/20 relative flex min-h-[140px] flex-col justify-between rounded-xl border p-4 text-center transition-all duration-300 hover:shadow-md ${
                    selection.isSelected(item.Path) ? 'border-primary/60 bg-primary/5' : ''
                  }`}>
                  {/* Selection checkbox */}
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selection.isSelected(item.Path)}
                      onCheckedChange={() => selection.toggle(item.Path)}
                      aria-label={`select ${item.Name}`}
                      className="opacity-60 hover:opacity-100"
                    />
                  </div>
                  <div className="bg-background/95 border-border/40 absolute top-2 right-2 flex items-center gap-0.5 rounded-lg border p-0.5 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('Download')}
                      onClick={() => void handleDownloadFile(item)}
                      className="text-muted-foreground hover:text-primary h-7 w-7 cursor-pointer rounded-md">
                      <Download className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('getPublicLink')}
                      onClick={() => handleGetPublicLink(item)}
                      className="text-muted-foreground hover:text-primary h-7 w-7 cursor-pointer rounded-md">
                      <Link2 className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('Move')}
                      onClick={() => handleOpenMove(item)}
                      className="text-muted-foreground hover:text-primary h-7 w-7 cursor-pointer rounded-md">
                      <MoveRight className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('Delete')}
                      onClick={() => handleOpenDeleteDialog(item)}
                      className="text-muted-foreground h-7 w-7 cursor-pointer rounded-md hover:text-red-600">
                      <Trash2 className="size-3" />
                    </Button>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center gap-2.5">
                    {item.IsDir ? (
                      <button
                        type="button"
                        onClick={() => navigateToFolder(item.Path)}
                        className="text-primary flex cursor-pointer flex-col items-center gap-2 hover:opacity-85">
                        <Folder className="fill-primary/10 text-primary size-11 transition-transform duration-300 group-hover:scale-105" />
                        <span className="max-w-[130px] truncate text-xs font-bold">{item.Name}</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <File className="text-muted-foreground/80 size-11 transition-transform duration-300 group-hover:scale-105" />
                        <span className="text-foreground max-w-[130px] truncate text-xs font-bold">{item.Name}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-muted-foreground/80 border-border/10 mt-2 border-t pt-2 font-mono text-[10px]">
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
            <DialogDescription>在当前目录下创建一个新的文件夹。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name" className="text-sm font-semibold">
                {t('Folder Name')}
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
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
              className="cursor-pointer">
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateFolder}
              disabled={creatingFolder || !newFolderName.trim()}
              className="cursor-pointer font-semibold">
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
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Copy className="text-primary size-5" />
              {isBatchCopy ? t('Batch Copy') : t('Transfer Setup')}
            </DialogTitle>
            <DialogDescription>
              {isBatchCopy
                ? t('Selected Count', { count: selection.count })
                : '选择目标存储云盘与路径，在后台开启文件的复制备份任务。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/40 border-border/40 text-muted-foreground space-y-1 rounded-lg border p-3 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span>源盘:</span>
                <span className="text-foreground font-bold">{selectedRemote}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>源路径:</span>
                <span className="text-foreground max-w-[280px] truncate font-bold">
                  {isBatchCopy ? t('Selected Count', { count: selection.count }) : currentPath || '/'}
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="target-remote" className="text-sm font-bold">
                {t('Destination Remote')}
              </Label>
              <Select value={targetRemote} onValueChange={setTargetRemote}>
                <SelectTrigger id="target-remote" className="w-full font-semibold">
                  <SelectValue placeholder="选择目标存储" />
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
              <Label htmlFor="target-path" className="text-sm font-bold">
                {t('Destination Path')}
              </Label>
              <Input
                id="target-path"
                value={targetPath}
                onChange={e => setTargetPath(e.target.value)}
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
              className="cursor-pointer">
              {t('Cancel')}
            </Button>

            <Button
              type="button"
              onClick={handleConfirmCopy}
              disabled={copying || !targetRemote}
              className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer font-bold">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          onOpenAutoFocus={e => e.preventDefault()}
          className="border-border/60 bg-background/95 rounded-2xl p-6 shadow-2xl backdrop-blur-xl transition-all sm:max-w-[440px]">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 text-destructive border-destructive/20 flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-inner">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-foreground text-lg font-extrabold tracking-tight">
                  {t('Delete Confirm Title')}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-0.5 text-xs font-medium">
                  {deleteTargetItem?.IsDir ? t('Delete Folder Confirm Msg') : t('Delete File Confirm Msg')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deleteTargetItem && (
            <div className="space-y-3 py-2">
              {/* Target File / Folder Detail Card */}
              <div className="border-border/50 bg-muted/30 hover:border-destructive/30 flex items-center gap-3.5 rounded-xl border p-3.5 transition-colors">
                <div className="bg-background border-border/40 flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm">
                  {deleteTargetItem.IsDir ? (
                    <Folder className="fill-primary/10 text-primary size-5" />
                  ) : (
                    <File className="text-muted-foreground size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-foreground truncate text-xs leading-none font-bold">{deleteTargetItem.Name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/70 text-[10px] font-medium">路径:</span>
                    <code className="bg-background/80 border-border/40 text-muted-foreground max-w-[240px] truncate rounded border px-1.5 py-0.5 font-mono text-[10px]">
                      {deleteTargetItem.Path || '/'}
                    </code>
                  </div>
                </div>
              </div>

              {/* Warning Alert Note */}
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <span className="text-amber-500">⚠️</span>
                <span>{t('This action cannot be undone.')}</span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 flex items-center justify-end gap-2.5 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
              className="border-border/60 hover:bg-muted h-9 min-w-[76px] cursor-pointer rounded-lg px-4 text-xs font-semibold shadow-none outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 active:scale-[0.98]">
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 shadow-destructive/20 h-9 min-w-[76px] cursor-pointer rounded-lg px-4 text-xs font-bold text-white shadow-sm outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 active:scale-[0.98]">
              {deleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('config.deleting')}
                </>
              ) : (
                t('Delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Queue Sheet */}
      <UploadQueueSheet
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        tasks={uploadQueue.tasks}
        stats={uploadQueue.stats}
        onCancel={uploadQueue.cancel}
        onRetry={uploadQueue.retry}
        onClearFinished={uploadQueue.clearFinished}
      />

      {/* Move Dialog */}
      <MoveDialog
        open={isMoveOpen}
        onOpenChange={setIsMoveOpen}
        targetItem={moveTargetItem}
        currentRemote={selectedRemote}
        currentPath={currentPath}
        remotes={remotes}
        submitting={moving}
        onSubmit={target => {
          void handleConfirmMove(target);
        }}
      />

      {/* Rename Dialog */}
      <RenameDialog
        open={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        targetItem={renameTargetItem}
        submitting={renaming}
        onSubmit={name => {
          void handleConfirmRename(name);
        }}
      />

      {/* Size Dialog */}
      <SizeDialog
        open={isSizeOpen}
        onOpenChange={setIsSizeOpen}
        targetPath={sizeTargetPath}
        loading={sizeLoading}
        info={sizeInfo}
      />

      {/* Batch Delete Confirmation */}
      <Dialog open={isBatchDeleteOpen} onOpenChange={setIsBatchDeleteOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <AlertTriangle className="text-destructive size-5" />
              {t('Delete Batch Confirm Title')}
            </DialogTitle>
            <DialogDescription>{t('Delete Batch Confirm Msg', { count: selection.count })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBatchDeleteOpen(false)}
              disabled={batchDeleting}
              className="cursor-pointer">
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void handleConfirmBatchDelete();
              }}
              disabled={batchDeleting}
              className="cursor-pointer font-bold">
              {batchDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('config.deleting')}
                </>
              ) : (
                t('Delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch action bar */}
      {selection.count > 0 && (
        <BatchActionBar
          count={selection.count}
          onDelete={handleOpenBatchDelete}
          onCopy={handleBatchCopy}
          onDownload={() => {
            void handleBatchDownload();
          }}
          onClear={selection.clear}
        />
      )}
    </div>
  );
}
