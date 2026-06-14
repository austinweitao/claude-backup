---
name: init-explore
description: Initialize knowledge base and run comprehensive codebase exploration with auto-update system
argument-hint: []
---

# Init-Explore Skill

**一键初始化知识库、代码探索和自动更新系统**

## 功能概述

此 skill 使用 **understand-anything** 工具集进行深度代码仓库探索，并自动配置完整的知识管理系统。

## 核心工具：understand-anything

### 工具集组成

understand-anything 是一套专门用于代码库深度分析的 AI agents 工具集，包括：

1. **project-scanner** - 项目扫描器
   - 扫描文件结构和目录层次
   - 检测编程语言和构建系统
   - 分析第三方依赖
   - 评估项目规模和复杂度
   - 识别关键入口点

2. **architecture-analyzer** - 架构分析器
   - 识别逻辑分层（UI层、业务层、数据层等）
   - 分析模块间依赖关系
   - 识别设计模式（单例、工厂、观察者等）
   - 绘制组件依赖图
   - 分析数据流向

3. **domain-analyzer** - 领域分析器
   - 提取业务流程和领域概念
   - 识别核心业务逻辑
   - 分析领域模型（实体、值对象、聚合）
   - 提取业务规则和约束
   - 识别业务流程步骤

4. **file-analyzer** - 文件分析器
   - 并行深度分析核心源文件
   - 提取类、函数、算法
   - 识别关键数据结构
   - 分析代码注释中的设计决策
   - 提取领域知识

5. **tour-builder** - 学习路径生成器
   - 创建结构化学习路径
   - 设计 5-15 个学习步骤
   - 推荐阅读顺序
   - 标注重点和难点

6. **graph-reviewer** - 知识图谱审查器
   - 验证知识图谱正确性
   - 检查完整性和一致性
   - 识别缺失的节点和边

## ⚠️ 强制工具链使用规则

**本 skill 要求联合使用多种工具，单一工具不足以完成深度探索！**

### 核心架构：CodeGraph + understand-anything 联合探索 🔥

**v3.0 默认采用 CodeGraph 联合探索，实现 70% 更少 tool calls 和 20x 加速：**

```
┌─────────────────────────────────────────────────────────────────┐
│              阶段0: CodeGraph 快速扫描 (30秒)                   │
│  codegraph_status + project_map + dependency_graph              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  阶段1: 并行三剑客 + CodeGraph 调用链 (同时执行)                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ project-scanner │  │architecture-   │  │  domain-analyzer│  │
│  │   (项目扫描)     │  │   analyzer     │  │   (领域分析)    │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           └───────────────────┼───────────────────┘             │
│                               ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          codegraph_callchain (调用链深度分析)            │   │
│  │  get_call_graph + codegraph_impact + find_similar_code  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              阶段2: 文件分析 (CodeGraph 符号索引增强)            │
│  codegraph_node + codegraph_callers/callees + file-analyzer     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
              tour-builder + graph-reviewer + 知识沉淀
```

**加速效果**：
- 阶段0（CodeGraph扫描）：30秒获取项目结构
- 阶段1（并行分析）：3x 提升
- 阶段2（文件分析）：CodeGraph 增强，精确度提升
- 知识沉淀质量：调用链、依赖关系精确数据

### 必须使用的工具

```
阶段0: CodeGraph 快速扫描（新增，默认启用）
  ├─ codegraph_status     → 检查索引状态
  ├─ project_map          → 获取项目架构全景
  ├─ dependency_graph     → 模块依赖关系

阶段1: 并行三剑客 + CodeGraph 调用链（同时执行）
  ├─ project-scanner       → 项目扫描（CodeGraph 增强）
  ├─ architecture-analyzer → 架构分析（CodeGraph 增强）
  ├─ domain-analyzer      → 领域分析
  └─ codegraph_callchain   → 调用链深度分析

阶段2: 文件批量分析（CodeGraph 符号索引增强）
  └─ file-analyzer        → 批量文件分析

阶段3: 学习路径生成
  └─ tour-builder         → 生成学习路径

阶段4: 知识图谱审查
  └─ graph-reviewer       → 审查验证

阶段5: 知识沉淀（CodeGraph 数据整合）
  └─ parallel             → 多文档并行创建
```

