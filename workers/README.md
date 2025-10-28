# Cloudflare Workers - Telegram 告警服务

这是 Telegram 告警服务的 Cloudflare Workers 版本。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 配置环境变量

```bash
# 设置生产环境变量
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

或创建 `.dev.vars` 用于本地开发：
```bash
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入你的配置
```

### 4. 本地开发

```bash
npm run dev
```

### 5. 部署

```bash
npm run deploy
```

## 目录结构

```
workers/
├── src/
│   └── index.js          # Workers 主文件
├── wrangler.toml         # Wrangler 配置
├── package.json          # 依赖配置
└── .dev.vars.example     # 环境变量模板
```

## API 端点

### POST /api/price-alert

接收价格对比数据并发送告警。

**请求体**:
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

### GET /health

健康检查端点。

**响应**:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

## 配置

### wrangler.toml

Workers 配置文件，包含：
- Workers 名称
- 兼容性日期
- 环境配置

### 环境变量

- `TELEGRAM_BOT_TOKEN`: Telegram Bot Token
- `TELEGRAM_CHAT_ID`: Telegram Chat ID

## 故障排除

查看 [CLOUDFLARE_DEPLOY.md](../CLOUDFLARE_DEPLOY.md) 了解详细故障排除指南。

