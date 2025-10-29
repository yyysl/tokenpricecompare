#!/bin/bash

echo "=== 重新配置 Telegram Secrets ==="
echo ""
echo "请提供以下信息："
echo ""

# Get Bot Token
echo "1. 请输入您的 Bot Token (从 BotFather 获取):"
read -r BOT_TOKEN

# Get Chat ID
echo ""
echo "2. 请输入您的群组 Chat ID (例如: -1002331069975):"
read -r CHAT_ID

echo ""
echo "=== 开始配置 ==="

# Set Bot Token
echo "$BOT_TOKEN" | npx wrangler secret put TELEGRAM_BOT_TOKEN

# Set Chat ID
echo "$CHAT_ID" | npx wrangler secret put TELEGRAM_CHAT_ID

echo ""
echo "=== 配置完成 ==="
echo ""
echo "验证配置："
npx wrangler secret list

echo ""
echo "测试消息发送："
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":\"✅ 配置测试成功！\"}"

echo ""
echo ""
echo "请检查您的 Telegram 群组是否收到测试消息！"

