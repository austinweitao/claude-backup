/**
 * 复杂度评估函数
 * @param {string} repoPath - 仓库路径
 * @returns {Object} { complexity, metrics, recommendedDepth }
 */

const fs = require('fs').promises;
const path = require('path');

const SOURCE_EXTENSIONS = ['.c', '.h', '.cc', '.cpp', '.java', '.kt', '.rs', '.go'];
const IGNORE_DIRS = ['.git', 'test', 'tests', 'benchmark', 'build', 'out', 'docs', 'node_modules'];

/**
 * 评估仓库复杂度
 */
async function assessComplexity(repoPath) {
  const metrics = {
    fileCount: 0,
    structCount: 0,
    functionCount: 0,
    lineCount: 0,
    dirCount: 0,
    sourceStats: {
      fileCount: 0,
      lineCount: 0,
      dirCount: 0,
    },
  };

  // 递归统计
  async function walk(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      metrics.dirCount++;
      metrics.sourceStats.dirCount++;

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // 跳过忽略目录
          if (IGNORE_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          metrics.fileCount++;

          const ext = path.extname(entry.name).toLowerCase();
          const isSource = SOURCE_EXTENSIONS.includes(ext);

          if (isSource) {
            metrics.sourceStats.fileCount++;

            try {
              const stat = await fs.stat(fullPath);
              metrics.lineCount += stat.size; // 近似行数

              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n').length;
              metrics.sourceStats.lineCount += lines;

              // 统计 struct
              const structMatches = content.match(/struct\s+\w+\s*\{/g);
              if (structMatches) metrics.structCount += structMatches.length;

              // 统计函数
              const funcMatches = content.match(/(?:static\s+)?(?:inline\s+)?(?:const\s+)?(?:unsigned\s+)?\w+\s+\w+\s*\([^)]*\)\s*(?:const)?\s*\{/g);
              if (funcMatches) metrics.functionCount += funcMatches.length;
            } catch (e) {
              // 忽略读取错误
            }
          }
        }
      }
    } catch (e) {
      // 忽略权限错误
    }
  }

  await walk(repoPath);

  // 评估复杂度
  let complexity = 'simple';
  if (metrics.sourceStats.fileCount > 200 || metrics.structCount > 100) {
    complexity = 'complex';
  } else if (metrics.sourceStats.fileCount > 20 || metrics.structCount > 10) {
    complexity = 'medium';
  }

  // 估算总 struct 数 (基于采样)
  const avgStructPerFile = metrics.sourceStats.fileCount > 0
    ? metrics.structCount / metrics.sourceStats.fileCount
    : 0;
  const estimatedStructs = Math.round(avgStructPerFile * metrics.fileCount);

  return {
    complexity,
    metrics,
    estimatedStructs,
    recommendedDepth: {
      simple: 'L1+L2',
      medium: 'L1+L2+L3',
      complex: 'L1+L2+L3+L4',
    }[complexity],
  };
}

/**
 * 简单评估 (不递归扫描，用于快速检查)
 */
function quickScaleAssessment(fileCount, structCount) {
  let level = 'simple';
  if (fileCount > 200 || structCount > 100) {
    level = 'complex';
  } else if (fileCount > 20 || structCount > 10) {
    level = 'medium';
  }
  return level;
}

module.exports = {
  assessComplexity,
  quickScaleAssessment,
};
