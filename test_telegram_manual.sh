#!/bin/bash

# 手动测试 Telegram 告警
echo "Testing Telegram alert..."

curl -X POST https://telegram-alert-service.352848845.workers.dev/api/price-alert \
  -H "Content-Type: application/json" \
  -d '{
    "priceComparisons": [{
      "symbol": "BTC",
      "hyperliquidPrice": 115338.00,
      "binancePrice": 115260.00,
      "priceDiff": 78.00,
      "priceDiffPercent": 0.0676,
      "lastUpdate": 1730000000000,
      "durationMs": 10000
    }]
  }'

echo ""
echo "Check your Telegram group for the alert!"
