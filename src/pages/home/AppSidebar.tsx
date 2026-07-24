import {
  Activity,
  CalendarClock,
  CircleDot,
  Cloud,
  FolderOpen,
  Gauge,
  Globe,
  Link2,
  LogOut,
  Moon,
  Sun,
  Terminal,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
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
import { getBandwidthLimit, getCoreStats } from '@/pages/tasks/services';

export function AppSidebar() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { clearUser } = useUser();

  // States
  const [mounted, setMounted] = useState(false);

  const [realLimit, setRealLimit] = useState('off');
  const [trafficSpeed, setTrafficSpeed] = useState({
    down: '0 B/s',
    up: '0 B/s',
  });

  // Get Rclone RC server URL
  const rcloneRc = localStorage.getItem('rclone-rc') || 'http://127.0.0.1:5572';
  const cleanRcHost = rcloneRc.replace(/^https?:\/\//, '');

  // Helper to format bytes per second

  const formatSpeed = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B/s';
    if (bytes < 1024) return `${bytes.toFixed(0)} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  // Fetch real traffic & limit
  useEffect(() => {
    setMounted(true);

    const updateRealStats = async () => {
      try {
        const stats = await getCoreStats();
        if (stats) {
          setTrafficSpeed({
            down: formatSpeed(stats.speed || 0),
            up: '0 B/s',
          });
        }
      } catch {
        // Ignore
      }
    };

    const updateLimit = async () => {
      try {
        const lim = await getBandwidthLimit();
        if (lim?.rate) {
          setRealLimit(lim.rate);
        }
      } catch {
        // Ignore
      }
    };

    updateRealStats();
    updateLimit();
    const interval = setInterval(updateRealStats, 3000);

    const handleBwUpdate = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setRealLimit(custom.detail);
      }
    };
    window.addEventListener('rclone-bwlimit-updated', handleBwUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('rclone-bwlimit-updated', handleBwUpdate);
    };
  }, []);

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

  const mainNavItems = [
    {
      title: t('Dashboard'),
      url: '/dashboard',
      icon: Gauge,
    },
    {
      title: '存储与云盘',
      url: '/configs',
      icon: Cloud,
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
      title: t('scheduledTasks'),
      url: '/schedules',
      icon: CalendarClock,
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
                <span className="text-primary font-mono font-semibold">
                  {realLimit === 'off' ? t('unlimited') : realLimit}
                </span>
              </div>

              {/* Traffic details */}
              <div className="border-border/20 flex items-center justify-between border-t pt-1 text-[9px]">
                <span className="flex items-center gap-0.5 font-mono">
                  <span className="text-emerald-500">↓</span> {trafficSpeed.down}
                </span>
                <span className="flex items-center gap-0.5 font-mono">
                  <span className="text-blue-500">↑</span> {trafficSpeed.up}
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
