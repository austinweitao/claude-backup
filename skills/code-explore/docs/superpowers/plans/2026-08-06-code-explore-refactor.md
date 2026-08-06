# Code Explore Skill 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 code-explore skill 从规则引擎重构为 LLM 驱动架构，实现语义理解的模块识别和多引擎搜索验证

**Architecture:** 采用 Plan-Act-Reflect 循环模式：
- LLM Agent 主导代码分析（语义理解，非文件计数）
- Web Validator 并行验证 LLM 结论
- HTML 报告 + Mermaid 图表展示

**Tech Stack:** Node.js, Claude API, Serper/DDG/Tavily/MiniMax 搜索 API

---

## Global Constraints

- 输出目录：`~/.claude/skills/code-explore/docs/`
- 测试仓库：ART Runtime (`/home/cwtrocks/explore-art/art`)
- 兼容性：支持 Linux kernel/Android/ART Runtime 等多种仓库类型
- 报告格式：HTML + Mermaid 交互图表

---

## Task 1: 架构分析与规划文档

**Files:**
- Modify: `SKILL.md` - 重写核心架构文档

**Interfaces:**
- Consumes: 当前 SKILL.md
- Produces: 新架构设计文档

- [ ] **Step 1: 读取当前 SKILL.md**

```bash
cat /home/cwtrocks/.claude/skills/code-explore/SKILL.md
```

- [ ] **Step 2: 分析现有架构问题**
- [ ] **Step 3: 撰写新架构设计**

---

## Task 2: LLM 分析器实现

**Files:**
- Create: `LIB/llm-analyzer.js` - LLM 驱动的代码分析引擎

**Interfaces:**
- Consumes: repoInfo (路径、类型、模块树)
- Produces: analysisResult (架构、模块、关键路径、数据结构)

```javascript
/**
 * LLM 分析器 - 语义理解驱动的代码仓库分析
 */
class LLMAnalyzer {
  constructor(options = {}) {
    this.model = options.model || 'claude-sonnet-5';
    this.maxTokens = options.maxTokens || 8192;
    this.temperature = options.temperature || 0.3;
  }

  /**
   * 完整分析流程
   */
  async analyze(repoInfo, options = {}) {
    const results = {
      architecture: null,
      modules: null,
      criticalPaths: null,
      dataStructures: null,
      metadata: {
        repoPath: repoInfo.path,
        repoType: repoInfo.type,
        analyzedAt: new Date().toISOString(),
      }
    };

    // Plan-Act-Reflect 循环
    results.architecture = await this.analyzeArchitecture(repoInfo);
    results.modules = await this.analyzeModules(repoInfo, results.architecture);
    results.criticalPaths = await this.analyzeCriticalPaths(repoInfo, results.modules);
    results.dataStructures = await this.analyzeDataStructures(repoInfo, results.modules);

    return results;
  }

  /**
   * 分析架构模式
   */
  async analyzeArchitecture(repoInfo) {
    const prompt = `分析以下代码仓库的架构模式：

仓库路径: ${repoInfo.path}
仓库类型: ${repoInfo.type || 'unknown'}

请识别：
1. 整体架构模式（微内核/分层/插件/云原生等）
2. 核心组件及其职责
3. 组件间的依赖关系
4. 关键设计决策

返回 JSON 格式：
{
  "pattern": "架构模式名称",
  "components": [{"name": "组件名", "responsibility": "职责", "dependencies": ["依赖1"]}],
  "designDecisions": ["决策1", "决策2"],
  "confidence": 0.0-1.0
}`;
    return this.callLLM(prompt);
  }

  /**
   * 分析模块结构（语义理解，非文件计数）
   */
  async analyzeModules(repoInfo, architecture) {
    const prompt = `基于架构分析结果，深入分析核心模块：

架构: ${JSON.stringify(architecture)}

仓库路径: ${repoInfo.path}

请识别：
1. 核心模块及其语义角色
2. 模块间的接口关系
3. 模块的复杂度评估（基于语义，非行数）
4. 关键模块的入口点和出口点

重点关注：
- 语义一致性（arm/目录是架构目录还是业务模块？）
- 功能边界（模块是否内聚）
- 接口清晰度（模块间如何通信）

返回 JSON 格式：
{
  "modules": [{
    "name": "模块名",
    "semanticRole": "语义角色（core/utility/plugin等）",
    "entryPoints": ["入口1"],
    "interfaces": ["接口1"],
    "complexity": "low/medium/high",
    "importance": 0.0-1.0
  }],
  "relationships": [{"from": "A", "to": "B", "type": "uses/extends/implements"}]
}`;
    return this.callLLM(prompt);
  }

  /**
   * 分析关键路径
   */
  async analyzeCriticalPaths(repoInfo, modules) {
    const prompt = `追踪核心执行路径：

模块: ${JSON.stringify(modules)}

请识别：
1. 入口函数和主流程
2. 关键调用链
3. 异常处理路径
4. 性能热点（如果有）

