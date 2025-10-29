# Workers 自动监控部署指南

## 🎉 新功能

Workers 现在可以**24/7 自动监控价格并发送告警**，完全不依赖浏览器！

### 功能特性

- ✅ 每分钟自动检查 20 个主流币种价格
- ✅ 对比 Hyperliquid 和 Binance 价格
- ✅ 价差超过阈值自动发送 Telegram 告警
- ✅ 5 分钟冷却期防止刷屏
- ✅ 使用 Cloudflare KV 存储状态
- ✅ 从设置页面动态读取阈值

---

## 部署步骤

### 方法 1: 通过 Cloudflare Dashboard（推荐）

由于您的本地 Node.js 环境有问题，请使用 Dashboard 部署：

#### 步骤 1: 访问 Cloudflare Dashboard

1. 打开：https://dash.cloudflare.com/
2. 左侧菜单 → **Workers & Pages**
3. 找到并点击 `telegram-alert-service`

#### 步骤 2: 部署新版本

1. 点击 **Quick edit** 按钮
2. 复制本地文件 `workers/src/index.js` 的全部内容
3. 粘贴到编辑器中，替换原有内容
4. 点击 **Save and deploy**

#### 步骤 3: 验证部署

访问：
```
https://telegram-alert-service.352848845.workers.dev/health
```

应该返回：
```json
{"status":"ok","timestamp":...}
```

---

### 方法 2: 通过 GitHub Actions（自动化）

1. 在 GitHub 仓库设置中添加 Secrets：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

2. 创建 `.github/workflows/deploy-workers.yml`

3. 推送代码到 GitHub，自动触发部署

---

### 方法 3: 使用 wrangler CLI（需要 Node.js）

如果您修复了 Node.js 环境：

```bash
cd workers
npx wrangler deploy
```

---

## 验证自动监控是否工作

### 1. 查看 Workers 日志

在 Cloudflare Dashboard：
1. 进入 `telegram-alert-service` Workers
2. 点击 **Logs** 标签
3. 选择 **Begin log stream**

您应该看到：
```
🕐 Cron trigger fired: * * * * *
🔍 Fetching prices for 40 symbols...
✅ Got 20 valid price comparisons
🔔 Checking alerts with threshold: 1.0%
```

### 2. 等待告警消息

- 系统每分钟自动检查一次
- 如果检测到价差超过阈值，会发送 Telegram 消息
- 同一交易对每 5 分钟最多发送一次告警

### 3. 测试手动触发

如果想立即测试，可以访问：
```
https://telegram-alert-service.352848845.workers.dev/api/price-alert
```

---

## 配置说明

### 阈值设置

在前端 **设置** 页面调整阈值：
1. 访问：https://82bdf86f.tokenpricecompare.pages.dev/settings
2. 输入新的阈值（例如：1%, 2%, 5%）
3. 点击保存

Workers 会自动从 Cloudflare KV 读取最新阈值。

### 监控的币种

当前监控 20 个主流币种（为了节省资源）：
- BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX, DOT, MATIC
- LTC, LINK, UNI, ATOM, ETC, ICP, APT, ARB, OP, SUI

如需添加更多币种，编辑 `workers/src/index.js` 中的 `symbols` 数组。

---

## 费用说明

### Cloudflare Workers 免费版额度

- ✅ **每天 100,000 次请求**
- ✅ **10ms CPU 时间/请求**
- ✅ **免费 KV 存储（每天 1000 次写入，10万次读取）**

### 预估使用量

- Cron 触发：1,440 次/天（每分钟 1 次）
- API 请求：每次触发 20-40 个（获取价格）
- **总计：约 30,000-50,000 次请求/天**

**完全在免费额度内！** ✅

---

## 故障排查

### 问题 1: 没有收到告警

**检查清单：**
1. Secrets 是否配置正确？
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

2. Bot 是否在群组中？

3. 价差是否真的超过阈值？

4. 查看 Workers 日志

### 问题 2: 日志显示 "Error fetching prices"

**可能原因：**
- Hyperliquid 或 Binance API 限流
- 网络问题

**解决方案：**
- 等待几分钟后自动恢复
- 减少监控的币种数量

### 问题 3: Cron 没有触发

**检查：**
1. `wrangler.toml` 中是否配置了 `[triggers]`：
   ```toml
   [triggers]
   crons = ["* * * * *"]
   ```

2. Workers 是否部署成功？

---

## 下一步

**现在您可以：**

1. ✅ 关闭浏览器
2. ✅ 关闭电脑
3. ✅ Workers 继续 24/7 监控价格
4. ✅ 价差超过阈值时自动收到 Telegram 消息

**完全自动化，无需人工干预！** 🎉

---

## 支持

如有问题，请查看：
- Workers 日志：Cloudflare Dashboard → Workers → Logs
- Telegram Bot 状态：发送 `/start` 测试
- API 健康检查：https://telegram-alert-service.352848845.workers.dev/health

