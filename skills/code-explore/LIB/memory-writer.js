/**
 * 知识库沉淀函数
 * @param {string} repoName - 仓库名 (如 "binder", "art")
 * @param {Array} concepts - 概念列表
 * @param {Object} options - 选项
 * @returns {Promise<string[]>} 写入的文件列表
 */
export async function writeMemory(repoName, concepts, options = {}) {
  const {
    baseDir = `${process.env.HOME}/.claude/projects/-home-cwtrocks-linux/memory`,
    dryRun = false,
  } = options;

  const { mkdir, writeFile } = await import('fs/promises');
  const { join } = await import('path');

  const written = [];

  // 确保目录存在
  await mkdir(baseDir, { recursive: true });

  for (const concept of concepts) {
    const slug = concept.slug || concept.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const filename = `${repoName}-${slug}.md`;
    const filepath = join(baseDir, filename);

    const content = `---
name: ${repoName}-${slug}
description: ${concept.summary || concept.description || ''}
metadata:
  type: ${concept.type || 'reference'}
  source: ${concept.source || 'code-explore'}
  created: ${new Date().toISOString().split('T')[0]}
---

# ${concept.title}

${concept.description ? `## 描述\n${concept.description}\n` : ''}

## 核心要点
${(concept.points || []).map(p => `- ${p}`).join('\n')}

${concept.sources?.length ? `## 源码位置\n${concept.sources.map(s => `- \`${s.file}\` :${s.line ? ` line ${s.line}` : ''} ${s.description || ''}`).join('\n')}\n` : ''}

${concept.related?.length ? `## 相关概念\n${concept.related.map(r => `- [[${r}]]`).join('\n')}\n` : ''}

${concept.why ? `**Why:** ${concept.why}\n` : ''}
${concept.howToApply ? `**How to apply:** ${concept.howToApply}\n` : ''}
`;

    if (!dryRun) {
      await writeFile(filepath, content, 'utf-8');
    }

    written.push(filepath);
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}已${dryRun ? '准备写入' : '写入'}: ${filename}`);
  }

  // 更新 MEMORY.md 索引
  if (!dryRun && concepts.length > 0) {
    const indexPath = join(baseDir, 'MEMORY.md');
    let indexContent = '';

    try {
      const { readFile } = await import('fs/promises');
      indexContent = await readFile(indexPath, 'utf-8');
    } catch (e) {
      // 文件不存在，创建新索引
      indexContent = '# Memory Index\n\n';
    }

    // 添加新条目
    const newEntries = concepts.map(c => {
      const slug = c.slug || c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `- [${c.title}](${repoName}-${slug}.md) — ${c.summary || ''}`;
    });

    // 避免重复
    const existingLinks = indexContent.match(/-\s*\[[^\]]+\]\([^)]+\)/g) || [];
    const filteredEntries = newEntries.filter(e => {
      const link = e.match(/-\s*\[([^\]]+)\]/)?.[1];
      return !existingLinks.some(ex => ex.includes(`[${link}]`));
    });

    if (filteredEntries.length > 0) {
      indexContent += '\n' + filteredEntries.join('\n') + '\n';
      await writeFile(indexPath, indexContent, 'utf-8');
      console.log(`已更新 MEMORY.md 索引 (${filteredEntries.length} 条)`);
    }
  }

  return written;
}

/**
 * 从分析结果提取关键概念
 */
export function extractConcepts(analysisResults) {
  const concepts = [];

  // 从架构分析提取模块
  if (analysisResults.architecture?.modules) {
    for (const mod of analysisResults.architecture.modules) {
      concepts.push({
        title: `${mod.name} 模块`,
        summary: mod.responsibility || mod.description || '',
        type: 'reference',
        points: [`职责: ${mod.responsibility}`, `路径: ${mod.path}`],
        related: mod.dependencies?.map(d => `${d} 模块`) || [],
      });
    }
  }

  // 从数据结构分析提取结构体
  if (analysisResults.structures?.structs) {
    for (const struct of analysisResults.structures.structs.slice(0, 10)) {
      concepts.push({
        title: `${struct.name} 结构体`,
        summary: struct.description || `${struct.fields?.length || 0} 个字段`,
        type: 'reference',
        points: struct.fields?.slice(0, 5).map(f => `${f.name}: ${f.type}`) || [],
        sources: [{ file: struct.path, line: struct.line, description: '结构体定义' }],
      });
    }
  }

  // 从关键路径提取流程
  if (analysisResults.paths) {
    for (const path of analysisResults.paths) {
      concepts.push({
        title: `${path.name} 路径`,
        summary: path.description || `${path.steps?.length || 0} 步`,
        type: 'reference',
        points: path.steps?.slice(0, 5).map(s => `${s.function}()`) || [],
        sources: path.steps?.map(s => ({ file: s.file, line: s.line })) || [],
      });
    }
  }

  return concepts;
}
