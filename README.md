# Suno · 循环生活前端

Suno 是一个把“回收、整理、再出售”做成完整体验的循环生活平台。

这个仓库是 Suno 的独立前端工程，提供两套面向用户的客户端和一套运营后台：

- Web：适合完整浏览、商品购买、订单物流、回收提交和运营管理
- 微信小程序：适合移动端快速浏览、收藏、下单、订单查看和回收提交
- 共享层：统一 API、登录会话、分页模型、错误处理和演示数据

本项目只负责前端体验与接口接入，不包含 Java、Maven、数据库或后端源码。后端服务单独维护在 [Kylinlixd/suno](https://github.com/Kylinlixd/suno)。

## 预览体验

默认启动演示模式，不需要后端即可浏览完整 UI 和主要交互。

```bash
corepack pnpm install
corepack pnpm dev:web
```

打开 [http://localhost:5173](http://localhost:5173)。

演示模式覆盖：

- 首页品牌叙事与商品推荐
- 市场分类筛选与商品详情
- 收藏、下单、订单取消、确认收货和物流时间线
- 回收申请表单与回收记录
- 账户登录、收藏数量和订单入口
- 运营后台指标、回收审核、风险摘要和导出任务下载

## 技术方案

| 层级 | 选择 | 作用 |
| --- | --- | --- |
| Web | React 19 + Vite + TypeScript | 浏览器端应用与运营后台 |
| 状态与数据 | TanStack Query + Zustand | 服务端缓存、请求状态和登录态 |
| 动效 | GSAP | 首页章节滚动、入场和微交互 |
| 小程序 | Taro 4 + React + TypeScript | 微信小程序端 |
| 共享代码 | `@suno/shared` | API 映射、会话刷新、领域类型和演示数据 |
| 样式 | CSS tokens + 响应式 CSS | Web 与小程序的一致视觉语言 |

整体结构是“两个客户端 + 一个共享前端内核”：

```text
                    ┌─────────────────────┐
                    │  Java 后端 API       │
                    │  /api/auth           │
                    │  /api/mall           │
                    │  /api/recycle        │
                    │  /api/admin          │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │       @suno/shared         │
                 │ API · session · types      │
                 └─────────┬───────┬─────────┘
                           │       │
                    ┌──────┘       └──────┐
                    │                     │
             apps/web              apps/miniprogram
```

## 功能页面

### Web

| 路径 | 能力 |
| --- | --- |
| `/` | 品牌首页、商品精选、回收入口 |
| `/market` | 在售商品、分类筛选、库存展示 |
| `/market/:id` | 商品详情、收藏、下单 |
| `/recycle` | 提交回收申请、查看回收记录 |
| `/orders` | 订单状态、取消订单、确认收货、物流轨迹 |
| `/account` | 登录、账户入口、收藏数量 |
| `/admin` | 运营指标、导出任务 |
| `/admin/recycle` | 回收质检、估价、上架 |
| `/admin/risk` | 支付重放、评论风险、安全事件 |

### 微信小程序

- 首页：品牌入口、商品精选、回收入口
- 市场：分类浏览与商品卡片
- 商品：详情、收藏、下单
- 订单：订单列表、取消订单、确认收货
- 回收：提交回收申请
- 账户：登录、收藏数量、订单和回收入口

## 快速开始

### 环境要求

- Node.js 20+
- Corepack
- pnpm 10+
- 微信开发者工具（仅小程序预览需要）

### 安装依赖

```bash
corepack enable
corepack pnpm install
```

### 启动 Web

```bash
corepack pnpm dev:web
```

### 连接真实 Java 后端

复制 Web 环境文件：

```bash
cp apps/web/.env.example apps/web/.env.local
```

修改为：

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_DEMO_MODE=false
```

小程序使用：

```dotenv
TARO_APP_API_BASE_URL=http://localhost:8080
TARO_APP_DEMO_MODE=false
```

真实接口模式要求后端允许对应前端地址的 CORS 请求，并且后端已启动。

## 常用命令

```bash
# Web 开发
corepack pnpm dev:web

# 共享层测试
corepack pnpm test

# 三个 workspace 类型检查
corepack pnpm typecheck

# Web 生产构建
corepack pnpm build:web

# 微信小程序构建
corepack pnpm build:mini
```

## 项目目录

```text
apps/
├── web/
│   └── src/
│       ├── components/       可复用 Web 组件
│       ├── pages/            用户页面
│       ├── admin/            运营后台页面
│       └── lib/              Web 登录态适配
└── miniprogram/
    └── src/
        ├── components/       小程序组件
        ├── pages/            小程序页面
        └── lib/              Taro 登录态适配

packages/
├── shared/
│   └── src/
│       ├── api.ts            API 请求和后端数据映射
│       ├── session.ts        登录、刷新、退出和存储
│       ├── types.ts          前端领域类型
│       ├── demo.ts           演示数据
│       └── index.test.ts     共享层测试
└── tokens/
    └── src/index.css         跨端设计 token
```

## API 接入边界

共享层已经对接以下后端能力：

- `/api/auth`：登录、当前用户、刷新 token、退出登录
- `/api/mall/listings`：在售商品
- `/api/mall/orders`：下单、订单列表、取消、确认收货、物流
- `/api/mall/favorites`：收藏和取消收藏
- `/api/mall/reviews`：商品评价读取
- `/api/recycle/orders`：提交回收申请
- `/api/admin/recycle`：回收审核和上架
- `/api/admin/payment`：支付重放摘要
- `/api/admin/auth/security-events`：风险摘要、导出任务和文件下载

共享层兼容后端使用的两种成功响应格式：

```json
{ "code": "OK", "message": "ok", "data": {} }
```

以及：

```json
{ "success": true, "message": "OK", "data": {} }
```

生产模式下，受保护请求遇到一次 `401` 会自动使用 refresh token 重试一次；失败后清理本地登录态。

## 设计方向

Suno 前端采用克制的编辑型视觉语言：

- 温暖米白底色、黑色文字和荧光黄操作色
- 大标题与短段落，避免模板化 SaaS 布局
- 商品图片承担主要视觉重量，卡片保持轻量
- Web 强调章节叙事，小程序强调单手操作和垂直信息流
- 所有真实业务动作都显示明确的加载、成功和失败状态

## 质量校验

当前提交已通过：

- 共享层 9 个 Vitest 测试
- Shared、Web、Mini 三个 workspace 类型检查
- Vite Web 生产构建
- Taro 微信小程序构建

## 与后端协作

前后端分开开发时：

1. 先启动 Java 后端并确认 `http://localhost:8080` 可访问
2. 将 Web 或小程序的 demo mode 设置为 `false`
3. 确认 CORS、登录 token 和数据库测试数据已准备好
4. 使用 `corepack pnpm typecheck` 和对应构建命令校验客户端

前端仓库不复制后端源码；接口变更应优先在 `packages/shared/src/api.ts` 和 `packages/shared/src/types.ts` 中完成映射，并补充共享层测试。

## License

本项目的开源协议与后端项目保持一致，详见 [Kylinlixd/suno](https://github.com/Kylinlixd/suno)。
