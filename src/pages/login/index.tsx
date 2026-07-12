import { zodResolver } from '@hookform/resolvers/zod';
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  Languages,
  Loader2,
  Lock,
  Moon,
  Server,
  Sun,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import * as z from 'zod';
import appLogo from '@/assets/appIcon.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-user';
import { setLocal } from '@/shared/utils/local';
import { connect } from './services';

// Dynamic Zod Schema Creator for Translation Support
const createLoginSchema = (t: (key: string) => string) =>
  z.object({
    remote: z
      .string()
      .min(1, { message: t('login.urlRequired') })
      .refine(
        val => {
          let cleaned = val.trim();
          if (!/^https?:\/\//i.test(cleaned)) {
            cleaned = `http://${cleaned}`;
          }
          try {
            const url = new URL(cleaned);
            return !!url.protocol && !!url.hostname;
          } catch {
            return false;
          }
        },
        { message: t('login.invalidUrl') },
      ),
    user: z.string().min(1, { message: t('login.userRequired') }),
    password: z.string().min(1, { message: t('login.passwordRequired') }),
  });

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { updateUser } = useUser();

  // States
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme mounted check to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-load saved credentials from localStorage
  const getInitialValues = () => {
    const savedRc = localStorage.getItem('rclone-rc') || 'http://127.0.0.1:5572';
    const savedToken = localStorage.getItem('rclone-token');
    let savedUser = 'dev';
    let savedPass = '1234';

    if (savedToken) {
      try {
        const decoded = atob(savedToken);
        const parts = decoded.split(':');
        if (parts.length >= 2) {
          savedUser = parts[0];
          savedPass = parts.slice(1).join(':');
        }
      } catch (e) {
        console.error('Failed to decode saved token', e);
      }
    }

    return {
      remote: savedRc,
      user: savedUser,
      password: savedPass,
    };
  };

  const loginSchema = createLoginSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: getInitialValues(),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setConnecting(true);

    // Normalize Remote URL
    let normalizedRemote = data.remote.trim();
    if (!/^https?:\/\//i.test(normalizedRemote)) {
      normalizedRemote = `http://${normalizedRemote}`;
    }

    try {
      // Save credentials locally
      setLocal(normalizedRemote, data.user, data.password);

      // Verify connection via Rclone RC API
      await connect();

      // Update local user state
      updateUser({ name: data.user || 'Admin' });

      toast.success(t('Connected'));
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error(t('login.connectionFailed'));

      // Clean authentication details on failure
      localStorage.removeItem('rclone-rc');
      localStorage.removeItem('rclone-token');
    } finally {
      setConnecting(false);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    toast.success(lang === 'zh-CN' ? '语言已切换为中文' : 'Language switched to English');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="bg-background flex min-h-screen transition-colors duration-300">
      {/* Left Pane: Brand & Feature Highlights */}
      <div className="border-border/20 relative hidden flex-col justify-between overflow-hidden border-r bg-gradient-to-br from-emerald-100 via-slate-100 to-teal-200/60 p-12 text-slate-800 lg:flex lg:w-1/2 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/30 dark:text-slate-100">
        {/* Background Visual Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:4rem_4rem] opacity-30 dark:opacity-20" />
        <div className="pointer-events-none absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/5" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src={appLogo}
            alt="RcloneX Logo"
            className="h-10 w-10 rounded-[20%] object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
          />
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-xl font-bold tracking-wider text-transparent dark:from-emerald-400 dark:to-teal-300">
            RcloneX
          </span>
        </div>

        {/* Center Feature Cards */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-4">
            <h1 className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-4xl leading-none font-extrabold tracking-tight text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-300">
              RcloneX Dashboard
            </h1>
            <p className="text-lg font-light text-slate-600 dark:text-slate-300">{t('login.subtitle')}</p>
          </div>

          <div className="space-y-4">
            {/* Feature 1 */}
            <div className="group flex gap-4 rounded-xl border border-slate-200/50 bg-white/60 p-4 backdrop-blur-md transition-all duration-300 hover:translate-x-1 hover:border-emerald-200/50 hover:bg-white/80 dark:border-slate-800/50 dark:bg-slate-900/40 dark:hover:border-slate-700/50 dark:hover:bg-slate-900/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 p-2 text-emerald-600 transition-all group-hover:bg-emerald-500/20 dark:text-emerald-400">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('login.features.multicloud')}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('login.features.multicloudDesc')}</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group flex gap-4 rounded-xl border border-slate-200/50 bg-white/60 p-4 backdrop-blur-md transition-all duration-300 hover:translate-x-1 hover:border-emerald-200/50 hover:bg-white/80 dark:border-slate-800/50 dark:bg-slate-900/40 dark:hover:border-slate-700/50 dark:hover:bg-slate-900/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 p-2 text-teal-600 transition-all group-hover:bg-teal-500/20 dark:text-teal-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('login.features.performance')}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('login.features.performanceDesc')}</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group flex gap-4 rounded-xl border border-slate-200/50 bg-white/60 p-4 backdrop-blur-md transition-all duration-300 hover:translate-x-1 hover:border-emerald-200/50 hover:bg-white/80 dark:border-slate-800/50 dark:bg-slate-900/40 dark:hover:border-slate-700/50 dark:hover:bg-slate-900/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 p-2 text-cyan-600 transition-all group-hover:bg-cyan-500/20 dark:text-cyan-400">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('login.features.mount')}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('login.features.mountDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Brand Info */}
        <div className="text-slate-450 relative z-10 flex items-center justify-between border-t border-slate-200/60 pt-6 text-xs dark:border-slate-900 dark:text-slate-500">
          <span>&copy; {new Date().getFullYear()} RcloneX Project.</span>
          <span>MIT License</span>
        </div>
      </div>

      {/* Right Pane: Login Form Card */}
      <div className="relative flex w-full flex-col justify-between p-6 sm:p-12 lg:w-1/2">
        {/* Floating Language & Theme Toggles */}
        <div className="flex w-full items-center justify-end gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-muted h-9 w-9 cursor-pointer rounded-full">
                <Languages className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('zh-CN')} className="cursor-pointer text-xs font-medium">
                中文 (简体)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en-US')} className="cursor-pointer text-xs font-medium">
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Selector */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-muted h-9 w-9 cursor-pointer rounded-full">
              {theme === 'dark' ? (
                <Sun className="h-[18px] w-[18px] animate-pulse text-amber-500" />
              ) : (
                <Moon className="h-[18px] w-[18px] text-slate-700" />
              )}
            </Button>
          )}
        </div>

        {/* Central Form Container */}
        <div className="mx-auto my-auto w-full max-w-[420px]">
          <Card className="border-border/60 bg-card/60 overflow-hidden shadow-xl backdrop-blur-sm">
            <CardContent className="p-8">
              {/* Form Title & Icon */}
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="bg-primary/10 text-primary mb-4 animate-bounce rounded-2xl p-3 lg:hidden">
                  <img src={appLogo} alt="Logo" className="h-10 w-10 rounded-[20%] object-contain" />
                </div>
                <h2 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent dark:from-slate-100 dark:to-slate-300">
                  {t('login.title')}
                </h2>
                <p className="text-muted-foreground mt-2 max-w-[300px] text-xs">{t('login.subtitle')}</p>
              </div>

              {/* Form Logic */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Remote Address Field */}
                <div className="space-y-2">
                  <Label htmlFor="remote" className="text-foreground/80 text-xs font-semibold">
                    {t('login.remoteAddress')}
                  </Label>
                  <div className="relative">
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Globe className="h-[15px] w-[15px] text-blue-500" />
                    </div>
                    <Input
                      id="remote"
                      type="text"
                      disabled={connecting}
                      placeholder={t('login.remoteAddressPlaceholder')}
                      className={`h-10 pl-10 text-sm transition-all duration-300 ${
                        errors.remote
                          ? 'border-destructive focus-visible:ring-destructive'
                          : 'focus-visible:ring-primary'
                      }`}
                      {...register('remote')}
                    />
                  </div>
                  {errors.remote && (
                    <p className="text-destructive text-[11px] font-medium transition-all">{errors.remote.message}</p>
                  )}
                </div>

                {/* User Field */}
                <div className="space-y-2">
                  <Label htmlFor="user" className="text-foreground/80 text-xs font-semibold">
                    {t('login.user')}
                  </Label>
                  <div className="relative">
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-[15px] w-[15px] text-indigo-500" />
                    </div>
                    <Input
                      id="user"
                      type="text"
                      disabled={connecting}
                      placeholder={t('login.userPlaceholder')}
                      className={`h-10 pl-10 text-sm transition-all duration-300 ${
                        errors.user ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'
                      }`}
                      {...register('user')}
                    />
                  </div>
                  {errors.user && (
                    <p className="text-destructive text-[11px] font-medium transition-all">{errors.user.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/80 text-xs font-semibold">
                    {t('login.password')}
                  </Label>
                  <div className="relative">
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-[15px] w-[15px] text-violet-500" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      disabled={connecting}
                      placeholder={t('login.passwordPlaceholder')}
                      className={`h-10 pr-10 pl-10 text-sm transition-all duration-300 ${
                        errors.password
                          ? 'border-destructive focus-visible:ring-destructive'
                          : 'focus-visible:ring-primary'
                      }`}
                      {...register('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={connecting}
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex h-10 w-9 cursor-pointer items-center pr-3 transition-colors hover:bg-transparent">
                      {showPassword ? (
                        <EyeOff className="h-[15px] w-[15px] text-slate-500" />
                      ) : (
                        <Eye className="h-[15px] w-[15px] text-slate-500" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-[11px] font-medium transition-all">{errors.password.message}</p>
                  )}
                </div>

                {/* Connect Submit Button */}
                <Button
                  type="submit"
                  disabled={connecting}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 mt-4 flex h-10 w-full cursor-pointer items-center justify-center gap-2 text-sm font-semibold tracking-wide shadow-md transition-all active:scale-[0.98]">
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('login.connecting')}
                    </>
                  ) : (
                    <>
                      {t('login.connect')}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Small Disclaimer Bottom Footer */}
        <div className="text-muted-foreground border-border/40 mx-auto flex w-full max-w-[420px] flex-col items-center justify-between gap-2 border-t pt-4 text-[10px] sm:flex-row">
          <span>RcloneX Web Panel v{process.env.APP_VERSION || '1.0.0'}</span>
          <a
            href="https://rclone.org/rc/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors hover:underline">
            Rclone RC API Docs
          </a>
        </div>
      </div>
    </div>
  );
}
