/**
 * 报告生成器 - 基于 Handlebars 模板的 HTML 报告生成
 *
 * [知识来源: 基于训练数据]
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 简单的模板引擎（不使用外部依赖）
 * 支持基本 Handlebars 风格的语法
 */
class SimpleTemplate {
  constructor(template) {
    this.template = template;
  }

  /**
   * 渲染模板
   */
  render(context) {
    let result = this.template;

    // 处理条件块 {{#if}}
    result = this._processIfBlocks(result, context);

    // 处理循环块 {{#each}}
    result = this._processEachBlocks(result, context);

    // 处理变量替换 {{variable}}
    result = this._processVariables(result, context);

    return result;
  }

  /**
   * 处理条件块
   */
  _processIfBlocks(template, context) {
    const ifRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

    return template.replace(ifRegex, (match, path, ifBlock, elseBlock = '') => {
      const value = this._getValue(path, context);
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        return ifBlock;
      }
      return elseBlock;
    });
  }

  /**
   * 处理循环块
   */
  _processEachBlocks(template, context) {
    const eachRegex = /\{\{#each\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(eachRegex, (match, path, itemTemplate) => {
      const items = this._getValue(path, context);
      if (!Array.isArray(items)) return '';

      return items.map((item, index) => {
        const itemContext = { ...context, this: item, ...item, index };
        return this._processVariables(itemTemplate, itemContext);
      }).join('');
    });
  }

  /**
   * 处理变量替换
   */
  _processVariables(template, context) {
    // 处理 {{variable}} 和 {{variable.property}}
    const varRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g;

    return template.replace(varRegex, (match, path) => {
      const value = this._getValue(path, context);
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
  }

  /**
   * 获取嵌套属性值
   */
  _getValue(path, context) {
    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }

    return value;
  }
}

/**
 * 报告生成器类
 */
class ReportGenerator {
  constructor(options = {}) {
    this.templatePath = options.templatePath ||
      path.join(__dirname, '../TEMPLATES/report-template.html');
    this.outputDir = options.outputDir ||
      path.join(process.env.HOME || '/tmp', '.claude/skills/code-explore/docs');
  }

  /**
   * 生成报告
   */
  async generate(analysis, validation, options = {}) {
    console.log('[ReportGenerator] 开始生成报告...');

    // 加载模板
    const template = await this.loadTemplate();

    // 准备上下文数据
    const context = this.prepareContext(analysis, validation);

    // 渲染报告
    const html = this.render(template, context);

    // 保存报告
    const outputPath = await this.saveReport(html, options.filename);

    console.log(`[ReportGenerator] 报告已生成: ${outputPath}`);

    return {
      path: outputPath,
      url: `file://${outputPath}`,
      html,
    };
  }

