#!/bin/bash

# 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "=== 检查 Node.js 安装 ==="

# 检查是否已安装 Node.js
if command -v node &> /dev/null; then
    echo "✓ Node.js 已安装: $(node --version)"
    echo "✓ npm 已安装: $(npm --version)"
else
    echo "✗ Node.js 未安装，正在安装最新 LTS 版本..."
    
    # 安装 Node.js LTS
    nvm install --lts
    
    # 使用 LTS 版本
    nvm use --lts
    
    # 设置为默认版本
    nvm alias default $(nvm version current)
fi

echo ""
echo "=== 安装项目依赖 ==="
cd "$(dirname "$0")/client"

if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
else
    echo "依赖已存在，跳过安装"
fi

echo ""
echo "=== 启动开发服务器 ==="
echo "服务器启动后会自动打开浏览器到 http://localhost:3000"
echo "访问交易页面: http://localhost:3000/trading"
echo ""
npm start

