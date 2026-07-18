#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# PostToolUse hook: 写入文件后审计产物合规性
# 检查：是否声明 Web 搜索但未调用 / 是否用过时 tag / 是否缺硬性事实清单
# ═══════════════════════════════════════════════════════════════

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_name', ''))" 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_input', {}).get('file_path', ''))" 2>/dev/null)

# 只对写文件类工具生效
if [[ ! "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit|NotebookEdit)$ ]]; then
    exit 0
fi

# 只审计 md/markdown 文件
if [[ ! "$FILE_PATH" =~ \.(md|markdown)$ ]]; then
    exit 0
fi

# 提取内容
CONTENT=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin).get('tool_input', {}); print(d.get('content', d.get('new_string', '')))" 2>/dev/null)

if [ -z "$CONTENT" ]; then
    exit 0
fi

WARNINGS=""

# 检查 1：是否声明了 Web 搜索
DECLARES_SEARCH=$(echo "$CONTENT" | grep -cE "Web 搜索|4 引擎|mcp__(serper|ddg|tavily|MiniMax)|WebSearch" || echo 0)
if [ "$DECLARES_SEARCH" -gt 0 ] 2>/dev/null; then
    # 找到本会话的 jsonl 日志
    SESSION_DIR="/home/cwtrocks/.claude/projects/-home-cwtrocks-boot-procedure"
    SESSION_LOG=$(ls -t "$SESSION_DIR"/*.jsonl 2>/dev/null | head -1)

    if [ -n "$SESSION_LOG" ]; then
        SEARCH_COUNT=$(grep -cE '"mcp__serper__google_search"|"mcp__ddg-search__search"|"mcp__tavily__tavily_search"|"mcp__MiniMax__web_search"' "$SESSION_LOG" 2>/dev/null)

        if [ "$SEARCH_COUNT" -lt 1 ]; then
            WARNINGS="${WARNINGS}\n⚠️ 内容声明了 Web 搜索，但本会话搜索调用次数 = 0"
            WARNINGS="${WARNINGS}\n   建议：要么实际调用搜索，要么改为 '[未执行 Web 搜索，仅基于训练数据]'"
        fi
    fi
fi

# 检查 2：调用 source freshness 检查器
FRESHNESS=$(/home/cwtrocks/.claude/hooks/check-source-freshness.sh "$CONTENT")
if [ -n "$FRESHNESS" ]; then
    WARNINGS="${WARNINGS}\n$FRESHNESS"
fi

# 输出警告
if [ -n "$WARNINGS" ]; then
    cat << EOF

═══════════════════════════════════════════════════════════════════
🛡️  PostToolUse 合规审计（$FILE_PATH）
═══════════════════════════════════════════════════════════════════
$WARNINGS
═══════════════════════════════════════════════════════════════════

EOF
fi

exit 0