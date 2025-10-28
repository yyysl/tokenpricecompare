# 将 Bot 添加到 Telegram 群组 - 完整指南

## 步骤 1: 创建 Telegram Bot（如果还没有）

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/start` 命令
3. 发送 `/newbot` 命令
4. 按照提示输入：
   - Bot 名称（例如：`价格告警 Bot`）
   - Bot 用户名（必须以 `bot` 结尾，例如：`price_alert_bot`）
5. **保存返回的 Bot Token**，格式类似：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## 步骤 2: 创建或选择一个群组

- 如果已有群组，直接使用
- 如果没有，创建一个新群组：
  1. 在 Telegram 中点击右上角的"编辑"（或三条横线）
  2. 选择"新建群组"
  3. 添加至少一个联系人（可以是自己）
  4. 给群组命名（例如：`价格监控群`）

## 步骤 3: 将 Bot 添加到群组

1. **在群组中**，点击群组名称进入群组信息
2. 点击"添加成员"或"Add members"
3. 在搜索框中输入你的 bot 用户名（例如：`@price_alert_bot`）
4. 选择你的 bot 并点击"添加"
5. **重要**: 给 bot 管理员权限（可选，但推荐）：
   - 进入群组设置
   - 选择你的 bot
   - 开启"删除消息"权限（某些情况下需要）

## 步骤 4: 获取群组 Chat ID

有几种方法可以获取群组 Chat ID（推荐使用方法 2，最简单）：

### 方法 1: 使用 API 查询（推荐，最简单！）⭐

这是最简单可靠的方法，不需要任何其他 bot：

1. **确保你的告警 bot 已经添加到群组中**
2. 在群组中发送任意消息（可以是 `/start` 或任何文字）
3. 在浏览器中访问以下 URL（将 `<YOUR_BOT_TOKEN>` 替换为你在 BotFather 获得的 token）：
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   
   例如，如果你的 token 是 `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`，访问：
   ```
   https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/getUpdates
   ```

4. 你会看到一个 JSON 响应，查找包含 `"chat"` 的部分，找到 `"id"` 字段
   - 群组的 ID 通常是负数，格式类似：`-1001234567890`
   - 私聊的 ID 是正数：`123456789`

5. **保存这个 Chat ID**

**提示**：如果返回的 JSON 是空的 `{"ok":true,"result":[]}`，先在群组中发送一条消息，然后刷新浏览器页面。

### 方法 2: 使用其他信息 bot（备选）

如果方法 1 不行，可以尝试这些类似的 bot（但可能不稳定）：
- `@userinfobot` - 可能已经被删除或重命名
- `@RawDataBot` - 另一个信息 bot
- `@getidsbot` - 获取 ID 的 bot

使用步骤：
1. 搜索并添加其中一个 bot 到群组
2. 在群组中发送 `/start` 或任意消息
3. Bot 会回复群组信息，包含 Chat ID

### 方法 3: 使用 curl 命令（适合开发者）

如果你熟悉命令行：

```bash
# 替换 <YOUR_BOT_TOKEN>
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```

在群组发送消息后运行此命令，在返回的 JSON 中查找 `"chat":{"id"`。

## 步骤 5: 配置 Cloudflare Workers

### 如果还没配置环境变量：

```bash
cd workers

# 设置 Bot Token
npx wrangler secret put TELEGRAM_BOT_TOKEN
# 粘贴你的 bot token，然后按 Enter

# 设置 Chat ID（群组 ID）
npx wrangler secret put TELEGRAM_CHAT_ID
# 粘贴你的群组 Chat ID（通常是负数，例如：-1001234567890），然后按 Enter
```

### 如果已经部署过，更新环境变量：

```bash
cd workers

# 更新 Bot Token（如果需要）
npx wrangler secret put TELEGRAM_BOT_TOKEN

# 更新 Chat ID
npx wrangler secret put TELEGRAM_CHAT_ID
```

## 步骤 6: 测试 Bot

### 方法 1: 手动发送测试消息

访问你的 Workers URL + `/health`：
```
https://telegram-alert-service.your-subdomain.workers.dev/health
```

### 方法 2: 通过前端触发

1. 确保前端已经配置了 Workers URL
2. 在价格对比页面等待价差超过 1%
3. 查看 Telegram 群组是否收到消息

### 方法 3: 直接测试 Telegram API

在浏览器中访问（替换 `<BOT_TOKEN>` 和 `<CHAT_ID>`）：
```
https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=测试消息
```

如果返回 `{"ok":true,...}`，说明配置成功！

## 常见问题

### Q: Bot 没有收到消息？

1. **确认 bot 已添加到群组**：在群组成员列表中查看
2. **确认 Chat ID 正确**：
   - 私聊的 Chat ID 是正数（例如：`123456789`）
   - 群组的 Chat ID 是负数（例如：`-1001234567890`）
   - 超级群组的 Chat ID 格式是 `-100` 开头
3. **检查环境变量**：
   ```bash
   # 查看已设置的 secrets（不会显示值）
   npx wrangler secret list
   ```
4. **查看 Workers 日志**：
   ```bash
   npx wrangler tail
   ```

### Q: 如何知道 Chat ID 是私聊还是群组？

- **正数**：私聊（个人聊天）
- **负数**：群组或频道
- **-100 开头**：超级群组

### Q: Bot 被移除了怎么办？

1. 重新将 bot 添加到群组
2. Chat ID 不会改变，不需要重新配置
3. 如果还是收不到消息，检查 bot 权限

### Q: 多个群组怎么办？

当前版本只支持一个 Chat ID。如果需要多个群组：
1. 可以在 Workers 代码中修改，支持多个 Chat ID
2. 或者部署多个 Workers 实例，每个配置不同的 Chat ID

## 推送格式示例

当价差超过 1% 时，你会收到类似这样的消息：

```
🚨 价差告警

交易对: BTC
Hyperliquid: $115000.00
币安: $115500.00
价差: -$500.00
价差百分比: -0.4336%
持续时间: 2分30秒

⚠️ 价差已超过 1%！
```

当价差低于 1% 时，会收到恢复消息：

```
✅ 价差恢复

交易对: BTC
价差已降至 0.8500%
持续时间已重置为 0
```

## 下一步

- 确保前端已配置正确的 Workers URL
- 在价格对比页面监控价差
- 当价差超过 1% 时，自动收到 Telegram 推送

如有问题，请查看：
- [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) - 部署指南
- [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - Telegram 设置详情

