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
import { connect } from './services';

// Dynamic Zod Schema Creator for Translation Support
const createLoginSchema = (t: (key: string) => string) =>
  z.object({
    remote: z
      .string()
      .min(1, { message: t('login.urlRequired') })
      .refine(
        (val) => {
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
    const savedRc =
      localStorage.getItem('rclone-rc') || 'http://127.0.0.1:5572';
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
    toast.success(
      lang === 'zh-CN' ? '语言已切换为中文' : 'Language switched to English',
    );
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      {/* Left Pane: Brand & Feature Highlights */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
        {/* Background Visual Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img
            src={appLogo}
            alt="RcloneX Logo"
            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          />
          <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
            RcloneX
          </span>
        </div>

        {/* Center Feature Cards */}
        <div className="space-y-8 max-w-lg relative z-10 my-auto">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-300">
              RcloneX Dashboard
            </h1>
            <p className="text-lg text-slate-300 font-light">
              {t('login.subtitle')}
            </p>
          </div>

          <div className="space-y-4">
            {/* Feature 1 */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md hover:bg-slate-900/60 hover:border-slate-700/50 hover:translate-x-1 transition-all duration-300 group">
              <div className="p-2 h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-all">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">
                  {t('login.features.multicloud')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('login.features.multicloudDesc')}
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md hover:bg-slate-900/60 hover:border-slate-700/50 hover:translate-x-1 transition-all duration-300 group">
              <div className="p-2 h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">
                  {t('login.features.performance')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('login.features.performanceDesc')}
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md hover:bg-slate-900/60 hover:border-slate-700/50 hover:translate-x-1 transition-all duration-300 group">
              <div className="p-2 h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 transition-all">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">
                  {t('login.features.mount')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('login.features.mountDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Brand Info */}
        <div className="flex justify-between items-center text-xs text-slate-500 relative z-10 border-t border-slate-900 pt-6">
          <span>&copy; {new Date().getFullYear()} RcloneX Project.</span>
          <span>MIT License</span>
        </div>
      </div>

      {/* Right Pane: Login Form Card */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative">
        {/* Floating Language & Theme Toggles */}
        <div className="flex justify-end gap-2 items-center w-full">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full cursor-pointer hover:bg-muted"
              >
                <Languages className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => changeLanguage('zh-CN')}
                className="cursor-pointer font-medium text-xs"
              >
                中文 (简体)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeLanguage('en-US')}
                className="cursor-pointer font-medium text-xs"
              >
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
              className="h-9 w-9 rounded-full cursor-pointer hover:bg-muted"
            >
              {theme === 'dark' ? (
                <Sun className="h-[18px] w-[18px] text-amber-500 animate-pulse" />
              ) : (
                <Moon className="h-[18px] w-[18px] text-slate-700" />
              )}
            </Button>
          )}
        </div>

        {/* Central Form Container */}
        <div className="my-auto w-full max-w-[420px] mx-auto">
          <Card className="border-border/60 shadow-xl overflow-hidden bg-card/60 backdrop-blur-sm">
            <CardContent className="p-8">
              {/* Form Title & Icon */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="lg:hidden p-3 rounded-2xl bg-primary/10 text-primary mb-4 animate-bounce">
                  <img
                    src={appLogo}
                    alt="Logo"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">
                  {t('login.title')}
                </h2>
                <p className="text-xs text-muted-foreground mt-2 max-w-[300px]">
                  {t('login.subtitle')}
                </p>
              </div>

              {/* Form Logic */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Remote Address Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="remote"
                    className="text-xs font-semibold text-foreground/80"
                  >
                    {t('login.remoteAddress')}
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                      <Globe className="h-[15px] w-[15px] text-blue-500" />
                    </div>
                    <Input
                      id="remote"
                      type="text"
                      disabled={connecting}
                      placeholder={t('login.remoteAddressPlaceholder')}
                      className={`pl-10 text-sm h-10 transition-all duration-300 ${
                        errors.remote
                          ? 'border-destructive focus-visible:ring-destructive'
                          : 'focus-visible:ring-primary'
                      }`}
                      {...register('remote')}
                    />
                  </div>
                  {errors.remote && (
                    <p className="text-[11px] font-medium text-destructive transition-all">
                      {errors.remote.message}
                    </p>
                  )}
                </div>

                {/* User Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="user"
                    className="text-xs font-semibold text-foreground/80"
                  >
                    {t('login.user')}
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                      <User className="h-[15px] w-[15px] text-indigo-500" />
                    </div>
                    <Input
                      id="user"
                      type="text"
                      disabled={connecting}
                      placeholder={t('login.userPlaceholder')}
                      className={`pl-10 text-sm h-10 transition-all duration-300 ${
                        errors.user
                          ? 'border-destructive focus-visible:ring-destructive'
                          : 'focus-visible:ring-primary'
                      }`}
                      {...register('user')}
                    />
                  </div>
                  {errors.user && (
                    <p className="text-[11px] font-medium text-destructive transition-all">
                      {errors.user.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold text-foreground/80"
                  >
                    {t('login.password')}
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="h-[15px] w-[15px] text-violet-500" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      disabled={connecting}
                      placeholder={t('login.passwordPlaceholder')}
                      className={`pl-10 pr-10 text-sm h-10 transition-all duration-300 ${
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
                      className="absolute inset-y-0 right-0 pr-3 flex items-center h-10 w-9 hover:bg-transparent cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-[15px] w-[15px] text-slate-500" />
                      ) : (
                        <Eye className="h-[15px] w-[15px] text-slate-500" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] font-medium text-destructive transition-all">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Connect Submit Button */}
                <Button
                  type="submit"
                  disabled={connecting}
                  className="w-full h-10 font-semibold text-sm cursor-pointer tracking-wide flex items-center justify-center gap-2 mt-4 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md active:scale-[0.98]"
                >
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
        <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-muted-foreground w-full max-w-[420px] mx-auto border-t border-border/40 pt-4 gap-2">
          <span>RcloneX Web Panel v{process.env.APP_VERSION || '1.0.0'}</span>
          <a
            href="https://rclone.org/rc/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-primary transition-colors"
          >
            Rclone RC API Docs
          </a>
        </div>
      </div>
    </div>
  );
}
