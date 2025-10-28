# Telegram 告警设置指南

## 步骤 1: 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按照提示输入 bot 名称（例如：`Price Alert Bot`）
4. 输入 bot 用户名（必须以 `bot` 结尾，例如：`your_price_alert_bot`）
5. BotFather 会返回一个 token，格式类似：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
6. **保存这个 token**，稍后需要用到

## 步骤 2: 获取群组 Chat ID

### 方法 1: 使用 API 查询（推荐，最简单！）⭐

**不需要任何其他 bot，直接用你创建的告警 bot 就可以**：

1. **将你创建的告警 bot 添加到群组**
   - 打开群组 → 添加成员
   - 搜索你的 bot 用户名（例如：`@your_price_alert_bot`）
   - 添加 bot 到群组

2. **在群组中发送任意消息**
   - 可以是 `/start` 或任何文字

3. **访问以下 URL**（将 `<YOUR_BOT_TOKEN>` 替换为你的 bot token）：
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   
   **示例**：如果你的 token 是 `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`，访问：
   ```
   https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/getUpdates
   ```

4. **在返回的 JSON 中查找 Chat ID**
   - 查找 `"chat":{"id":-1001234567890}` 部分
   - 群组的 ID 是**负数**（例如：`-1001234567890`）
   - 私聊的 ID 是**正数**（例如：`123456789`）

5. **保存这个 Chat ID**

**提示**：如果返回的 JSON 是空的 `{"ok":true,"result":[]}`，先在群组中发送一条消息，然后刷新浏览器页面。

### 方法 2: 使用其他信息 bot（备选）

如果找不到 `@userinfobot`，可以尝试：
- `@RawDataBot`
- `@getidsbot`
- 或搜索 "chat id bot"

但**推荐使用方法 1**，因为它不需要依赖其他 bot。

**详细步骤请参考**: [GET_CHAT_ID.md](./GET_CHAT_ID.md)

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

