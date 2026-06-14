/**
 * init-explore Workflow - 并行探索版本
 *
 * 改进：
 * 1. 阶段1-3 完全并行执行（project-scanner, architecture-analyzer, domain-analyzer）
 * 2. 阶段4 文件分析使用更高效的 pipeline
 * 3. 阶段5-6 可以与阶段4的部分工作交叉进行
 * 4. 知识沉淀使用并行创建多个文档
 *
 * 加速比：理论上可达 3-5x（取决于项目规模和子任务依赖）
 */

export const meta = {
  name: 'explore-codebase',
  description: '并行探索代码库 - 多subagent协同加速知识库初始化',
  phases: [
    { title: '扫描分析', detail: '并行执行项目扫描、架构分析、领域分析' },
    { title: '文件分析', detail: '批量并行分析核心源文件' },
    { title: '学习路径', detail: '生成学习路径' },
    { title: '图谱审查', detail: '审查验证知识图谱' },
    { title: '知识沉淀', detail: '并行创建多个知识文档' }
  ]
}

// 阶段1：并行扫描三剑客（project-scanner, architecture-analyzer, domain-analyzer）
// 关键改进：这3个任务完全独立，可以同时执行
phase('扫描分析')

// 使用 parallel() 同时启动3个独立的分析任务
const [scanResult, archResult, domainResult] = await parallel([
  () => agent(
    '扫描项目结构，识别：
     - 项目名称、主要语言、文件数量
     - 构建系统（CMake/Maven/npm/Gradle等）
     - 第三方依赖列表
     - 关键入口点（main.java, CMakeLists.txt等）
     - 目录结构和模块划分',
    {
      agentType: 'understand-anything:project-scanner',
      label: 'project-scanner',
      phase: '扫描分析'
    }
  ),
  () => agent(
    '深度分析代码架构：
     - 逻辑分层（UI层/业务层/数据层等）
     - 模块间依赖关系和调用链
     - 设计模式识别（单例/工厂/观察者等）
     - 组件依赖图和数据流向
     - 核心类和方法的关系',
    {
      agentType: 'understand-anything:architecture-analyzer',
      label: 'architecture-analyzer',
      phase: '扫描分析'
    }
  ),
  () => agent(
    '提取业务领域知识：
     - 核心业务领域和子领域划分
     - 关键业务概念和术语
     - 业务流程和操作步骤
     - 领域模型（实体/值对象/聚合）
     - 业务规则和约束条件',
    {
      agentType: 'understand-anything:domain-analyzer',
      label: 'domain-analyzer',
      phase: '扫描分析'
    }
  )
])

log(`扫描分析完成：project-scanner + architecture-analyzer + domain-analyzer 并行执行`)

// 阶段2：智能识别需要深度分析的文件
// 从扫描结果中提取关键文件路径
const criticalFiles = extractCriticalFiles(scanResult, archResult)
log(`识别到 ${criticalFiles.length} 个核心文件待分析: ${criticalFiles.slice(0, 5).join(', ')}...`)

// 阶段2：并行文件分析（使用 pipeline 提高并发度）
phase('文件分析')
const fileAnalyses = await pipeline(
  criticalFiles,
  async (file, index) => agent(
    `深度分析源文件: ${file}
     提取内容：
     - 类结构、成员变量、方法签名
     - 关键算法和业务逻辑
     - 数据结构设计
     - 代码注释中的设计决策
     - 依赖的外部模块`,
    {
      agentType: 'understand-anything:file-analyzer',
      label: `file-analyzer:${file.split('/').pop()}`,
      phase: '文件分析'
    }
  ),
  { concurrency: 5 }  // 提高并发度，同时处理5个文件
)

log(`文件分析完成：${fileAnalyses.length} 个文件深度分析`)

// 阶段3：学习路径生成（可以与阶段2部分重叠，这里等待阶段2完成确保有足够信息）
phase('学习路径')
const tourResult = await agent(
  `基于以下分析结果生成结构化学习路径：

  项目扫描: ${scanResult.summary || '已扫描'}
  架构分析: ${archResult.summary || '已分析'}
  领域知识: ${domainResult.summary || '已提取'}
  核心文件: ${fileAnalyses.map(f => f.fileName).join(', ')}

  要求：
  - 生成 8-15 个学习步骤
  - 每步包含主题、目标、关键文件
  - 推荐阅读顺序
  - 标注重点和难点`,
  {
    agentType: 'understand-anything:tour-builder',
    label: 'tour-builder',
    phase: '学习路径'
  }
)

log(`学习路径生成完成：${tourResult.steps?.length || 0} 个学习步骤`)

// 阶段4：知识图谱审查
phase('图谱审查')
const reviewResult = await agent(
  `审查验证知识图谱的完整性和一致性：
   - 检查节点是否完整（项目/模块/类/函数）
   - 检查边是否正确（依赖/调用/继承关系）
   - 识别可能缺失的连接
   - 验证数据流向的准确性
   - 提出修复建议`,
  {
    agentType: 'understand-anything:graph-reviewer',
    label: 'graph-reviewer',
    phase: '图谱审查'
  }
)