  /**
   * 加载模板
   */
  async loadTemplate() {
    try {
      const template = await fs.readFile(this.templatePath, 'utf-8');
      return template;
    } catch (e) {
      console.error('[ReportGenerator] 模板加载失败:', e.message);
      // 返回内联默认模板
      return this.getDefaultTemplate();
    }
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Exploration Report</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; padding: 40px; }
        h1 { color: #58a6ff; }
        .section { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .stat { display: inline-block; margin: 10px 20px; }
        .stat-value { font-size: 24px; color: #58a6ff; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #30363d; }
        th { background: #21262d; }
    </style>
</head>
<body>
    <h1>{{title}}</h1>
    <p>Repository: {{repoPath}} | Type: {{repoType}} | Model: {{model}}</p>

    <div class="section">
        <h2>Overview</h2>
        <div class="stat"><div class="stat-value">{{stats.moduleCount}}</div><div>Modules</div></div>
        <div class="stat"><div class="stat-value">{{stats.structCount}}</div><div>Structures</div></div>
        <div class="stat"><div class="stat-value">{{stats.pathCount}}</div><div>Critical Paths</div></div>
        <div class="stat"><div class="stat-value">{{validation.overallConfidence}}</div><div>Confidence</div></div>
    </div>

    <div class="section">
        <h2>Architecture Pattern</h2>
        <p><strong>{{architecture.pattern}}</strong> - Confidence: {{architecture.confidence}}</p>
    </div>

    <div class="section">
        <h2>Modules</h2>
        <table>
            <thead><tr><th>Name</th><th>Role</th><th>Importance</th></tr></thead>
            <tbody>
            {{#each modules.modules}}
            <tr>
                <td>{{name}}</td>
                <td>{{semanticRole}}</td>
                <td>{{importance}}</td>
            </tr>
            {{/each}}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Validation</h2>
        <p>Engines Succeeded: {{validation.enginesSucceeded}}/{{validation.enginesTotal}}</p>
        <p>Overall Confidence: {{validation.overallConfidence}}</p>
    </div>
</body>
</html>`;
  }

  /**
   * 准备渲染上下文
   */
  prepareContext(analysis, validation) {
    const modules = analysis.modules?.modules || [];
    const structures = analysis.dataStructures?.structures || [];
    const entryPoints = analysis.criticalPaths?.entryPoints || [];

    return {
      title: 'Code Exploration Report',
      repoPath: analysis.metadata?.repoPath || 'Unknown',
      repoType: analysis.metadata?.repoType || 'Unknown',
      analyzedAt: analysis.metadata?.analyzedAt || new Date().toISOString(),
      model: analysis.metadata?.model || 'Unknown',

      stats: {
        moduleCount: modules.length,
        structCount: structures.length,
        pathCount: entryPoints.length,
      },

      architecture: {
        pattern: analysis.architecture?.pattern || 'Unknown',
        confidence: analysis.architecture?.confidence || 0,
        components: analysis.architecture?.components || [],
        diagram: this.generateArchitectureDiagram(analysis.architecture),
      },

      modules: {
        modules: modules.map(m => ({
          name: m.name || 'Unknown',
          semanticRole: m.semanticRole || 'unknown',
          entryPoints: m.entryPoints?.join(', ') || '',
          complexity: m.complexity || 'unknown',
          importance: typeof m.importance === 'number' ? m.importance.toFixed(2) : 'N/A',
        })),
        relationships: analysis.modules?.relationships || [],
        diagram: this.generateModuleDiagram(analysis.modules),
      },

      criticalPaths: {
        entryPoints: entryPoints.map(e => ({
          name: e.name || 'Unknown',
          file: e.file || 'Unknown',
          description: e.description || '',
        })),
        callChains: analysis.criticalPaths?.callChains || [],
        diagram: this.generateCallChainDiagram(analysis.criticalPaths),
      },

      dataStructures: {
        structures: structures.map(s => ({
          name: s.name || 'Unknown',
          file: s.file || 'Unknown',
          fields: Array.isArray(s.fields) ? s.fields.join(', ') : (s.fields || ''),
          purpose: s.purpose || '',
        })),
        patterns: analysis.dataStructures?.patterns || [],
      },

      validation: {
        overallConfidence: validation?.overallConfidence?.toFixed(2) || '0.00',
        confidenceLevel: this.getConfidenceLevel(validation?.overallConfidence),
        enginesSucceeded: validation?.enginesSucceeded || 0,
        enginesTotal: validation?.enginesTotal || 4,
        sources: (validation?.sources || []).join(', '),
        needsRefinement: validation?.needsRefinement || false,
      },
    };
  }

  /**
   * 获取置信度等级
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * 生成架构图（Mermaid 代码）
   */
  generateArchitectureDiagram(architecture) {
    if (!architecture?.components?.length) return '';

    const lines = ['flowchart TB'];

    architecture.components.forEach((comp, i) => {
      lines.push(`    C${i}[${comp.name}]`);
    });

    architecture.components.forEach((comp, i) => {
      if (comp.dependencies?.length) {
        comp.dependencies.forEach(dep => {
          const depIndex = architecture.components.findIndex(c => c.name === dep);
          if (depIndex >= 0) {
            lines.push(`    C${depIndex} --> C${i}`);
          }
        });
      }
    });

    return lines.join('\n');
  }

  /**
   * 生成模块关系图
   */
  generateModuleDiagram(modules) {
    if (!modules?.relationships?.length) return '';

    const lines = ['flowchart LR'];

    modules.relationships.forEach(rel => {
      const typeSymbol = rel.type === 'extends' ? '-->' : '-.->';
      lines.push(`    ${rel.from} ${typeSymbol} ${rel.to}`);
    });

    return lines.join('\n');
  }

  /**
   * 生成调用链图
   */
  generateCallChainDiagram(criticalPaths) {
    if (!criticalPaths?.callChains?.length) return '';

    const lines = ['sequenceDiagram'];

    criticalPaths.callChains.forEach(chain => {
      if (chain.chain?.length >= 2) {
        for (let i = 0; i < chain.chain.length - 1; i++) {
          lines.push(`    ${chain.chain[i]}->>${chain.chain[i + 1]}`);
        }
      }
    });

    return lines.join('\n');
  }

  /**
   * 渲染模板
   */
  render(template, context) {
    const engine = new SimpleTemplate(template);
    return engine.render(context);
  }

  /**
   * 保存报告
   */
  async saveReport(html, filename) {
    // 确保输出目录存在
    await fs.mkdir(this.outputDir, { recursive: true });

    // 生成文件名
    const name = filename ||
      `code-exploration-${Date.now()}.html`;
    const outputPath = path.join(this.outputDir, name);

    // 写入文件
    await fs.writeFile(outputPath, html, 'utf-8');

    return outputPath;
  }
}

module.exports = { ReportGenerator };
