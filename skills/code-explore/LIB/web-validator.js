/**
 * Web 验证器 - 多引擎并行验证 LLM 结论
 *
 * [知识来源: 基于训练数据 - 行业最佳实践]
 */

const https = require('https');
const http = require('http');

/**
 * Web 验证器类
 */
class WebValidator {
  constructor(options = {}) {
    this.engines = {
      serper: { weight: 0.3, enabled: true, key: 'SERPER_API_KEY' },
      ddg: { weight: 0.25, enabled: true, key: 'DDG_API_KEY' },
      tavily: { weight: 0.25, enabled: true, key: 'TAVILY_API_KEY' },
      claude: { weight: 0.2, enabled: true, key: 'MINIMAX_API_KEY' },
    };

    // 从环境变量获取 API Keys
    Object.keys(this.engines).forEach(engine => {
      this.engines[engine].key = process.env[this.engines[engine].key];
    });

    this.confidenceThreshold = options.confidenceThreshold || 0.6;
    this.timeout = options.timeout || 30000;
  }

  /**
   * 验证分析结果
   */
  async validate(analysis) {
    console.log('[WebValidator] 开始验证...');

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

    const result = {
      ...validationResults,
      overallConfidence,
      needsRefinement: overallConfidence < this.confidenceThreshold,
      sources: this.collectSources(validationResults),
    };

    console.log(`[WebValidator] 验证完成，置信度: ${overallConfidence.toFixed(2)}`);

    return result;
  }

  /**
   * 验证单个模块
   */
  async validateSingleModule(item, type) {
    if (!item || item.error) {
      return { valid: false, confidence: 0, reason: 'No item to validate or error in item' };
    }

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
    const apiKey = this.engines.serper.key;

    if (!apiKey) {
      return { engine: 'serper', success: false, reason: 'API key not configured' };
    }

    try {
      const result = await this.httpRequest({
        hostname: 'google.serper.dev',
        path: `/search?q=${encodeURIComponent(query)}`,
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
        timeout: this.timeout,
      });

      const data = JSON.parse(result);

      return {
        engine: 'serper',
        success: true,
        results: data.organic || [],
        count: (data.organic || []).length,
        data,
      };
    } catch (e) {
      return { engine: 'serper', success: false, error: e.message };
    }
  }

