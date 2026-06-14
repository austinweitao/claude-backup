#!/bin/bash
# Stop Hook - 会话结束时自动处理高质量对话内容
# 触发条件: 会话结束、clear、compact

set -e

# 配置
THRESHOLD=4
PROJECT_ROOT="${CLAUDE_PROJECT_ROOT:-$(pwd)}"
KNOWLEDGE_STATE="$PROJECT_ROOT/.knowledge-system.json"
EXPLORATION_DIR="$PROJECT_ROOT/docs/exploration"
LOG_DIR="$PROJECT_ROOT/.claude/logs"
LOG_FILE="$LOG_DIR/stop-hook.log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 日志函数 - 同时输出到文件和控制台
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# 异常捕获
trap 'log "ERROR: Hook 执行异常"; exit 1' ERR

# 获取当前 session 的 transcript
CLAUDE_SESSION_ID="${CLAUDE_CODE_SESSION_ID:-}"
if [ -z "$CLAUDE_SESSION_ID" ]; then
    CLAUDE_SESSION_ID="$(basename "$(pwd)")"
fi

# 尝试多个可能的 transcript 路径
# 格式: $HOME/.claude/projects/<project-path>/$CLAUDE_SESSION_ID.jsonl
PROJECT_HASH=$(echo "$PROJECT_ROOT" | sed 's/[^a-zA-Z0-9]/-/g' | head -c 50)
TRANSCRIPT_PATHS=(
    "${CLAUDE_TRANSCRIPT:-}"
    "$HOME/.claude/projects/${PROJECT_HASH}/${CLAUDE_SESSION_ID}.jsonl"
    "$HOME/.claude/projects/-home-cwtrocks/${CLAUDE_SESSION_ID}.jsonl"
    "$HOME/.claude/history.jsonl"
)

log "=== Stop Hook: 知识捕获 ==="
log "项目: $PROJECT_ROOT"
log "Session ID: $CLAUDE_SESSION_ID"

# 检查知识库是否已初始化
if [ ! -f "$KNOWLEDGE_STATE" ]; then
    log "知识库未初始化，跳过"
    exit 0
fi

# 检查是否有初始化标记
LAST_EXPLORE="$PROJECT_ROOT/.understand-anything/last-explore.txt"
if [ ! -f "$LAST_EXPLORE" ]; then
    log "未运行 /init-explore，跳过自动捕获"
    exit 0
fi

# 获取会话输出
SESSION_OUTPUT=""
for TRANSCRIPT_FILE in "${TRANSCRIPT_PATHS[@]}"; do
    if [ -n "$TRANSCRIPT_FILE" ] && [ -f "$TRANSCRIPT_FILE" ]; then
        SESSION_OUTPUT=$(cat "$TRANSCRIPT_FILE" 2>/dev/null || echo "")
        if [ -n "$SESSION_OUTPUT" ]; then
            log "使用 transcript: $TRANSCRIPT_FILE ($(echo "$SESSION_OUTPUT" | wc -c) bytes)"
            break
        fi
    fi
done

if [ -z "$SESSION_OUTPUT" ]; then
    log "⚠️ 无会话内容，跳过"
    exit 0
fi

# 质量评估
SCORE=0
REASONS=""

# 1. 分析文件数（检查对话中提到的文件路径）
FILE_COUNT=$(echo "$SESSION_OUTPUT" | grep -oE '\./[a-zA-Z0-9_/]+\.(cpp|h|java|py|kt)' | sort -u | wc -l)
if [ "$FILE_COUNT" -ge 3 ]; then
    SCORE=$((SCORE + 3))
    REASONS="$REASONS +3(分析$FILE_COUNT个文件)"
fi

# 2. 架构关键词
if echo "$SESSION_OUTPUT" | grep -qE "架构|分层|设计模式|architecture|layer|pattern"; then
    SCORE=$((SCORE + 2))
    REASONS="$REASONS +2(架构讨论)"
