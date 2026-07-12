# RcloneX 代理商协作规范 (AGENTS.md)

本文件是针对 AI 编程代理（Agents）的开发规范与指引。在对本项目进行任何修改或设计前，请务必仔细阅读并严格遵循本文件中的约束。

---

## 1. 项目概览

RcloneX 是一个基于 Rclone Remote Control (RC) API 的现代化 Web UI 管理面板，主要用于远程存储配置的 CRUD、文件系统管理及后台任务监控。

### 技术栈构成

| 类别                | 技术选型                   | 备注 / 规范要求                                        |
| :------------------ | :------------------------- | :----------------------------------------------------- |
| **基础框架**        | React 19                   | 函数式组件，使用 `FC` 类型或 `export default function` |
| **运行环境**        | Node.js v24.x              | 必须使用 Node 24 (通过 `.node-version` 锁定)           |
| **开发语言**        | TypeScript 7.0.2           | 强制开启 `strict` 模式，禁止使用 `any`                 |
| **构建系统**        | Rsbuild v2                 | 基于 Rspack 驱动，插件使用 `@rsbuild/plugin-react`     |
| **样式系统**        | Tailwind CSS v4            | CSS Variables 驱动主题，严禁使用内联 `style`           |
| **UI 组件库**       | shadcn/ui                  | 统一使用 `new-york` 风格，自 `@/components/ui/` 导入   |
| **图标系统**        | lucide-react               | 统一样式与设计语言                                     |
| **路由导航**        | react-router v7            | 支持动态与嵌套路由                                     |
| **国际化**          | i18next + react-i18next    | 支持中英文切换，默认语言 `zh-CN`                       |
| **网络请求**        | Axios (NetworkClient 单例) | 自动处理鉴权 Token，401 自动重定向至登录页             |
| **表单方案**        | react-hook-form + Zod      | 表单数据校验与动态配置表单生成                         |
| **通知反馈**        | sonner                     | 全局 Toast 提示                                        |
| **主题切换**        | next-themes                | 亮色/暗色模式切换                                      |
| **代码规范**        | oxlint + oxfmt             | 包含代码 Lint 校验与极速代码格式化                     |
| **测试框架**        | Vitest                     | 单元测试与集成测试                                     |
| **工具链/包管理器** | nub (pnpm 兼容模式)        | 现代一站式开发工具链，管理依赖、运行脚本及版本控制     |

### 路径别名配置

| 别名                  | 映射路径           | 目标用途                |
| :-------------------- | :----------------- | :---------------------- |
| `@/*`                 | `src/*`            | 基础路径前缀            |
| `@pages/*`            | `src/pages/*`      | 各大功能页面组件        |
| `@components/*`       | `src/components/*` | 全局共享 UI / 布局组件  |
| `@utils` / `@utils/*` | `src/shared/utils` | 全局公共工具单例 / 方法 |

---

## 2. 项目目录结构

```
src/
├── assets/              # 静态资源目录（如 appIcon.png）
├── components/          # 共享 UI 组件
│   ├── ui/              # shadcn/ui 导出的原子组件（Button, Card, Dialog 等）
│   ├── Header.tsx       # 全局头部组件
│   └── ErrorFallback.tsx # 错误边界 Fallback 视图
├── hooks/               # 自定义 React Hooks（例如 use-user, use-mobile）
├── lib/utils/           # 样式合并等辅助工具函数 (cn = clsx + tailwind-merge)
├── locales/             # 国际化语言包目录
│   ├── en-US/translation.json
│   ├── zh-CN/translation.json
│   └── i18n.ts
├── pages/               # 核心功能页面（按业务模块组织）
│   ├── App.tsx          # 路由配置与应用入口定义
│   ├── home/            # 主页布局 (Sidebar + Header + Outlet)
│   ├── login/           # 登录鉴权页
│   ├── dashboard/       # 仪表盘监控页
│   ├── config/          # 存储配置 CRUD 页
│   ├── explorer/        # 文件浏览器页
│   ├── tasks/           # 传输与后台任务管理页
│   ├── mounts/          # 远程挂载点管理页
│   └── logs/            # 系统实时日志页
├── shared/utils/        # 全局共享模块与单例
│   ├── net.ts           # NetworkClient (Axios 封装，带拦截器)
│   └── local.ts         # localStorage 统一读写工具
├── styles/globals.css   # 全局样式文件与 Tailwind CSS Variables 主题定义
├── env.d.ts             # 全局类型定义声明
└── index.tsx            # Web App 的渲染挂载入口
```

---

