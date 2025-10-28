#!/bin/bash

echo "测试 Telegram Bot"
echo "================="
echo ""
echo "请按照提示输入信息："
echo ""

read -p "输入你的 Bot Token: " BOT_TOKEN
CHAT_ID="-1003252941341"

echo ""
echo "测试 1: 验证 Bot Token..."
RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")
echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Bot Token 有效"
else
    echo "❌ Bot Token 无效"
    exit 1
fi

echo ""
echo "测试 2: 发送测试消息到群组 ${CHAT_ID}..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":\"🎉 测试消息：Bot 配置成功！\"}")

echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ 消息发送成功！请查看 Telegram 群组"
else
    echo "❌ 消息发送失败"
    echo "错误信息："
    echo "$RESPONSE" | grep -o '"description":"[^"]*"'
fi

