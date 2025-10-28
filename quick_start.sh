#!/bin/bash
echo "=== 检查 Node.js 安装 ==="
if command -v node &> /dev/null; then
    echo "✓ Node.js 已安装: $(node --version)"
    echo "✓ npm 已安装: $(npm --version)"
    echo ""
    echo "=== 安装项目依赖 ==="
    cd "$(dirname "$0")/client"
    npm install
    echo ""
    echo "=== 启动开发服务器 ==="
    echo "服务器启动后会自动打开浏览器..."
    npm start
else
    echo "✗ Node.js 未安装"
    echo ""
    echo "请先安装 Node.js："
    echo "1. 访问 https://nodejs.org/ 下载安装包"
    echo "2. 或查看 INSTALL_NODE.md 了解详细安装说明"
    exit 1
fi
