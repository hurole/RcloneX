import { Home, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { FC } from 'react';

/** 错误页面内联 SVG 插画 */
const ErrorIllustration: FC = () => (
  <svg
    viewBox="0 0 240 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mx-auto mb-4 w-56"
    aria-hidden="true">
    {/* 背景装饰圆 */}
    <circle cx="120" cy="90" r="72" fill="var(--muted)" />
    <circle cx="48" cy="44" r="6" fill="var(--destructive)" opacity="0.2" />
    <circle cx="196" cy="52" r="4" fill="var(--destructive)" opacity="0.25" />
    <circle cx="36" cy="128" r="3" fill="var(--muted-foreground)" opacity="0.3" />
    <circle cx="204" cy="136" r="5" fill="var(--muted-foreground)" opacity="0.2" />

    {/* 显示器外壳 */}
    <rect x="60" y="36" width="120" height="84" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
    {/* 屏幕区域 */}
    <rect x="68" y="44" width="104" height="64" rx="4" fill="var(--background)" />
    {/* 显示器支架 */}
    <rect x="108" y="120" width="24" height="10" rx="2" fill="var(--border)" />
    <rect x="96" y="128" width="48" height="6" rx="3" fill="var(--border)" />

    {/* 屏幕内 — 断裂的链接图标 */}
    <g transform="translate(100, 58)">
      {/* 左半链 */}
      <path
        d="M6 20 L6 14 C6 8.48 10.48 4 16 4 L20 4"
        stroke="var(--destructive)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* 右半链 */}
      <path
        d="M34 4 L34 10 C34 15.52 29.52 20 24 20 L20 20"
        stroke="var(--destructive)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* 断裂闪电 */}
      <path
        d="M22 8 L18 14 L22 14 L18 20"
        stroke="var(--destructive)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>

    {/* 屏幕内 — 小装饰线 */}
    <rect x="80" y="88" width="28" height="3" rx="1.5" fill="var(--muted-foreground)" opacity="0.3" />
    <rect x="112" y="88" width="16" height="3" rx="1.5" fill="var(--muted-foreground)" opacity="0.2" />

    {/* 右上角小星星 */}
    <path
      d="M184 32 L186 28 L188 32 L192 34 L188 36 L186 40 L184 36 L180 34Z"
      fill="var(--destructive)"
      opacity="0.35"
    />
    {/* 左下角小星星 */}
    <path
      d="M52 140 L53.5 137 L55 140 L58 141.5 L55 143 L53.5 146 L52 143 L49 141.5Z"
      fill="var(--muted-foreground)"
      opacity="0.25"
    />

    {/* 感叹号圆点 */}
    <circle cx="176" cy="76" r="10" fill="var(--destructive)" opacity="0.15" />
    <text
      x="176"
      y="81"
      textAnchor="middle"
      fontSize="14"
      fontWeight="bold"
      fill="var(--destructive)"
      fontFamily="sans-serif">
      !
    </text>
  </svg>
);

const ErrorFallback: FC = () => {
  const { t } = useTranslation();

  const handleReload = () => {
    window.location.reload();
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <ErrorIllustration />
          <CardTitle className="text-xl">{t('errorBoundary.title')}</CardTitle>
          <CardDescription>{t('errorBoundary.description')}</CardDescription>
        </CardHeader>

        <CardContent>
          <Button onClick={handleReload} className="w-full cursor-pointer">
            <RefreshCw />
            {t('errorBoundary.reload')}
          </Button>
        </CardContent>

        <CardFooter className="justify-center">
          <Button variant="ghost" size="sm" onClick={handleBackToHome} className="cursor-pointer">
            <Home />
            {t('errorBoundary.backToHome')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ErrorFallback;
