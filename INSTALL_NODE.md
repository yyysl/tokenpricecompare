# 安装 Node.js 说明

由于系统环境限制，请手动安装 Node.js。有以下几种方式：

## 方式一：官方安装包（推荐，最简单）

1. 访问 Node.js 官网：https://nodejs.org/
2. 下载 **LTS 版本**（推荐 v20.x 或 v18.x）
3. 运行下载的 `.pkg` 安装包
4. 按照安装向导完成安装
5. 重新打开终端，运行以下命令验证：
   ```bash
   node --version
   npm --version
   ```

## 方式二：使用 nvm（Node Version Manager）- 适合开发者

1. 安装 nvm：
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. 重新启动终端或运行：
   ```bash
   source ~/.zshrc
   ```

3. 安装 Node.js：
   ```bash
   nvm install --lts
   nvm use --lts
   ```

4. 验证安装：
   ```bash
   node --version
   npm --version
   ```

## 方式三：尝试修复 Homebrew

如果你想使用 Homebrew，可以尝试：

```bash
brew update
brew install node
```

---

## 安装完成后

1. 安装项目依赖：
   ```bash
   cd /Users/linoyeung/Dev/trade-on-hyper/client
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm start
   ```

3. 浏览器会自动打开 http://localhost:3000

4. 访问交易页面：http://localhost:3000/trading

