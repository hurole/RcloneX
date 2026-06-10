# RcloneX 项目提示词

## 项目概述

RcloneX 是一个 Rclone 的 Web UI 前端项目，用于通过 Rclone Remote Control (RC) API 管理远程存储配置。使用 React 19 + TypeScript 构建，基于 Rsbuild v2 打包。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 |
| 语言 | TypeScript 5.8 (strict 模式) |
| 构建 | Rsbuild v2 + @rsbuild/plugin-react v2 |
| 样式 | Tailwind CSS v4 + CSS Variables 主题 |
| UI 组件 | shadcn/ui (new-york 风格) |
| 图标 | lucide-react |
| 路由 | react-router v7 |
| 国际化 | i18next + react-i18next + i18next-browser-languagedetector |
| HTTP | axios (封装为 NetworkClient 单例) |
| 表单 | react-hook-form + @hookform/resolvers + zod |
| Toast | sonner |
| 主题 | next-themes |
| 错误监控 | @sentry/react |
| 代码格式 | Biome (format + lint + check) |
| 包管理 | pnpm |

## 项目结构

```
src/
├── assets/              # 静态资源（如 appIcon.png）
├── components/          # 共享组件
│   ├── ui/              # shadcn/ui 基础组件（Button, Card, Dialog 等）
│   ├── Header.tsx       # 全局头部组件
│   └── ErrorFallback.tsx # 错误边界 fallback
├── hooks/               # 自定义 hooks（use-user, use-mobile）
├── lib/utils/           # 工具函数（cn = clsx + tailwind-merge）
├── locales/             # 国际化文件
│   ├── en-US/translation.json
│   ├── zh-CN/translation.json
│   └── i18n.ts
├── pages/               # 页面组件（按路由组织）
│   ├── App.tsx          # 路由定义
│   ├── home/            # 主布局（Sidebar + Header + Outlet）
│   ├── login/           # 登录页
│   ├── dashboard/       # 仪表盘
│   └── config/          # 配置管理（CRUD）
├── shared/utils/        # 共享工具类
│   ├── net.ts           # NetworkClient（axios 封装，单例）
│   └── local.ts         # localStorage 操作
├── styles/globals.css   # 全局样式 + CSS Variables
├── env.d.ts             # 全局类型声明
└── index.tsx            # 应用入口
```

## 路径别名

| 别名 | 路径 | 用途 |
|------|------|------|
| `@/*` | `src/*` | 通用前缀 |
| `@pages/*` | `src/pages/*` | 页面组件 |
| `@components/*` | `src/components/*` | 共享组件 |
| `@utils` / `@utils/*` | `src/shared/utils` | 工具模块 |

## 开发命令

```bash
pnpm dev          # 启动开发服务器（自动打开浏览器）
pnpm build        # 生产构建
pnpm preview      # 预览构建产物
pnpm format       # Biome 格式化代码
pnpm check        # Biome lint + 自动修复
pnpm sentry       # 上传 source map 到 Sentry
```

## 编码规范

### 代码修改后必须运行格式化

每次修改代码后，**必须运行** `pnpm run format`。

### 组件规范

- 使用函数式组件 + `FC` 类型或 `export default function`
- UI 组件统一使用 shadcn/ui，从 `@/components/ui/` 导入
- 图标使用 lucide-react
- 样式使用 Tailwind CSS class，避免内联 style
- 组件文件使用 `.tsx` 扩展名

### 页面组织

- 每个页面放在 `src/pages/<page-name>/` 目录下
- 页面的 API 服务放在 `src/pages/<page-name>/services/index.ts`
- 页面入口为 `index.tsx`，子组件同目录放置

### 网络请求

- 使用 `net` 单例（从 `@/shared/utils` 导入）
- 认证信息自动从 localStorage 读取（`rclone-rc` + `rclone-token`）
- 响应拦截器自动提取 `response.data`，401 自动跳转登录

### 国际化

- 所有用户可见文本使用 `useTranslation()` hook 的 `t()` 函数
- 翻译文件：`src/locales/en-US/translation.json` 和 `zh-CN/translation.json`
- 新增文案必须同时添加中英文翻译
- 默认语言：`zh-CN`

### 用户反馈

- 操作成功/失败使用 `sonner` 的 `toast.success()` / `toast.error()` / `toast.info()`
- 加载状态使用 `RefreshCw` 图标 + `animate-spin`

### TypeScript

- strict 模式，禁止 `any`（优先使用 `unknown`）
- `noUnusedLocals` + `noUnusedParameters` 开启
- 接口类型定义与使用放在一起（services 文件中定义 API 相关类型）

### Biome 格式化配置

- 缩进：空格（space）
- 引号：单引号（single quote）
- CSS Modules 解析开启

## 环境变量

- `process.env.APP_VERSION`：通过 Rsbuild `source.define` 从 `package.json` 的 `version` 注入

## Rclone RC 开发环境

```bash
pnpm start:rclone
# 等价于: rclone rcd --rc-addr :5572 --rc-user dev --rc-pass 1234 --rc-allow-origin http://localhost:3000
```