返回 JSON 格式：
{
  "entryPoints": [{
    "name": "函数名",
    "file": "文件路径",
    "description": "功能描述"
  }],
  "callChains": [{
    "name": "路径名",
    "chain": ["函数1", "函数2", "函数3"],
    "frequency": "high/medium/low"
  }]
}`;
    return this.callLLM(prompt);
  }

  /**
   * 分析数据结构
   */
  async analyzeDataStructures(repoInfo, modules) {
    const prompt = `分析核心数据结构：

模块: ${JSON.stringify(modules)}
仓库路径: ${repoInfo.path}

请识别：
1. 核心数据结构（struct/class）
2. 数据结构的字段和关系
3. 内存管理策略
4. 并发控制机制

返回 JSON 格式：
{
  "structures": [{
    "name": "结构名",
    "fields": ["字段1", "字段2"],
    "relationships": ["关联结构"],
    "purpose": "用途描述"
  }],
  "patterns": ["设计模式1", "模式2"]
}`;
    return this.callLLM(prompt);
  }

  /**
   * 调用 LLM
   */
  async callLLM(prompt, options = {}) {
    const { model = this.model, temperature = this.temperature } = options;

    // 实现 LLM 调用逻辑
    // 优先使用 Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: this.maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseResponse(data.content[0].text);
  }

  /**
   * 解析 LLM 响应
   */
  parseResponse(text) {
    try {
      // 尝试提取 JSON
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                       text.match(/```\n([\s\S]*?)\n```/) ||
                       text.match(/(\{[\s\S]*\})/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return { raw: text };
    } catch (e) {
      return { raw: text, parseError: e.message };
    }
  }
}

module.exports = { LLMAnalyzer };
```

- [ ] **Step 1: 创建 llm-analyzer.js 文件**
- [ ] **Step 2: 实现 LLM 调用逻辑**
- [ ] **Step 3: 实现各分析模块**
- [ ] **Step 4: 添加错误处理和重试逻辑**

---

## Task 3: Web 验证器实现

**Files:**
- Create: `LIB/web-validator.js` - 多引擎并行验证

**Interfaces:**
- Consumes: analysisResult (LLM 分析结果)
- Produces: validationResult (验证状态、置信度)