阶段 4: 知识图谱审查
  └─ graph-reviewer       → 审查验证

阶段 5: 知识沉淀（parallel 并行）
  └─ 多个知识文档同时创建

阶段 6-8: 深度分析工具链（如果工具已安装）
  ├─ tree-sitter          → AST 语法树
  ├─ SCIP                → 符号索引
  └─ Semgrep             → 模式检测
```

### ❌ 常见错误（必须避免）

| 错误 | 问题 | 正确做法 |
|------|------|----------|
| 只用 project-scanner | 缺少架构/领域分析 | 必须用完所有 4 个 agents |
| 跳过 tour-builder | 缺少学习路径 | 阶段 5 必须生成学习路径 |
| 跳过 graph-reviewer | 图谱可能有错误未发现 | 阶段 6 必须审查图谱 |
| 跳过深度分析工具 | 缺少 AST/符号级分析 | 如果工具可用，必须使用 |

## 执行流程（完整版 v2.0 - 并行优化）

### 阶段 1: 并行三剑客扫描 ✅🔥

**关键改进**：三个 agent 同时执行，不串行等待！

```javascript
// 使用 parallel() 同时启动3个独立任务
const [scanResult, archResult, domainResult] = await parallel([
  () => agent('扫描项目结构...', { agentType: 'understand-anything:project-scanner' }),
  () => agent('分析架构层次...', { agentType: 'understand-anything:architecture-analyzer' }),
  () => agent('提取业务领域...', { agentType: 'understand-anything:domain-analyzer' })
])
```

**输出**:
- project-scanner: 项目名称、语言、构建系统、入口点
- architecture-analyzer: 分层、依赖图、设计模式
- domain-analyzer: 业务领域、核心概念、业务流程

**加速效果**：从 30min → 10min（3x 提升）

### 阶段 2: 文件批量分析 ✅（pipeline 并行优化）

使用 **pipeline()** 并行分析多个文件，提高并发度：

```javascript
const fileAnalyses = await pipeline(
  criticalFiles,
  async (file, index) => agent(
    `深度分析文件: ${file}`,
    {
      label: `分析 ${file}`,
      phase: '文件分析'
    }
  ),
  { concurrency: 5 }  // 提高并发度，同时处理5个文件
)
```

**特点**:
- 并行处理，提高效率
- 每个文件独立分析
- 提取类、函数、算法
- 识别设计模式
- **concurrency=5** 相比默认 3 提升 67% 吞吐

### 阶段 5: 学习路径生成 ✅ **（必须执行）**
使用 **tour-builder** agent：
```javascript
const tourResult = await agent(
  `生成结构化学习路径，设计 5-15 个学习步骤`,
  { agentType: 'understand-anything:tour-builder' }
)
```

**输出**:
- 5-15 个学习步骤
- 推荐阅读顺序
- 重点/难点标注
- 核心依赖链

### 阶段 6: 知识图谱审查 ✅ **（必须执行）**
使用 **graph-reviewer** agent：
```javascript
const reviewResult = await agent(
  `审查验证知识图谱，检查完整性和一致性`,
  { agentType: 'understand-anything:graph-reviewer' }
)
```

**输出**:
- 图谱正确性验证
- 缺失节点/边识别
- 一致性检查
- 修复建议

### 阶段 7: 深度代码分析（自动检测并安装）
使用 **tree-sitter + SCIP + Semgrep**：
```bash
# deep-code-analysis.sh 会自动检测工具是否安装
# 如果缺失会自动调用 install-deep-analysis-tools.sh 安装
bash ~/.claude/skills/init-explore/scripts/deep-code-analysis.sh /path/to/project
```

**自动检测机制**：
- 脚本运行前检查 `tree-sitter`、`scip`、`semgrep` 命令
- 如有缺失，自动调用安装脚本
- 安装失败则报错退出，确保不会静默跳过

**输出**:
- `ast-analysis.json` - AST 语法树分析
- `*.scip` - 符号索引文件
- `semgrep-results.json` - 模式检测结果

### 阶段 8: 精细知识文档生成（可选）
使用 **generate-deep-knowledge.py**：
```bash
python3 ~/.claude/skills/init-explore/scripts/generate-deep-knowledge.py
```

**生成文档**:
| 编号 | 文档 | 内容 |
|------|------|------|
| 14 | symbol-index.md | 符号索引（函数、类、变量） |
| 15 | function-relationships.md | 函数调用关系图 |
| 16 | code-patterns.md | 设计模式 + 代码问题 |
| 17 | complexity-analysis.md | 复杂度分析 |

### 阶段 5: 知识沉淀（并行创建）✅🔥

**关键改进**：多个知识文档同时创建！

```javascript
// 检测需要沉淀的知识主题
const knowledgeTopics = detectKnowledgeTopics(scanResult, archResult, domainResult, fileAnalyses)