## 3. 开发命令指南

在开发调试或代码提交前，需通过 nub 执行以下命令：

```bash
# 启动开发服务器（自动打开浏览器，端口默认为 3000）
nub run dev

# 执行生产打包编译
nub run build

# 本地预览打包后的生产产物
nub run preview

# 启动本地 Rclone 模拟测试环境
nub run start:rclone
# 备注：实际执行命令为: rclone rcd --rc-addr :5572 --rc-user dev --rc-pass 1234 --rc-allow-origin http://localhost:3000

# 运行 Vitest 进行单元与集成测试（单次运行模式）
nub run test

# 验证 TypeScript 类型安全性
nub run check

# 运行 oxfmt 自动格式化项目代码
nub run fmt

# 运行 oxlint 进行代码 Lint 静态检查
nub run lint
```

---

## 4. 代理商编码规范约束 (CRITICAL)

### 🗣️ 思考与沟通过程语言约束

- **语言要求**：AI 代理在进行自我思考（thought 过程）以及与用户交流沟通时，**必须统一使用中文（Chinese）**。

### ⚠️ 代码修改后置流程 (必须执行)

任何时候只要你修改了代码，**必须依次运行**以下命令确保项目格式与类型无误：

1. `nub run lint`：通过 oxlint 进行静态代码 Lint 检查。
2. `nub run fmt`：通过 oxfmt 进行代码排版格式化。
3. `nub run check`：验证没有 TypeScript 类型编译错误。
4. `nub run test`：运行所有单元测试，保证未引入回归 Bug。

### 🎨 组件与页面开发规范

- **文件后缀**：所有的 React 组件文件必须使用 `.tsx` 扩展名，非组件逻辑使用 `.ts`。
- **UI 标准**：统一使用 shadcn/ui 组件，直接从 `@/components/ui/` 导入。禁止手动编写复杂的底层 HTML CSS 样式。
- **图标选用**：统一从 `lucide-react` 导入，保持视觉一致性。
- **内联样式**：严禁在组件中写 `style={{...}}` 内联样式，必须使用 Tailwind CSS 类名。
- **页面组织**：
  - 各个页面级组件必须放入 `src/pages/<page-name>/` 目录下。
  - 页面对应的 API 请求服务必须放在 `src/pages/<page-name>/services/index.ts` 中。
  - 页面主入口文件必须命名为 `index.tsx`，该页面专用的子组件直接存放在同级目录下。

### 📡 网络请求与状态拦截

- 必须导入并使用 `@utils/net` 中导出的 `NetworkClient` 单例。
- 接口请求不需要手动设置 token，底层拦截器会自动从 localStorage 中的 `rclone-rc` 与 `rclone-token` 获取配置并附加在 Headers 中。
- Axios 响应拦截器已配置为自动提取 `response.data`。当检测到 401 未授权错误时，程序会自动清理凭证并重定向至 `/login`。

### 🌐 国际化规范 (i18n)

- 任何直接呈现在 UI 上、供最终用户阅读的静态/动态文本，**禁止**直接硬编码，必须使用 `useTranslation()` 的 `t()` 函数包裹。
- 新增文案必须在 [locales](file:///Users/hurole/code/RcloneX/src/locales/) 目录中同时为 `en-US/translation.json` 和 `zh-CN/translation.json` 补充对应的中英文翻译。
- 默认语言为 `zh-CN`。

### 🧪 测试规范

- 编写代码逻辑（如新 Hooks、新 utils 函数或复杂组件）后，必须在同级目录（或对应位置）编写配套的测试文件，命名规则为 `*.test.ts` 或 `*.test.tsx`。
- 在编写 React Component / Hook 的测试时，使用 `@testing-library/react` 与 `jsdom` 环境，涉及 `localStorage` 或 `fetch` 时应提前对其进行清理（`localStorage.clear()`）或模拟（Mock）。

### 🧱 强类型约束

- 必须启用并遵循 TS Strict 模式。**绝对禁止使用 `any` 类型**，应优先选择 `unknown` 或定义明确的 `interface` / `type`。
- 全局编译选项已开启 `noUnusedLocals` 和 `noUnusedParameters`，注意清理无用的导入和参数。
- 数据接口（Interfaces）应就近定义，API 请求与响应参数类型应统一在对应的 `services` 文件中声明。

### 🔧 运行环境与定义

- **版本注入**：前端可通过 `process.env.APP_VERSION` 获取版本号，该变量是通过 Rsbuild 的 `source.define` 从 `package.json` 中的 `version` 自动注入的。
