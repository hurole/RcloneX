import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/hooks/use-user';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { user } = useUser();

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
    </header>
  );
}
