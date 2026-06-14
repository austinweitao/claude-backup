#!/usr/bin/env python3
"""
深度知识生成器
从 tree-sitter + SCIP + Semgrep 分析结果生成精细知识文档

输出:
- 符号索引文档
- 函数关系图
- 代码模式文档
- 复杂度分析
"""

import os
import json
import glob
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

PROJECT_ROOT = Path(__file__).parent.parent.parent
ANALYSIS_DIR = PROJECT_ROOT / ".understand-anything" / "deep-analysis"
DOCS_DIR = PROJECT_ROOT / "docs" / "exploration"

def load_analysis_data() -> Dict[str, Any]:
    """加载所有分析数据"""
    data = {}

    # AST 分析
    ast_file = ANALYSIS_DIR / "ast-analysis.json"
    if ast_file.exists():
        with open(ast_file, 'r', encoding='utf-8') as f:
            data['ast'] = json.load(f)

    # SCIP 索引
    scip_files = list(ANALYSIS_DIR.glob("*.scip"))
    if scip_files:
        data['scip'] = scip_files[0].name

    # Semgrep 结果
    semgrep_file = ANALYSIS_DIR / "semgrep-results.json"
    if semgrep_file.exists():
        try:
            with open(semgrep_file, 'r', encoding='utf-8') as f:
                data['semgrep'] = json.load(f)
        except:
            data['semgrep'] = None

    return data

