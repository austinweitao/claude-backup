#!/usr/bin/env python3
"""
自动知识沉淀脚本
从 transcript 中提取高质量对话并生成知识文档

触发条件: stop-hook 质量评分 >= 阈值
"""

import os
import re
import json
import glob
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import sys

PROJECT_ROOT = Path(os.environ.get('CLAUDE_PROJECT_ROOT', '.')).resolve()
EXPLORATION_DIR = PROJECT_ROOT / "docs" / "exploration"
CLAUDE_MD = PROJECT_ROOT / "CLAUDE.md"
KNOWLEDGE_STATE = PROJECT_ROOT / ".knowledge-system.json"


def extract_messages_from_transcript(transcript_content: str) -> List[Dict]:
    """从 JSONL transcript 中提取消息，支持多种格式"""

    lines = [l.strip() for l in transcript_content.strip().split('\n') if l.strip()]
    if not lines:
        return []

    messages = []

    for line in lines:
        try:
            entry = json.loads(line)
            msg_type = entry.get('type', '')
            entry_data = entry.get('message', {})

            # 1. 处理完整 transcript 格式 (assistant/user 类型)
            if msg_type in ('user', 'assistant'):
                content_list = entry_data.get('content', [])

                if isinstance(content_list, list):
                    # 提取 text 类型的内容
                    for item in content_list:
                        if isinstance(item, dict):
                            item_type = item.get('type', '')
                            if item_type == 'text':
                                text = item.get('text', '').strip()
                                if text and len(text) > 10:
                                    messages.append({
                                        'role': 'assistant' if msg_type == 'assistant' else 'user',
                                        'content': text
                                    })
                else:
                    # 处理其他格式
                    content = entry_data.get('content', '')
                    if content and isinstance(content, str) and len(content) > 10:
                        messages.append({
                            'role': 'assistant' if msg_type == 'assistant' else 'user',
                            'content': strip_html_tags(content)
                        })

            # 2. 处理 history.jsonl 格式 (display 字段)
            elif 'display' in entry:
                display = entry.get('display', '')
                if display and len(display) > 3:
                    # 检查 pastedContents
                    pasted = entry.get('pastedContents', {})
                    if pasted:
                        for key, value in pasted.items():
                            if isinstance(value, dict) and 'content' in value:
                                content = value.get('content', '')
                                if content and len(content) > 20:
                                    messages.append({
                                        'role': 'assistant',
                                        'content': content
                                    })

                    # display 通常是用户消息
                    if not display.startswith('/') and not display.startswith('$'):
                        messages.append({
                            'role': 'user',
                            'content': strip_html_tags(display)
                        })

        except (json.JSONDecodeError, KeyError):
            continue

    return messages


def strip_html_tags(text: str) -> str:
    """去除 HTML 标签"""
    return re.sub(r'<[^>]+>', '', text).strip()


def assess_llm_response_quality(messages: List[Dict]) -> Tuple[int, str]:
    """
    专门评估 LLM 回复质量

    Returns:
        (score, reasons): 评分和原因
    """
    # 只取助手消息
    assistant_msgs = [m for m in messages if m.get('role') == 'assistant']
    if not assistant_msgs:
        return 0, "无 LLM 回复"

    assistant_text = '\n'.join([m['content'] for m in assistant_msgs])

    score = 0
    reasons = []

    # 1. Mermaid 图表 (每个 +3)
    diagrams = len(re.findall(r'```mermaid', assistant_text))
    if diagrams > 0:
        score += diagrams * 3
        reasons.append(f"+{diagrams * 3}({diagrams}个图表)")

    # 2. 代码片段 (每个 +2)
    code_blocks = len(re.findall(r'```\w+', assistant_text))
    if code_blocks > 0:
        score += code_blocks * 2
        reasons.append(f"+{code_blocks * 2}({code_blocks}段代码)")

    # 3. 表格行 (每个 +1)
    tables = assistant_text.count('| --- |')
    if tables > 0:
        score += tables * 1
        reasons.append(f"+{tables}({tables}个表格)")

    # 4. 技术关键词 (每个 +2)
    tech_kw = ['架构', '分层', '设计模式', 'ELF', 'ARM64', 'coredump', '信号处理',
                'Android', 'kernel', 'ptrace', 'VMA', '寄存器', '内存', '调试']
    kw_count = sum(1 for kw in tech_kw if kw in assistant_text)
    if kw_count > 0:
        score += kw_count * 2
        reasons.append(f"+{kw_count * 2}({kw_count}个技术词)")

    # 5. 详细解释 (平均回复长度 > 500 字符 +3)
    avg_len = sum(len(m['content']) for m in assistant_msgs) / len(assistant_msgs)
    if avg_len > 500:
        score += 3
        reasons.append("+3(详细解释)")

    # 6. 引用代码/文档 (每个 +1)
    refs = len(re.findall(r'\[.*\]\(.*\)', assistant_text))  # markdown 链接
    if refs > 0:
        score += min(refs, 5)  # 最多 +5
        reasons.append(f"+{min(refs, 5)}({refs}个引用)")

    return score, ', '.join(reasons) if reasons else "无加分项"


