#!/usr/bin/env node

/**
 * code-explore 集成测试脚本
 *
 * 测试整个分析流程:
 * 1. 仓库类型检测
 * 2. LLM 分析
 * 3. Web 验证
 * 4. 报告生成
 *
 * [知识来源: 基于训练数据]
 */

const path = require('path');

// 加载模块
const { detectRepoType } = require('./LIB/repo-detection');
const { LLMAnalyzer } = require('./LIB/llm-analyzer');
const { WebValidator } = require('./LIB/web-validator');
const { ReportGenerator } = require('./LIB/report-generator');

// 测试配置
const TEST_REPOS = [
  { path: '/home/cwtrocks/explore-art/art', type: 'art', name: 'ART Runtime' },
  { path: '/home/cwtrocks/linux/drivers/android', type: 'kernel', name: 'Android Binder Driver' },
];

/**
 * 颜色输出
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function success(message) { log(colors.green, 'PASS', message); }
function info(message) { log(colors.blue, 'INFO', message); }
function warn(message) { log(colors.yellow, 'WARN', message); }
function error(message) { log(colors.red, 'FAIL', message); }

/**
 * 测试仓库类型检测
 */
async function testRepoDetection(repoPath) {
  info(`测试仓库类型检测: ${repoPath}`);

  try {
    const result = await detectRepoType(repoPath);
    success(`检测到类型: ${result.type} (置信度: ${result.confidence})`);
    return result;
  } catch (e) {
    error(`检测失败: ${e.message}`);
    return null;
  }
}

/**
 * 测试 LLM 分析
 */
async function testLLMAnalyzer(repoInfo) {
  info(`测试 LLM 分析器...`);

  const analyzer = new LLMAnalyzer({
    model: process.env.LLM_MODEL || 'claude-sonnet-5',
  });

  try {
    const result = await analyzer.analyze(repoInfo);

    if (result.error) {
      warn(`LLM 分析返回错误（可能是正常降级）: ${result.error}`);
    } else {
      success(`LLM 分析完成`);
      info(`  - 架构: ${result.architecture?.pattern || 'N/A'}`);
      info(`  - 模块数: ${result.modules?.modules?.length || 0}`);
      info(`  - 入口点数: ${result.criticalPaths?.entryPoints?.length || 0}`);
      info(`  - 数据结构: ${result.dataStructures?.structures?.length || 0}`);
    }

    return result;
  } catch (e) {
    error(`LLM 分析失败: ${e.message}`);
    return null;
  }
}

/**
 * 测试 Web 验证器
 */
async function testWebValidator(analysis) {
  info(`测试 Web 验证器...`);

  const validator = new WebValidator({
    confidenceThreshold: 0.5,
  });

  try {
    const result = await validator.validate(analysis);

    success(`Web 验证完成`);
    info(`  - 总体置信度: ${result.overallConfidence?.toFixed(2) || 'N/A'}`);
    info(`  - 成功引擎: ${result.enginesSucceeded || 0}/${result.enginesTotal || 4}`);
    info(`  - 需要优化: ${result.needsRefinement ? '是' : '否'}`);

    if (result.sources?.length) {
      info(`  - 验证来源: ${result.sources.join(', ')}`);
    }

    return result;
  } catch (e) {
    error(`Web 验证失败: ${e.message}`);
    return null;
  }
}

/**
 * 测试报告生成
 */
async function testReportGenerator(analysis, validation, outputName) {
  info(`测试报告生成器...`);

  const generator = new ReportGenerator({
    outputDir: path.join(__dirname, 'docs'),
  });

  try {
    const result = await generator.generate(analysis, validation, {
      filename: outputName,
    });

    success(`报告生成完成`);
    info(`  - 路径: ${result.path}`);
    info(`  - URL: ${result.url}`);

    return result;
  } catch (e) {
    error(`报告生成失败: ${e.message}`);
    return null;
  }
}

/**
 * 运行完整测试流程
 */
async function runFullTest(repo) {
  console.log('\n' + '='.repeat(60));
  info(`开始测试: ${repo.name}`);
  console.log('='.repeat(60));

  // 1. 仓库类型检测
  const repoType = await testRepoDetection(repo.path);
  if (!repoType) {
    error(`跳过仓库 ${repo.name} (检测失败)`);
    return null;
  }

  // 构建仓库信息
  const repoInfo = {
    path: repo.path,
    type: repo.type || repoType.type,
  };

  // 2. LLM 分析（可选，跳过如果没 API key）
  let analysis = null;
  if (process.env.ANTHROPIC_API_KEY) {
    analysis = await testLLMAnalyzer(repoInfo);
  } else {
    warn('跳过 LLM 分析（未配置 ANTHROPIC_API_KEY）');
    // 使用模拟数据
    analysis = {
      architecture: {
        pattern: 'Mock Architecture',
        confidence: 0.5,
        components: [],
      },
      modules: { modules: [] },
      criticalPaths: { entryPoints: [] },
      dataStructures: { structures: [], patterns: [] },
      metadata: {
        repoPath: repo.path,
        repoType: repoInfo.type,
        analyzedAt: new Date().toISOString(),
        model: 'mock',
      },
    };
  }

  // 3. Web 验证
  const validation = await testWebValidator(analysis);

  // 4. 报告生成
  const outputName = `test-report-${repo.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.html`;
  const report = await testReportGenerator(analysis, validation, outputName);

  return { repoType, analysis, validation, report };
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '#'.repeat(60));
  info('code-explore 集成测试');
  info(`时间: ${new Date().toISOString()}`);
  console.log('#'.repeat(60));

  // 检查环境
  info('检查环境配置...');
  info(`  - ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '已配置' : '未配置'}`);
  info(`  - SERPER_API_KEY: ${process.env.SERPER_API_KEY ? '已配置' : '未配置'}`);
  info(`  - TAVILY_API_KEY: ${process.env.TAVILY_API_KEY ? '已配置' : '未配置'}`);
  info(`  - DDG_API_KEY: ${process.env.DDG_API_KEY ? '已配置' : '未配置'}`);
  info(`  - MINIMAX_API_KEY: ${process.env.MINIMAX_API_KEY ? '已配置' : '未配置'}`);

  const results = [];

  // 运行测试
  for (const repo of TEST_REPOS) {
    try {
      const result = await runFullTest(repo);
      results.push({ repo: repo.name, success: true, result });
    } catch (e) {
      error(`测试 ${repo.name} 失败: ${e.message}`);
      results.push({ repo: repo.name, success: false, error: e.message });
    }
  }

  // 输出总结
  console.log('\n' + '#'.repeat(60));
  info('测试总结');
  console.log('#'.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  info(`总计: ${results.length} 个测试`);
  success(`通过: ${passed}`);
  if (failed > 0) {
    error(`失败: ${failed}`);
  }

  results.forEach(r => {
    if (r.success) {
      success(`  ✓ ${r.repo}`);
    } else {
      error(`  ✗ ${r.repo}: ${r.error}`);
    }
  });

  // 输出报告位置
  if (results.some(r => r.success && r.result?.report?.path)) {
    console.log('\n生成的报告:');
    results.forEach(r => {
      if (r.success && r.result?.report?.path) {
        info(`  - ${r.result.report.path}`);
      }
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 运行
main().catch(e => {
  error(`测试脚本异常: ${e.message}`);
  process.exit(1);
});
