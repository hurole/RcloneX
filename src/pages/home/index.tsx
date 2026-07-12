import { Loader2 } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { net } from '@/shared/utils/net';
import { AppSidebar } from './AppSidebar';

const Home: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      // 检查本地是否已经有了 Token 和 RC 地址，如果没有，直接返回登录页
      const rc = localStorage.getItem('rclone-rc');
      const token = localStorage.getItem('rclone-token');
      if (!rc || !token) {
        if (active) {
          localStorage.removeItem('rclone-rc');
          localStorage.removeItem('rclone-token');
          navigate('/login');
        }
        return;
      }

      try {
        await net.post({ url: '/rc/noop' });
        if (active) {
          setChecking(false);
        }
      } catch (error) {
        console.error('应用初始化 Rclone 连通性测试失败:', error);
        if (active) {
          toast.error(t('login.connectionFailed'));
          localStorage.removeItem('rclone-rc');
          localStorage.removeItem('rclone-token');
          navigate('/login');
        }
      }
    };

    checkConnection();

    return () => {
      active = false;
    };
  }, [navigate, t]);

  if (checking) {
    return (
      <div className="bg-background flex h-screen w-screen flex-col items-center justify-center gap-4">
        {/* 精致的毛玻璃发光 Loading 界面 */}
        <div className="relative flex items-center justify-center">
          <div className="bg-primary/10 absolute h-16 w-16 animate-pulse rounded-full blur-xl" />
          <Loader2 className="text-primary relative z-10 h-10 w-10 animate-spin" />
        </div>
        <p className="text-muted-foreground animate-pulse text-sm font-semibold">{t('login.connecting')}</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 space-y-4 p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Home;