// 使用 parallel 并行创建多个知识文档
const knowledgeDocs = await parallel(
  knowledgeTopics.map(topic => () => agent(
    `创建知识文档：docs/exploration/${topic.filename}`,
    { label: `create:${topic.filename}`, phase: '知识沉淀' }
  ))
)
```

**功能**:
- 自动检测需要沉淀的知识主题（架构/实现/设计模式/领域）
- **parallel 并行创建多个文档**（不串行等待）
- 生成标准格式知识文档
- 自动编号（01-*.md 起）

### 阶段 7: 索引更新（自动）

知识沉淀后自动更新知识库索引：

```javascript
// 生成文档索引
await agent(`python3 scripts/generate-doc-index.py`)

// 更新 CLAUDE.md 索引
await agent(`更新 CLAUDE.md 中的知识库索引`)
```

**功能**:
- 扫描 `docs/exploration/` 更新 INDEX.md
- 自动将新文档添加到 CLAUDE.md 知识库索引

### 阶段 8: 知识管理系统初始化

#### 8.1 生成文档索引
```javascript
const indexResult = await agent(
  `运行文档索引生成器: python3 scripts/generate-doc-index.py`,
  { label: '生成文档索引' }
)
```

**功能**:
- 扫描 `docs/exploration/` 目录
- 提取所有文档的标题和摘要
- 生成 `INDEX.md` 文件
- 按类别分组展示

#### 8.2 初始化知识管理系统
```javascript
const initResult = await agent(
  `运行知识系统初始化: bash scripts/init-knowledge-system.sh`,
  { label: '初始化知识系统' }
)
```

**功能**:
- 检查 Git Hook 状态
- 验证文档索引
- 检查 GitHub Actions 配置
- 设置向量数据库配置
- 检测依赖状态

#### 8.3 验证所有组件
```javascript
const verifyResult = await agent(
  `验证知识管理系统的所有组件`,
  { label: '验证系统组件' }
)
```

**检查项**:
- Git Hook (.git/hooks/post-commit)
- 文档索引 (docs/exploration/INDEX.md)
- GitHub Actions workflows
- 知识状态文件 (.knowledge-system.json)
- 脚本文件完整性

### 阶段 9: 生成项目 CLAUDE.md（自动）

在知识库初始化后，自动生成项目级 CLAUDE.md：

```javascript
const claudeMdResult = await agent(
  `运行 CLAUDE.md 生成器: python3 scripts/generate-claude-md.py`,
  { label: '生成 CLAUDE.md' }
)
```

**功能**:
- 读取知识库状态 (`.knowledge-system.json`)
- 扫描知识文档生成索引
- 嵌入自动知识沉淀规则
- 包含知识图谱节点
- **嵌入知识使用规则（方案 2）**

**生成的 CLAUDE.md 包含**:
1. **项目信息**: 版本、文档数、最后更新时间
2. **知识使用规则**: ⚠️ 要求 LLM 回答前先 Read 知识文档
3. **知识库索引**: 13 个文档的链接和摘要
4. **自动知识沉淀规则**: 触发条件、关键词检测、沉淀流程
5. **知识图谱节点**: 核心知识节点列表

**知识使用规则（关键）**:
```markdown
## 知识使用规则 ⚠️ 重要

