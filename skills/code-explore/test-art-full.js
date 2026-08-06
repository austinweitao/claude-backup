#!/usr/bin/env node
/**
 * Code Explore Skill - ART Runtime 完整验证脚本
 * 测试所有 LIB 模块在大规模仓库上的表现
 */

const path = require('path');
const fs = require('fs');

// 测试仓库路径 (ART Runtime)
const TEST_REPO = process.env.TEST_REPO || '/home/cwtrocks/explore-art/art';

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '../../docs/code-explore-art');
const docsDir = path.dirname(OUTPUT_DIR);
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runFullValidation() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     code-explore Skill - ART Runtime 完整验证              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`测试仓库: ${TEST_REPO}\n`);

  // 加载模块
  const modules = {
    scaleAssessment: require('./LIB/scale-assessment.js'),
    repoDetection: require('./LIB/repo-detection.js'),
    moduleTreeScanner: require('./LIB/module-tree-scanner.js'),
    structScanner: require('./LIB/struct-scanner.js'),
    pathFinder: require('./LIB/path-finder.js'),
  };

  const results = {};

  // ========== L1: 复杂度评估 ==========
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('L1: 复杂度评估');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const start = Date.now();
    const result = await modules.scaleAssessment.assessComplexity(TEST_REPO);
    const elapsed = Date.now() - start;

    results.complexity = result;
    console.log(`✓ 复杂度: ${result.complexity}`);
    console.log(`  - 源文件数: ${result.metrics.sourceStats.fileCount}`);
    console.log(`  - 总行数: ${result.metrics.sourceStats.lineCount}`);
    console.log(`  - 目录数: ${result.metrics.sourceStats.dirCount}`);
    console.log(`  - 估算 Struct 数: ${result.estimatedStructs}`);
    console.log(`  - 推荐深度: ${result.recommendedDepth}`);
    console.log(`  - 耗时: ${elapsed}ms`);
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    results.complexity = { error: e.message };
  }
  console.log();

  // ========== L2: 仓库类型检测 ==========
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('L2: 仓库类型检测');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const start = Date.now();
    const result = await modules.repoDetection.detectRepoType(TEST_REPO);
    const elapsed = Date.now() - start;

    results.repoType = result;
    console.log(`✓ 仓库类型: ${result.type}`);
    console.log(`  - 置信度: ${result.confidence}`);
    console.log(`  - 推荐专题: ${result.recommendedTopics.join(', ')}`);
    console.log(`  - 耗时: ${elapsed}ms`);
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    results.repoType = { error: e.message };
  }
  console.log();

  // ========== L3: 模块树扫描 ==========
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('L3: 模块树扫描');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const start = Date.now();
    const result = await modules.moduleTreeScanner.scanModuleTree(TEST_REPO, {
      maxDepth: 4,
      minFilesPerModule: 1,
      minLinesPerModule: 100,
    });
    const elapsed = Date.now() - start;

    const keyModules = modules.moduleTreeScanner.identifyKeyModules(result, 20);

    results.modules = { ...result, keyModules };
    console.log(`✓ 扫描完成`);
    console.log(`  - 总模块数: ${result.modules.length}`);
    console.log(`  - 总文件数: ${result.totalStats.fileCount}`);
    console.log(`  - 总行数: ${result.totalStats.lineCount}`);
    console.log(`  - 耗时: ${elapsed}ms`);

    console.log(`\n  关键模块 Top 20:`);
    keyModules.forEach((m, i) => {
      console.log(`    ${i + 1}. ${m.name} (分数: ${m.importanceScore.toFixed(2)}, 文件: ${m.fileCount}, 行数: ${m.lineCount})`);
    });
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    results.modules = { error: e.message };
  }
  console.log();

  // ========== L4: 结构体扫描 ==========
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('L4: 结构体扫描');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const start = Date.now();
    const result = await modules.structScanner.analyzeStructs(TEST_REPO, {
      maxDepth: 4,
      minFields: 2,
    });
    const elapsed = Date.now() - start;

    results.structs = result;
    console.log(`✓ 扫描完成`);
    console.log(`  - 总 Struct 数: ${result.stats.total}`);
    console.log(`  - struct: ${result.stats.byKind.struct || 0}`);
    console.log(`  - class: ${result.stats.byKind.class || 0}`);
    console.log(`  - union: ${result.stats.byKind.union || 0}`);
    console.log(`  - 耗时: ${elapsed}ms`);

    console.log(`\n  按类别分组:`);
    for (const [cat, structs] of Object.entries(result.groups)) {
      if (structs && structs.length > 0) {
        console.log(`    - ${cat}: ${structs.length}`);
      }
    }

    console.log(`\n  字段最多的 Top 15:`);
    result.stats.topByFields.slice(0, 15).forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.name} (${s.fieldCount} 字段, ${s.kind}) - ${path.basename(s.file)}`);
    });
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    results.structs = { error: e.message };
  }
  console.log();

  // ========== L5: 关键路径挖掘 ==========
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('L5: 关键路径挖掘');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const start = Date.now();
    const result = await modules.pathFinder.analyzeKeyPaths(TEST_REPO, {
      repoType: results.repoType?.type || 'generic',
      maxFiles: 100,
    });
    const elapsed = Date.now() - start;

    results.paths = result;
    console.log(`✓ 分析完成`);
    console.log(`  - 关键路径数: ${result.stats.totalPaths}`);
    console.log(`  - 最大深度: ${result.stats.maxDepth}`);
    console.log(`  - 核心流程数: ${result.stats.totalFlows}`);
    console.log(`  - 耗时: ${elapsed}ms`);

    if (result.callPaths && result.callPaths.length > 0) {
      console.log(`\n  最长调用链 Top 10:`);
      result.callPaths.slice(0, 10).forEach((p, i) => {
        const chainStr = p.chain.slice(0, 6).join(' → ');
        console.log(`    ${i + 1}. ${p.entry} (深度: ${p.depth})`);
        console.log(`       ${chainStr}${p.chain.length > 6 ? ' → ...' : ''}`);
      });
    }

    if (result.coreFlows && result.coreFlows.length > 0) {
      console.log(`\n  核心流程:`);
      result.coreFlows.slice(0, 10).forEach((f, i) => {
        console.log(`    ${i + 1}. ${f.name} (出现 ${f.occurrences} 次)`);
      });
    }
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    results.paths = { error: e.message };
  }
  console.log();

  // ========== 输出结果摘要 ==========
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                     验证结果摘要                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const summary = {
    timestamp: new Date().toISOString(),
    repo: TEST_REPO,
    complexity: results.complexity?.complexity || 'unknown',
    repoType: results.repoType?.type || 'unknown',
    moduleCount: results.modules?.modules?.length || 0,
    structCount: results.structs?.stats?.total || 0,
    pathCount: results.paths?.stats?.totalPaths || 0,
    keyModules: results.modules?.keyModules?.slice(0, 10).map(m => m.name) || [],
    topStructs: results.structs?.stats?.topByFields?.slice(0, 10).map(s => s.name) || [],
    topPaths: results.paths?.callPaths?.slice(0, 5).map(p => p.entry) || [],
    errors: Object.entries(results).filter(([k, v]) => v.error).map(([k]) => k),
  };

  console.log(`仓库复杂度: ${summary.complexity}`);
  console.log(`仓库类型: ${summary.repoType}`);
  console.log(`模块数: ${summary.moduleCount}`);
  console.log(`结构体数: ${summary.structCount}`);
  console.log(`关键路径数: ${summary.pathCount}`);
  console.log(`错误: ${summary.errors.length === 0 ? '无' : summary.errors.join(', ')}`);

  console.log(`\nTop 10 关键模块:`);
  summary.keyModules.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));

  console.log(`\nTop 10 大结构体:`);
  summary.topStructs.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  console.log(`\nTop 5 调用链入口:`);
  summary.topPaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

  // 保存 JSON 结果
  const jsonPath = path.join(OUTPUT_DIR, 'validation-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  console.log(`\n✓ 结果已保存至: ${jsonPath}`);

  return summary;
}

// 运行验证
runFullValidation()
  .then(summary => {
    console.log('\n🎉 ART Runtime 验证完成!');
    process.exit(0);
  })
  .catch(e => {
    console.error('验证脚本错误:', e);
    process.exit(1);
  });