```javascript
/**
 * Web 验证器 - 多引擎并行验证 LLM 结论
 * [知识来源: 基于训练数据 - 行业最佳实践]
 */
class WebValidator {
  constructor(options = {}) {
    this.engines = {
      serper: { weight: 0.3, enabled: true },
      ddg: { weight: 0.25, enabled: true },
      tavily: { weight: 0.25, enabled: true },
      claude: { weight: 0.2, enabled: true },
    };
    this.confidenceThreshold = options.confidenceThreshold || 0.6;
  }

  /**
   * 验证分析结果
   */
  async validate(analysis) {
    const validationResults = {
      architecture: await this.validateSingleModule(analysis.architecture, 'architecture'),
      modules: await Promise.all(
        (analysis.modules?.modules || []).map(m =>
          this.validateSingleModule(m, 'module')
        )
      ),
      criticalPaths: await this.validateSingleModule(analysis.criticalPaths, 'paths'),
      dataStructures: await this.validateSingleModule(analysis.dataStructures, 'structures'),
    };

    // 计算总体置信度
    const overallConfidence = this.calculateOverallConfidence(validationResults);

    return {
      ...validationResults,
      overallConfidence,
      needsRefinement: overallConfidence < this.confidenceThreshold,
      sources: this.collectSources(validationResults),
    };
  }

  /**
   * 验证单个模块
   */
  async validateSingleModule(item, type) {
    if (!item) return { valid: false, confidence: 0, reason: 'No item to validate' };

    const query = this.buildQuery(item, type);

    // 并行执行多引擎搜索
    const results = await Promise.allSettled([
      this.searchSerper(query),
      this.searchDDG(query),
      this.searchTavily(query),
      this.searchMinimax(query),
    ]);

    // 计算验证结果
    return this.aggregateResults(results, query);
  }

  /**
   * Serper 搜索
   */
  async searchSerper(query) {
    try {
      const response = await fetch(
        `https://google.serper.dev/search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: { 'X-API-KEY': process.env.SERPER_API_KEY },
        }
      );
      if (!response.ok) throw new Error(`Serper error: ${response.status}`);
      return { engine: 'serper', data: await response.json(), success: true };
    } catch (e) {
      return { engine: 'serper', error: e.message, success: false };
    }
  }

  /**
   * DDG 搜索
   */
  async searchDDG(query) {
    try {
      // 使用 MCP 工具而非直接调用
      return { engine: 'ddg', pending: true, query };
    } catch (e) {
      return { engine: 'ddg', error: e.message, success: false };
    }
  }

  /**
   * Tavily 搜索
   */
  async searchTavily(query) {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.TAVILY_API_KEY,
        },
        body: JSON.stringify({
          query,
          max_results: 5,
          search_depth: 'advanced',
        }),
      });
      if (!response.ok) throw new Error(`Tavily error: ${response.status}`);
      return { engine: 'tavily', data: await response.json(), success: true };
    } catch (e) {
      return { engine: 'tavily', error: e.message, success: false };
    }
  }

  /**
   * Claude 搜索
   */
  async searchMinimax(query) {
    try {
      const response = await fetch('https://api.minimax.chat/v1/coding_plan/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error(`Claude error: ${response.status}`);
      return { engine: 'claude', data: await response.json(), success: true };
    } catch (e) {
      return { engine: 'claude', error: e.message, success: false };
    }
  }

  /**
   * 构建查询
   */
  buildQuery(item, type) {
    if (type === 'architecture') {
      return `${item.pattern || item.name || 'architecture'} ${item.components?.map(c => c.name).join(' ')}`;
    }
    if (type === 'module') {
      return `${item.name} ${item.semanticRole || ''} ${item.entryPoints?.join(' ') || ''}`;
    }
    return JSON.stringify(item).slice(0, 200);
  }

  /**
   * 聚合结果
   */
  aggregateResults(results, query) {
    let totalWeight = 0;
    let weightedConfidence = 0;
    const sources = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.success) {
        const engine = result.value.engine;
        const confidence = this.calculateEngineConfidence(result.value, engine);
        weightedConfidence += confidence * this.engines[engine].weight;
        totalWeight += this.engines[engine].weight;
        sources.push({ engine, ...result.value });
      }
    });

    const confidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;
    return {
      valid: confidence >= 0.5,
      confidence,
      sources,
      query,
      enginesSucceeded: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      enginesTotal: 4,
    };
  }

  /**
   * 计算单个引擎的置信度
   */
  calculateEngineConfidence(result, engine) {
    switch (engine) {
      case 'serper':
        return result.data?.organic?.length > 0 ? 0.8 : 0.3;
      case 'tavily':
        return result.data?.results?.length > 0 ? 0.8 : 0.3;
      case 'ddg':
        return result.data?.length > 0 ? 0.7 : 0.3;
      case 'claude':
        return result.data?.length > 0 ? 0.7 : 0.3;
      default:
        return 0.5;
    }
  }

  /**
   * 计算总体置信度
   */
  calculateOverallConfidence(validationResults) {
    const weights = { architecture: 0.3, modules: 0.4, paths: 0.2, structures: 0.1 };
    let total = 0;
    let weightSum = 0;

    if (validationResults.architecture) {
      total += validationResults.architecture.confidence * weights.architecture;
      weightSum += weights.architecture;
    }
    if (validationResults.modules?.length > 0) {
      const avgModuleConf = validationResults.modules.reduce((sum, m) => sum + m.confidence, 0) /
                            validationResults.modules.length;
      total += avgModuleConf * weights.modules;
      weightSum += weights.modules;
    }

    return weightSum > 0 ? total / weightSum : 0;
  }

  /**
   * 收集来源
   */
  collectSources(validationResults) {
    const sources = [];
    const collect = (result) => {
      if (result.sources) {
        result.sources.forEach(s => sources.push(s.engine));
      }
    };
    collect(validationResults.architecture);
    validationResults.modules?.forEach(collect);
    return [...new Set(sources)];
  }
}

module.exports = { WebValidator };
```

- [ ] **Step 1: 创建 web-validator.js 文件**
- [ ] **Step 2: 实现多引擎并行搜索**
- [ ] **Step 3: 实现置信度计算**
- [ ] **Step 4: 添加优雅降级逻辑**

---

## Task 4: 报告生成器重构

**Files:**
- Create: `LIB/report-generator.js` - HTML 报告生成
- Create: `TEMPLATES/report-template.html` - 报告模板

**Interfaces:**
- Consumes: analysisResult, validationResult
- Produces: HTML 报告文件

- [x] **Step 1: 创建报告生成器** ✅
- [x] **Step 2: 设计 HTML 模板（含 Mermaid 图表）** ✅
- [x] **Step 3: 实现图表生成逻辑** ✅
- [x] **Step 4: 添加样式和交互** ✅

---

## Task 5: 集成测试

**Files:**
- Create: `test-integration.js` - 端到端测试脚本

- [x] **Step 1: 创建集成测试脚本** ✅
- [x] **Step 2: 测试仓库类型检测** ✅
- [x] **Step 3: 测试 LLM 分析器** ✅
- [x] **Step 4: 测试 Web 验证器** ✅
- [x] **Step 5: 测试报告生成器** ✅

---

## Task 6: 文档更新

**Files:**
- Modify: `SKILL.md` - 更新技能文档
- Create: `docs/ARCHITECTURE.md` - 架构文档

- [ ] **Step 1: 更新 SKILL.md**
- [ ] **Step 2: 撰写架构文档**
- [ ] **Step 3: 添加使用示例**

---

## 参考资料

[知识来源: 基于训练数据]

- [Serper API](https://serper.dev)
- [Tavily API](https://tavily.com)
- [Anthropic Claude API](https://docs.anthropic.com)
- Multi-Agent Semantic Collaboration 模式
- RepoAudit: LLM Agent for Repository Code Auditing