fi

# 3. 图表
DIAGRAM_COUNT=$(echo "$SESSION_OUTPUT" | grep -c '```mermaid' | tr -d '[:space:]' || echo "0")
if [ "$DIAGRAM_COUNT" -ge 1 ] 2>/dev/null; then
    SCORE=$((SCORE + 2))
    REASONS="$REASONS +2(包含$DIAGRAM_COUNT个图表)"
fi

# 4. 集成指南
if echo "$SESSION_OUTPUT" | grep -qE "集成|接入|Maven|Gradle|CMake|integration"; then
    SCORE=$((SCORE + 2))
    REASONS="$REASONS +2(集成指南)"
fi

# 5. 流程描述
if echo "$SESSION_OUTPUT" | grep -qE "流程|步骤|首先|然后|最后"; then
    SCORE=$((SCORE + 1))
    REASONS="$REASONS +1(流程说明)"
fi

# 6. 设计决策
if echo "$SESSION_OUTPUT" | grep -qE "设计决策|为什么|why|设计目的"; then
    SCORE=$((SCORE + 1))
    REASONS="$REASONS +1(设计决策)"
fi

log "质量评分: $SCORE/$THRESHOLD"
log "加分项: $REASONS"

# 达到阈值，更新状态
if [ "$SCORE" -ge "$THRESHOLD" ]; then
    log "✅ 达到捕获阈值，开始自动知识沉淀"

    # 更新时间戳
    date +%s > "$LAST_EXPLORE"

    # 查找并执行自动沉淀脚本
    if [ -n "$SESSION_OUTPUT" ] && command -v python3 &> /dev/null; then
        AUTO_PRECIPITATE="$HOME/.claude/skills/init-explore/scripts/auto-precipitate.py"
        if [ -f "$AUTO_PRECIPITATE" ]; then
            # 创建临时 transcript 文件
            TEMP_TRANSCRIPT=$(mktemp /tmp/XXXXXX_transcript.jsonl)
            echo "$SESSION_OUTPUT" > "$TEMP_TRANSCRIPT"

            log "📝 执行自动知识沉淀..."
            if python3 "$AUTO_PRECIPITATE" "$TEMP_TRANSCRIPT" "$SCORE" 2>&1 | tee -a "$LOG_FILE"; then
                log "✅ 自动知识沉淀完成"
            else
                log "⚠️ 自动知识沉淀执行异常"
            fi

            # 清理临时文件
            rm -f "$TEMP_TRANSCRIPT"
        else
            log "⚠️ auto-precipitate.py 不存在"
        fi
    fi

    # 更新知识系统状态
    if command -v python3 &> /dev/null; then
        python3 -c "
import json
from datetime import datetime

state_file = '$KNOWLEDGE_STATE'
try:
    with open(state_file, 'r+') as f:
        d = json.load(f)
        d['lastUpdate'] = datetime.now().isoformat()
        d['lastUpdateBy'] = 'stop-hook'
        d['sessionCaptured'] = d.get('sessionCaptured', 0) + 1
        d['sessionScore'] = $SCORE
        f.seek(0)
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.truncate()
    print('状态已更新')
except Exception as e:
    print(f'更新状态失败: {e}')
" 2>&1 | tee -a "$LOG_FILE"

        # 同步更新 CLAUDE.md
        SYNC_SCRIPT="$PROJECT_ROOT/scripts/update-claude-md.py"
        if [ -f "$SYNC_SCRIPT" ]; then
            if python3 "$SYNC_SCRIPT" > /dev/null 2>&1; then
                log "✅ CLAUDE.md 已同步"
            fi
        fi
    fi
else
    log "⚪ 未达到阈值 ($SCORE < $THRESHOLD)，跳过"
fi

log "=== Stop Hook 完成 ==="

# 输出 JSON 以支持 hook 系统
echo "{\"status\": \"completed\", \"score\": $SCORE, \"threshold\": $THRESHOLD}"
