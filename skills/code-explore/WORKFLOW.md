# Code Explore Workflow 模板

## 概述
此 Workflow 实现 4 层代码探索流程，支持并行分析和双轨输出。

## 使用方式
```javascript
// 在 Workflow 脚本中引用
const { scaleAssessment } = await import('./LIB/scale-assessment.js');
const { detectRepoType } = await import('./LIB/repo-detection.js');
const { writeMemory, extractConcepts } = await import('./LIB/memory-writer.js');
```

## 输入参数
```yaml
repo_path: /path/to/repo    # 必需
module: binder              # 可选，聚焦模块
topics:                     # 可选，专题列表
  - concurrency
  - memory
depth: full                 # simple/medium/full
```

## Schema 定义

### ARCH_SCHEMA
```javascript
const ARCH_SCHEMA = {
  type: 'object',
  properties: {
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          path: { type: 'string' },
          responsibility: { type: 'string' },
          dependencies: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    dependencies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          type: { type: 'string' },
        },
      },
    },
    entryPoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          path: { type: 'string' },
          line: { type: 'number' },
        },
      },
    },
  },
};
```

### STRUCT_SCHEMA
```javascript
const STRUCT_SCHEMA = {
  type: 'object',
  properties: {
    structs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          path: { type: 'string' },
          line: { type: 'number' },
          fields: { type: 'array', items: { type: 'object' } },
          description: { type: 'string' },
        },
      },
    },
    relationships: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          type: { type: 'string' },
        },
      },
    },
    lifetimes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          struct: { type: 'string' },
          phases: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};
```

### PATH_SCHEMA
```javascript
const PATH_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    entry: {
      type: 'object',
      properties: {
        function: { type: 'string' },
        line: { type: 'number' },
        file: { type: 'string' },
      },
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          function: { type: 'string' },
          line: { type: 'number' },
          file: { type: 'string' },
          description: { type: 'string' },
          lock: { type: 'string' },
        },
      },
    },
    locks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          acquire: { type: 'string' },
          release: { type: 'string' },
        },
      },
    },
  },
};
```

### TOPIC_SCHEMA
```javascript
const TOPIC_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string' },
          location: { type: 'string' },
        },
      },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'string' },
          description: { type: 'string' },
          impact: { type: 'string' },
        },
      },
    },
  },
};
```

## 执行模板

### 完整执行模板
```javascript
export const meta = {
  name: 'code-explore-workflow',
  description: '复杂代码仓库 4 层深度探索',
  phases: [
    { title: 'L1 Architecture', detail: '宏观架构分析' },
    { title: 'L2 Data Structures', detail: '核心数据结构分析' },
    { title: 'L3 Critical Paths', detail: '关键路径分析' },
    { title: 'L4 Topics', detail: '专题深挖分析' },
    { title: 'Integration', detail: '整合输出' },
  ],
}

// 导入辅助模块
const { scaleAssessment } = await import('./LIB/scale-assessment.js');
const { detectRepoType } = await import('./LIB/repo-detection.js');

// Phase 1: 初始化 + 评估
phase('L1 Architecture')

const scale = await scaleAssessment(repoPath);
const { type, recommendedTopics } = await detectRepoType(repoPath);

log(`仓库复杂度: ${scale.level}`);
log(`仓库类型: ${type}`);
log(`推荐深度: ${scale.recommendedDepth}`);
log(`推荐专题: ${recommendedTopics.join(', ')}`);

// Phase 2: L1 + L2 并行分析
const [archResult, structResult] = await parallel([
  () => agent(`分析 ${repoPath} 架构，使用 L1 prompt`, {
    label: 'L1: Architecture',
    schema: ARCH_SCHEMA,
  }),
  () => agent(`分析 ${repoPath} 数据结构，使用 L2 prompt`, {
    label: 'L2: Data Structures',
    schema: STRUCT_SCHEMA,
  }),
]);

// Phase 3: 关键路径识别 + L3 分析
phase('L3 Critical Paths')

// 识别关键路径 (基于 L2 数据结构结果)
const paths = identifyCriticalPaths(structResult);
const pathResults = await parallel(
  paths.map(p => () => agent(
    `分析关键路径: ${p.name}`,
    { label: `L3: ${p.name}`, schema: PATH_SCHEMA }
  ))
);

// Phase 4: L4 专题分析 (用户选择后执行)
if (selectedTopics.length > 0) {
  phase('L4 Topics');
  
  const topicResults = await parallel(
    selectedTopics.map(t => () => agent(
      `分析专题: ${t}`,
      { label: `L4: ${t}`, schema: TOPIC_SCHEMA }
    ))
  );
}

// Phase 5: 知识库沉淀
const concepts = extractConcepts({
  architecture: archResult,
  structures: structResult,
  paths: pathResults,
});
await writeMemory(repoName, concepts);
```

## 关键路径识别策略

### 内核驱动
```javascript
const kernelEntryPatterns = [
  /SYSCALL_DEFINE\s*\(\s*\w+\s*,/,
  /static\s+\w+\s+ioctl\s*\(/,
  /__builtin_add_overflow/,
  /module_init\s*\(\s*\w+\s*\)/,
];
```

### Android Framework
```javascript
const androidEntryPatterns = [
  /extends\s+\w+Binder/,
  /implements\s+\w+AIDL/,
  /@UnsupportedAppUsage/,
  /BinderInternal\./,
];
```

## 输出模板

### HTML 整合报告头部
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{repo} 代码分析报告</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    .mermaid { background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .mermaid svg { width: 100% !important; height: auto !important; }
  </style>
</head>
<body>
  <h1>{repo} 代码分析报告</h1>
  <p>生成时间: {timestamp}</p>
  <p>复杂度: {scale.level} | 类型: {type}</p>
```

### Markdown 章节模板
```markdown
# {repo} - {标题}

## 概览
- 复杂度: {level}
- 类型: {type}
- 分析时间: {timestamp}

## 内容
{分析内容}

## 硬性事实清单
- [ ] 实测: {事实}
```
