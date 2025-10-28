# Telegram Alert Server

后端服务，用于接收价格对比数据并发送 Telegram 告警。

## 功能

- 监控 Hyperliquid 和币安的价格差异
- 当价差超过 1% 时发送 Telegram 告警
- 跟踪价差持续时间
- 价差低于 1% 时重置持续时间并发送恢复消息

## 设置

1. **创建 Telegram Bot**
   - 在 Telegram 中搜索 `@BotFather`
   - 发送 `/newbot` 并按照指示创建 bot
   - 保存返回的 bot token

2. **获取 Chat ID**
   - 将 bot 添加到你的群组
   - 在群组中发送任意消息
   - 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - 在返回的 JSON 中找到 `"chat":{"id":-123456789}` 中的数字，这就是 chat ID

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入你的 bot token 和 chat ID
   ```

4. **安装依赖**
   ```bash
   npm install
   ```

5. **启动服务**
   ```bash
   npm start
   # 或开发模式（自动重启）
   npm run dev
   ```

## API 端点

### POST /api/price-alert
接收价格对比数据并发送告警

**请求体：**
```json
{
  "priceComparisons": [
    {
      "symbol": "BTC",
      "hyperliquidPrice": 115000,
      "binancePrice": 115500,
      "priceDiff": -500,
      "priceDiffPercent": -0.43,
      "durationMs": 120000
    }
  ]
}
```

## 部署

可以部署到任何支持 Node.js 的平台：
- Railway
- Render
- Heroku
- DigitalOcean App Platform
- 或者任何 VPS

记得设置环境变量！

