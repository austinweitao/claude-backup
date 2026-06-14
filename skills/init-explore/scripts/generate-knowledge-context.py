#!/usr/bin/env python3
"""
生成知识上下文摘要
自动注入到会话上下文中

功能:
1. 扫描 docs/exploration/ 提取摘要
2. 生成知识上下文片段 (knowledge-context.md)
3. 可被 CLAUDE.md 引用
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

PROJECT_ROOT = Path(__file__).parent.parent.parent
DOCS_DIR = PROJECT_ROOT / "docs" / "exploration"
CONTEXT_FILE = PROJECT_ROOT / ".understand-anything" / "knowledge-context.md"

def extract_doc_summary(doc_path: Path) -> Dict[str, Any]:
    """提取文档摘要"""
    content = doc_path.read_text(encoding='utf-8')

    # 提取标题
    title = doc_path.stem
    for line in content.split('\n')[:10]:
        if line.startswith('# ') and not title:
            title = line[2:].strip()

    # 提取关键点（以 | 或 - 开头的行）
    key_points = []
    for line in content.split('\n')[10:50]:
        line = line.strip()
        if line.startswith('|') and ('---' not in line):
            key_points.append(line[:100])
        elif line.startswith('- **') or line.startswith('- '):
            key_points.append(line[:100])

    # 提取代码片段（第一个 cpp/java 代码块）
    code_sample = ""
    in_code = False
    for line in content.split('\n'):
        if line.startswith('```'):
            if in_code:
                break
            in_code = True
            continue
        if in_code and len(line) > 10:
            code_sample = line[:80]
            break

    return {
        'title': title,
        'path': doc_path.name,
        'key_points': key_points[:5],
        'code_sample': code_sample
    }

def generate_context_summary(docs: List[Dict]) -> str:
    """生成上下文摘要"""
    lines = []
    lines.append("# 知识上下文摘要")
    lines.append("")
    lines.append(f"> 自动生成于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("**使用规则**: 回答技术问题时，先检查本文档中的知识索引，如有需要再使用 Read 工具加载详细文档。")
    lines.append("")

    for doc in docs:
        lines.append(f"## {doc['title']}")
        lines.append("")
        lines.append(f"**文件**: `{doc['path']}`")
        lines.append("")

        if doc['key_points']:
            lines.append("**关键点**:")
            for point in doc['key_points'][:3]:
                if point:
                    lines.append(f"- {point}")
            lines.append("")

        if doc['code_sample']:
            lines.append(f"**代码示例**: `{doc['code_sample']}...`")
            lines.append("")

    return "\n".join(lines)

def generate_knowledge_checklist() -> str:
    """生成知识检查清单（用于 CLAUDE.md）"""
    lines = []
    lines.append("## 回答前检查清单")
    lines.append("")
    lines.append("回答以下问题时，先检查知识库：")
    lines.append("")
    lines.append("### 信号处理")
    lines.append("- 信号处理流程 → 读取 `docs/exploration/10-signal-handling-flow.md`")
    lines.append("- Signal 处理机制 → 读取 `docs/exploration/08-signal-handling.md`")
    lines.append("")
    lines.append("### 集成指南")
    lines.append("- Java SDK 集成 → 读取 `docs/exploration/11-java-sdk-integration.md`")
    lines.append("- Native SDK 集成 → 读取 `docs/exploration/12-native-sdk-integration.md`")
    lines.append("")
    lines.append("### 架构分析")
    lines.append("- 项目架构 → 读取 `docs/exploration/02-architecture-analysis.md`")
    lines.append("- 多架构支持 → 读取 `docs/exploration/06-multi-arch-support.md`")
    lines.append("")
    lines.append("### ELF Core 格式")
    lines.append("- ELF Core 格式 → 读取 `docs/exploration/09-elf-core-format.md`")
    lines.append("- OpenCoreSDK vs AOSP → 读取 `docs/exploration/13-opencore-vs-aosp-coredump.md`")
    lines.append("")

    return "\n".join(lines)

def main():
    print("=== 生成知识上下文摘要 ===")

    docs = []
    if DOCS_DIR.exists():
        for f in sorted(DOCS_DIR.glob("*.md")):
            if f.name == "INDEX.md":
                continue
            summary = extract_doc_summary(f)
            docs.append(summary)
            print(f"  处理: {f.name}")

    # 生成上下文摘要
    context = generate_context_summary(docs)
    CONTEXT_FILE.write_text(context, encoding='utf-8')
    print(f"\n✅ 生成上下文摘要: {CONTEXT_FILE}")

    # 生成检查清单
    checklist = generate_knowledge_checklist()
    print(f"\n✅ 知识检查清单:")
    print(checklist)

    # 更新状态
    state_file = PROJECT_ROOT / ".knowledge-system.json"
    if state_file.exists():
        state = json.loads(state_file.read_text(encoding='utf-8'))
        state['knowledgeContextGenerated'] = True
        state['lastContextUpdate'] = datetime.now().isoformat()
        state_file.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f"\n共处理 {len(docs)} 个知识文档")

if __name__ == "__main__":
    main()