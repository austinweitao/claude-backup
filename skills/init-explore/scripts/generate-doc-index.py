#!/usr/bin/env python3
"""
文档索引生成器
扫描 docs/exploration/ 目录，生成 INDEX.md 文件
"""

import os
import re
from pathlib import Path
from datetime import datetime

# 使用当前工作目录作为项目根目录
PROJECT_ROOT = Path.cwd()
DOCS_DIR = PROJECT_ROOT / "docs" / "exploration"


def extract_title_and_abstract(filepath: Path) -> tuple:
    """从文档中提取标题和摘要"""
    try:
        content = filepath.read_text(encoding='utf-8')
        lines = content.split('\n')

        # 提取标题 (# 开头)
        title = "Untitled"
        for line in lines:
            if line.startswith('# '):
                title = line[2:].strip()
                break

        # 提取摘要 (前两行非空非标题内容)
        abstract_lines = []
        in_abstract = False
        for line in lines[1:10]:  # 前10行内找摘要
            line = line.strip()
            if line and not line.startswith('#') and not line.startswith('|'):
                abstract_lines.append(line)
                if len(abstract_lines) >= 2:
                    break

        abstract = ' '.join(abstract_lines)[:100]
        return title, abstract
    except Exception as e:
        return filepath.stem, f"Error reading: {e}"


def detect_category(filename: str) -> str:
    """根据文件名检测文档类别"""
    filename_lower = filename.lower()
    if 'overview' in filename_lower or 'project' in filename_lower:
        return "overview"
    elif 'arch' in filename_lower:
        return "architecture"
    elif 'domain' in filename_lower or 'business' in filename_lower:
        return "domain"
    elif 'learn' in filename_lower or 'path' in filename_lower or 'tour' in filename_lower:
        return "learning"
    elif 'symbol' in filename_lower or 'function' in filename_lower or 'code' in filename_lower:
        return "code-analysis"
    elif 'debug' in filename_lower or 'test' in filename_lower:
        return "debugging"
    elif 'index' in filename_lower:
        return "index"
    else:
        return "other"


def generate_index() -> str:
    """生成 INDEX.md 内容"""
    content = []
    content.append("# OpenCoreSDK 知识库索引\n")
    content.append(f"> 自动生成于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    content.append("## 文档列表\n")
    content.append("| 编号 | 标题 | 类别 | 摘要 |")
    content.append("|------|------|------|------|")

    if not DOCS_DIR.exists():
        return "// docs/exploration/ 目录不存在"

    docs = sorted(DOCS_DIR.glob("*.md"))
    for doc in docs:
        if doc.name == "INDEX.md":
            continue
        title, abstract = extract_title_and_abstract(doc)
        category = detect_category(doc.name)
        # 提取编号
        match = re.match(r'^(\d+)', doc.name)
        num = match.group(1) if match else "??"
        content.append(f"| {num} | [{title}](./{doc.name}) | {category} | {abstract}... |")

    content.append("\n## 快速导航\n")
    content.append("### 入门\n")
    content.append("1. 阅读 [项目概览](./01-project-overview.md) 了解项目背景\n")
    content.append("2. 阅读 [学习路径](./04-learning-path.md) 制定学习计划\n")
    content.append("\n### 深入理解\n")
    content.append("3. 阅读 [架构分析](./02-architecture-analysis.md) 掌握设计思想\n")
    content.append("4. 阅读 [领域知识](./03-domain-knowledge.md) 理解核心概念\n")

    content.append("\n## 统计\n")
    content.append(f"- **文档数量**: {len([d for d in docs if d.name != 'INDEX.md'])}\n")
    content.append(f"- **生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    return "\n".join(content)


def main():
    index_content = generate_index()
    index_file = DOCS_DIR / "INDEX.md"

    if not DOCS_DIR.exists():
        print(f"❌ 目录不存在: {DOCS_DIR}")
        return

    index_file.write_text(index_content, encoding='utf-8')
    print(f"✅ 已生成文档索引: {index_file}")
    print(f"   发现 {len(list(DOCS_DIR.glob('*.md')))} 个文档")


if __name__ == "__main__":
    main()
