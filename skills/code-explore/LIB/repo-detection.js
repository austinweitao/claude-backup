/**
 * 仓库类型检测
 * @param {string} repoPath - 仓库路径
 * @returns {Object} { type, confidence, signatures, recommendedTopics }
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 检测仓库类型
 */
async function detectRepoType(repoPath) {
  const signatures = {
    kernel: {
      files: ['Kconfig', 'Makefile', 'init/Kconfig'],
      dirs: ['arch', 'include/linux', 'kernel'],
      patterns: [/MODULE_LICENSE/i, /EXPORT_SYMBOL/, /__init\b/, /struct\s+\w+\s*\{[^}]*\bspinlock/, /dev_name_nr/i],
      weights: { file: 30, dir: 10, pattern: 5 },
    },
    android: {
      files: ['AndroidManifest.xml'],
      dirs: ['frameworks', 'packages', 'system'],
      patterns: [/android\.(os|content|app)/i, /IBinder/, /@SystemApi/],
      weights: { file: 10, dir: 5, pattern: 1 },
    },
    art: {
      files: ['Android.bp', 'art.gni'],
      dirs: ['runtime', 'compiler', 'dex2oat', 'oatdump', 'libdexfile', 'libartbase', 'openjdkjvmti'],
      patterns: [/class\s+\w+\s*:\s*public\s+Object/, /Thread::/, /gc\/|, GC|Heap::/, /ArtMethod|ArtField/, /ScopedObjectAccess/, /ThreadList|RootsCallback/],
      weights: { file: 20, dir: 15, pattern: 3 },
    },
    userspace: {
      files: ['CMakeLists.txt', 'meson.build', 'configure.ac', 'Makefile.am'],
      dirs: ['src', 'lib'],
      patterns: [/#include\s*<[^>]+>/, /printf\s*\(/, /malloc\s*\(/],
      weights: { file: 5, dir: 3, pattern: 1 },
    },
    rust: {
      files: ['Cargo.toml'],
      dirs: ['src'],
      patterns: [/fn main\s*\(/, /impl\s+\w+/, /pub fn/, /use\s+\w+::/],
      weights: { file: 10, dir: 5, pattern: 1 },
    },
  };

  const scores = {
    kernel: 0,
    android: 0,
    art: 0,
    userspace: 0,
    rust: 0,
  };

  // 检查文件存在
  async function checkFiles(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const name = entry.name;

        // 检查顶层文件
        for (const [type, sig] of Object.entries(signatures)) {
          if (sig.files.includes(name)) {
            scores[type] += sig.weights.file;
          }
        }

        // 检查目录
        if (entry.isDirectory()) {
          for (const [type, sig] of Object.entries(signatures)) {
            if (sig.dirs.includes(name) || sig.dirs.some(d => name.includes(d))) {
              scores[type] += sig.weights.dir;
            }
          }
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  // 检查模式匹配 (仅扫描前 20 个文件)
  async function checkPatterns(dir, depth = 0) {
    if (depth > 2) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let filesChecked = 0;

      for (const entry of entries) {
        if (filesChecked > 20) break;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!['.git', 'test', 'tests', 'build'].includes(entry.name)) {
            await checkPatterns(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = entry.name.split('.').pop();
          if (!['c', 'h', 'cpp', 'rs', 'java', 'kt', 'go'].includes(ext)) continue;

          filesChecked++;
          try {
            const content = await fs.readFile(fullPath, 'utf-8');

            for (const [type, sig] of Object.entries(signatures)) {
              for (const pattern of sig.patterns) {
                if (pattern.test(content)) {
                  scores[type] += sig.weights.pattern;
                }
              }
            }
          } catch (e) {
            // 忽略读取错误
          }
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  await checkFiles(repoPath);
  await checkPatterns(repoPath);

  // 确定最高分类型
  let maxScore = 0;
  let type = 'userspace'; // 默认类型
  for (const [t, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      type = t;
    }
  }

  // 计算置信度
  const totalSignals = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalSignals > 0 ? maxScore / Math.max(totalSignals, 1) : 0.5;

  // 推荐专题
  const recommendedTopics = {
    kernel: ['concurrency', 'memory', 'security', 'performance'],
    android: ['security', 'performance', 'concurrency', 'error'],
    art: ['gc', 'compilation', 'jit', 'interpreter', 'memory', 'concurrency'],
    userspace: ['error', 'concurrency', 'performance'],
    rust: ['memory', 'concurrency', 'error'],
  };

  return {
    type,
    confidence: Math.round(confidence * 100) / 100,
    signatures: Object.entries(scores).map(([type, score]) => ({ type, score })),
    recommendedTopics: recommendedTopics[type],
  };
}

/**
 * 快速检测 (仅检查顶层文件)
 */
function quickDetectRepoType(fileList) {
  const signatures = {
    kernel: ['Kconfig', 'Makefile'],
    android: ['Android.bp', 'Android.mk'],
    userspace: ['CMakeLists.txt', 'meson.build', 'configure.ac', 'package.json'],
    rust: ['Cargo.toml'],
  };

  for (const [type, files] of Object.entries(signatures)) {
    if (files.some(f => fileList.includes(f))) {
      return type;
    }
  }
  return 'userspace';
}

module.exports = {
  detectRepoType,
  quickDetectRepoType,
};
