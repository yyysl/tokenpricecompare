# 如何获取 Telegram 群组 Chat ID（无需其他 Bot）

如果你找不到 `@userinfobot`，可以用以下方法获取 Chat ID。

## 最简单的方法 ⭐

### 步骤 1: 将你的告警 Bot 添加到群组

1. 打开你的 Telegram 群组
2. 点击群组名称 → "添加成员"
3. 搜索你创建的告警 bot（例如：`@your_price_alert_bot`）
4. 添加 bot 到群组

### 步骤 2: 在群组中发送一条消息

可以是任何消息，例如：
- `/start`
- `测试`
- 或者随便打几个字

**重要**：必须在群组中发送消息，这样 API 才能获取到群组信息。

### 步骤 3: 获取 Bot Token

如果你还没记住 Bot Token，可以：
1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/mybots`
3. 选择你的 bot
4. 选择 "API Token"
5. 复制 token

### 步骤 4: 访问 API 获取 Chat ID

在浏览器中打开以下 URL（**将 `<YOUR_BOT_TOKEN>` 替换为你的实际 token**）：

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

**示例**：
如果你的 token 是 `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`，访问：
```
https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/getUpdates
```

### 步骤 5: 在 JSON 中查找 Chat ID

你会看到类似这样的 JSON 响应：

```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 1,
        "from": {...},
        "chat": {
          "id": -1001234567890,    ← 这就是 Chat ID！
          "title": "我的价格监控群",
          "type": "supergroup"
        },
        "date": 1234567890,
        "text": "测试"
      }
    }
  ]
}
```

**重要提示**：
- 群组的 Chat ID 是**负数**（例如：`-1001234567890`）
- 私聊的 Chat ID 是**正数**（例如：`123456789`）
- 如果 JSON 显示 `"result": []`（空数组），先在群组发送一条消息，然后刷新浏览器页面

### 步骤 6: 复制 Chat ID

复制找到的 `"id"` 后面的数字（包括负号），例如：`-1001234567890`

## 常见问题

### Q: 返回的 JSON 是空的？

**A**: 先在群组中发送一条消息，然后刷新浏览器页面。

### Q: 看到的 ID 是正数？

**A**: 可能你查看的是私聊，不是群组。确保：
1. Bot 已经添加到群组
2. 在群组中发送消息（不是私聊 bot）
3. 在返回的 JSON 中，`"chat"` 的 `"type"` 应该是 `"group"` 或 `"supergroup"`

### Q: 有多个群组，如何区分？

**A**: 在 JSON 的 `"chat"` 部分，会显示 `"title"`，这就是群组名称。找到对应的群组名称，使用其对应的 `"id"`。

### Q: 找不到 chat.id？

**A**: 
1. 确保 bot 已经在群组中
2. 确保你在群组中发送了消息（不是私聊）
3. 刷新浏览器页面
4. 检查 token 是否正确（如果在浏览器中看到错误信息，说明 token 不对）

### Q: 可以测试 token 是否有效吗？

**A**: 访问：
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

如果 token 有效，会返回 bot 信息：
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "你的 Bot 名称",
    "username": "your_bot_username"
  }
}
```

## 完成后的下一步

获取到 Chat ID 后，继续配置 Cloudflare Workers：

```bash
cd workers
npx wrangler secret put TELEGRAM_CHAT_ID
# 粘贴你的 Chat ID（例如：-1001234567890），按 Enter
```

## 快速验证

获取到 Chat ID 后，可以立即测试：

在浏览器中访问（替换 `<BOT_TOKEN>` 和 `<CHAT_ID>`）：
```
https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=测试消息
```

如果配置正确，你的群组应该会收到这条"测试消息"！

