import {
  Activity,
  CircleDot,
  Cloud,
  Database,
  FolderOpen,
  Gauge,
  Globe,
  Link2,
  Loader2,
  HardDrive as LocalDrive,
  LogOut,
  Moon,
  Search,
  Server,
  Settings,
  Sun,
  Terminal,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import logo from '@/assets/appIcon.png';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { useUser } from '@/hooks/use-user';
import { type RcloneConfig, getAllConfigs } from '@/pages/config/services';

export function AppSidebar() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearUser } = useUser();

  // States
  const [remotes, setRemotes] = useState<RcloneConfig[]>([]);
  const [loadingRemotes, setLoadingRemotes] = useState(false);
  const [remoteSearchQuery, setRemoteSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [simulatedSpeed, setSimulatedSpeed] = useState({
    down: '0 B/s',
    up: '0 B/s',
  });

  // Get Rclone RC server URL
  const rcloneRc = localStorage.getItem('rclone-rc') || 'http://127.0.0.1:5572';
  const cleanRcHost = rcloneRc.replace(/^https?:\/\//, '');

  useEffect(() => {
    setMounted(true);
    // Simulating minor network traffic changes to make UI feel alive
    const interval = setInterval(() => {
      const downVal = Math.random() > 0.7 ? `${(Math.random() * 200 + 10).toFixed(1)} KB/s` : '0 B/s';
      const upVal = Math.random() > 0.8 ? `${(Math.random() * 50 + 2).toFixed(1)} KB/s` : '0 B/s';
      setSimulatedSpeed({ down: downVal, up: upVal });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Fetch configs (remotes)
  const fetchConfigs = useCallback(async () => {
    try {
      setLoadingRemotes(true);
      const data = await getAllConfigs();
      setRemotes(data);
    } catch (err) {
      console.error('Failed to fetch configs in sidebar', err);
    } finally {
      setLoadingRemotes(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();

    // Listen to configs updated custom event
    const handleConfigsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<RcloneConfig[]>;
      if (customEvent.detail) {
        setRemotes(customEvent.detail);
      } else {
        fetchConfigs();
      }
    };

    window.addEventListener('rclone-configs-updated', handleConfigsUpdated);
    return () => {
      window.removeEventListener('rclone-configs-updated', handleConfigsUpdated);
    };
  }, [fetchConfigs]);

  const handleLogout = () => {
    clearUser();
    localStorage.removeItem('rclone-rc');
    localStorage.removeItem('rclone-token');
    toast.success(`${t('Logout')} ${t('Confirm')}`);
    navigate('/login');
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    i18n.changeLanguage(nextLang);
    toast.info(nextLang === 'zh-CN' ? '已切换为中文' : 'Language switched to English');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Helper to determine if link is active
  const isLinkActive = (url: string) => {
    return location.pathname === url;
  };

  // Check if a remote is active (based on URL query parameter)
  const isRemoteActive = (remoteName: string) => {
    return location.pathname === '/configs' && searchParams.get('search') === remoteName;
  };

  // Map remote types to Lucide icons
  const getRemoteIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'drive':
      case 'dropbox':
      case 'onedrive':
      case 'box':
      case 's3':
        return Cloud;
      case 'ftp':
      case 'sftp':
        return Server;
      case 'webdav':
      case 'http':
        return Globe;
      case 'local':
        return LocalDrive;
      default:
        return Database;
    }
  };

  // Filtered remotes based on sidebar search input
  const filteredRemotes = remotes.filter(remote => remote.name.toLowerCase().includes(remoteSearchQuery.toLowerCase()));

  const mainNavItems = [
    {
      title: t('Dashboard'),
      url: '/dashboard',
      icon: Gauge,
    },
    {
      title: t('Configs'),
      url: '/configs',
      icon: Settings,
    },
  ];

  const toolNavItems = [
    {
      title: t('Explorer'),
      url: '/explorer',
      icon: FolderOpen,
      badge: 'Beta',
    },
    {
      title: t('Tasks'),
      url: '/tasks',
      icon: Activity,
    },
    {
      title: t('Mounts'),
      url: '/mounts',
      icon: Link2,
    },
    {
      title: t('Logs'),
      url: '/logs',
      icon: Terminal,
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-border/40 bg-sidebar/95 border-r backdrop-blur-md transition-all duration-300">
      {/* Brand Header */}
      <SidebarHeader
        className={`border-border/40 flex items-center border-b p-4 ${
          state === 'collapsed' ? 'justify-center px-1.5' : 'flex-row justify-between gap-3'
        }`}>
        <div className={`flex items-center ${state === 'collapsed' ? 'justify-center' : 'gap-3'}`}>
          <div
            className={`from-primary/20 to-primary/10 border-primary/20 group/logo rounded-xl border bg-gradient-to-tr shadow-inner transition-all duration-300 hover:scale-105 ${
              state === 'collapsed' ? 'p-1' : 'p-1.5'
            }`}>
            <img
              src={logo}
              alt="logo"
              className={`rounded-[20%] object-contain transition-all duration-500 group-hover/logo:rotate-12 ${
                state === 'collapsed' ? 'h-6 w-6' : 'h-7 w-7'
              }`}
            />
          </div>
          {state === 'expanded' && (
            <div className="flex flex-col">
              <h2 className="from-primary bg-gradient-to-r to-teal-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
                RcloneX
              </h2>
              <span className="text-muted-foreground font-mono text-[10px] leading-none">v1.0.1</span>
            </div>
          )}
        </div>

        {state === 'expanded' && (
          <div className="animate-fade-in flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {t('Connected')}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="no-scrollbar space-y-3 px-2 py-3">
        {/* Navigation Section */}
        <div>
          {state === 'expanded' && (
            <p className="text-muted-foreground/70 mb-2 px-3 text-[10px] font-semibold tracking-widest uppercase">
              {t('General')}
            </p>
          )}
          <SidebarMenu className="space-y-1">
            {mainNavItems.map(item => {
              const active = isLinkActive(item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={state === 'collapsed' ? item.title : undefined}
                    className={`group/item relative overflow-hidden rounded-xl transition-all duration-200 ease-in-out ${
                      active
                        ? 'from-primary text-primary-foreground shadow-primary/20 scale-[1.01] bg-gradient-to-r to-blue-600 shadow-md'
                        : 'hover:bg-primary/10 hover:text-primary active:scale-[0.98]'
                    } ${state === 'collapsed' ? 'w-full justify-center p-3' : 'p-3'} `}>
                    <Link
                      to={item.url}
                      className={`flex w-full items-center transition-all duration-200 ${state === 'collapsed' ? 'justify-center' : 'gap-3'} `}>
                      {/* Premium vertical active indicator */}
                      {!active && (
                        <div className="bg-primary absolute top-1/2 left-[3px] h-4 w-[3px] -translate-y-1/2 rounded-full opacity-0 transition-all duration-200 group-hover/item:opacity-100" />
                      )}

                      <item.icon
                        className={`shrink-0 transition-all duration-200 ${state === 'collapsed' ? 'size-5' : 'size-4'} group-hover/item:scale-110`}
                      />
                      {state === 'expanded' && <span className="truncate text-sm font-semibold">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>

        <SidebarSeparator className="bg-border/40" />

        {/* Dynamic Cloud Remotes List */}
        <div>
          {state === 'expanded' && (
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="text-muted-foreground/70 text-[10px] font-semibold tracking-widest uppercase">
                {t('Remotes')}
              </p>
              {remotes.length > 0 && (
                <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                  {remotes.length}
                </span>
              )}
            </div>
          )}

          {/* Search box for remotes in Sidebar - only when expanded */}
          {state === 'expanded' && remotes.length > 3 && (
            <div className="mb-2 px-2">
              <div className="border-border/40 bg-muted/30 focus-within:border-primary/50 relative flex items-center rounded-lg border px-2.5 py-1 transition-colors duration-200">
                <Search className="text-muted-foreground size-3.5 shrink-0" />
                <input
                  type="text"
                  placeholder={t('Search remotes...')}
                  value={remoteSearchQuery}
                  onChange={e => setRemoteSearchQuery(e.target.value)}
                  className="text-foreground placeholder:text-muted-foreground/60 ml-2 w-full bg-transparent text-xs outline-none"
                />
              </div>
            </div>
          )}

          <SidebarMenu className="custom-scrollbar max-h-[220px] space-y-0.5 overflow-y-auto pr-0.5">
            {loadingRemotes ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-4">
                <Loader2 className="size-3.5 animate-spin" />
                {state === 'expanded' && <span className="text-xs">{t('Loading') || 'Loading...'}</span>}
              </div>
            ) : filteredRemotes.length === 0 ? (
              state === 'expanded' && (
                <p className="text-muted-foreground/60 py-4 text-center text-xs italic">
                  {remoteSearchQuery ? t('No configurations found') : t('No configurations found')}
                </p>
              )
            ) : (
              filteredRemotes.map(remote => {
                const RemoteIcon = getRemoteIcon(remote.type);
                const active = isRemoteActive(remote.name);
                return (
                  <SidebarMenuItem key={remote.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={state === 'collapsed' ? remote.name : undefined}
                      className={`group/item relative rounded-lg transition-all duration-200 ease-in-out ${
                        active
                          ? 'bg-primary/15 text-primary border-primary border-l-2 pl-2.5 font-medium'
                          : 'hover:bg-primary/5 hover:text-primary active:scale-[0.98]'
                      } ${state === 'collapsed' ? 'w-full justify-center p-3' : 'h-9 px-3 py-2'} `}>
                      <Link
                        to={`/configs?search=${encodeURIComponent(remote.name)}`}
                        className="flex w-full items-center">
                        <RemoteIcon
                          className={`shrink-0 transition-transform duration-200 ${state === 'collapsed' ? 'size-5' : 'mr-2.5 size-3.5'} group-hover/item:scale-110`}
                        />
                        {state === 'expanded' && (
                          <div className="flex w-full min-w-0 items-center justify-between">
                            <span className="truncate text-xs font-semibold">{remote.name}</span>
                            <span className="py-0.2 bg-muted/60 text-muted-foreground origin-right scale-90 rounded px-1 font-mono text-[9px] font-medium">
                              {remote.type}
                            </span>
                          </div>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })
            )}
          </SidebarMenu>
        </div>

        <SidebarSeparator className="bg-border/40" />

        {/* Tools Section */}
        <div>
          {state === 'expanded' && (
            <p className="text-muted-foreground/70 mb-2 px-3 text-[10px] font-semibold tracking-widest uppercase">
              {t('Tools')}
            </p>
          )}
          <SidebarMenu className="space-y-1">
            {toolNavItems.map(item => {
              const active = isLinkActive(item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={state === 'collapsed' ? item.title : undefined}
                    className={`group/item relative overflow-hidden rounded-xl transition-all duration-200 ease-in-out ${
                      active
                        ? 'from-primary text-primary-foreground shadow-primary/20 scale-[1.01] bg-gradient-to-r to-blue-600 shadow-md'
                        : 'hover:bg-primary/10 hover:text-primary active:scale-[0.98]'
                    } ${state === 'collapsed' ? 'w-full justify-center p-3' : 'p-3'} `}>
                    <Link
                      to={item.url}
                      className={`flex w-full items-center transition-all duration-200 ${state === 'collapsed' ? 'justify-center' : 'gap-3'} `}>
                      {!active && (
                        <div className="bg-primary absolute top-1/2 left-[3px] h-4 w-[3px] -translate-y-1/2 rounded-full opacity-0 transition-all duration-200 group-hover/item:opacity-100" />
                      )}

                      <item.icon
                        className={`shrink-0 transition-all duration-200 ${state === 'collapsed' ? 'size-5' : 'size-4'} group-hover/item:scale-110`}
                      />
                      {state === 'expanded' && (
                        <div className="flex w-full min-w-0 items-center justify-between">
                          <span className="truncate text-left text-sm font-semibold">{item.title}</span>
                          {item.badge && (
                            <span
                              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
                                active
                                  ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/10'
                                  : 'bg-primary/20 text-primary border-primary/10 border'
                              }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* Footer / Connection Card / Utility toolbar */}
      <SidebarFooter className="border-border/40 bg-muted/10 space-y-3 border-t p-3">
        {/* Rclone Connection Status Card - Expanded mode only */}
        {state === 'expanded' && (
          <div className="border-border/50 bg-muted/40 animate-fade-in hover:border-primary/30 space-y-2.5 rounded-xl border p-3 text-xs shadow-inner backdrop-blur-sm transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                {t('System Status')}
              </span>
              <CircleDot className="size-3.5 animate-pulse text-emerald-500" />
            </div>

            <div className="text-muted-foreground/90 space-y-1 font-mono text-[10px]">
              <div className="flex items-center justify-between">
                <span>{t('Endpoint')}:</span>
                <span className="text-foreground max-w-[120px] truncate font-semibold">{cleanRcHost}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('Speed Limit')}:</span>
                <span className="text-foreground font-semibold">{t('Unlimited')}</span>
              </div>

              {/* Traffic details */}
              <div className="border-border/20 flex items-center justify-between border-t pt-1 text-[9px]">
                <span className="flex items-center gap-0.5">
                  <span className="text-emerald-500">↓</span> {simulatedSpeed.down}
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="text-blue-500">↑</span> {simulatedSpeed.up}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Global actions bar */}
        <div
          className={`flex ${state === 'collapsed' ? 'flex-col items-center gap-3' : 'items-center justify-between'} px-1`}>
          {/* Theme Switcher */}
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              title={t('Theme')}
              className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-2 transition-all duration-200 focus:outline-none">
              {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </button>
          )}

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={t('Language')}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex cursor-pointer items-center justify-center gap-1 rounded-lg p-2 font-mono text-[11px] font-bold transition-all duration-200 focus:outline-none">
            <Globe className="size-4.5" />
            {state === 'expanded' && (
              <span className="scale-90 opacity-80">{i18n.language === 'zh-CN' ? 'ZH' : 'EN'}</span>
            )}
          </button>

          {/* Logout Trigger */}
          <button
            type="button"
            onClick={handleLogout}
            title={t('Logout')}
            className="text-muted-foreground cursor-pointer rounded-lg p-2 transition-all duration-200 hover:bg-red-500/10 hover:text-red-500 focus:outline-none">
            <LogOut className="size-4.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
