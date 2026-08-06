# Suno Frontend

Suno 的前后端分离前端工程，包含 Web 端和微信小程序端。Java 后端保持在独立仓库：[Kylinlixd/suno](https://github.com/Kylinlixd/suno)。本仓库只包含 TypeScript、React、Taro 和共享前端代码，不包含 Java、Maven 或数据库文件。

## 技术栈

- Web：React 19、Vite、TypeScript、React Router、TanStack Query、Zustand、GSAP
- 小程序：Taro 4、React、TypeScript
- 共享层：统一 API envelope、分页映射、登录会话、401 刷新、演示数据

## 本地运行

```bash
corepack pnpm install
corepack pnpm dev:web
```

默认使用演示数据。连接 Java 后端时，将 `apps/web/.env.example` 复制为 `apps/web/.env.local`，并设置：

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_DEMO_MODE=false
```

小程序使用 `apps/miniprogram/.env.example` 中的 `TARO_APP_API_BASE_URL` 和 `TARO_APP_DEMO_MODE`。

## 校验命令

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build:web
corepack pnpm build:mini
```

## 项目结构

```text
apps/web/           Web 前端
apps/miniprogram/   微信小程序前端
packages/shared/    API、会话和领域类型
packages/tokens/    跨端设计 token
```

前端通过 `/api/auth`、`/api/mall`、`/api/recycle` 和 `/api/admin` 对接 Java 后端，不在本仓库复制或修改后端实现。