log(`知识图谱审查完成`)

// 阶段5：并行知识沉淀
phase('知识沉淀')

// 检测需要沉淀的知识主题
const knowledgeTopics = detectKnowledgeTopics(scanResult, archResult, domainResult, fileAnalyses)
log(`检测到 ${knowledgeTopics.length} 个知识主题待沉淀`)

// 使用 parallel 并行创建多个知识文档（每个文档独立创建）
const knowledgeDocs = await parallel(
  knowledgeTopics.map(topic => () => agent(
    `创建知识文档：docs/exploration/${topic.filename}

     主题：${topic.title}
     内容要求：
     - 问题背景
     - 核心流程
     - 实现细节
     - 应用场景
     - 总结

     参考信息：
     ${topic.content}

     格式要求：
     - 使用 Markdown
     - 包含代码示例
     - 包含流程图（Mermaid）
     - 关键数据结构说明`,
    { label: `create:${topic.filename}`, phase: '知识沉淀' }
  ))
)

log(`知识沉淀完成：${knowledgeDocs.length} 个文档创建`)

// 阶段6：更新索引和系统状态
await agent(
  `执行以下操作完成知识库初始化：
   1. 运行: python3 scripts/generate-doc-index.py
   2. 运行: bash scripts/init-knowledge-system.sh
   3. 更新: .understand-anything/last-explore.txt (时间戳)
   4. 验证: 检查 docs/exploration/INDEX.md 是否生成`,
  { label: 'finalize', phase: '完成' }
)

log(`知识库初始化完成！`)
return {
  scan: scanResult,
  arch: archResult,
  domain: domainResult,
  files: fileAnalyses,
  tour: tourResult,
  review: reviewResult,
  knowledgeDocs: knowledgeDocs.length
}

// ========== 辅助函数 ==========

/**
 * 从扫描和架构分析结果中提取需要深度分析的核心文件
 */
function extractCriticalFiles(scanResult, archResult) {
  const files = new Set()

  // 从 project-scanner 结果中提取关键文件
  if (scanResult.entryPoints) {
    scanResult.entryPoints.forEach(ep => files.add(ep))
  }
  if (scanResult.keyFiles) {
    scanResult.keyFiles.forEach(f => files.add(f))
  }

  // 从 architecture-analyzer 结果中提取核心模块文件
  if (archResult.coreModules) {
    archResult.coreModules.forEach(m => {
      if (m.files) m.files.forEach(f => files.add(f))
    })
  }
  if (archResult.keyClasses) {
    archResult.keyClasses.forEach(c => {
      if (c.file) files.add(c.file)
    })
  }

  // 转换为数组并去重，限制数量避免超时
  return Array.from(files).slice(0, 20)
}

/**
 * 检测需要沉淀的知识主题
 */
function detectKnowledgeTopics(scanResult, archResult, domainResult, fileAnalyses) {
  const topics = []

  // 1. 项目概览
  topics.push({
    filename: '01-project-overview.md',
    title: '项目概览',
    content: `项目名称: ${scanResult.projectName || '未知'}
     主要语言: ${scanResult.languages?.join(', ') || '未知'}
     构建系统: ${scanResult.buildSystem || '未知'}
     文件数量: ${scanResult.fileCount || '未知'}`
  })

  // 2. 架构分析
  if (archResult.layers) {
    topics.push({
      filename: '02-architecture-analysis.md',
      title: '架构分析',
      content: `分层结构: ${JSON.stringify(archResult.layers)}
     设计模式: ${archResult.designPatterns?.join(', ') || '未识别'}
     模块依赖: ${JSON.stringify(archResult.dependencies)}`
    })
  }

  // 3. 领域知识
  if (domainResult.domains) {
    topics.push({
      filename: '03-domain-knowledge.md',
      title: '领域知识',
      content: `业务领域: ${domainResult.domains.join(', ')}
     核心概念: ${domainResult.coreConcepts?.join(', ') || '未提取'}
     业务流程: ${JSON.stringify(domainResult.processes)}`
    })
  }

  // 4. 核心文件分析（取前3个最重要的）
  const topFiles = fileAnalyses.slice(0, 3)
  topFiles.forEach((analysis, idx) => {
    topics.push({
      filename: `0${idx + 4}-file-${analysis.fileName.split('/').pop().replace('.', '-')}.md`,
      title: `核心文件分析: ${analysis.fileName}`,
      content: `文件: ${analysis.fileName}
     类结构: ${JSON.stringify(analysis.classes)}
     关键方法: ${analysis.keyMethods?.join(', ') || '未识别'}
     设计决策: ${analysis.designDecisions?.join('; ') || '无'}`
    })
  })

  // 5. 学习路径
  if (tourResult?.steps) {
    topics.push({
      filename: '04-learning-path.md',
      title: '学习路径',
      content: `学习步骤: ${JSON.stringify(tourResult.steps)}
     推荐顺序: ${tourResult.recommendedOrder?.join(' → ') || '未推荐'}
     重点难点: ${tourResult.keyPoints?.join(', ') || '未标注'}`
    })
  }

  return topics
}