/**
 * 递归模块树扫描器
 * 构建完整的代码仓库模块层次结构
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 扫描目录构建模块树
 * @param {string} rootPath - 仓库根目录
 * @param {Object} options - 配置选项
 * @returns {Object} 模块树结构
 */
async function scanModuleTree(rootPath, options = {}) {
  const {
    maxDepth = 4,           // 最大递归深度
    excludeDirs = ['.git', 'test', 'tests', 'benchmark', 'benchmarks', 'docs', 'tools', 'out', 'build'],
    includeExtensions = ['.h', '.cc', '.cpp', '.c', '.java', '.kt', '.rs', '.go', '.py'],
    minFilesPerModule = 1,   // 最小文件数才计入
    minLinesPerModule = 100, // 最小代码行数
  } = options;

  const result = {
    root: {
      path: rootPath,
      name: path.basename(rootPath),
      depth: 0,
      files: [],
      subdirs: {},
      stats: { fileCount: 0, lineCount: 0, size: 0 },
    },
    modules: [],  // 所有模块列表
    totalStats: { fileCount: 0, lineCount: 0, size: 0 },
  };

  async function scanDir(dirPath, depth, parent) {
    if (depth > maxDepth) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      let dirFileCount = 0;
      let dirLineCount = 0;
      let dirSize = 0;
      const subdirs = {};

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 跳过排除目录
          if (excludeDirs.includes(entry.name) || entry.name.startsWith('.')) {
            continue;
          }

          // 递归扫描子目录
          const subResult = {
            name: entry.name,
            path: fullPath,
            depth: depth + 1,
            files: [],
            subdirs: {},
            stats: { fileCount: 0, lineCount: 0, size: 0 },
          };

          await scanDir(fullPath, depth + 1, subResult);

          // 只有满足条件的子目录才计入
          if (subResult.stats.fileCount >= minFilesPerModule &&
              subResult.stats.lineCount >= minLinesPerModule) {
            subdirs[entry.name] = subResult;
            dirFileCount += subResult.stats.fileCount;
            dirLineCount += subResult.stats.lineCount;
            dirSize += subResult.stats.size;
          }
        } else if (entry.isFile()) {
          // 检查扩展名
          const ext = path.extname(entry.name).toLowerCase();
          if (!includeExtensions.includes(ext)) continue;

          // 统计文件
          try {
            const stat = await fs.stat(fullPath);
            dirSize += stat.size;
            dirFileCount++;

            // 统计行数（仅文本文件）
            if (['.h', '.cc', '.cpp', '.c', '.java', '.kt', '.rs', '.go', '.py'].includes(ext)) {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n').length;
              dirLineCount += lines;
            }
          } catch (e) {
            // 忽略读取错误
          }
        }
      }

      parent.path = dirPath;
      parent.depth = depth;
      parent.subdirs = subdirs;
      parent.stats = {
        fileCount: dirFileCount,
        lineCount: dirLineCount,
        size: dirSize,
      };
      parent.name = path.basename(dirPath);

      // 添加到全局模块列表
      if (depth > 0 && dirFileCount >= minFilesPerModule) {
        result.modules.push({
          name: path.basename(dirPath),
          path: dirPath,
          depth,
          parent: path.dirname(dirPath),
          ...parent.stats,
        });
      }

      result.totalStats.fileCount += dirFileCount;
      result.totalStats.lineCount += dirLineCount;
      result.totalStats.size += dirSize;

    } catch (e) {
      console.error(`Error scanning ${dirPath}: ${e.message}`);
    }
  }

  await scanDir(rootPath, 0, result.root);

  // 按文件数排序模块
  result.modules.sort((a, b) => b.fileCount - a.fileCount);

  return result;
}

/**
 * 识别关键模块（基于大小、依赖等指标）
 * @param {Object} moduleTree - 模块树
 * @param {number} topN - 返回前 N 个关键模块
 * @returns {Array} 关键模块列表
 */