回答技术问题前，必须先检查知识库：

1. **识别问题主题**: 判断属于哪个技术领域
2. **检查知识文档**: 根据索引表使用 `Read` 工具加载对应文档
3. **基于文档回答**: 引用文档内容给出准确答案
```

**后续 LLM 行为约束**:
- 每次回答技术问题前，检查 CLAUDE.md 中的知识文档索引
- 如问题涉及已知主题，必须先用 `Read` 加载对应文档
- 基于文档内容回答，而非凭记忆

**CLAUDE.md 自动同步**:
当知识文档更新时，以下脚本会自动同步 CLAUDE.md：
- `add-knowledge.py` - 手动添加知识后同步
- `auto-capture.py` - 自动捕获后同步
- `stop-hook.sh` - 会话结束时同步
- `update-claude-md.py` - 同步脚本（核心）

## 使用方法

### 基本用法
```
/init-explore
```

### 高级用法：直接调用 workflow

如果需要自定义参数，可以直接调用 workflow：

```javascript
// 在 Claude Code 中运行 workflow
const result = await workflow('explore-opencore-codebase')
```

### 查看 workflow 实现

workflow 位于：`workflows/explore-codebase.js`

关键代码：
```javascript
// 使用 understand-anything agents
const scanResult = await agent(
  '扫描项目',
  { agentType: 'understand-anything:project-scanner' }
)

const archResult = await agent(
  '分析架构',
  { agentType: 'understand-anything:architecture-analyzer' }
)

// 并行分析文件
const fileAnalyses = await pipeline(
  files,
  async (file) => await agent(`分析 ${file}`)
)
```

## 自动更新系统

### A. Git Hook 自动更新 ✅
- **位置**: `.git/hooks/post-commit`
- **触发**: 每次 `git commit` 自动运行
- **功能**: 检测代码变更，映射到知识文档
- **实现**: Bash 脚本
- **状态文件**: `.knowledge-system.json`

### B. 文档索引自动生成 ✅
- **脚本**: `scripts/generate-doc-index.py`
- **输出**: `docs/exploration/INDEX.md`
- **功能**: 扫描文档，提取标题和摘要，按类别分组
- **实现**: Python 脚本 + understand-anything agents

### C. 定时任务知识图谱重建 ✅
- **实现**: GitHub Actions
- **配置**: `.github/workflows/scheduled-knowledge-rebuild.yml`
- **频率**: 每周日凌晨 3:00 UTC
- **功能**: 自动重建知识图谱
- **可选**: 手动触发重新运行 `/init-explore`

### D. 向量数据库语义搜索 ✅
- **配置脚本**: `scripts/setup-vector-db.py`
- **自动设置**: `scripts/auto-setup-vector-db.sh`
- **功能**: 支持自然语言查询
- **依赖**: `pip3 install qdrant-client sentence-transformers`
- **实现**: Qdrant + sentence-transformers

## 深度探索技巧

### 1. 定制文件分析列表

编辑 `workflows/explore-codebase.js`：
```javascript
const criticalFiles = [
  'your/critical/file1.cpp',
  'your/critical/file2.h',
  // 添加你想深度分析的文件
]
```

### 2. 调整分析深度

修改 agent 的 prompt：
```javascript
const result = await agent(
  `深度分析文件，特别关注：
   - 性能优化点
   - 安全漏洞
   - 代码异味
   - 设计模式`,
  { agentType: 'understand-anything:file-analyzer' }
)
```

### 3. 使用结构化输出

使用 schema 强制返回结构化数据：
```javascript
const result = await agent(
  'analyze architecture',
  {
    agentType: 'understand-anything:architecture-analyzer',
    schema: {
      type: 'object',
      properties: {
        layers: { type: 'array' },
        dependencies: { type: 'array' }
      }
    }
  }
)
```

### 4. 并行处理加速

使用 `pipeline()` 并行分析：
```javascript
// 并行分析多个文件
const results = await pipeline(
  files,
  async (file) => await agent(`分析 ${file}`)
)

