#!/bin/bash
# 深度代码分析工具安装脚本
# 集成 tree-sitter + SCIP + Semgrep

set -e

echo "=== 安装深度代码分析工具 ==="

# 1. tree-sitter
echo "1/3. 安装 tree-sitter..."
if command -v tree-sitter &> /dev/null; then
    echo "  ✅ tree-sitter 已安装"
else
    npm install -g tree-sitter-cli 2>/dev/null || {
        echo "  ⚠️  npm 安装失败，尝试 cargo"
        cargo install tree-sitter-cli 2>/dev/null || {
            echo "  ⚠️  tree-sitter 安装跳过（需要 npm 或 cargo）"
        }
    }
    command -v tree-sitter &> /dev/null && echo "  ✅ tree-sitter 安装完成" || true
fi

# 2. SCIP (Sourcegraph)
echo "2/3. 安装 SCIP..."
if command -v src &> /dev/null; then
    echo "  ✅ @sourcegraph/src 已安装"
else
    npm install -g @sourcegraph/src 2>/dev/null || {
        echo "  ⚠️  SCIP 安装失败（需要 npm）"
    }
    command -v src &> /dev/null && echo "  ✅ @sourcegraph/src 安装完成" || true
fi

# 3. Semgrep
echo "3/3. 安装 Semgrep..."
if command -v semgrep &> /dev/null; then
    echo "  ✅ Semgrep 已安装"
else
    pip install semgrep --quiet 2>/dev/null || {
        echo "  ⚠️  Semgrep 安装失败（需要 pip）"
    }
    command -v semgrep &> /dev/null && echo "  ✅ Semgrep 安装完成" || true
fi

echo ""
echo "=== 安装完成 ==="
echo ""
echo "可用工具:"
command -v tree-sitter &> /dev/null && echo "  ✅ tree-sitter" || echo "  ❌ tree-sitter"
command -v src &> /dev/null && echo "  ✅ @sourcegraph/src" || echo "  ❌ @sourcegraph/src"
command -v semgrep &> /dev/null && echo "  ✅ Semgrep" || echo "  ❌ Semgrep"