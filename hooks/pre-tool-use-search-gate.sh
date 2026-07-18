#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# PreToolUse hook v6: 写文件前检查"4 引擎 Web 搜索"标注是否真实
# 仅对 md / markdown 文件生效
#
# v6 策略（使用 sentinel 文件）：
# 1. 检查本轮是否有 user-prompt-turn-sentinel.sh 创建的 sentinel 文件
# 2. sentinel 文件的时间戳 = 本轮开始时间
# 3. 如果 sentinel 文件存在，统计该时间戳之后的搜索调用
# 4. 如果 < 1，强制拒绝
#
# 这解决了 v1-v5 的核心问题：无法识别"本回答"的真正起点
# ═══════════════════════════════════════════════════════════════

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_name', ''))" 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_input', {}).get('file_path', ''))" 2>/dev/null)

# 只对写文件类工具生效
if [[ ! "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit|NotebookEdit)$ ]]; then
    exit 0
fi

# 只对 md/markdown 文件生效
if [[ ! "$FILE_PATH" =~ \.(md|markdown)$ ]]; then
    exit 0
fi

# 提取内容
CONTENT=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin).get('tool_input', {}); print(d.get('content', d.get('new_string', '')))" 2>/dev/null)

if [ -z "$CONTENT" ]; then
    exit 0
fi

# 检查：内容是否声明了 Web 搜索
if ! echo "$CONTENT" | grep -qE "Web 搜索|4 引擎|mcp__(serper|ddg|tavily|MiniMax)|WebSearch"; then
    exit 0
fi

# 找到本会话的 jsonl 日志
SESSION_DIR="/home/cwtrocks/.claude/projects/-home-cwtrocks-boot-procedure"
SESSION_LOG=$(ls -t "$SESSION_DIR"/*.jsonl 2>/dev/null | head -1)

if [ -z "$SESSION_LOG" ]; then
    exit 0
fi

# ═══════════════════════════════════════════════════════════════
# v6 核心逻辑：基于 sentinel 文件
# 1. 找最新的 sentinel 文件
# 2. 从 sentinel 时间戳起统计搜索调用
# 3. 如果 < 1，强制拒绝
# ═══════════════════════════════════════════════════════════════

SENTINEL_DIR="/tmp/claude-turn-sentinels"
TURN_START_NS=""

# 找最新的 sentinel 文件
if [ -d "$SENTINEL_DIR" ]; then
    LATEST_SENTINEL=$(ls -t "$SENTINEL_DIR"/*.sentinel 2>/dev/null | head -1)
    if [ -n "$LATEST_SENTINEL" ]; then
        TURN_START_NS=$(cat "$LATEST_SENTINEL" 2>/dev/null)
    fi
fi

# 如果没有 sentinel 文件，fallback 到会话总搜索数（兼容旧行为）
if [ -z "$TURN_START_NS" ]; then
    # 用文件最新修改时间作为 fallback
    TURN_START_NS=$(stat -c %Y.%N "$SESSION_LOG" 2>/dev/null || date +%s.%N)
fi

RESULT=$(python3 << PYEOF
import json
import datetime
import os

SESSION_LOG = "$SESSION_LOG"
TURN_START = "$TURN_START_NS"
SEARCH_TOOLS = {
    "mcp__serper__google_search",
    "mcp__ddg-search__search",
    "mcp__tavily__tavily_search",
    "mcp__MiniMax__web_search",
}

# 转换 sentinel 时间戳为秒
try:
    turn_start_sec = float(TURN_START) / 1_000_000_000  # 纳秒 -> 秒
except:
    turn_start_sec = 0

search_count = 0
search_details = []

with open(SESSION_LOG, 'r') as f:
    for line in f:
        try:
            obj = json.loads(line)
            ts_str = obj.get("timestamp", "")
            if not ts_str:
                continue
            try:
                ts = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00")).timestamp()
            except:
                continue

            # 只统计本轮（sentinel 之后）
            if ts < turn_start_sec:
                continue

            if obj.get("type") == "assistant":
                content = obj.get("message", {}).get("content", [])
                if isinstance(content, list):
                    for item in content:
                        if item.get("type") == "tool_use":
                            tool_name = item.get("name", "")
                            if tool_name in SEARCH_TOOLS:
                                search_count += 1
                                search_details.append({
                                    "tool": tool_name,
                                    "ts": ts_str[:19]
                                })
        except:
            pass

result = {
    "turn_start": TURN_START,
    "turn_start_sec": turn_start_sec,
    "search_count": search_count,
    "search_details": search_details[:5]
}
print(json.dumps(result))
PYEOF
)

SEARCH_COUNT=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('search_count', 0))")
TURN_START=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('turn_start', ''))")

if [ "$SEARCH_COUNT" -lt 1 ]; then
    # ⛔ 拦截
    cat << EOF >&2

═══════════════════════════════════════════════════════════════════
⛔ PreToolUse hook 拦截（v6 - sentinel 文件版）
═══════════════════════════════════════════════════════════════════

文件: $FILE_PATH

原因：内容中标注了"4 引擎 Web 搜索"或"WebSearch"，
      但从本轮 user 消息开始（sentinel 文件时间戳：$TURN_START）
      到本次 Write 之前，没有任何真实搜索记录。

      本轮搜索调用次数: $SEARCH_COUNT

规则：如果要在回答中标注 Web 搜索来源，必须在本回答中实际调用 4 个搜索引擎：
     - mcp__serper__google_search
     - mcp__ddg-search__search
     - mcp__tavily__tavily_search
     - mcp__MiniMax__web_search

修复方式：
  1. 在本回答中先调用 4 个搜索工具（每次回答前都调用），然后再写文件
  2. 或者修改内容，删除 Web 搜索声明，改用"基于训练数据"标注
  3. 或者诚实标注：[本回答未执行 Web 搜索，仅基于训练数据]

诚实声明不会被视为低质量，反而是值得信任的表现。
伪造搜索标注属于严重违规。

═══════════════════════════════════════════════════════════════════
EOF
    exit 2
fi

# ✅ 通过
exit 0