# Suno Frontend

Suno 是一个把回收、整理和再出售连接起来的循环生活平台。

本仓库是与 Java 后端分离的前端工程，明确拆成两个前端项目：

| 项目 | 目录 | 默认地址 | 面向对象 |
| --- | --- | --- | --- |
| 用户前台 | `apps/storefront` | `http://localhost:4173` | 普通用户 |
| 运营后台 | `apps/admin` | `http://localhost:4174` | 运营、审核和管理员 |

微信小程序是用户前台的移动端形态，位于 `apps/miniprogram`，和 `apps/storefront` 共享同一套 API、登录会话和领域类型。三个客户端都只通过 `packages/shared` 对接 Java 后端；本仓库不包含 Java、Maven、数据库或后端源码。

后端独立仓库：[Kylinlixd/suno](https://github.com/Kylinlixd/suno)

## 项目关系

```text
                         Java 后端 API
                              │
                       packages/shared
                   API · session · types · demo
                       ┌──────┴──────┐
                       │             │
                 用户前台项目     运营后台项目
                 apps/storefront   apps/admin
                       │
                 用户移动端形态
                 apps/miniprogram
```

前台和后台拥有独立的 React/Vite 入口、路由、构建产物和部署地址，可以分别发布、扩容和配置权限；共享层只放跨端业务基础能力，不把后台页面混入前台路由。

## 用户前台

`apps/storefront` 是面向消费者的 Web 项目，提供：

- 品牌首页和商品精选
- 商品分类筛选、商品详情、库存和价格
- 收藏、下单、取消订单、确认收货
- 订单状态和物流时间线
- 回收申请和账户入口

主要路由：

| 路径 | 能力 |
| --- | --- |
| `/` | 首页和商品推荐 |
| `/market` | 在售商品市场 |
| `/market/:id` | 商品详情、收藏和下单 |
| `/recycle` | 提交回收申请 |
| `/orders` | 订单和物流 |
| `/account` | 用户账户和收藏数量 |

## 运营后台

`apps/admin` 是独立的运营管理 Web 项目，不和用户前台共用路由入口，提供：

- 运营指标总览
- 回收单质检、估价和上架
- 支付重放摘要
- 评论风险摘要
- 安全事件时间线
- 导出任务创建和文件下载

主要路由：

| 路径 | 能力 |
| --- | --- |
| `/` | 运营指标和导出任务 |
| `/recycle` | 回收审核工作台 |
| `/risk` | 风险与支付摘要 |

## 微信小程序

`apps/miniprogram` 是用户前台的移动端版本，使用 Taro 4 构建微信小程序：

- 首页、市场、商品详情
- 收藏和下单
- 订单取消、确认收货
- 回收申请
- 账户登录和订单入口

## 技术栈

- 用户前台：React 19、Vite、TypeScript、React Router
- 运营后台：React 19、Vite、TypeScript、React Router
- 数据请求：TanStack Query
- 登录状态：Zustand + 共享 session client
- 动效：GSAP
- 小程序：Taro 4 + React
- 包管理：pnpm workspace
- 共享层：统一响应解析、分页映射、401 刷新和演示数据

## 快速开始

### 环境要求

- Node.js 20+
- Corepack
- pnpm 10+
- 微信开发者工具（小程序预览需要）

### 安装依赖

```bash
corepack enable
corepack pnpm install
```

### 启动用户前台

```bash
corepack pnpm dev:storefront
```

打开 [http://localhost:4173](http://localhost:4173)。

### 启动运营后台

```bash
corepack pnpm dev:admin
```

打开 [http://localhost:4174](http://localhost:4174)。后台左侧“返回用户端”默认跳转到 `http://localhost:4173`。

### 演示模式

默认使用演示数据，不依赖后端即可浏览页面和体验主要交互：

```dotenv
VITE_DEMO_MODE=true
TARO_APP_DEMO_MODE=true
```

### 连接真实 Java 后端

用户前台：复制 `apps/storefront/.env.example` 为 `apps/storefront/.env.local`。

运营后台：复制 `apps/admin/.env.example` 为 `apps/admin/.env.local`。

然后设置：

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_DEMO_MODE=false
VITE_STOREFRONT_URL=http://localhost:4173
```

小程序使用：

```dotenv
TARO_APP_API_BASE_URL=http://localhost:8080
TARO_APP_DEMO_MODE=false
```

真实接口模式要求 Java 后端已启动，并允许两个 Web 项目和小程序开发环境发起 CORS 请求。

## 常用命令

```bash
# 用户前台开发
corepack pnpm dev:storefront

# 运营后台开发
corepack pnpm dev:admin

# 共享层测试
corepack pnpm test

# 所有 workspace 类型检查
corepack pnpm typecheck

# 用户前台生产构建
corepack pnpm build:storefront

# 运营后台生产构建
corepack pnpm build:admin

# 微信小程序构建
corepack pnpm build:mini
```

## 目录结构

```text
apps/
├── storefront/              用户前台 Web 项目
│   └── src/
│       ├── components/      用户端组件
│       ├── pages/           首页、市场、订单、回收、账户
│       └── lib/             用户端登录态适配
├── admin/                   运营后台 Web 项目
│   └── src/
│       ├── admin/            总览、回收审核、风险页面
│       ├── components/       后台登录组件
│       └── lib/              后台登录态适配
└── miniprogram/             用户前台微信小程序

packages/
├── shared/
│   └── src/
│       ├── api.ts            API 请求和数据映射
│       ├── session.ts        登录、刷新和退出
│       ├── types.ts          领域类型
│       ├── demo.ts           演示数据
│       └── index.test.ts     共享层测试
└── tokens/
    └── src/index.css         设计 token
```

## 后端接口边界

共享层对接 Java 后端的主要接口：

- `/api/auth`：登录、当前用户、刷新 token、退出登录
- `/api/mall/listings`：在售商品
- `/api/mall/orders`：下单、订单列表、取消、确认收货、物流
- `/api/mall/favorites`：收藏和取消收藏
- `/api/recycle/orders`：提交回收申请
- `/api/admin/recycle`：回收审核和上架
- `/api/admin/payment`：支付重放摘要
- `/api/admin/auth/security-events`：风险摘要、导出任务和文件下载

共享层兼容后端的两种成功响应：

```json
{ "code": "OK", "message": "ok", "data": {} }
```

```json
{ "success": true, "message": "OK", "data": {} }
```

生产模式下，受保护请求遇到一次 `401` 会使用 refresh token 自动重试一次；刷新失败后清理本地登录态。

## 设计方向

- 用户前台：温暖米白、黑色文字、荧光黄操作色和编辑型大标题
- 运营后台：高信息密度、清晰状态色和可操作的数据面板
- 小程序：单手操作、垂直信息流和大触控区域
- 所有业务动作提供加载、成功、失败和空状态

## 质量校验

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build:storefront
corepack pnpm build:admin
corepack pnpm build:mini
```

当前前端代码已通过共享层测试、类型检查、用户前台构建、运营后台构建和小程序构建。

## 前后端协作

前端仓库不复制后端源码。接口变更应优先更新：

- `packages/shared/src/api.ts`
- `packages/shared/src/types.ts`
- `packages/shared/src/index.test.ts`

用户前台和运营后台可以独立部署，但共享层的接口映射和 token 刷新行为必须保持一致。

## License

本项目的开源协议与后端项目保持一致，详见 [Kylinlixd/suno](https://github.com/Kylinlixd/suno)。