def extract_knowledge_topics(messages: List[Dict]) -> Dict:
    """从消息中提取知识主题"""
    full_text = '\n'.join([m['content'] for m in messages])
    user_text = '\n'.join([m['content'] for m in messages if m.get('role') == 'user'])

    topics = {
        'title': '',
        'category': 'technical',
        'files_analyzed': [],
        'has_diagram': False,
        'has_architecture': False,
        'key_concepts': [],
        'summary': '',
        'code_snippets': [],
        'mermaid_diagrams': []
    }

    # 改进：从用户消息中提取关键主题词
    tech_keywords = {
        'coredump': 'Coredump 内容分析',
        'elf': 'ELF 文件格式',
        'arm64': 'ARM64 架构',
        'mte': 'MTE 内存标签',
        'pac': 'PAC 指针认证',
        'signal': '信号处理',
        'ptrace': 'Ptrace 调试',
        'zygote': 'Zygote 进程',
        'jni': 'JNI 桥接',
        'opencore': 'OpenCoreSDK',
        'crash': '崩溃捕获',
        'core-parser': 'Core Parser 工具',
        'android': 'Android 系统',
        'kernel': '内核机制',
        'vma': '虚拟内存区域',
        'stack': '堆栈回溯',
        'tombstone': 'Tombstone 分析',
        'asan': 'ASan 内存检测',
        'hwasan': 'HWASan 内存检测',
        'lldb': 'LLDB 调试',
        'gdb': 'GDB 调试',
    }

    # 匹配技术主题
    detected_topics = []
    for keyword, topic_name in tech_keywords.items():
        if keyword.lower() in user_text.lower():
            detected_topics.append(topic_name)

    # 生成标题
    if detected_topics:
        # 去重并限制数量
        unique_topics = list(dict.fromkeys(detected_topics))[:3]
        topics['title'] = ' / '.join(unique_topics)
        topics['category'] = 'technical'
        # 提取关键概念
        for t in unique_topics:
            topics['key_concepts'].append((t, '本次对话涉及的核心主题'))
    else:
        # 从最后一条用户消息推断
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                content = msg['content'][:100]
                # 清理并截取
                title = re.sub(r'[^\w一-鿿]+', ' ', content).strip()
                topics['title'] = title or '技术分析'
                break

    # 检测文件路径
    file_pattern = re.compile(r'([a-zA-Z0-9_/]+\.(cpp|h|java|py|kt|md))')
    topics['files_analyzed'] = list(set(file_pattern.findall(full_text)))[:10]

    # 检测 Mermaid 图表
    if '```mermaid' in full_text:
        topics['has_diagram'] = True
        mermaid_pattern = re.compile(r'```mermaid\s*(.*?)```', re.DOTALL)
        topics['mermaid_diagrams'] = mermaid_pattern.findall(full_text)

    # 检测架构关键词
    arch_keywords = ['架构', '分层', '设计模式', 'architecture', 'layer', 'pattern', 'component']
    topics['has_architecture'] = any(kw in full_text.lower() for kw in arch_keywords)

    # 提取代码片段
    code_pattern = re.compile(r'```[\w]*\s*(.*?)```', re.DOTALL)
    topics['code_snippets'] = code_pattern.findall(full_text)[:5]

    # 提取标题（查找 # 开头的内容或总结性语句）
    title_pattern = re.compile(r'^#\s+(.+)$', re.MULTILINE)
    titles = title_pattern.findall(full_text)
    if titles:
        topics['title'] = titles[0].strip()

    # 提取关键概念（查找加粗或特定模式）
    concept_pattern = re.compile(r'\*\*(.+?)\*\*[:：]?\s*(.+?)(?=\n\n|\*\*)')
    concepts = concept_pattern.findall(full_text)[:10]
    topics['key_concepts'] = [(c[0].strip(), c[1].strip()[:100]) for c in concepts]

    return topics