// 或使用 parallel() 等待所有任务
const results = await parallel([
  () => agent('任务1'),
  () => agent('任务2'),
  () => agent('任务3')
])
```

## 输出文件

### 知识文档（17+ 个）
- `01-project-overview.md` - 项目概览
- `02-architecture-analysis.md` - 架构分析
- `03-domain-knowledge.md` - 领域知识
- `04-learning-path.md` - 学习路径
- `05-knowledge-reuse-guide.md` - 知识复用指南
- `06-address-location-mechanism.md` - 地址定位机制
- `07-class-command-implementation.md` - class 命令实现
- `08-space-walking-mechanism.md` - 空间遍历机制
- `09-livebitmap-storage-location.md` - LiveBitmap 存储位置
- 等等...

### 系统脚本（10+ 个）
- `scripts/update-knowledge.sh` - 知识更新逻辑
- `scripts/generate-doc-index.py` - 索引生成
- `scripts/rebuild-knowledge-graph.sh` - 图谱重建
- `scripts/init-knowledge-system.sh` - 一键初始化
- `scripts/auto-setup-vector-db.sh` - 向量数据库设置
- 等等...

### GitHub Actions（2 个）
- `update-knowledge.yml` - 代码变更触发
- `scheduled-knowledge-rebuild.yml` - 定时任务

### 知识图谱文件
- `.understand-anything/graph.json` - 完整知识图谱
- `.understand-anything/layers.json` - 架构层次
- `.understand-anything/tour.json` - 学习路径

## 前置条件

- 项目是 Git 仓库
- 有基本的源代码文件
- Python 3 已安装
- 网络连接（用于调用 AI agents）

## 执行时间（v2.0 并行优化）

| 项目规模 | 旧版（串行） | 新版（并行） | 加速比 |
|----------|--------------|--------------|--------|
| **小型** (< 100 文件) | 5-10 分钟 | 3-5 分钟 | **2x** |
| **中型** (100-500 文件) | 10-20 分钟 | 6-10 分钟 | **2x** |
| **大型** (> 500 文件) | 20-30 分钟 | 12-15 分钟 | **2-2.5x** |

**关键改进**：
- 阶段1（扫描分析）：3个 agent 并行执行，从串行 30min → 并行 10min
- 阶段2（文件分析）：pipeline concurrency 从默认 3 → 5
- 阶段5（知识沉淀）：多个文档 parallel 同时创建

## 执行后验证

```bash
# 检查系统状态
bash scripts/init-knowledge-system.sh

# 查看文档索引
cat docs/exploration/INDEX.md

# 查看知识状态
cat .knowledge-system.json

# 测试 Git Hook
git commit -am "test"

# 查看知识图谱
cat .understand-anything/graph.json | jq '.nodes | length'
```

## 手动触发组件

```bash
# 生成文档索引
python3 scripts/generate-doc-index.py

# 重建知识图谱（重新运行 /init-explore）
/init-explore

# 设置向量数据库
python3 scripts/setup-vector-db.py

# 检查是否需要更新
bash ~/.claude/skills/init-explore/check-update.sh
```

## 复用到其他项目

### 方式 1: 复制 skill 和 workflow
```bash
# 复制 skill 定义
cp -r ~/.claude/skills/init-explore /path/to/new/project/.claude/skills/

