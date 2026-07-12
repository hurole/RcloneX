---
name: playwright-reminder
description: Automatically triggers when browser debugging, web page viewing, or visual verification is requested on macOS, reminding the agent to strictly use playwright-cli instead of the built-in browser subagent.
---

# Playwright macOS 调试优先级指南 (playwright-reminder)

当收到需要运行任何与浏览器相关、查看网页链接、确认视觉效果、或者测试页面交互的指令时，请遵循以下硬性约束：

## 🚨 环境兼容性冲突说明

- **内置浏览器工具 (`browser_subagent` / `read_browser_page`)**：底层基于 Headless Chrome，其 local 运行模式**仅支持 Linux 系统**。在当前用户的 macOS 环境下调用会直接报错 `local chrome mode is only supported on Linux` 导致任务失败。
- **Playwright 技能 (`playwright-cli`)**：通过本地脚本驱动系统里安装的浏览器，在 macOS 系统中可以 **100% 正常运行**。

## 🛠️ 行动准则

1.  **禁止调用内置工具**：严禁在 macOS 环境中使用 `browser_subagent`、`read_browser_page` 或其他常规网络抓取浏览器工具。
2.  **强制优先使用 `playwright-cli`**：必须通过调用 `playwright-cli` 技能（运行本地 Playwright 代码）或直接在终端使用相关的 `playwright-cli` 命令完成任何网页分析、调试、截图及交互。
