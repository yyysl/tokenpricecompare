# 推送到 GitHub 的步骤

## 1. 在 GitHub 上创建新仓库

1. 访问 https://github.com/new
2. 仓库名称：`tokenpricecompare`
3. 描述：`实时价格和资金费率对比工具 - Hyperliquid vs Binance`
4. **不要**勾选 "Initialize this repository with a README"（我们已经有了）
5. 选择 Public 或 Private
6. 点击 "Create repository"

## 2. 推送代码

仓库创建后，运行以下命令（将 `YOUR_USERNAME` 替换为你的 GitHub 用户名）：

```bash
cd /Users/linoyeung/Dev/trade-on-hyper

# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/tokenpricecompare.git

# 或者使用 SSH（如果你配置了 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/tokenpricecompare.git

# 推送代码
git push -u origin main
```

## 注意事项

- 如果 GitHub 仓库名称不同，请相应修改上面的 URL
- 首次推送可能需要输入 GitHub 用户名和密码（或使用 Personal Access Token）
- 建议使用 SSH key 或 Personal Access Token 而不是密码

## 后续步骤

推送成功后，可以在 GitHub 仓库设置中：
1. 配置 GitHub Actions secrets（如果使用自动部署）
2. 连接 Cloudflare Pages 进行自动部署

