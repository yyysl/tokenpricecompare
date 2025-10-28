# Cloudflare 部署指南

本指南介绍如何将 Telegram 告警服务部署到 Cloudflare Workers。

## 前置要求

1. Cloudflare 账户
2. Wrangler CLI（Cloudflare Workers 命令行工具）

## 安装 Wrangler

```bash
npm install -g wrangler
# 或
npm install wrangler --save-dev
```

## 登录 Cloudflare

```bash
wrangler login
```

这会在浏览器中打开 Cloudflare 登录页面，授权后即可。

## 配置环境变量

### 方法 1: 使用 Wrangler Secret（推荐用于生产环境）

```bash
cd workers
wrangler secret put TELEGRAM_BOT_TOKEN
# 输入时不会显示，直接粘贴你的 token 然后按 Enter

wrangler secret put TELEGRAM_CHAT_ID
# 输入你的 chat ID
```

### 方法 2: 使用 .dev.vars（仅用于本地开发）

```bash
cd workers
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 文件，填入你的配置
```

**注意**: `.dev.vars` 文件不会被提交到 Git（已在 .gitignore 中）

## 部署

### 部署到生产环境

```bash
cd workers
npm install
npm run deploy
# 或
wrangler deploy
```

### 部署到暂存环境

```bash
npm run deploy:staging
# 或
wrangler deploy --env staging
```

## 获取 Workers URL

部署成功后，Wrangler 会显示 Workers 的 URL，格式类似：
```
https://telegram-alert-service.your-subdomain.workers.dev
```

## 配置前端

在 `client/.env.local` 或 Cloudflare Pages 环境变量中设置：

```env
REACT_APP_TELEGRAM_API_URL=https://telegram-alert-service.your-subdomain.workers.dev/api/price-alert
```

## 更新 Workers

```bash
cd workers
# 修改代码后
wrangler deploy
```

## 查看日志

```bash
wrangler tail
```

这会实时显示 Workers 的运行日志。

## 本地开发

```bash
cd workers
npm run dev
```

这会在本地启动一个开发服务器，地址通常是 `http://localhost:8787`

## 注意事项

### Cloudflare Workers 限制

1. **执行时间限制**: 免费版最多 10ms CPU 时间，付费版最多 50ms
2. **内存限制**: 128MB
3. **请求大小**: 最大 100MB（响应）和 100MB（请求体）

### 无状态设计

Cloudflare Workers 是无状态的，每个请求都是独立的。因此：
- 持续时间跟踪由前端维护
- 冷却期检查需要在前端或使用外部存储（如 KV）实现

### 推荐方案

对于需要状态管理的场景（如冷却期），可以考虑：
1. 使用 Cloudflare KV（键值存储）
2. 使用 Cloudflare Durable Objects（状态管理）
3. 使用外部数据库（如 Supabase, PlanetScale）

## 替代方案：使用其他平台

如果你的后端需要更复杂的功能或状态管理，也可以考虑：

### Railway（推荐）
- 完全支持 Node.js
- 简单易用
- 免费额度充足

### Render
- 免费套餐可用
- 自动部署

### Vercel（Serverless Functions）
- 与前端部署在一起
- 方便管理

详细部署说明请参考 [DEPLOY.md](./DEPLOY.md)

## 故障排除

### 部署失败

1. 检查是否已登录：`wrangler whoami`
2. 检查 wrangler.toml 配置是否正确
3. 查看错误日志

### 环境变量未生效

1. 确保使用 `wrangler secret put` 设置（不是 .dev.vars）
2. 检查环境变量名称是否正确
3. 重新部署：`wrangler deploy`

### CORS 错误

Workers 代码中已包含 CORS 头，如果仍有问题：
1. 检查前端请求的 URL 是否正确
2. 检查 Workers URL 是否可访问

## 相关文件

- `workers/src/index.js` - Workers 主文件
- `workers/wrangler.toml` - Wrangler 配置
- `workers/.dev.vars.example` - 环境变量模板

