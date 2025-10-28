# 完整设置指南

本文档提供项目的完整设置说明。

## 前置要求

- Node.js 18+ 和 npm
- Git

## 1. 克隆项目

```bash
git clone https://github.com/yyysl/tokenpricecompare.git
cd tokenpricecompare
```

## 2. 安装前端依赖

```bash
cd client
npm install --legacy-peer-deps
cd ..
```

## 3. 启动前端开发服务器

```bash
cd client
npm start
```

前端将在 http://localhost:3000 启动

## 4. 设置 Telegram 告警（可选）

### 步骤 1: 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按提示输入 bot 名称和用户名
4. 保存返回的 bot token

### 步骤 2: 获取 Chat ID

1. 将 bot 添加到你的群组
2. 在群组中发送任意消息
3. 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 找到 `"chat":{"id":-1234567890}` 中的数字，这就是 Chat ID

### 步骤 3: 配置后端

```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件：
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
PORT=3001
```

### 步骤 4: 安装并启动后端服务

```bash
cd server
npm install
npm start
```

后端将在 http://localhost:3001 启动

### 步骤 5: 配置前端连接到后端（如果后端在其他服务器）

创建 `client/.env.local`：
```env
REACT_APP_TELEGRAM_API_URL=http://localhost:3001/api/price-alert
```

## 5. 构建生产版本

```bash
cd client
npm run build
```

构建输出在 `client/build` 目录

## 部署

### 前端部署（Cloudflare Pages）

1. 连接 GitHub 仓库到 Cloudflare Pages
2. 设置构建命令：`cd client && npm install --legacy-peer-deps && npm run build`
3. 设置输出目录：`client/build`
4. 设置环境变量（如果后端在其他服务器）：
   - `REACT_APP_TELEGRAM_API_URL`: 后端 API 地址

### 后端部署

可以将后端部署到：
- Railway: https://railway.app
- Render: https://render.com
- Heroku: https://heroku.com
- 或其他支持 Node.js 的平台

部署时记得设置环境变量：
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `PORT` (可选，默认 5000)

## 功能说明

### 价格对比页面

- 实时显示 Hyperliquid 和币安的价格差异
- 价差超过 1% 时显示在"置顶区域"
- 自动通过 WebSocket 获取实时价格数据

### 资金费率页面

- 对比 Hyperliquid 和币安的资金费率
- 显示结算时间
- 计算预期资金费收益

### Telegram 告警

- 价差超过 1% 时自动发送告警
- 告警包含：价格、价差、价差百分比、持续时间
- 价差低于 1% 时发送恢复消息并重置持续时间

## 故障排除

### 前端无法启动

- 确保 Node.js 版本 >= 18
- 尝试删除 `node_modules` 并重新安装：`rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`

### Telegram 告警不工作

- 检查后端服务是否运行
- 检查 `.env` 文件中的 token 和 chat ID 是否正确
- 检查 bot 是否已添加到群组
- 查看后端控制台日志

### 价格数据不显示

- 检查浏览器控制台是否有错误
- 确保网络连接正常
- 尝试刷新页面

## 获取帮助

如有问题，请查看：
- [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - Telegram 设置详细说明
- [README.md](./README.md) - 项目概述

