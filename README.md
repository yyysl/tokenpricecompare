# Trade on Hyper

一个现代化的交易平台，提供实时市场数据、高级分析工具和直观的用户界面。

## 🚀 功能特性

### 核心功能
- **实时价格对比**: Hyperliquid 和币安实时价格对比，价差分析
- **资金费率对比**: 对比 Hyperliquid 和币安的资金费率，查看套利机会
- **WebSocket 实时更新**: 使用 WebSocket 获取实时数据，无延迟
- **套利机会提示**: 自动识别价差超过阈值的交易对

### 技术特性
- **响应式设计**: 完美适配桌面和移动设备
- **实时更新**: WebSocket 实时数据推送
- **高性能**: 优化的数据处理和渲染

## 🛠️ 技术栈

### 前端
- **React 18**: 现代化用户界面
- **TypeScript**: 类型安全
- **Tailwind CSS**: 快速样式开发
- **WebSocket**: 实时价格流
- **React Router**: 单页应用路由

## Telegram 告警

项目集成了 Telegram 告警功能，当价差超过 1% 时会自动推送通知。

### 设置步骤

1. **创建 Telegram Bot**
   - 在 Telegram 中搜索 `@BotFather`
   - 发送 `/newbot` 创建 bot
   - 保存返回的 bot token

2. **获取 Chat ID**
   - 将 bot 添加到群组
   - 使用 `@userinfobot` 获取群组 Chat ID

3. **配置后端服务**
   ```bash
   cd server
   cp .env.example .env
   # 编辑 .env 文件，填入 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID
   npm install
   npm start
   ```

4. **配置前端（如果需要）**
   - 如果后端部署在不同服务器，在 `client/.env.local` 中设置：
     ```
     REACT_APP_TELEGRAM_API_URL=https://your-backend-url/api/price-alert
     ```

详细设置说明请参考 [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) 或 [SETUP.md](./SETUP.md)

## 📦 部署

### 后端部署到 Cloudflare Workers

后端可以部署到 Cloudflare Workers（Serverless）或其他平台。

**Cloudflare Workers 部署**（推荐，免费且快速）：
- 查看 [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) 了解详细步骤
- 快速部署：
  ```bash
  cd workers
  npm install
  wrangler secret put TELEGRAM_BOT_TOKEN
  wrangler secret put TELEGRAM_CHAT_ID
  wrangler deploy
  ```

**其他平台**（Railway, Render, Heroku 等）：
- 使用 `server/` 目录中的 Express 服务器
- 查看 [SETUP.md](./SETUP.md) 了解详细说明

### 前端部署到 Cloudflare Pages

详细部署说明请查看 [DEPLOY.md](./DEPLOY.md)

#### 快速部署

1. **使用 Cloudflare Dashboard** (推荐)
   - 访问 https://dash.cloudflare.com/
   - 创建新的 Pages 项目
   - 连接 GitHub 仓库
   - 构建命令: `cd client && npm install && npm run build`
   - 输出目录: `client/build`

2. **使用 Wrangler CLI**
   ```bash
   cd client
   npm install
   npm run build
   wrangler pages deploy build --project-name=trade-on-hyper
   ```

### 本地开发

```bash
cd client
npm install
npm start
```

## 📁 项目结构

```
trade-on-hyper/
├── client/                 # React 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── pages/          # 页面组件
│   │   │   ├── PriceComparison.tsx    # 价格对比页面
│   │   │   └── FundingComparison.tsx  # 资金费率页面
│   │   ├── services/       # API 服务
│   │   │   ├── hyperApi.ts           # Hyperliquid API
│   │   │   ├── priceStreamService.ts # 价格流服务
│   │   │   └── fundingService.ts      # 资金费率服务
│   │   └── types/          # TypeScript 类型
│   ├── public/             # 静态资源
│   │   └── _redirects      # SPA 路由重定向
│   └── package.json
├── .github/workflows/      # GitHub Actions
│   └── deploy-cloudflare.yml  # 自动部署配置
├── DEPLOY.md              # 部署文档
├── wrangler.toml          # Cloudflare 配置
└── README.md              # 项目说明
```

## 🚀 快速开始

### 1. 安装依赖
```bash
npm run install-all
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp server/.env.example server/.env
# 编辑配置文件
```

### 3. 启动开发服务器
```bash
npm run dev
```

### 4. 访问应用
- 前端: http://localhost:3000
- 后端API: http://localhost:5000

## 📊 主要页面

- **仪表板**: 市场概览和投资组合
- **交易**: 实时交易界面
- **图表**: 技术分析和图表工具
- **投资组合**: 资产管理
- **历史**: 交易历史和回测
- **设置**: 用户配置和偏好

## 🔧 开发指南

### 代码规范
- 使用 ESLint 和 Prettier
- TypeScript 严格模式
- 组件化开发
- 测试驱动开发

### 提交规范
- feat: 新功能
- fix: 修复问题
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试相关

## 📈 部署

### 生产环境
```bash
npm run build
npm start
```

### Docker 部署
```bash
docker-compose up -d
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**让交易更简单，让投资更智能！** 📈🚀
# tokenpricecompare