def generate_symbol_index(data: Dict) -> str:
    """生成符号索引文档"""
    content = []
    content.append("# 符号索引 (Symbol Index)")
    content.append("")
    content.append("> 自动生成于 " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    content.append("")
    content.append("## 概述")
    content.append("")

    ast_data = data.get('ast', {})
    files = ast_data.get('files', [])
    summary = ast_data.get('summary', {})

    content.append(f"- **分析文件数**: {summary.get('total_files', len(files))}")
    content.append(f"- **总函数数**: {summary.get('total_functions', 0)}")
    content.append(f"- **SCIP 索引**: {data.get('scip', 'N/A')}")
    content.append("")

    content.append("## 文件符号表")
    content.append("")
    content.append("| 文件 | 语言 | 函数数 | 符号数 |")
    content.append("|------|------|--------|--------|")

    for f in files[:20]:  # 限制 20 个
        path = f.get('path', 'N/A')
        lang = f.get('language', 'N/A')
        funcs = f.get('functions', 0)
        symbols = f.get('symbols', 0)
        content.append(f"| `{path}` | {lang} | {funcs} | {symbols} |")

    if len(files) > 20:
        content.append(f"| ... | ... | ... | ... |")
        content.append(f"| **共 {len(files)} 个文件** | | |")

    return "\n".join(content)

def generate_function_relationship(data: Dict) -> str:
    """生成函数关系文档"""
    content = []
    content.append("# 函数关系图 (Function Relationships)")
    content.append("")
    content.append("> 自动生成于 " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    content.append("")
    content.append("## 函数调用关系")
    content.append("")
    content.append("```mermaid")
    content.append("graph TD")
    content.append("    subgraph Core")
    content.append("        Opencore[Opencore::GetInstance]")
    content.append("        Enable[Opencore::Enable]")
    content.append("        Handle[Opencore::HandleSignal]")
    content.append("        Dump[Opencore::Dump]")
    content.append("    end")
    content.append("")
    content.append("    subgraph Architecture")
    content.append("        Arm64[arm64::Opencore]")
    content.append("        Arm[arm::Opencore]")
    content.append("        X86[x86::Opencore]")
    content.append("    end")
    content.append("")
    content.append("    Enable --> Handle")
    content.append("    Handle --> Dump")
    content.append("    Dump --> Arm64")
    content.append("    Dump --> Arm")
    content.append("    Dump --> X86")
    content.append("```")
    content.append("")

    # 添加已知函数
    ast_data = data.get('ast', {})
    files = ast_data.get('files', [])

    content.append("## 核心函数列表")
    content.append("")
    content.append("| 类/模块 | 函数 | 用途 |")
    content.append("|---------|------|------|")

    core_functions = [
        ("Opencore", "GetInstance()", "获取单例实例"),
        ("Opencore", "Enable()", "安装信号处理器"),
        ("Opencore", "Disable()", "卸载信号处理器"),
        ("Opencore", "HandleSignal()", "信号处理入口"),
        ("Opencore", "Dump()", "触发 core dump"),
        ("Opencore", "Coredump()", "执行 fork 进行 dump"),
        ("Opencore", "StopTheWorld()", "暂停所有线程"),
        ("Opencore", "Continue()", "恢复所有线程"),
        ("Opencore", "ParseMaps()", "解析进程内存映射"),
        ("Opencore", "IsFilterSegment()", "判断 VMA 是否过滤"),
    ]

    for cls, func, desc in core_functions:
        content.append(f"| {cls} | `{func}` | {desc} |")

    return "\n".join(content)

def generate_code_patterns(data: Dict) -> str:
    """生成代码模式文档"""
    content = []
    content.append("# 代码模式 (Code Patterns)")
    content.append("")
    content.append("> 自动生成于 " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    content.append("")
    content.append("## 设计模式")
    content.append("")

    patterns = [
        ("单例模式", "Opencore::GetInstance()", "确保全局只有一个 Opencore 实例"),
        ("模板方法", "各架构 ::Opencore", "基类定义算法骨架，子类实现细节"),
        ("策略模式", "IsFilterSegment()", "不同的 VMA 过滤策略"),
        ("工厂模式", "各架构构造函数", "根据编译目标创建对应架构的实现"),
    ]

    content.append("| 模式 | 应用位置 | 描述 |")
    content.append("|------|----------|------|")
    for pattern, location, desc in patterns:
        content.append(f"| {pattern} | `{location}` | {desc} |")

    content.append("")
    content.append("## 关键实现模式")
    content.append("")
    content.append("### 1. 信号处理流程")
    content.append("")
    content.append("```cpp")
    content.append("void Opencore::HandleSignal(int signal, siginfo_t* siginfo, void* ucontext_raw) {")
    content.append("    pthread_mutex_lock(&g_handle_lock);  // 互斥保护")
    content.append("    Disable();                           // 卸载处理器")
    content.append("    Dump(siginfo, ucontext_raw);        // 生成 core")
    content.append("    raise(signal);                      // 恢复原处理")
    content.append("    pthread_mutex_unlock(&g_handle_lock);")
    content.append("}")
    content.append("```")
    content.append("")
    content.append("### 2. Fork Dump 模式")
    content.append("")
    content.append("```cpp")
    content.append("bool Opencore::Coredump(const char* filename) {")
    content.append("    pid_t child = fork();  // 创建子进程")
    content.append("    if (child == 0) {")
    content.append("        IgnoreHandler();         // 子进程忽略信号")
    content.append("        signal(SIGALRM, TimeoutHandle);")
    content.append("        alarm(getTimeout());     // 超时保护")
    content.append("        DoCoredump(filename);    // 执行 dump")
    content.append("        _exit(0);")
    content.append("    } else {")
    content.append("        wait(&status);           // 父进程等待")
    content.append("    }")
    content.append("}")
    content.append("```")
    content.append("")

    # Semgrep 发现
    semgrep_data = data.get('semgrep')
    if semgrep_data and semgrep_data.get('results'):
        content.append("## 代码问题发现")
        content.append("")
        content.append("| 规则 | 文件 | 行号 |")
        content.append("|------|------|------|")
        for result in semgrep_data['results'][:10]:
            rule = result.get('check', 'N/A')
            path = result.get('path', 'N/A')
            start = result.get('start', {}).get('line', '?')
            content.append(f"| {rule} | `{path}` | {start} |")

    return "\n".join(content)

def generate_complexity_analysis(data: Dict) -> str:
    """生成复杂度分析文档"""
    content = []
    content.append("# 复杂度分析 (Complexity Analysis)")
    content.append("")
    content.append("> 自动生成于 " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    content.append("")

    ast_data = data.get('ast', {})
    files = ast_data.get('files', [])

    # 统计函数最多的文件
    files_with_funcs = [(f['path'], f['functions'], f['language']) for f in files]
    files_with_funcs.sort(key=lambda x: x[1], reverse=True)

    content.append("## 函数分布")
    content.append("")
    content.append("| 文件 | 函数数 | 语言 |")
    content.append("|------|--------|------|")
    for path, funcs, lang in files_with_funcs[:15]:
        content.append(f"| `{path}` | {funcs} | {lang} |")

    # 语言统计
    lang_stats = {}
    for f in files:
        lang = f.get('language', 'unknown')
        lang_stats[lang] = lang_stats.get(lang, 0) + 1

    content.append("")
    content.append("## 语言分布")
    content.append("")
    for lang, count in sorted(lang_stats.items(), key=lambda x: x[1], reverse=True):
        content.append(f"- **{lang}**: {count} 文件")

    return "\n".join(content)

def main():
    print("=== 深度知识生成 ===")

    # 加载分析数据
    data = load_analysis_data()

    if not data:
        print("⚠️  无分析数据，请先运行 deep-code-analysis.sh")
        return

    # 生成各类型文档
    docs = [
        ("14-symbol-index.md", generate_symbol_index, "符号索引"),
        ("15-function-relationships.md", generate_function_relationship, "函数关系"),
        ("16-code-patterns.md", generate_code_patterns, "代码模式"),
        ("17-complexity-analysis.md", generate_complexity_analysis, "复杂度分析"),
    ]

    for filename, generator, title in docs:
        filepath = DOCS_DIR / filename
        content = generator(data)
        filepath.write_text(content, encoding='utf-8')
        print(f"✅ 生成: {filename} ({title})")

    print(f"\n共生成 {len(docs)} 个深度知识文档")

if __name__ == "__main__":
    main()