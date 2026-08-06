/**
 * LLM 分析器 - 语义理解驱动的代码仓库分析
 *
 * [知识来源: 基于训练数据]
 * 采用 Plan-Act-Reflect 循环模式进行代码分析
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * LLM 分析器类
 */
class LLMAnalyzer {
  constructor(options = {}) {
    this.model = options.model || 'claude-sonnet-5';
    this.maxTokens = options.maxTokens || 8192;
    this.temperature = options.temperature || 0.3;
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.repoPath = options.repoPath || '';
  }

  /**
   * 完整分析流程
   */
  async analyze(repoInfo, options = {}) {
    console.log('[LLMAnalyzer] 开始分析...');

    const results = {
      architecture: null,
      modules: null,
      criticalPaths: null,
      dataStructures: null,
      metadata: {
        repoPath: repoInfo.path,
        repoType: repoInfo.type || 'unknown',
        analyzedAt: new Date().toISOString(),
        model: this.model,
      }
    };

    try {
      // Plan-Act-Reflect 循环
      console.log('[LLMAnalyzer] 分析架构模式...');
      results.architecture = await this.analyzeArchitecture(repoInfo);

      console.log('[LLMAnalyzer] 分析模块结构...');
      results.modules = await this.analyzeModules(repoInfo, results.architecture);

      console.log('[LLMAnalyzer] 分析关键路径...');
      results.criticalPaths = await this.analyzeCriticalPaths(repoInfo, results.modules);

      console.log('[LLMAnalyzer] 分析数据结构...');
      results.dataStructures = await this.analyzeDataStructures(repoInfo, results.modules);

      console.log('[LLMAnalyzer] 分析完成');
    } catch (error) {
      console.error('[LLMAnalyzer] 分析失败:', error.message);
      results.error = error.message;
    }

    return results;
  }

