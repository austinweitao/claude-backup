#!/usr/bin/env node

/**
 * code-explore CLI - LLM 驱动的代码仓库分析工具
 *
 * 使用方法:
 *   node cli.js /path/to/repo [--output output.html]
 *
 * 环境变量:
 *   ANTHROPIC_API_KEY  - Claude API 密钥
 *   SERPER_API_KEY     - Serper API 密钥
 *   TAVILY_API_KEY     - Tavily API 密钥
 *   DDG_API_KEY        - DuckDuckGo API 密钥
 *   CLAUDE_API_KEY    - Claude API 密钥
 *
 * [知识来源: 基于训练数据]
 */

const path = require('path');
const fs = require('fs').promises;

// 加载模块
const { detectRepoType } = require('./LIB/repo-detection');
const { LLMAnalyzer } = require('./LIB/llm-analyzer');
const { WebValidator } = require('./LIB/web-validator');
const { ReportGenerator } = require('./LIB/report-generator');

/**
 * 颜色输出
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

const info = (m) => log(colors.blue, 'INFO', m);
const success = (m) => log(colors.green, 'OK', m);
const warn = (m) => log(colors.yellow, 'WARN', m);
const error = (m) => log(colors.red, 'ERROR', m);

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    repoPath: null,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (!arg.startsWith('-')) {
      options.repoPath = arg;
    }
  }

  return options;
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + colors.cyan + '═'.repeat(60));
  console.log('  code-explore - LLM 驱动的代码仓库分析工具');
  console.log('═'.repeat(60) + colors.reset + '\n');

  // 解析参数
  const options = parseArgs();

  if (!options.repoPath) {
    console.log('用法: node cli.js <repo-path> [--output <output.html>]');
    console.log('\n示例:');
    console.log('  node cli.js /home/user/project');
    console.log('  node cli.js /home/user/project -o report.html');
    process.exit(1);
  }

  // 检查路径是否存在
  try {
    await fs.access(options.repoPath);
  } catch (e) {
    error(`路径不存在: ${options.repoPath}`);
    process.exit(1);
  }

  const absolutePath = path.resolve(options.repoPath);
  info(`分析仓库: ${absolutePath}`);

  // 1. 仓库类型检测
  info('步骤 1/4: 检测仓库类型...');
  const repoType = await detectRepoType(absolutePath);
  success(`检测到类型: ${repoType.type} (置信度: ${repoType.confidence})`);

  if (repoType.recommendedTopics?.length) {
    info(`推荐分析主题: ${repoType.recommendedTopics.join(', ')}`);
  }

  // 2. LLM 分析
  info('步骤 2/4: LLM 分析中...');

  const repoInfo = {
    path: absolutePath,
    type: repoType.type,
  };

  const analyzer = new LLMAnalyzer({
    model: process.env.LLM_MODEL || 'claude-sonnet-5',
  });

  const analysis = await analyzer.analyze(repoInfo);

  if (analysis.error) {
    warn(`LLM 分析遇到问题: ${analysis.error}`);
    warn('将使用模拟数据进行演示');
  } else {
    success('LLM 分析完成');
  }

  // 3. Web 验证
  info('步骤 3/4: Web 验证中...');
  const validator = new WebValidator({
    confidenceThreshold: 0.6,
  });

  const validation = await validator.validate(analysis);
  success(`验证完成 (置信度: ${validation.overallConfidence?.toFixed(2) || 'N/A'})`);

  // 4. 报告生成
  info('步骤 4/4: 生成报告...');

  const outputName = options.output || `code-explore-${Date.now()}.html`;
  const generator = new ReportGenerator({
    outputDir: path.join(__dirname, 'docs'),
  });

  const report = await generator.generate(analysis, validation, {
    filename: outputName,
  });

  success(`报告已生成: ${report.path}`);

  // 打印摘要
  console.log('\n' + colors.cyan + '─'.repeat(60));
  console.log('  分析摘要');
  console.log('─'.repeat(60) + colors.reset);

  console.log(`\n  仓库: ${absolutePath}`);
  console.log(`  类型: ${repoType.type}`);
  console.log(`  模型: ${analysis.metadata?.model || 'N/A'}`);
  console.log(`  架构: ${analysis.architecture?.pattern || 'N/A'}`);
  console.log(`  模块: ${analysis.modules?.modules?.length || 0}`);
  console.log(`  入口点: ${analysis.criticalPaths?.entryPoints?.length || 0}`);
  console.log(`  数据结构: ${analysis.dataStructures?.structures?.length || 0}`);
  console.log(`\n  验证置信度: ${validation.overallConfidence?.toFixed(2) || 'N/A'}`);
  console.log(`  验证引擎: ${validation.enginesSucceeded || 0}/${validation.enginesTotal || 4}`);
  console.log(`  报告文件: ${report.path}`);

  console.log('\n  用浏览器打开报告:');
  console.log(`    file://${report.path}`);

  console.log('\n' + colors.green + '✓ 完成!' + colors.reset + '\n');
}

// 运行
main().catch((e) => {
  error(`运行失败: ${e.message}`);
  console.error(e);
  process.exit(1);
});