# 复制 workflow
mkdir -p /path/to/new/project/workflows
cp workflows/explore-codebase.js /path/to/new/project/workflows/

# 在新项目中运行
cd /path/to/new/project
/init-explore
```

### 方式 2: 复制完整系统
```bash
# 复制所有脚本
cp -r scripts/ /path/to/new/project/

# 复制 GitHub Actions
cp -r .github/workflows/update-knowledge.yml /path/to/new/project/.github/workflows/
cp -r .github/workflows/scheduled-knowledge-rebuild.yml /path/to/new/project/.github/workflows/

# 复制 workflow
cp -r workflows/ /path/to/new/project/

# 运行初始化
cd /path/to/new/project
bash scripts/init-knowledge-system.sh
/init-explore
```

### 方式 3: 自定义 workflow

创建自己的 workflow：
```javascript
// workflows/my-explore.js
export const meta = {
  name: 'my-custom-explore',
  description: '自定义代码探索',
  phases: [
    { title: '扫描', detail: '扫描项目' },
    { title: '分析', detail: '深度分析' }
  ]
}

phase('扫描')
const scan = await agent(
  '扫描我的项目',
  { agentType: 'understand-anything:project-scanner' }
)

phase('分析')
const arch = await agent(
  '分析架构',
  { agentType: 'understand-anything:architecture-analyzer' }
)

return { scan, arch }
```

## understand-anything 工具详解

### 可用的 agent types

```javascript
// 项目扫描
'understand-anything:project-scanner'

// 架构分析
'understand-anything:architecture-analyzer'

// 领域分析
'understand-anything:domain-analyzer'

// 文件分析
'understand-anything:file-analyzer'

// 学习路径生成
'understand-anything:tour-builder'

// 知识图谱审查
'understand-anything:graph-reviewer'

// 知识图谱指南
'understand-anything:knowledge-graph-guide'
```

### 使用示例

```javascript
// 1. 扫描项目
const scan = await agent(
  '扫描 /path/to/project',
  { 
    agentType: 'understand-anything:project-scanner',
    schema: {
      type: 'object',
      properties: {
        fileCount: { type: 'number' },
        languages: { type: 'array' }
      }
    }
  }
)

// 2. 分析架构
const arch = await agent(
  '分析架构层次',
  { 
    agentType: 'understand-anything:architecture-analyzer',
    label: '架构分析'
  }
)

// 3. 并行分析多个文件
const files = ['file1.cpp', 'file2.h', 'file3.py']
const analyses = await pipeline(
  files,
  async (file) => await agent(
    `分析 ${file}`,
    { 
      phase: '文件分析',
      label: file 
    }
  )
)
```

## 深度代码分析工具链 (可选)

### 工具组合：tree-sitter + SCIP + Semgrep

```
tree-sitter (AST 解析)
    ↓
SCIP (符号索引 + 交叉引用)
    ↓
Semgrep (模式分析)
    ↓
