# Telegram 告警设置指南

## 步骤 1: 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按照提示输入 bot 名称（例如：`Price Alert Bot`）
4. 输入 bot 用户名（必须以 `bot` 结尾，例如：`your_price_alert_bot`）
5. BotFather 会返回一个 token，格式类似：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
6. **保存这个 token**，稍后需要用到

## 步骤 2: 获取群组 Chat ID

### 方法 1: 使用 userinfobot（推荐）

1. 在 Telegram 中搜索 `@userinfobot`
2. 将 bot 添加到你的群组
3. 在群组中发送 `/start` 或任意消息
4. userinfobot 会返回群组信息，找到 `Chat ID`（通常是一个负数，如 `-1001234567890`）

### 方法 2: 使用 API 查询

1. 将你创建的 bot 添加到群组
2. 在群组中发送任意消息
3. 访问（将 `<YOUR_BOT_TOKEN>` 替换为你的 token）：
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. 在返回的 JSON 中查找 `"chat":{"id":-1234567890}`，这个数字就是 Chat ID

## 步骤 3: 配置后端服务

1. 进入 `server` 目录
2. 复制 `.env.example` 为 `.env`：
   ```bash
   cp .env.example .env
   ```
3. 编辑 `.env` 文件，填入你的配置：
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_CHAT_ID=-1001234567890
   PORT=3001
   ```

## 步骤 4: 启动后端服务

```bash
cd server
npm install
npm start
```

## 步骤 5: 配置前端

前端需要在环境变量中配置后端 API 地址（如果不在同一台服务器）。

### 开发环境

创建 `client/.env.local`：
```env
REACT_APP_TELEGRAM_API_URL=http://localhost:3001/api/price-alert
```

### 生产环境

如果后端部署在不同的服务器，需要在部署时设置环境变量：
- `REACT_APP_TELEGRAM_API_URL`: 你的后端 API 地址

## 告警规则

- **触发条件**: 价差（绝对值）≥ 1%
- **推送内容**:
  - Hyperliquid 价格
  - 币安价格
  - 价差（USD）
  - 价差百分比
  - 持续时间（价差超过 1% 的持续时间）
- **冷却时间**: 每个交易对每 5 分钟最多发送一次告警（避免刷屏）
- **恢复通知**: 当价差降至 1% 以下时，会发送恢复消息并重置持续时间

## 部署后端

可以将后端部署到：
- Railway: https://railway.app
- Render: https://render.com
- Heroku: https://heroku.com
- 或任何支持 Node.js 的 VPS

部署时记得设置环境变量 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`。