def infer_document_title(messages: List[Dict], files: List) -> str:
    """从对话内容推断文档标题"""
    # 查找用户问题作为标题候选
    user_questions = []
    assistant_content = []

    for msg in messages:
        if msg['role'] == 'user':
            content = msg['content'].strip()
            if content and len(content) < 200:
                user_questions.append(content)
        else:
            assistant_content.append(msg['content'])

    # 从文件路径推断
    if files:
        file_paths = [f[0] if isinstance(f, tuple) else f for f in files[:3]]
        if file_paths:
            # 提取目录和文件名
            main_topic = file_paths[0]
            if '/' in main_topic:
                parts = main_topic.split('/')
                main_topic = parts[-1].replace('.cpp', '').replace('.h', '')

    # 使用最后一个用户问题
    if user_questions:
        last_question = user_questions[-1]
        # 清理并截取
        title = re.sub(r'[^\w一-鿿]+', ' ', last_question).strip()
        if len(title) > 50:
            title = title[:50] + '...'
        return title or '技术分析'

    return '技术分析'


def generate_markdown_content(messages: List[Dict], topics: Dict, score: int) -> str:
    """生成 Markdown 格式的沉淀文档"""
    lines = []
    title = topics.get('title') or infer_document_title(messages, topics.get('files_analyzed', []))
    now = datetime.now().strftime('%Y-%m-%d')

    # 头部
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"> 生成时间: {now} | 来源: auto-precipitate (score={score})")
    lines.append("")

    # 分析的文件
    files = topics.get('files_analyzed', [])
    if files:
        lines.append("## 分析的文件")
        lines.append("")
        for f in files[:10]:
            path = f[0] if isinstance(f, tuple) else f
            lines.append(f"- `{path}`")
        lines.append("")

    # 核心发现
    lines.append("## 核心发现")
    lines.append("")

    key_concepts = topics.get('key_concepts', [])
    if key_concepts:
        for concept, desc in key_concepts:
            lines.append(f"- **{concept}**: {desc}")
    else:
        # 从用户问题中提取技术主题作为要点
        user_messages = [m['content'] for m in messages if m.get('role') == 'user']
        if user_messages:
            lines.append(f"- **主题**: {topics.get('title', '技术分析')}")
            # 提取关键问题
            for msg in user_messages[-5:]:  # 最近 5 条用户消息
                if len(msg) > 20 and len(msg) < 300:
                    # 清理并截取
                    cleaned = re.sub(r'[^\w一-鿿\s]', ' ', msg)[:150].strip()
                    if cleaned:
                        lines.append(f"- {cleaned}")

    lines.append("")

    # Mermaid 图表
    diagrams = topics.get('mermaid_diagrams', [])
    if diagrams:
        lines.append("## 流程图/架构图")
        lines.append("")
        for i, diagram in enumerate(diagrams[:3], 1):
            lines.append(f"### 图 {i}")
            lines.append("")
            lines.append("```mermaid")
            lines.append(diagram.strip())
            lines.append("```")
            lines.append("")

    # 代码示例
    code_snippets = topics.get('code_snippets', [])
    if code_snippets:
        lines.append("## 代码示例")
        lines.append("")
        for i, code in enumerate(code_snippets[:3], 1):
            if len(code) > 50:  # 忽略太短的片段
                lines.append("```cpp")
                lines.append(code[:800].strip())
                lines.append("```")
                lines.append("")

    # 技术细节
    lines.append("## 技术细节")
    lines.append("")

    # 提取要点列表
    full_text = '\n'.join([m['content'] for m in messages])
    bullet_points = re.findall(r'^\s*[-*]\s+(.+)$', full_text, re.MULTILINE)
    for point in bullet_points[:10]:
        if len(point) > 20 and len(point) < 200:
            lines.append(f"- {point}")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append(f"**质量评分**: {score}")
    lines.append(f"**自动生成**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    return '\n'.join(lines)


def get_next_doc_number() -> int:
    """获取下一个文档编号"""
    if not EXPLORATION_DIR.exists():
        return 1

    existing = list(EXPLORATION_DIR.glob("[0-9][0-9]-*.md"))
    if not existing:
        return 1

    numbers = []
    for f in existing:
        name = f.stem
        if name[0].isdigit():
            try:
                num = int(name[:2])
                numbers.append(num)
            except ValueError:
                continue

    return max(numbers) + 1 if numbers else 1


def update_claude_md_index(doc_filename: str, title: str, category: str = 'technical'):
    """更新 CLAUDE.md 的知识库索引"""
    if not CLAUDE_MD.exists():
        return False

    content = CLAUDE_MD.read_text(encoding='utf-8')

    # 提取编号
    doc_num = doc_filename[:2]

    # 查找索引表的位置
    if '| 编号 |' not in content:
        return False

    # 构建新索引行
    today = datetime.now().strftime('%Y-%m-%d')
    new_entry = f"| {doc_num} | [{title}](./docs/exploration/{doc_filename}) | {category} | auto-generated |"

    # 在第一行之后插入（找到 | --- | --- | 之后的第一个空行或表格行之后）
    lines = content.split('\n')
    new_lines = []
    inserted = False

    for i, line in enumerate(lines):
        new_lines.append(line)
        if not inserted and '| 编号 |' in line:
            # 找到表头后的分隔线
            if i + 2 < len(lines) and '| --- |' in lines[i + 1]:
                # 在分隔线后添加新行
                new_lines.append(new_entry)
                inserted = True

    if inserted:
        CLAUDE_MD.write_text('\n'.join(new_lines), encoding='utf-8')
        return True
    return False


def update_knowledge_state(doc_filename: str, score: int):
    """更新知识系统状态"""
    if not KNOWLEDGE_STATE.exists():
        return

    try:
        with open(KNOWLEDGE_STATE, 'r', encoding='utf-8') as f:
            state = json.load(f)

        state['lastUpdate'] = datetime.now().isoformat()
        state['lastUpdateBy'] = 'auto-precipitate'
        state['docCount'] = state.get('docCount', 0) + 1
        state['lastDoc'] = doc_filename
        state['lastScore'] = score

        with open(KNOWLEDGE_STATE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"更新状态失败: {e}")


def main():
    global PROJECT_ROOT, EXPLORATION_DIR, CLAUDE_MD, KNOWLEDGE_STATE

    if len(sys.argv) < 2:
        print("用法: auto-precipitate.py <transcript_file> [score]")
        sys.exit(1)

    transcript_file = sys.argv[1]
    bash_score = int(sys.argv[2]) if len(sys.argv) > 2 else 5

    # 重新读取环境变量，确保获取最新值
    PROJECT_ROOT = Path(os.environ.get('CLAUDE_PROJECT_ROOT', '.')).resolve()
    EXPLORATION_DIR = PROJECT_ROOT / "docs" / "exploration"
    CLAUDE_MD = PROJECT_ROOT / "CLAUDE.md"
    KNOWLEDGE_STATE = PROJECT_ROOT / ".knowledge-system.json"

    if not Path(transcript_file).exists():
        print(f"Transcript 文件不存在: {transcript_file}")
        sys.exit(1)

    print("=== 自动知识沉淀 ===")
    print(f"项目: {PROJECT_ROOT}")
    print(f"Transcript: {transcript_file}")

    # 读取 transcript
    with open(transcript_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 提取消息
    messages = extract_messages_from_transcript(content)
    print(f"提取到 {len(messages)} 条消息 (用户: {len([m for m in messages if m['role']=='user'])}, 助手: {len([m for m in messages if m['role']=='assistant'])})")

    if not messages:
        print("无有效消息，跳过")
        sys.exit(0)

    # 使用 LLM 回复质量评估
    score, score_reasons = assess_llm_response_quality(messages)
    print(f"🏆 LLM 回复质量评分: {score} (加分项: {score_reasons})")

    # 提取知识主题
    topics = extract_knowledge_topics(messages)

    # 生成文档
    doc_content = generate_markdown_content(messages, topics, score)

    # 确定文档编号和文件名
    doc_num = get_next_doc_number()
    title = topics.get('title') or infer_document_title(messages, topics.get('files_analyzed', []))
    # 清理标题用于文件名
    safe_title = re.sub(r'[^\w一-鿿-]', '-', title)[:40]
    doc_filename = f"{doc_num:02d}-{safe_title}.md"

    # 确保目录存在
    EXPLORATION_DIR.mkdir(parents=True, exist_ok=True)

    # 写入文档
    doc_path = EXPLORATION_DIR / doc_filename
    doc_path.write_text(doc_content, encoding='utf-8')
    print(f"✅ 生成文档: {doc_filename}")

    # 更新索引和状态
    update_claude_md_index(doc_filename, title)
    update_knowledge_state(doc_filename, score)

    print("✅ 索引和状态已更新")
    print(f"=== 完成 ===")

    return doc_filename


if __name__ == "__main__":
    main()