生成精细知识图谱
```

### 工具安装

```bash
# 一键安装所有深度分析工具
bash ~/.claude/skills/init-explore/scripts/install-deep-analysis-tools.sh
```

**包含工具**:
| 工具 | 粒度 | 语言支持 | 用途 |
|------|------|----------|------|
| **tree-sitter** | ⭐⭐⭐⭐⭐ AST级 | 30+ | 精确语法树解析 |
| **SCIP** | ⭐⭐⭐⭐⭐ 符号级 | 7+ | 符号索引、交叉引用 |
| **Semgrep** | ⭐⭐⭐⭐ 模式级 | 20+ | 代码模式检测 |

### 深度分析脚本

```bash
# 在项目目录运行深度分析
bash ~/.claude/skills/init-explore/scripts/deep-code-analysis.sh /path/to/project
```

**输出**:
- `ast-analysis.json` - AST 语法树分析
- `*.scip` - 符号索引文件
- `semgrep-results.json` - 模式检测结果

### 生成精细知识文档

```bash
# 从分析结果生成精细知识文档
python3 ~/.claude/skills/init-explore/scripts/generate-deep-knowledge.py
```

**生成文档**:
| 编号 | 文档 | 内容 |
|------|------|------|
| 14 | symbol-index.md | 符号索引（函数、类、变量） |
| 15 | function-relationships.md | 函数调用关系图 |
| 16 | code-patterns.md | 设计模式 + 代码问题 |
| 17 | complexity-analysis.md | 复杂度分析 |

### 使用示例

```bash
# 完整流程
cd /path/to/project
bash ~/.claude/skills/init-explore/scripts/install-deep-analysis-tools.sh
bash ~/.claude/skills/init-explore/scripts/deep-code-analysis.sh .
python3 ~/.claude/skills/init-explore/scripts/generate-deep-knowledge.py
```

## 系统架构

```
三层知识架构:
  第一层: CLAUDE.md (自动加载)
    └─ 核心设计约束 + 知识索引
  
  第二层: docs/exploration/ (按需读取)
    └─ 17+ 个深度技术文档
  
  第三层: 知识图谱 (可视化)
    ├─ graph.json (节点和边)
    ├─ layers.json (架构层次)
    └─ tour.json (学习路径)

四种自动更新:
  A. Git Hook      → 实时触发（每次提交）
  B. 文档索引      → 按需生成（手动/自动）
  C. 知识图谱      → 定期重建（每周/手动）
  D. 向量索引      → 手动更新（重大变更后）

### E. 对话级知识自动捕获 ✅

在每次 LLM 回答后自动评估质量，达到阈值自动沉淀：

#### 质量评分标准

| 条件 | 分值 | 检测方式 |
|------|------|----------|
| 深度分析 3+ 文件 | +3 | 统计分析的文件路径 |
| 架构/设计模式讨论 | +2 | 关键词匹配 |
| 包含 Mermaid 图表 | +2 | `\`\`\`mermaid` 计数 |
| 集成/使用指南 | +2 | 关键词匹配 |
| 复杂技术流程 | +1 | 关键词匹配 |
| 设计决策说明 | +1 | 关键词匹配 |

**阈值**: 4 分（满足任一条件可触发）

#### 自动捕获流程

```javascript
// 1. 收集回答上下文
const context = {
    analyzedFiles: ['file1.cpp', 'file2.h', ...],
    hasArchitecture: checkArchitectureKeywords(response),
    hasDiagrams: countMermaidDiagrams(response),
    hasIntegration: checkIntegrationKeywords(response),
    hasProcess: checkProcessKeywords(response),
    hasDesignDecision: checkDesignDecisionKeywords(response)
}

// 2. 计算质量分
const score = calculateQualityScore(context)

// 3. 达到阈值自动沉淀
if (score >= 4) {
    const docNum = getNextDocNumber()
    await createKnowledgeDoc(docNum, response)
    await updateIndex()
    await updateState('conversation')
}
```

#### 触发条件（满足任一即触发）

1. **代码深度分析**: 回答涉及 3+ 个源文件路径
2. **架构讨论**: 包含"架构"、"分层"、"设计模式"等关键词
3. **图表输出**: 回答包含 Mermaid 流程图/时序图
4. **集成指南**: 包含"集成"、"接入"、"如何使用"等
5. **复杂流程**: 包含"流程如下"、"步骤是"、"首先/然后/最后"

#### 自动捕获实现：Stop Hook

通过 Claude Code 的 `Stop` 钩子在会话结束时自动触发：

```json
// ~/.claude/settings.json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "bash ~/.claude/skills/init-explore/scripts/stop-hook.sh",
        "timeout": 60,
        "statusMessage": "评估对话质量..."
      }]
    }]
  }
}
```

