#!/bin/bash
# UserPromptSubmit hook: 写入本轮开始的时间戳 sentinel
# 每个 user 消息触发一次，由 UserPromptSubmit hook 调用

SENTINEL_DIR="/tmp/claude-turn-sentinels"
mkdir -p "$SENTINEL_DIR"

# 用会话 ID + 时间戳生成唯一 sentinel 文件
# 用户输入内容（可能含特殊字符）做 hash
SESSION_ID=$(echo "$CLAUDE_SESSION_ID" | tr -dc 'a-zA-Z0-9-_')
if [ -z "$SESSION_ID" ]; then
    SESSION_ID="default"
fi

# 删除旧 sentinel，标记新轮次开始
rm -f "$SENTINEL_DIR"/*.sentinel 2>/dev/null

# 创建新 sentinel
TIMESTAMP=$(date +%s%N)
echo "$TIMESTAMP" > "$SENTINEL_DIR/last-turn-${SESSION_ID}.sentinel"

exit 0