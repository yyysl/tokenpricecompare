# 部署到 Cloudflare Pages

## 方法 1: 使用 Cloudflare Dashboard (推荐)

1. **登录 Cloudflare Dashboard**
   - 访问 https://dash.cloudflare.com/
   - 点击左侧菜单的 "Workers & Pages"
   - 点击 "Create application" > "Pages" > "Connect to Git"

2. **连接 GitHub 仓库**
   - 选择你的 GitHub 账户
   - 选择仓库 `trade-on-hyper`
   - 点击 "Begin setup"

3. **配置构建设置**
   - **Project name**: `trade-on-hyper`
   - **Production branch**: `main`
   - **Build command**: `cd client && npm install && npm run build`
   - **Build output directory**: `client/build`
   - **Root directory (advanced)**: `/` (留空)

4. **环境变量** (如果需要)
   - 通常不需要，因为这是纯前端应用

5. **点击 "Save and Deploy"**

## 方法 2: 使用 Wrangler CLI

1. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **构建项目**
   ```bash
   cd client
   npm install
   npm run build
   ```

4. **部署到 Cloudflare Pages**
   ```bash
   wrangler pages deploy client/build --project-name=trade-on-hyper
   ```

## 方法 3: 使用 GitHub Actions (自动化部署)

1. **获取 Cloudflare API Token**
   - 访问 https://dash.cloudflare.com/profile/api-tokens
   - 点击 "Create Token"
   - 使用 "Edit Cloudflare Workers" 模板
   - 复制生成的 token

2. **添加 GitHub Secrets**
   - 在 GitHub 仓库设置中添加以下 secrets:
     - `CLOUDFLARE_API_TOKEN`: 你的 API token
     - `CLOUDFLARE_ACCOUNT_ID`: 你的 Account ID (在 Cloudflare Dashboard 右侧栏可以找到)

3. **推送代码到 main 分支**
   - 代码会自动构建和部署

## 注意事项

- 确保 `client/public/_redirects` 文件存在，用于处理 React Router 的单页应用路由
- 所有路由都会重定向到 `index.html`，这样前端路由才能正常工作
- 如果需要自定义域名，可以在 Cloudflare Pages 设置中配置

