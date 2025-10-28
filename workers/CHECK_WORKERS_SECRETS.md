# 检查 Cloudflare Workers 环境变量配置

## 需要配置的 Secrets

在 Cloudflare Workers 中，您需要设置以下 secrets：

### 1. TELEGRAM_BOT_TOKEN
您的 Telegram Bot Token（从 BotFather 获取）

### 2. TELEGRAM_CHAT_ID  
您的 Telegram 群组 Chat ID（从之前的测试获取）

## 如何设置

运行以下命令（在 workers 目录下）：

```bash
# 设置 Bot Token
npx wrangler secret put TELEGRAM_BOT_TOKEN
# 然后粘贴您的 Bot Token

# 设置 Chat ID
npx wrangler secret put TELEGRAM_CHAT_ID
# 然后粘贴您的 Chat ID（例如：-1002331069975）
```

## 如何验证

运行以下命令查看已配置的 secrets：

```bash
npx wrangler secret list
```

应该显示：
```
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

## 测试 Workers

部署后可以直接访问测试：

```bash
curl https://telegram-alert-service.352848845.workers.dev/health
```

应该返回：
```json
{"status":"ok","timestamp":...}
```
