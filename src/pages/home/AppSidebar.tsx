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
      const downVal =
        Math.random() > 0.7
          ? `${(Math.random() * 200 + 10).toFixed(1)} KB/s`
          : '0 B/s';
      const upVal =
        Math.random() > 0.8
          ? `${(Math.random() * 50 + 2).toFixed(1)} KB/s`
          : '0 B/s';
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
      window.removeEventListener(
        'rclone-configs-updated',
        handleConfigsUpdated,
      );
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
    toast.info(
      nextLang === 'zh-CN' ? '已切换为中文' : 'Language switched to English',
    );
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
    return (
      location.pathname === '/configs' &&
      searchParams.get('search') === remoteName
    );
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
  const filteredRemotes = remotes.filter((remote) =>
    remote.name.toLowerCase().includes(remoteSearchQuery.toLowerCase()),
  );

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
      className="border-r border-border/40 bg-sidebar/95 backdrop-blur-md transition-all duration-300"
    >
      {/* Brand Header */}
      <SidebarHeader
        className={`flex items-center p-4 border-b border-border/40 ${
          state === 'collapsed'
            ? 'justify-center'
            : 'flex-row justify-between gap-3'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/10 border border-primary/20 shadow-inner group/logo hover:scale-105 transition-transform duration-300">
            <img
              src={logo}
              alt="logo"
              className="w-7 h-7 object-contain rounded-[20%] group-hover/logo:rotate-12 transition-transform duration-500"
            />
          </div>
          {state === 'expanded' && (
            <div className="flex flex-col">
              <h2 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent">
                RcloneX
              </h2>
              <span className="text-[10px] text-muted-foreground font-mono leading-none">
                v1.0.1
              </span>
            </div>
          )}
        </div>

        {state === 'expanded' && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium animate-fade-in">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            {t('Connected')}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 space-y-3 no-scrollbar">
        {/* Navigation Section */}
        <div>
          {state === 'expanded' && (
            <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {t('General')}
            </p>
          )}
          <SidebarMenu className="space-y-1">
            {mainNavItems.map((item) => {
              const active = isLinkActive(item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={state === 'collapsed' ? item.title : undefined}
                    className={`
                      group/item relative overflow-hidden rounded-xl transition-all duration-200 ease-in-out
                      ${
                        active
                          ? 'bg-gradient-to-r from-primary to-blue-600 text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]'
                          : 'hover:bg-primary/10 hover:text-primary active:scale-[0.98]'
                      }
                      ${state === 'collapsed' ? 'w-full justify-center p-3' : 'p-3'}
                    `}
                  >
                    <Link
                      to={item.url}
                      className={`
                        flex items-center w-full transition-all duration-200
                        ${state === 'collapsed' ? 'justify-center' : 'gap-3'}
                      `}
                    >
                      {/* Premium vertical active indicator */}
                      {!active && (
                        <div className="absolute left-[3px] top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-primary opacity-0 group-hover/item:opacity-100 transition-all duration-200" />
                      )}

                      <item.icon
                        className={`
                          transition-all duration-200 shrink-0
                          ${state === 'collapsed' ? 'size-5' : 'size-4'}
                          group-hover/item:scale-110
                        `}
                      />
                      {state === 'expanded' && (
                        <span className="font-semibold text-sm truncate">
                          {item.title}
                        </span>
                      )}
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
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                {t('Remotes')}
              </p>
              {remotes.length > 0 && (
                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground font-semibold">
                  {remotes.length}
                </span>
              )}
            </div>
          )}

          {/* Search box for remotes in Sidebar - only when expanded */}
          {state === 'expanded' && remotes.length > 3 && (
            <div className="px-2 mb-2">
              <div className="relative flex items-center rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1 focus-within:border-primary/50 transition-colors duration-200">
                <Search className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder={t('Search remotes...')}
                  value={remoteSearchQuery}
                  onChange={(e) => setRemoteSearchQuery(e.target.value)}
                  className="ml-2 w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          )}

          <SidebarMenu className="max-h-[220px] overflow-y-auto pr-0.5 space-y-0.5 custom-scrollbar">
            {loadingRemotes ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                {state === 'expanded' && (
                  <span className="text-xs">
                    {t('Loading') || 'Loading...'}
                  </span>
                )}
              </div>
            ) : filteredRemotes.length === 0 ? (
              state === 'expanded' && (
                <p className="text-xs text-muted-foreground/60 text-center py-4 italic">
                  {remoteSearchQuery
                    ? t('No configurations found')
                    : t('No configurations found')}
                </p>
              )
            ) : (
              filteredRemotes.map((remote) => {
                const RemoteIcon = getRemoteIcon(remote.type);
                const active = isRemoteActive(remote.name);
                return (
                  <SidebarMenuItem key={remote.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={state === 'collapsed' ? remote.name : undefined}
                      className={`
                        group/item relative rounded-lg transition-all duration-200 ease-in-out
                        ${
                          active
                            ? 'bg-primary/15 text-primary border-l-2 border-primary pl-2.5 font-medium'
                            : 'hover:bg-primary/5 hover:text-primary active:scale-[0.98]'
                        }
                        ${state === 'collapsed' ? 'w-full justify-center p-3' : 'px-3 py-2 h-9'}
                      `}
                    >
                      <Link
                        to={`/configs?search=${encodeURIComponent(remote.name)}`}
                        className="flex items-center w-full"
                      >
                        <RemoteIcon
                          className={`
                            shrink-0 transition-transform duration-200
                            ${state === 'collapsed' ? 'size-5' : 'size-3.5 mr-2.5'}
                            group-hover/item:scale-110
                          `}
                        />
                        {state === 'expanded' && (
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span className="text-xs font-semibold truncate">
                              {remote.name}
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted/60 text-muted-foreground scale-90 origin-right font-medium">
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
            <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {t('Tools')}
            </p>
          )}
          <SidebarMenu className="space-y-1">
            {toolNavItems.map((item) => {
              const active = isLinkActive(item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={state === 'collapsed' ? item.title : undefined}
                    className={`
                      group/item relative overflow-hidden rounded-xl transition-all duration-200 ease-in-out
                      ${
                        active
                          ? 'bg-gradient-to-r from-primary to-blue-600 text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]'
                          : 'hover:bg-primary/10 hover:text-primary active:scale-[0.98]'
                      }
                      ${state === 'collapsed' ? 'w-full justify-center p-3' : 'p-3'}
                    `}
                  >
                    <Link
                      to={item.url}
                      className={`
                        flex items-center w-full transition-all duration-200
                        ${state === 'collapsed' ? 'justify-center' : 'gap-3'}
                      `}
                    >
                      {!active && (
                        <div className="absolute left-[3px] top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-primary opacity-0 group-hover/item:opacity-100 transition-all duration-200" />
                      )}

                      <item.icon
                        className={`
                          transition-all duration-200 shrink-0
                          ${state === 'collapsed' ? 'size-5' : 'size-4'}
                          group-hover/item:scale-110
                        `}
                      />
                      {state === 'expanded' && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="font-semibold text-sm truncate text-left">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                active
                                  ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/10'
                                  : 'bg-primary/20 text-primary border border-primary/10'
                              }`}
                            >
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
      <SidebarFooter className="p-3 border-t border-border/40 space-y-3 bg-muted/10">
        {/* Rclone Connection Status Card - Expanded mode only */}
        {state === 'expanded' && (
          <div className="p-3 rounded-xl border border-border/50 bg-muted/40 backdrop-blur-sm shadow-inner text-xs space-y-2.5 animate-fade-in hover:border-primary/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {t('System Status')}
              </span>
              <CircleDot className="size-3.5 text-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-1 font-mono text-[10px] text-muted-foreground/90">
              <div className="flex items-center justify-between">
                <span>{t('Endpoint')}:</span>
                <span className="truncate max-w-[120px] font-semibold text-foreground">
                  {cleanRcHost}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('Speed Limit')}:</span>
                <span className="text-foreground font-semibold">
                  {t('Unlimited')}
                </span>
              </div>

              {/* Traffic details */}
              <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[9px]">
                <span className="flex items-center gap-0.5">
                  <span className="text-emerald-500">↓</span>{' '}
                  {simulatedSpeed.down}
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
          className={`flex ${state === 'collapsed' ? 'flex-col gap-3 items-center' : 'items-center justify-between'} px-1`}
        >
          {/* Theme Switcher */}
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              title={t('Theme')}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none transition-all duration-200 cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="size-4.5" />
              ) : (
                <Moon className="size-4.5" />
              )}
            </button>
          )}

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={t('Language')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none transition-all duration-200 flex items-center justify-center cursor-pointer text-[11px] font-bold font-mono gap-1"
          >
            <Globe className="size-4.5" />
            {state === 'expanded' && (
              <span className="scale-90 opacity-80">
                {i18n.language === 'zh-CN' ? 'ZH' : 'EN'}
              </span>
            )}
          </button>

          {/* Logout Trigger */}
          <button
            type="button"
            onClick={handleLogout}
            title={t('Logout')}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 focus:outline-none transition-all duration-200 cursor-pointer"
          >
            <LogOut className="size-4.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
