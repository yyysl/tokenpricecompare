# 快速开始指南

## 5 分钟快速设置

### 1. 启动前端

```bash
cd client
npm install --legacy-peer-deps
npm start
```

前端将在 http://localhost:3000 启动

### 2. 启动后端（可选，用于 Telegram 告警）

```bash
cd server
cp .env.example .env
# 编辑 .env 文件，填入你的 Telegram Bot Token 和 Chat ID
npm install
npm start
```

后端将在 http://localhost:3001 启动

### 3. 配置前端连接后端（如果需要）

如果后端在本地运行，前端会自动连接到 `http://localhost:3001/api/price-alert`

如果后端在其他服务器，创建 `client/.env.local`：
```env
REACT_APP_TELEGRAM_API_URL=https://your-backend-url/api/price-alert
```

## 功能说明

### 价格对比页面
- 实时显示 Hyperliquid 和币安的价格
- 自动计算价差和价差百分比
- 价差超过 1% 的交易对会显示在"置顶区域"

### Telegram 告警
- 当价差超过 1% 时，自动发送 Telegram 消息
- 包含：价格、价差、价差百分比、持续时间
- 价差低于 1% 时，发送恢复消息并重置持续时间

## 常见问题

**Q: 价格数据不显示？**
- 检查浏览器控制台是否有错误
- 确保网络连接正常

**Q: Telegram 告警不工作？**
- 检查后端服务是否运行
- 检查 `.env` 文件中的配置是否正确
- 查看后端控制台日志

**Q: 如何获取 Telegram Bot Token 和 Chat ID？**
- 查看 [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

## 下一步

- 查看 [SETUP.md](./SETUP.md) 了解详细设置
- 查看 [README.md](./README.md) 了解项目详情

