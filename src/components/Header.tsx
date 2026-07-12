import { LogOut, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/hooks/use-user';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, clearUser } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = () => {
    // 清除用户状态
    clearUser();

    // 清除本地存储的认证信息
    localStorage.removeItem('rclone-rc');
    localStorage.removeItem('rclone-token');

    // 跳转到登录页
    navigate('/login');
  };

  // 获取用户名的首字母作为头像fallback
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // 鼠标悬浮处理
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 如果用户未登录，不显示Header
  if (!user) {
    return null;
  }

  return (
    <header className={`bg-background flex h-[58px] items-center justify-between border-b px-4 ${className || ''}`}>
      {/* 左侧收起按钮 */}
      <div className="flex items-center">
        <SidebarTrigger />
      </div>

      {/* 中间可以放置其他内容，比如标题或搜索框 */}
      <div className="flex-1 px-4">{/* 这里可以添加标题、搜索框等其他元素 */}</div>

      {/* 右侧用户信息 */}
      <div className="flex items-center gap-4">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
          <DropdownMenuTrigger
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            asChild>
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs select-none">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="aspect-square h-full w-full object-cover" />
                ) : (
                  getUserInitials(user.name)
                )}
              </div>
              <span className="hidden text-sm font-medium sm:block">{user.name}</span>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none font-medium">{user.name}</p>
                <p className="text-muted-foreground text-xs leading-none">{user.email || t('Welcome back')}</p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>{t('Profile')}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('Logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
