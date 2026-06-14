#!/bin/bash
# init-explore skill 自动更新脚本
# 当项目有重大变更时，自动更新知识库

set -e

PROJECT_ROOT="$(pwd)"
DOCS_DIR="$PROJECT_ROOT/docs/exploration"

echo "════════════════════════════════════════════════════════════"
echo "🔄 Init-Explore 知识库自动更新"
echo "════════════════════════════════════════════════════════════"
echo ""

# 检查是否在项目根目录
if [ ! -d ".git" ]; then
    echo "❌ 错误：不在 Git 仓库中"
    exit 1
fi

# 检查上次更新时间
LAST_UPDATE_FILE=".understand-anything/last-explore.txt"
UPDATE_INTERVAL_DAYS=7  # 每7天提示更新

if [ -f "$LAST_UPDATE_FILE" ]; then
    LAST_UPDATE=$(cat "$LAST_UPDATE_FILE")
    CURRENT_TIME=$(date +%s)
    DAYS_SINCE=$(( (CURRENT_TIME - LAST_UPDATE) / 86400 ))

    echo "上次运行 /init-explore: $(date -d @$LAST_UPDATE '+%Y-%m-%d %H:%M:%S')"
    echo "距今: $DAYS_SINCE 天"
    echo ""

    if [ $DAYS_SINCE -lt $UPDATE_INTERVAL_DAYS ]; then
        echo "✓ 知识库仍然新鲜（< $UPDATE_INTERVAL_DAYS 天）"
        exit 0
    fi
fi

# 检测代码变更
if [ -f "$LAST_UPDATE_FILE" ]; then
    LAST_TIME=$(date -d @$(cat "$LAST_UPDATE_FILE") '+%Y-%m-%d %H:%M:%S')
    CHANGED_FILES=$(git log --since="$LAST_TIME" --name-only --pretty=format: | grep -E '\.(cpp|h|py|js)$' | sort -u | wc -l)

    echo "自上次 /init-explore 以来的代码变更: $CHANGED_FILES 个文件"
    echo ""

    if [ $CHANGED_FILES -ge 10 ]; then
        echo "⚠️  建议重新运行 /init-explore"
        echo ""
        echo "原因:"
        echo "  • 距上次分析已过去 $DAYS_SINCE 天"
        echo "  • 修改了 $CHANGED_FILES 个代码文件"
        echo ""
        echo "执行:"
        echo "  在 Claude Code 中运行: /init-explore"
        echo ""
    else
        echo "✓ 代码变更较小，可暂不更新"
    fi
else
    echo "💡 首次运行，建议执行:"
    echo "   /init-explore"
    echo ""
fi

echo "════════════════════════════════════════════════════════════"