function identifyKeyModules(moduleTree, topN = 20) {
  const { modules, totalStats } = moduleTree;

  // 计算每个模块的"重要性分数"
  const scored = modules.map(mod => {
    // 文件数分数 (40%)
    const fileScore = (mod.fileCount / totalStats.fileCount) * 40;

    // 代码行数分数 (40%)
    const lineScore = (mod.lineCount / totalStats.lineCount) * 40;

    // 深度分数 (20%) - 越深越具体
    const depthScore = Math.min(mod.depth / 6, 1) * 20;

    // 惩罚过深的模块
    const totalScore = fileScore + lineScore + depthScore;

    return {
      ...mod,
      importanceScore: Math.round(totalScore * 100) / 100,
    };
  });

  // 按重要性分数排序
  scored.sort((a, b) => b.importanceScore - a.importanceScore);

  return scored.slice(0, topN);
}

/**
 * 构建模块依赖关系图（通过 #include 分析）
 * @param {Object} moduleTree - 模块树
 * @returns {Object} 依赖关系
 */
async function buildDependencyGraph(moduleTree, options = {}) {
  const {
    maxFilesPerModule = 10,  // 每个模块最多分析的文件数
  } = options;

  const dependencies = new Map();

  async function findIncludes(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const includes = [];

      // 匹配 #include "xxx" 或 #include <xxx>
      const includeRegex = /#include\s+["<]([^">]+)[">]/g;
      let match;
      while ((match = includeRegex.exec(content)) !== null) {
        includes.push(match[1]);
      }

      return includes;
    } catch (e) {
      return [];
    }
  }

  async function analyzeModule(mod) {
    // 查找模块中的源文件
    const allFiles = await findSourceFiles(mod.path);
    const filesToAnalyze = allFiles.slice(0, maxFilesPerModule);

    const includes = new Set();

    for (const file of filesToAnalyze) {
      const fileIncludes = await findIncludes(file);
      fileIncludes.forEach(inc => includes.add(inc));
    }

    return {
      module: mod.name,
      path: mod.path,
      includeCount: includes.size,
      includes: Array.from(includes).slice(0, 20),  // 限制数量
    };
  }

  async function findSourceFiles(dirPath) {
    const files = [];

    async function walk(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!['.git', 'test', 'tests'].includes(entry.name)) {
              await walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.h', '.cc', '.cpp', '.c'].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (e) {
        // 忽略
      }
    }

    await walk(dirPath);
    return files;
  }

  // 分析前 20 个关键模块的依赖
  const keyModules = moduleTree.modules.slice(0, 20);
  const results = [];

  for (const mod of keyModules) {
    const dep = await analyzeModule(mod);
    results.push(dep);
    dependencies.set(mod.name, dep);
  }

  return {
    modules: results,
    totalModules: moduleTree.modules.length,
  };
}

/**
 * 完整的模块分析
 * @param {string} repoPath - 仓库路径
 * @param {Object} options - 配置选项
 * @returns {Object} 完整分析结果
 */
async function analyzeModules(repoPath, options = {}) {
  console.log('开始模块树扫描...');
  const moduleTree = await scanModuleTree(repoPath, options);

  console.log(`扫描完成，共 ${moduleTree.modules.length} 个模块`);

  console.log('识别关键模块...');
  const keyModules = identifyKeyModules(moduleTree, options.topModules || 30);

  console.log('构建依赖关系...');
  const dependencies = await buildDependencyGraph(moduleTree, options);

  return {
    summary: {
      totalModules: moduleTree.modules.length,
      totalFiles: moduleTree.totalStats.fileCount,
      totalLines: moduleTree.totalStats.lineCount,
      totalSize: moduleTree.totalStats.size,
    },
    moduleTree,
    keyModules,
    dependencies,
  };
}

module.exports = {
  scanModuleTree,
  identifyKeyModules,
  buildDependencyGraph,
  analyzeModules,
};
