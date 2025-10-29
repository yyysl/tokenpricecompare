#!/bin/bash

echo "=== 更新 Cloudflare Workers Secrets ==="
echo ""

cd /Users/linoyeung/Dev/trade-on-hyper/workers

echo "更新 TELEGRAM_BOT_TOKEN..."
echo "7618264381:AAHO3F-801CFqe_VtjYWgj4G-wKtoCxgQy8" | npx wrangler secret put TELEGRAM_BOT_TOKEN

echo ""
echo "更新 TELEGRAM_CHAT_ID..."
echo "-1003252941341" | npx wrangler secret put TELEGRAM_CHAT_ID

echo ""
echo "✅ 更新完成！"
echo ""
echo "验证配置："
npx wrangler secret list

echo ""
echo "测试告警..."
curl -X POST https://telegram-alert-service.352848845.workers.dev/api/price-alert \
  -H "Content-Type: application/json" \
  -d '{
    "priceComparisons": [{
      "symbol": "BTC",
      "hyperliquidPrice": 115500,
      "binancePrice": 115400,
      "priceDiff": 100,
      "priceDiffPercent": 0.0867,
      "lastUpdate": 1730000000000,
      "durationMs": 15000
    }]
  }'

echo ""
echo ""
echo "请检查 Telegram 群组是否收到 BTC 价差告警！"