  /**
   * DDG 搜索
   */
  async searchDDG(query) {
    const apiKey = this.engines.ddg.key;

    // DDG API 需要认证，如果没有 key 使用备用方案
    if (!apiKey) {
      // 使用 DuckDuckGo HTML 搜索（备用）
      try {
        const result = await this.httpRequest({
          hostname: 'api.duckduckgo.com',
          path: `/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
          method: 'GET',
          timeout: this.timeout,
        });

        const data = JSON.parse(result);

        return {
          engine: 'ddg',
          success: true,
          results: data.RelatedTopics || [],
          count: (data.RelatedTopics || []).length,
          fallback: true,
        };
      } catch (e) {
        return { engine: 'ddg', success: false, error: e.message };
      }
    }

    try {
      const result = await this.httpRequest({
        hostname: 'api.duckduckgo.com',
        path: `/?q=${encodeURIComponent(query)}&format=json`,
        method: 'GET',
        timeout: this.timeout,
      });

      const data = JSON.parse(result);

      return {
        engine: 'ddg',
        success: true,
        results: data.RelatedTopics || [],
        count: (data.RelatedTopics || []).length,
      };
    } catch (e) {
      return { engine: 'ddg', success: false, error: e.message };
    }
  }

  /**
   * Tavily 搜索
   */
  async searchTavily(query) {
    const apiKey = this.engines.tavily.key;

    if (!apiKey) {
      return { engine: 'tavily', success: false, reason: 'API key not configured' };
    }

    try {
      const result = await this.httpRequest({
        hostname: 'api.tavily.com',
        path: '/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          query,
          max_results: 5,
          search_depth: 'advanced',
        }),
        timeout: this.timeout,
      });

      const data = JSON.parse(result);

      return {
        engine: 'tavily',
        success: true,
        results: data.results || [],
        count: (data.results || []).length,
        data,
      };
    } catch (e) {
      return { engine: 'tavily', success: false, error: e.message };
    }
  }

  /**
   * Claude 搜索 (Claude)
   */
  async searchMinimax(query) {
    const apiKey = this.engines.minimax.key;

    if (!apiKey) {
      return { engine: 'claude', success: false, reason: 'API key not configured' };
    }

    try {
      const result = await this.httpRequest({
        hostname: 'api.minimax.chat',
        path: '/v1/coding_plan/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query }),
        timeout: this.timeout,
      });

      const data = JSON.parse(result);

      return {
        engine: 'claude',
        success: true,
        results: data.data || [],
        count: (data.data || []).length,
        data,
      };
    } catch (e) {
      return { engine: 'claude', success: false, error: e.message };
    }
  }

  /**
   * HTTP 请求封装
   */
  httpRequest(options) {
    return new Promise((resolve, reject) => {
      const isHttps = options.hostname.includes('api') || options.port === 443;
      const client = isHttps ? https : http;

      const timeout = options.timeout || 30000;

      const req = client.request({
        hostname: options.hostname,
        port: options.port || (isHttps ? 443 : 80),
        path: options.path,
        method: options.method || 'GET',
        headers: options.headers || {},
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(timeout);

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * 构建查询
   */
  buildQuery(item, type) {
    if (type === 'architecture') {
      const pattern = item.pattern || item.name || 'architecture';
      const components = item.components?.map(c => c.name).join(' ') || '';
      return `${pattern} ${components}`.trim();
    }

    if (type === 'module') {
      const name = item.name || '';
      const semanticRole = item.semanticRole || '';
      const entryPoints = item.entryPoints?.join(' ') || '';
      return `${name} ${semanticRole} ${entryPoints}`.trim();
    }

    if (type === 'paths') {
      const entries = item.entryPoints?.map(e => e.name).join(' ') || '';
      return entries;
    }

    if (type === 'structures') {
      const names = item.structures?.map(s => s.name).join(' ') || '';
      return names;
    }

    // 回退：使用 JSON 字符串
    return JSON.stringify(item).slice(0, 200);
  }

  /**
   * 聚合结果
   */
  aggregateResults(results, query) {
    let totalWeight = 0;
    let weightedConfidence = 0;
    const sources = [];
    const errors = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const r = result.value;
        if (r.success) {
          const engine = r.engine;
          const confidence = this.calculateEngineConfidence(r, engine);
          const weight = this.engines[engine]?.weight || 0.25;

          weightedConfidence += confidence * weight;
          totalWeight += weight;

          sources.push({
            engine,
            count: r.count || 0,
            confidence,
            fallback: r.fallback || false,
          });
        } else {
          errors.push({ engine: r.engine, error: r.error || r.reason });
        }
      } else {
        errors.push({ engine: 'unknown', error: result.reason });
      }
    });

    const confidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

    return {
      valid: confidence >= 0.5,
      confidence: Math.round(confidence * 100) / 100,
      sources,
      errors: errors.length > 0 ? errors : undefined,
      query,
      enginesSucceeded: sources.length,
      enginesTotal: 4,
    };
  }

  /**
   * 计算单个引擎的置信度
   */
  calculateEngineConfidence(result, engine) {
    const count = result.count || 0;

    switch (engine) {
      case 'serper':
        // Serper 返回 organic 列表
        if (count >= 5) return 0.9;
        if (count >= 3) return 0.7;
        if (count >= 1) return 0.5;
        return 0.2;

      case 'tavily':
        // Tavily 返回 results 列表
        if (count >= 5) return 0.9;
        if (count >= 3) return 0.7;
        if (count >= 1) return 0.5;
        return 0.2;

      case 'ddg':
        // DDG 返回 RelatedTopics
        if (result.fallback) {
          // 备用模式置信度降低
          return count >= 3 ? 0.5 : 0.2;
        }
        if (count >= 3) return 0.7;
        if (count >= 1) return 0.5;
        return 0.2;

      case 'claude':
        if (count >= 3) return 0.8;
        if (count >= 1) return 0.5;
        return 0.2;

      default:
        return count >= 3 ? 0.6 : 0.3;
    }
  }

  /**
   * 计算总体置信度
   */
  calculateOverallConfidence(validationResults) {
    const weights = {
      architecture: 0.3,
      modules: 0.4,
      paths: 0.2,
      structures: 0.1,
    };

    let total = 0;
    let weightSum = 0;

    if (validationResults.architecture && validationResults.architecture.confidence > 0) {
      total += validationResults.architecture.confidence * weights.architecture;
      weightSum += weights.architecture;
    }

    if (validationResults.modules && validationResults.modules.length > 0) {
      const validModules = validationResults.modules.filter(m => m.confidence > 0);
      if (validModules.length > 0) {
        const avgModuleConf = validModules.reduce((sum, m) => sum + m.confidence, 0) / validModules.length;
        total += avgModuleConf * weights.modules;
        weightSum += weights.modules;
      }
    }

    if (validationResults.criticalPaths && validationResults.criticalPaths.confidence > 0) {
      total += validationResults.criticalPaths.confidence * weights.paths;
      weightSum += weights.paths;
    }

    if (validationResults.dataStructures && validationResults.dataStructures.confidence > 0) {
      total += validationResults.dataStructures.confidence * weights.structures;
      weightSum += weights.structures;
    }

    return weightSum > 0 ? total / weightSum : 0;
  }

  /**
   * 收集来源
   */
  collectSources(validationResults) {
    const sources = new Set();

    const collect = (result) => {
      if (result && result.sources) {
        result.sources.forEach(s => sources.add(s.engine));
      }
    };

    collect(validationResults.architecture);
    validationResults.modules?.forEach(collect);
    collect(validationResults.criticalPaths);
    collect(validationResults.dataStructures);

    return Array.from(sources);
  }

  /**
   * 检查引擎配置状态
   */
  getEngineStatus() {
    const status = {};

    Object.entries(this.engines).forEach(([engine, config]) => {
      status[engine] = {
        enabled: config.enabled,
        configured: !!config.key,
        weight: config.weight,
      };
    });

    return status;
  }
}

module.exports = { WebValidator };