**Stop Hook 脚本**: `~/.claude/skills/init-explore/scripts/stop-hook.sh`

**触发时机**:
- 会话结束 (`/clear`)
- 上下文压缩后 (`/compact`)
- 会话停止

**功能**:
1. 检查知识库是否已初始化
2. 读取会话输出内容
3. 按质量评分标准打分
4. 达到阈值 → 更新 `lastExplore.txt` 和 `.knowledge-system.json`
6. **用户要求**: 用户明确说"沉淀"、"保存"、"记录"

#### 实现脚本

```bash
# 质量评估脚本
python3 scripts/auto-capture.py

# 快速评估（推荐）
bash scripts/auto-capture-skill.sh "$CONVERSATION" "$ANALYZED_FILES"
```

#### 配置项

在 `CONFIG.md` 中可配置：

```bash
QUALITY_THRESHOLD=4    # 触发阈值（默认 4）
ENABLE_AUTO_CAPTURE=1  # 启用自动捕获（默认 1）
AUTO_CAPTURE_CATEGORY="对话沉淀"  # 文档分类
```

## 完整工具链图（v2.0 并行优化版）

```
┌─────────────────────────────────────────────────────────────────┐
│              阶段 1: 并行三剑客（同时执行，不等待）🔥              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ project-scanner │  │architecture-   │  │  domain-analyzer│  │
│  │   (项目扫描)     │  │   analyzer     │  │   (领域分析)    │  │
│  │                 │  │   (架构分析)    │  │                 │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           └───────────────────┼───────────────────┘             │
│                               ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              阶段 2: file-analyzer (pipeline, 并发=5)   │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │   │
│  │  │file1 │ │file2 │ │file3 │ │file4 │ │file5 │ → ...   │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                               ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        阶段 3: tour-builder (学习路径生成)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                               ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        阶段 4: graph-reviewer (图谱审查)                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                               ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        阶段 5: 知识沉淀 (parallel 并行创建) 🔥          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ arch.md  │ │domain.md│ │ files.md │ │ tour.md  │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                               ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        阶段 6-8: 索引更新 + 系统初始化                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                               ↓                                 │
│                            ✅ 完成                              │
└─────────────────────────────────────────────────────────────────┘

加速效果：
  阶段1: 30min → 10min (3x)
  阶段2: +67% 吞吐 (并发度 3→5)
  阶段5: N个文档同时创建 (串行变并行)
  总体: 预计 30min → 12-15min (2-2.5x 提升)
```

**关键规则**：
- 阶段 1-6 为**强制执行**，跳过将导致知识库不完整
- 阶段 7-8 为**可选执行**，取决于工具是否可用

## 完整文档

- **系统指南**: `docs/KNOWLEDGE_MANAGEMENT_SYSTEM.md`
- **标配说明**: `STANDARD_CONFIG_COMPLETE.md`
- **实施报告**: `FINAL_IMPLEMENTATION_REPORT.md`
- **Workflow 源码**: `workflows/explore-codebase.js`

## 故障排查

### workflow 执行失败
```bash
# 检查 workflow 文件
cat workflows/explore-codebase.js

# 手动测试
# 在 Claude Code 中直接运行 workflow
```

### agent 超时
- 减少并行分析的文件数量
- 简化 agent 的 prompt
- 分批执行

### 知识图谱不完整
- 重新运行 `/init-explore`
- 检查 `.understand-anything/` 目录
- 查看错误日志

---

### 知识沉淀增强

| 文档 | 旧版 | CodeGraph 增强版 |
|------|------|-----------------|
| 架构分析 | 推断依赖 | dependency_graph 精确数据 |
| 调用关系 | 猜测 | codegraph_callers/callees 精确 |
| 影响范围 | 粗略估计 | codegraph_impact 精确计算 |
| 代码质量 | 无 | dead-code + find_similar_code |

### 降级说明

如果 CodeGraph 未安装或初始化失败，workflow 会自动降级到 v2.0（无 CodeGraph）。
