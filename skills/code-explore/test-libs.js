#!/usr/bin/env node
/**
 * Code Explore Skill - 综合测试脚本
 * 测试所有 LIB 模块的功能
 */

const path = require('path');
const fs = require('fs');

// 测试仓库路径 (使用 Linux kernel binder 驱动)
const TEST_REPO = process.env.TEST_REPO || '/home/cwtrocks/linux/drivers/android';

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Code Explore Skill - LIB 模块综合测试                  ║');
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

  let passed = 0;
  let failed = 0;

  // 测试 1: 复杂度评估
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 1: 复杂度评估 (scale-assessment.js)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await modules.scaleAssessment.assessComplexity(TEST_REPO);
    console.log(`✓ 复杂度: ${result.complexity}`);
    console.log(`  - 源文件数: ${result.metrics.sourceStats.fileCount}`);
    console.log(`  - 总行数: ${result.metrics.sourceStats.lineCount}`);
    console.log(`  - 目录数: ${result.metrics.sourceStats.dirCount}`);
    console.log(`  - 估算 Struct 数: ${result.estimatedStructs}`);
    passed++;
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    failed++;
  }
  console.log();

  // 测试 2: 仓库类型检测
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 2: 仓库类型检测 (repo-detection.js)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await modules.repoDetection.detectRepoType(TEST_REPO);
    console.log(`✓ 仓库类型: ${result.type}`);
    console.log(`  - 置信度: ${result.confidence}`);
    console.log(`  - 特征: ${result.signatures.slice(0, 5).join(', ')}`);
    passed++;
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    failed++;
  }
  console.log();

  // 测试 3: 模块树扫描
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 3: 模块树扫描 (module-tree-scanner.js)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await modules.moduleTreeScanner.scanModuleTree(TEST_REPO, {
      maxDepth: 4,
      minFilesPerModule: 1,
      minLinesPerModule: 50,
    });
    console.log(`✓ 扫描完成`);
    console.log(`  - 总模块数: ${result.modules.length}`);
    console.log(`  - 总文件数: ${result.totalStats.fileCount}`);
    console.log(`  - 总行数: ${result.totalStats.lineCount}`);

    // 显示前 10 个关键模块
    const keyModules = modules.moduleTreeScanner.identifyKeyModules(result, 10);
    console.log(`\n  关键模块 Top 10:`);
    keyModules.forEach((m, i) => {
      console.log(`    ${i + 1}. ${m.name} (分数: ${m.importanceScore}, 文件: ${m.fileCount}, 行数: ${m.lineCount})`);
    });
    passed++;
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    failed++;
  }
  console.log();

  // 测试 4: 结构体扫描
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 4: 结构体扫描 (struct-scanner.js)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await modules.structScanner.analyzeStructs(TEST_REPO, {
      maxDepth: 4,
      minFields: 2,
    });
    console.log(`✓ 扫描完成`);
    console.log(`  - 总 Struct 数: ${result.stats.total}`);
    console.log(`  - struct: ${result.stats.byKind.struct}`);
    console.log(`  - class: ${result.stats.byKind.class}`);
    console.log(`  - union: ${result.stats.byKind.union || 0}`);

    console.log(`\n  按类别分组:`);
    for (const [cat, structs] of Object.entries(result.groups)) {
      if (structs.length > 0) {
        console.log(`    - ${cat}: ${structs.length}`);
      }
    }

    console.log(`\n  字段最多的 Top 10:`);
    result.stats.topByFields.slice(0, 10).forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.name} (${s.fieldCount} 字段, ${s.kind}) - ${path.basename(s.file)}`);
    });
    passed++;
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    failed++;
  }
  console.log();

  // 测试 5: 关键路径挖掘
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试 5: 关键路径挖掘 (path-finder.js)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await modules.pathFinder.analyzeKeyPaths(TEST_REPO, {
      repoType: 'kernel',
      maxFiles: 50,
    });
    console.log(`✓ 分析完成`);
    console.log(`  - 关键路径数: ${result.stats.totalPaths}`);
    console.log(`  - 最大深度: ${result.stats.maxDepth}`);
    console.log(`  - 核心流程数: ${result.stats.totalFlows}`);

    if (result.callPaths.length > 0) {
      console.log(`\n  最长调用链 Top 5:`);
      result.callPaths.slice(0, 5).forEach((p, i) => {
        console.log(`    ${i + 1}. ${p.entry} (深度: ${p.depth})`);
        console.log(`       ${p.chain.slice(0, 5).join(' → ')}${p.chain.length > 5 ? ' → ...' : ''}`);
      });
    }

    if (result.coreFlows.length > 0) {
      console.log(`\n  核心流程:`);
      result.coreFlows.slice(0, 5).forEach((f, i) => {
        console.log(`    ${i + 1}. ${f.name} (出现 ${f.occurrences} 次)`);
      });
    }
    passed++;
  } catch (e) {
    console.log(`✗ 失败: ${e.message}`);
    failed++;
  }
  console.log();

  // 总结
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                        测试总结                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log('🎉 所有测试通过!');
  } else {
    console.log('⚠️  有测试失败，请检查输出');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(e => {
  console.error('测试脚本错误:', e);
  process.exit(1);
});
