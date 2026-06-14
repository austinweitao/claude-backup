#!/bin/bash
# 深度代码分析脚本
# 使用 tree-sitter + SCIP + Semgrep 进行细粒度分析

set -e

PROJECT_ROOT="${1:-$(pwd)}"
OUTPUT_DIR="$PROJECT_ROOT/.understand-anything/deep-analysis"
TREE_SITTER_QUERIES="$PROJECT_ROOT/.claude/skills/init-explore/queries"

mkdir -p "$OUTPUT_DIR"

echo "=== 深度代码分析 ==="
echo "项目: $PROJECT_ROOT"
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 0. 检查并安装依赖工具（强制）
# ============================================
ensure_tools_installed() {
    log_info "0. 检查依赖工具..."

    local missing=()

    if ! command -v tree-sitter &> /dev/null; then
        missing+=("tree-sitter")
    fi
    if ! command -v src &> /dev/null; then
        missing+=("src (SCIP)")
    fi
    if ! command -v semgrep &> /dev/null; then
        missing+=("semgrep")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        log_warn "发现缺失工具: ${missing[*]}"
        log_info "自动安装缺失工具..."

        # 调用安装脚本
        bash "$HOME/.claude/skills/init-explore/scripts/install-deep-analysis-tools.sh" || {
            log_error "工具安装失败，将跳过深度分析"
            return 1
        }
    fi

    log_info "所有工具就绪"
    return 0
}

# ============================================
# 1. Tree-sitter AST 分析
# ============================================
run_treesitter_analysis() {
    log_info "1/3. Tree-sitter AST 分析..."

    if ! command -v tree-sitter &> /dev/null; then
        log_error "tree-sitter 仍然未安装，跳过 AST 分析"
        return 1
    fi

    local ast_output="$OUTPUT_DIR/ast-analysis.json"
    local file_count=0
    local symbol_count=0
    local func_count=0

    echo "{" > "$ast_output"
    echo '  "files": [' >> "$ast_output"

    # 查找源代码文件
    while IFS= read -r -d '' file; do
        ((file_count++))

        local rel_path="${file#$PROJECT_ROOT/}"
        echo "    {" >> "$ast_output"
        echo "      \"path\": \"$rel_path\"," >> "$ast_output"
        echo "      \"language\": \"$(detect_language "$file")\"," >> "$ast_output"

        # 解析 AST
        local ast_json
        ast_json=$(tree-sitter parse "$file" 2>/dev/null | head -100 || echo "")

        # 提取函数
        local funcs
        funcs=$(echo "$ast_json" | grep -oE '(function_definition|method_definition|class_declaration)' | wc -l || echo "0")
        ((func_count+=funcs))

        echo "      \"functions\": $funcs," >> "$ast_output"
        echo "      \"symbols\": $(echo "$ast_json" | grep -c 'identifier' || echo "0")" >> "$ast_output"

        # 提取注释
        local comments
        comments=$(echo "$ast_json" | grep -cE 'comment|block_comment|line_comment' || echo "0")
        echo "      \"comments\": $comments" >> "$ast_output"

        echo "    }," >> "$ast_output"

        if [ $file_count -ge 50 ]; then
            log_warn "AST 分析限制 50 个文件"
            break
        fi
    done < <(find "$PROJECT_ROOT" -type f \( -name "*.c" -o -name "*.cpp" -o -name "*.h" -o -name "*.java" -o -name "*.py" -o -name "*.js" -o -name "*.ts" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/build/*" ! -path "*/output/*" -print0 2>/dev/null)

    # 移除最后一个逗号
    sed -i '$ s/,$//' "$ast_output"

    echo "  ]," >> "$ast_output"
    echo "  \"summary\": {" >> "$ast_output"
    echo "    \"total_files\": $file_count," >> "$ast_output"
    echo "    \"total_functions\": $func_count" >> "$ast_output"
    echo "  }" >> "$ast_output"
    echo "}" >> "$ast_output"

    log_info "  AST 分析完成: $file_count 文件, $func_count 函数"
    return 0
}

# ============================================
# 2. SCIP 符号索引
# ============================================
run_scip_analysis() {
    log_info "2/3. SCIP 符号索引..."

    if ! command -v scip &> /dev/null; then
        log_error "SCIP 仍然未安装，跳过符号索引"
        return 1
    fi

    cd "$PROJECT_ROOT"

    # 生成 SCIP 索引
    if scip index . --no-progress 2>/dev/null; then
        mv "*.scip" "$OUTPUT_DIR/" 2>/dev/null || true
        ls -la "$OUTPUT_DIR"/*.scip 2>/dev/null && log_info "  SCIP 索引生成完成" || log_warn "  SCIP 索引文件未找到"
    else
        log_warn "SCIP 索引生成失败"
    fi

    return 0
}

# ============================================
# 3. Semgrep 模式分析
# ============================================
run_semgrep_analysis() {
    log_info "3/3. Semgrep 模式分析..."

    if ! command -v semgrep &> /dev/null; then
        log_error "Semgrep 仍然未安装，跳过模式分析"
        return 1
    fi

    local semgrep_output="$OUTPUT_DIR/semgrep-results.json"

    # 运行 Semgrep 规则
    cd "$PROJECT_ROOT"

    # 使用基础规则扫描
    semgrep --quiet --json --no-progress \
        --config "auto" \
        --targets "./opencore/src ./app/src" \
        2>/dev/null > "$semgrep_output" || {
        log_warn "Semgrep 扫描完成（可能有错误）"
    }

    # 统计结果
    if [ -f "$semgrep_output" ]; then
        local findings
        findings=$(python3 -c "import json; d=json.load(open('$semgrep_output')); print(len(d.get('results', [])))" 2>/dev/null || echo "0")
        log_info "  Semgrep 分析完成: $findings 发现"
    fi

    return 0
}

# ============================================
# 辅助函数
# ============================================
detect_language() {
    local file="$1"
    case "${file##*.}" in
        c|h) echo "c";;
        cpp|cc|cxx) echo "cpp";;
        java) echo "java";;
        py) echo "python";;
        js) echo "javascript";;
        ts) echo "typescript";;
        rs) echo "rust";;
        go) echo "go";;
        *) echo "unknown";;
    esac
}

# ============================================
# 主流程
# ============================================
main() {
    echo "开始深度代码分析..."
    echo ""

    # 强制检查并安装依赖工具
    if ! ensure_tools_installed; then
        log_error "依赖工具安装失败，深度分析无法继续"
        echo ""
        echo "=== 深度分析中止 ==="
        echo "请手动安装工具后重试:"
        echo "  bash ~/.claude/skills/init-explore/scripts/install-deep-analysis-tools.sh"
        exit 1
    fi

    run_treesitter_analysis
    run_scip_analysis
    run_semgrep_analysis

    echo ""
    echo "=== 深度分析完成 ==="
    echo "输出目录: $OUTPUT_DIR"
    echo ""
    ls -la "$OUTPUT_DIR/" 2>/dev/null || true
}

main "$@"