#!/bin/bash
# 知识管理系统初始化脚本
# 检查 Git Hook、文档索引、GitHub Actions 等组件状态

set -e

# 支持命令行参数指定项目目录，默认为当前目录
PROJECT_ROOT="${1:-$(pwd)}"

echo "=== 知识管理系统初始化检查 ==="
echo ""

# 1. 检查 Git Hook
echo "1. 检查 Git Hook..."
GIT_HOOK="$PROJECT_ROOT/.git/hooks/post-commit"
if [ -f "$GIT_HOOK" ]; then
    echo "   ✅ Git Hook 已存在: $GIT_HOOK"
else
    echo "   ⚠️  Git Hook 不存在，尝试创建..."
    mkdir -p "$PROJECT_ROOT/.git/hooks"
    cat > "$GIT_HOOK" << 'EOF'
#!/bin/bash
# 知识库自动更新 Hook
# 每次 git commit 后自动检测代码变更并更新知识库

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
KNOWLEDGE_STATE="$PROJECT_ROOT/.knowledge-system.json"

if [ -f "$KNOWLEDGE_STATE" ]; then
    echo "[Knowledge] 检测到代码变更，更新知识库状态..."
    # 更新最后探索时间
    python3 -c "
import json
from datetime import datetime
with open('$KNOWLEDGE_STATE', 'r') as f:
    state = json.load(f)
state['lastCommit'] = datetime.now().isoformat()
with open('$KNOWLEDGE_STATE', 'w') as f:
    json.dump(state, f, indent=2)
"
fi
EOF
    chmod +x "$GIT_HOOK"
    echo "   ✅ Git Hook 已创建"
fi
echo ""

# 2. 检查文档索引
echo "2. 检查文档索引..."
INDEX_FILE="$PROJECT_ROOT/docs/exploration/INDEX.md"
if [ -f "$INDEX_FILE" ]; then
    echo "   ✅ 文档索引已存在: $INDEX_FILE"
    DOC_COUNT=$(find "$PROJECT_ROOT/docs/exploration" -name "*.md" | wc -l)
    echo "   📄 文档数量: $DOC_COUNT"
else
    echo "   ⚠️  文档索引不存在"
    if [ -d "$PROJECT_ROOT/docs/exploration" ]; then
        echo "   🔧 运行生成器..."
        python3 "$HOME/.claude/skills/init-explore/scripts/generate-doc-index.py"
    fi
fi
echo ""

# 3. 检查知识状态文件
echo "3. 检查知识状态文件..."
STATE_FILE="$PROJECT_ROOT/.knowledge-system.json"
if [ -f "$STATE_FILE" ]; then
    echo "   ✅ 知识状态文件存在: $STATE_FILE"
else
    echo "   ⚠️  知识状态文件不存在"
fi
echo ""

# 4. 检查 GitHub Actions
echo "4. 检查 GitHub Actions..."
GHA_DIR="$PROJECT_ROOT/.github/workflows"
if [ -d "$GHA_DIR" ]; then
    echo "   ✅ GitHub Actions 目录存在"
    YML_COUNT=$(find "$GHA_DIR" -name "*.yml" -o -name "*.yaml" | wc -l)
    echo "   📄 Workflow 文件数量: $YML_COUNT"
else
    echo "   ⚠️  GitHub Actions 目录不存在（如需自动更新可创建）"
fi
echo ""

# 5. 检查 understand-anything 目录
echo "5. 检查知识图谱..."
UA_DIR="$PROJECT_ROOT/.understand-anything"
if [ -d "$UA_DIR" ]; then
    echo "   ✅ understand-anything 目录存在"
    GRAPH_FILE="$UA_DIR/graph.json"
    if [ -f "$GRAPH_FILE" ]; then
        NODE_COUNT=$(python3 -c "import json; g=json.load(open('$GRAPH_FILE')); print(len(g.get('nodes', [])))" 2>/dev/null || echo "N/A")
        echo "   🔗 知识图谱节点数: $NODE_COUNT"
    else
        echo "   ⚠️  知识图谱文件不存在"
    fi
else
    echo "   ⚠️  understand-anything 目录不存在（需要运行 /init-explore）"
fi
echo ""

# 6. 检查 CLAUDE.md
echo "6. 检查 CLAUDE.md..."
if [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then
    echo "   ✅ CLAUDE.md 存在"
else
    echo "   ⚠️  CLAUDE.md 不存在"
fi
echo ""

echo "=== 检查完成 ==="
echo ""
echo "如需重新初始化知识库，请运行: /init-explore"