  /**
   * 分析架构模式
   */
  async analyzeArchitecture(repoInfo) {
    const repoPath = repoInfo.path;

    // 收集基本信息
    const basicInfo = await this.gatherBasicInfo(repoPath, repoInfo.type);

    const prompt = `分析以下代码仓库的架构模式：

仓库路径: ${repoPath}
仓库类型: ${repoInfo.type || 'unknown'}

仓库结构信息:
- 顶层目录: ${basicInfo.topDirs.join(', ')}
- 源文件总数: ${basicInfo.sourceFiles}
- 主要文件类型: ${basicInfo.fileTypes.join(', ')}

请根据仓库类型和结构，识别：
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
    const repoPath = repoInfo.path;
    const architectureStr = JSON.stringify(architecture || {}, null, 2);

    // 扫描模块目录结构
    const moduleStructure = await this.scanModuleStructure(repoPath);

    const prompt = `基于架构分析结果，深入分析核心模块：

架构: ${architectureStr}

仓库路径: ${repoPath}

模块目录结构:
${JSON.stringify(moduleStructure, null, 2)}

请识别：
1. 核心模块及其语义角色
2. 模块间的接口关系
3. 模块的复杂度评估（基于语义，非行数）
4. 关键模块的入口点和出口点

重点关注：
- 语义一致性（arm/目录是架构目录还是业务模块？）
- 功能边界（模块是否内聚）
- 接口清晰度（模块间如何通信）
- 排除测试目录和构建产物

返回 JSON 格式：
{
  "modules": [{
    "name": "模块名",
    "semanticRole": "语义角色（core/utility/plugin/arch等）",
    "path": "相对路径",
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
    const repoPath = repoInfo.path;
    const modulesStr = JSON.stringify(modules || {}, null, 2);

    // 收集入口点候选
    const entryCandidates = await this.findEntryCandidates(repoPath);

    const prompt = `追踪核心执行路径：

模块: ${modulesStr}

仓库路径: ${repoPath}

候选入口点:
${JSON.stringify(entryCandidates, null, 2)}

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
    const repoPath = repoInfo.path;
    const modulesStr = JSON.stringify(modules || {}, null, 2);

    // 收集结构体候选
    const structCandidates = await this.findStructCandidates(repoPath);

    const prompt = `分析核心数据结构：

模块: ${modulesStr}
仓库路径: ${repoPath}

候选数据结构:
${JSON.stringify(structCandidates.slice(0, 20), null, 2)}

请识别：
1. 核心数据结构（struct/class）
2. 数据结构的字段和关系
3. 内存管理策略
4. 并发控制机制

返回 JSON 格式：
{
  "structures": [{
    "name": "结构名",
    "file": "文件路径",
    "fields": ["字段1", "字段2"],
    "relationships": ["关联结构"],
    "purpose": "用途描述"
  }],
  "patterns": ["设计模式1", "模式2"]
}`;

    return this.callLLM(prompt);
  }

  /**
   * 收集基本信息
   */
  async gatherBasicInfo(repoPath, repoType) {
    try {
      const entries = await fs.readdir(repoPath, { withFileTypes: true });

      const topDirs = entries
        .filter(e => e.isDirectory())
        .filter(d => !d.name.startsWith('.') && !['test', 'tests', 'build', 'node_modules'].includes(d.name))
        .map(d => d.name);

      // 统计源文件
      let sourceFiles = 0;
      const fileTypes = new Set();

      await this.countFiles(repoPath, sourceFiles, fileTypes, 2);

      return {
        topDirs,
        sourceFiles,
        fileTypes: Array.from(fileTypes).slice(0, 10),
      };
    } catch (e) {
      return {
        topDirs: [],
        sourceFiles: 0,
        fileTypes: [],
      };
    }
  }

  /**
   * 递归统计文件
   */
  async countFiles(dir, counter, fileTypes, depth) {
    if (depth <= 0 || counter.count > 1000) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (counter.count > 1000) break;

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && !['test', 'tests', 'build', 'node_modules', 'gen'].includes(entry.name)) {
            await this.countFiles(path.join(dir, entry.name), counter, fileTypes, depth - 1);
          }
        } else {
          counter.count++;
          const ext = path.extname(entry.name);
          if (ext) fileTypes.add(ext);
        }
      }
    } catch (e) {
      // 忽略
    }
  }

  /**
   * 扫描模块结构
   */
  async scanModuleStructure(repoPath) {
    const structure = [];

    try {
      const entries = await fs.readdir(repoPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') || ['test', 'tests', 'build'].includes(entry.name)) continue;

        const fullPath = path.join(repoPath, entry.name);
        const stats = await fs.stat(fullPath);

        // 统计子目录和文件数
        let subDirs = 0;
        let fileCount = 0;

        try {
          const subEntries = await fs.readdir(fullPath, { withFileTypes: true });
          subDirs = subEntries.filter(e => e.isDirectory()).length;
          fileCount = subEntries.filter(e => e.isFile()).length;
        } catch (e) {
          // 忽略
        }

        structure.push({
          name: entry.name,
          type: this.classifyDirectory(entry.name),
          subDirs,
          fileCount,
        });
      }
    } catch (e) {
      // 忽略
    }

    return structure;
  }

  /**
   * 分类目录类型
   */
  classifyDirectory(name) {
    const lower = name.toLowerCase();

    // 架构/平台目录
    if (['arm', 'arm64', 'x86', 'x86_64', 'riscv64', 'arch', 'platform'].includes(lower)) {
      return 'architecture';
    }

    // 核心代码
    if (['core', 'runtime', 'kernel', 'engine', 'base'].includes(lower)) {
      return 'core';
    }

    // 工具/辅助
    if (['util', 'utils', 'common', 'lib', 'tools'].includes(lower)) {
      return 'utility';
    }

    // 协议/接口
    if (['api', 'protocol', 'interface', 'binder'].includes(lower)) {
      return 'protocol';
    }

    // 内存/垃圾回收
    if (['gc', 'heap', 'memory', 'mm'].includes(lower)) {
      return 'memory';
    }

    // 测试
    if (['test', 'tests'].includes(lower)) {
      return 'test';
    }

    return 'other';
  }

  /**
   * 查找入口点候选
   */
  async findEntryCandidates(repoPath) {
    const candidates = [];
    const patterns = [
      'main', 'init', 'create', 'start', 'run', 'execute',
      'open', 'probe', 'entry', '__init', '__start'
    ];

    try {
      const entries = await fs.readdir(repoPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') || ['test', 'tests', 'build'].includes(entry.name)) continue;

        candidates.push({
          dir: entry.name,
          pattern: this.classifyDirectory(entry.name),
        });
      }
    } catch (e) {
      // 忽略
    }

    return candidates.slice(0, 15);
  }

  /**
   * 查找结构体候选
   */
  async findStructCandidates(repoPath) {
    const candidates = [];
    const extensions = ['.h', '.hpp', '.java', '.cc', '.cpp'];

    try {
      await this.scanForStructs(repoPath, candidates, extensions, 3);
    } catch (e) {
      // 忽略
    }

    return candidates;
  }

  /**
   * 扫描结构体
   */
  async scanForStructs(dir, candidates, extensions, depth) {
    if (depth <= 0 || candidates.length >= 50) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (candidates.length >= 50) break;

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && !['test', 'tests', 'build'].includes(entry.name)) {
            await this.scanForStructs(path.join(dir, entry.name), candidates, extensions, depth - 1);
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            candidates.push({
              file: path.join(dir, entry.name).replace(repoPath, ''),
              type: ext,
            });
          }
        }
      }
    } catch (e) {
      // 忽略
    }
  }

  /**
   * 调用 LLM
   */
  async callLLM(prompt, options = {}) {
    const { model = this.model, temperature = this.temperature } = options;

    if (!this.apiKey) {
      console.warn('[LLMAnalyzer] 未配置 ANTHROPIC_API_KEY，使用模拟响应');
      return this.generateMockResponse(prompt);
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
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
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return this.parseResponse(data.content[0].text);
    } catch (error) {
      console.error('[LLMAnalyzer] LLM 调用失败:', error.message);
      // 返回降级响应
      return this.generateFallbackResponse(prompt);
    }
  }

  /**
   * 解析 LLM 响应
   */
  parseResponse(text) {
    try {
      // 尝试提取 JSON
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                       text.match(/```\n([\s\S]*?)\n```/) ||
                       text.match(/```json([\s\S]*?)```/) ||
                       text.match(/(\{[\s\S]*\})/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1].trim();
        return JSON.parse(jsonStr);
      }
      return { raw: text, parsed: false };
    } catch (e) {
      console.warn('[LLMAnalyzer] JSON 解析失败:', e.message);
      return { raw: text, parseError: e.message };
    }
  }

  /**
   * 生成模拟响应（无 API Key 时使用）
   */
  generateMockResponse(prompt) {
    if (prompt.includes('架构模式')) {
      return {
        pattern: '分层架构',
        components: [
          { name: 'core', responsibility: '核心运行时', dependencies: [] },
          { name: 'gc', responsibility: '垃圾回收', dependencies: ['core'] },
        ],
        designDecisions: ['使用 C++ 实现核心逻辑', '分层模块化设计'],
        confidence: 0.5,
        source: 'mock',
      };
    }

    if (prompt.includes('模块')) {
      return {
        modules: [],
        relationships: [],
        source: 'mock',
      };
    }

    if (prompt.includes('关键路径')) {
      return {
        entryPoints: [],
        callChains: [],
        source: 'mock',
      };
    }

    if (prompt.includes('数据结构')) {
      return {
        structures: [],
        patterns: [],
        source: 'mock',
      };
    }

    return { source: 'mock' };
  }

  /**
   * 生成降级响应
   */
  generateFallbackResponse(prompt) {
    return {
      error: 'LLM 调用失败',
      fallback: true,
      message: '无法获取 LLM 响应，请检查 API 配置',
    };
  }
}

module.exports = { LLMAnalyzer };
