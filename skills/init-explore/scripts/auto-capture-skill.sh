#!/bin/bash
# 自动知识质量评估
# 用法: bash scripts/auto-evaluate.sh "对话内容" "分析的文件1,文件2,文件3"

CONVERSATION="$1"
ANALYZED_FILES="$2"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 质量阈值
THRESHOLD=4
SCORE=0

echo "=== 自动知识质量评估 ==="
echo ""

# 1. 深度分析加分（3+ 文件）
if [ -n "$ANALYZED_FILES" ]; then
    FILE_COUNT=$(echo "$ANALYZED_FILES" | tr ',' '\n' | wc -l)
    if [ "$FILE_COUNT" -ge 3 ]; then
        SCORE=$((SCORE + 3))
        echo "✅ 深度分析: +3 (分析了 $FILE_COUNT 个文件)"
    fi
fi

# 2. 架构讨论加分
if echo "$CONVERSATION" | grep -qE "架构|分层|设计模式|architecture|layer|pattern"; then
    SCORE=$((SCORE + 2))
    echo "✅ 架构讨论: +2"
fi

# 3. 图表加分
DIAGRAM_COUNT=$(echo "$CONVERSATION" | grep -c "```mermaid" || echo "0")
if [ "$DIAGRAM_COUNT" -ge 1 ]; then
    SCORE=$((SCORE + 2))
    echo "✅ 流程图: +$((DIAGRAM_COUNT * 2)) (包含 $DIAGRAM_COUNT 个图表)"
fi

# 4. 集成指南加分
if echo "$CONVERSATION" | grep -qE "集成|接入|Maven|Gradle|CMake|integration"; then
    SCORE=$((SCORE + 2))
    echo "✅ 集成指南: +2"
fi

# 5. 复杂流程加分
if echo "$CONVERSATION" | grep -qE "流程|时序|步骤|处理流程"; then
    SCORE=$((SCORE + 1))
    echo "✅ 技术流程: +1"
fi

echo ""
echo "质量评分: $SCORE / $THRESHOLD"

# 更新状态
if [ "$SCORE" -ge "$THRESHOLD" ]; then
    echo ""
    echo "✅ 达到自动捕获阈值"

    # 更新时间戳
    mkdir -p "$PROJECT_ROOT/.understand-anything"
    date +%s > "$PROJECT_ROOT/.understand-anything/last-explore.txt"

    # 更新知识系统状态
    if [ -f "$PROJECT_ROOT/.knowledge-system.json" ]; then
        python3 -c "
import json
from datetime import datetime
with open('$PROJECT_ROOT/.knowledge-system.json', 'r+') as f:
    d = json.load(f)
    d['lastUpdate'] = datetime.now().isoformat()
    d['lastUpdateBy'] = 'auto-capture'
    d['autoCapturedCount'] = d.get('autoCapturedCount', 0) + 1
    f.seek(0)
    json.dump(d, f, indent=2, ensure_ascii=False)
    f.truncate()
"
    fi

    echo "✅ 知识系统状态已更新"
    exit 0
else
    echo "⚪ 未达到捕获阈值"
    exit 1
fi