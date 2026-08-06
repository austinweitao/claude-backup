/**
 * 深度关键路径挖掘器
 * 识别并分析代码仓库中的核心执行路径
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 扫描关键路径
 * @param {string} repoPath - 仓库路径
 * @param {Object} options - 配置选项
 * @returns {Object} 关键路径分析结果
 */
async function scanKeyPaths(repoPath, options = {}) {
  const {
    repoType = 'generic',      // 仓库类型: kernel, android, userspace, rust
    maxFiles = 500,            // 最多分析文件数 (提升到 500)
    maxDepth = 8,              // 递归深度 (提升到 8)
  } = options;

  const paths = [];
  const functionCalls = new Map();

  // 收集所有文件和函数调用
  await scanFiles(repoPath, {
    extensions: ['.c', '.cc', '.cpp', '.h', '.java'],
    maxFiles,
    maxDepth,
    onFile: async (filePath) => {
      const calls = await extractFunctionCalls(filePath);
      calls.forEach(call => {
        if (!functionCalls.has(call.caller)) {
          functionCalls.set(call.caller, new Set());
        }
        call.callees.forEach(callee => functionCalls.get(call.caller).add(callee));
      });
    },
  });

  // 识别入口函数
  const entryPoints = identifyEntryPoints(functionCalls, repoType);

  // 追踪关键路径
  for (const entry of entryPoints) {
    const tracedPath = traceCallChain(entry, functionCalls);
    if (tracedPath.length > 0) {
      paths.push({
        entry,
        chain: tracedPath,
        depth: tracedPath.length,
      });
    }
  }

  // 排序并限制数量
  return paths
    .sort((a, b) => b.depth - a.depth)
    .slice(0, 30);
}

/**
 * 扫描文件
 */
async function scanFiles(dirPath, options) {
  const {
    extensions,
    maxFiles,
    maxDepth,
    onFile,
  } = options;

  let filesScanned = 0;

  async function walk(dir, depth) {
    if (depth > maxDepth || filesScanned > maxFiles) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (['.git', 'test', 'tests', 'benchmark'].includes(entry.name)) continue;
          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!extensions.includes(ext)) continue;

          filesScanned++;
          if (filesScanned > maxFiles) break;

          await onFile(fullPath);
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  await walk(dirPath, 0);
}

/**
 * 提取函数调用
 */
async function extractFunctionCalls(filePath) {
  const calls = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // 匹配函数定义
    const funcDefRegex = /(?:static\s+)?(?:inline\s+)?(?:const\s+)?(?:unsigned\s+)?(?:int|void|bool|long|char|struct\s+\w+\s*\*?)\s+(\w+)\s*\([^)]*\)\s*(?:const)?\s*(?:\{|;)/g;

    let match;
    while ((match = funcDefRegex.exec(content)) !== null) {
      const funcName = match[1];

      // 跳过常见非关键函数
      if (isIgnoreableFunction(funcName)) continue;

      // 在函数体内查找调用
      const funcStart = match.index;
      const braceStart = content.indexOf('{', funcStart);
      if (braceStart === -1) continue;

      // 找到匹配的右括号
      let braceCount = 1;
      let funcEnd = braceStart + 1;
      while (braceCount > 0 && funcEnd < content.length) {
        if (content[funcEnd] === '{') braceCount++;
        else if (content[funcEnd] === '}') braceCount--;
        funcEnd++;
      }

      const funcBody = content.slice(braceStart, funcEnd);

      // 提取函数调用
      const callees = extractCallees(funcBody);

      calls.push({
        caller: funcName,
        file: filePath,
        line: content.slice(0, funcStart).split('\n').length,
        callees: Array.from(callees),
      });
    }
  } catch (e) {
    // 忽略错误
  }

  return calls;
}

/**
 * 从函数体中提取被调用的函数
 */
function extractCallees(body) {
  const callees = new Set();

  // 匹配函数调用 (排除宏和注释)
  const callRegex = /(?:^|[^a-zA-Z_])(\w+)\s*\(/gm;

  let match;
  while ((match = callRegex.exec(body)) !== null) {
    const name = match[1];

    // 跳过常见非实际调用
    if (isIgnoreableFunction(name)) continue;

    // 跳过自身和常见标准库
    if (!['if', 'while', 'for', 'switch', 'return', 'sizeof', 'typeof', 'define'].includes(name)) {
      callees.add(name);
    }
  }

  return callees;
}

/**
 * 判断是否可忽略的函数名
 */
function isIgnoreableFunction(name) {
  const ignoreList = [
    // C 标准库
    'printf', 'sprintf', 'snprintf', 'fprintf', 'scanf', 'sscanf',
    'malloc', 'calloc', 'realloc', 'free', 'memcpy', 'memset', 'memmove', 'memcmp',
    'strcpy', 'strncpy', 'strcat', 'strncat', 'strlen', 'strcmp', 'strncmp', 'strchr', 'strstr',
    'open', 'close', 'read', 'write', 'lseek', 'ioctl',
    // C++ 标准库
    'std', 'vector', 'string', 'map', 'set', 'unordered_map', 'unique_ptr', 'shared_ptr',
    // Linux kernel
    'printk', 'kmalloc', 'kzalloc', 'kfree', 'vmalloc', 'vfree',
    // Android
    'ALOGI', 'ALOGE', 'ALOGD', 'LOGI', 'LOGE',
    // 常见宏/关键字
    'if', 'while', 'for', 'switch', 'return', 'sizeof', 'typeof',
    // 常见辅助函数
    'likely', 'unlikely', 'ACCESS_ONCE', 'WRITE_ONCE', 'READ_ONCE',
  ];

  return ignoreList.includes(name);
}

/**
 * 根据仓库类型识别入口函数
 */
function identifyEntryPoints(functionCalls, repoType) {
  const entryPatterns = {
    kernel: [
      'init_module', 'cleanup_module',           // 模块入口
      '__init', '__exit',                         // 内核初始化
      'probe', 'remove',                          // 驱动入口
      'open', 'release', 'read', 'write', 'ioctl', // 文件操作
      'poll', 'mmap',                             // 其他 VFS 操作
      'netif_receive_skb', 'dev_queue_xmit',     // 网络入口
      'start_xmit', 'tx_timeout',                // 网卡驱动
    ],
    android: [
      'main', 'onCreate', 'onStart', 'onResume', // 生命周期
      'onPause', 'onStop', 'onDestroy',
      'onBind', 'onUnbind', 'onRebind',          // Service 生命周期
      'handleMessage', 'dispatchMessage',        // Handler
      'run', 'execute',                          // 执行入口
      'nativeInit', 'nativeDoFrame',             // JNI 入口
    ],
    userspace: [
      'main',                                    // 标准入口
      'init', 'cleanup', 'run',                  // 常见模式
      'process', 'handle', 'serve',              // 服务模式
      'Create', 'Destroy',                       // C++ 创建/销毁
      'Initialize', 'Shutdown',                  // 初始化/关闭
      'Start', 'Stop',                          // 启动/停止
    ],
    rust: [
      'main', 'run',                             // 标准入口
      'new', 'start', 'spawn',                   // 异步/并发
    ],
    // ART Runtime 特定入口
    art: [
      'main', 'Runtime', 'Thread',               // 运行时核心
      'Create', 'Destroy', 'Initialize',          // 生命周期
      'Execute', 'Run', 'Start',                 // 执行入口
      'Compile', 'Optimize',                     // 编译相关
      'gc', 'GC', 'Collect',                     // GC 相关
      'LoadClass', 'Resolve',                    // 类加载
    ],
  };

  const patterns = entryPatterns[repoType] || entryPatterns.userspace;
  // 如果是 android 或 userspace 且 repoType 不是精确匹配，额外添加 art 模式
  if (repoType !== 'art' && repoType !== 'kernel') {
    const artPatterns = entryPatterns.art || [];
    patterns.push(...artPatterns);
  }
  const entryPoints = [];

  for (const [func, callees] of functionCalls) {
    if (patterns.some(p => func.includes(p))) {
      entryPoints.push(func);
    }
  }

  // 如果没找到模式匹配，返回被调用最多的函数
  if (entryPoints.length === 0) {
    const funcScores = [];
    for (const [func, callees] of functionCalls) {
      funcScores.push({ func, callers: callees.size });
    }
    funcScores.sort((a, b) => b.callers - a.callers);
    return funcScores.slice(0, 10).map(s => s.func);
  }

  return entryPoints;
}

/**
 * 追踪调用链 - 改进版，支持多路径追踪
 */
function traceCallChain(entryPoint, functionCalls, maxDepth = 15) {
  const chains = [];
  const visited = new Set();

  // 追踪主路径（被调用最多的路径）
  function traceMain(start, depth, currentChain) {
    if (depth >= maxDepth) return;

    const callees = functionCalls.get(start);
    if (!callees || callees.size === 0) return;

    // 按被调用次数排序选择下一个
    let bestNext = null;
    let bestScore = -1;

    for (const callee of callees) {
      if (visited.has(callee)) continue;
      const calleeCallees = functionCalls.get(callee);
      const score = calleeCallees ? calleeCallees.size : 0;
      if (score > bestScore) {
        bestScore = score;
        bestNext = callee;
      }
    }

    if (!bestNext) return;

    currentChain.push(bestNext);
    visited.add(bestNext);
    traceMain(bestNext, depth + 1, currentChain);
  }

  // 主路径
  const mainChain = [entryPoint];
  visited.add(entryPoint);
  traceMain(entryPoint, 0, mainChain);
  if (mainChain.length > 1) {
    chains.push({ chain: mainChain, type: 'main' });
  }

  // 尝试多条分支路径
  visited.clear();
  visited.add(entryPoint);

  const initialCallees = functionCalls.get(entryPoint);
  if (initialCallees) {
    let branchCount = 0;
    for (const callee of initialCallees) {
      if (branchCount >= 3) break;  // 最多 3 条分支路径
      if (visited.has(callee)) continue;

      const branchChain = [entryPoint, callee];
      visited.add(callee);

      // 追踪这条分支
      const callees2 = functionCalls.get(callee);
      if (callees2) {
        for (const callee2 of callees2) {
          if (visited.has(callee2)) continue;
          branchChain.push(callee2);
          visited.add(callee2);
          break;
        }
      }

      if (branchChain.length > 2) {
        chains.push({ chain: branchChain, type: 'branch' });
        branchCount++;
      }
    }
  }

  // 返回最长的链
  if (chains.length > 0) {
    chains.sort((a, b) => b.chain.length - a.chain.length);
    return chains[0].chain;
  }

  return [entryPoint];
}

/**
 * 识别核心执行流程
 */
async function identifyCoreFlows(repoPath, repoType) {
  const flows = [];

  // 根据仓库类型识别不同的流程
  const flowPatterns = {
    kernel: [
      { name: 'VFS 操作流程', keywords: ['open', 'read', 'write', 'close', 'file_operations'] },
      { name: '中断处理流程', keywords: ['interrupt', 'irq', 'bottom_half', 'tasklet', 'workqueue'] },
      { name: '内存分配流程', keywords: ['alloc', 'malloc', 'kmalloc', 'page_alloc'] },
      { name: '进程调度流程', keywords: ['schedule', 'wake_up', 'try_to_wake', 'pick_next_task'] },
      { name: '网络接收流程', keywords: ['netif_receive', 'net_rx_action', 'napi_gro_receive'] },
    ],
    android: [
      { name: 'Activity 生命周期', keywords: ['onCreate', 'onStart', 'onResume', 'onPause', 'onStop', 'onDestroy'] },
      { name: 'Binder IPC 流程', keywords: ['transact', 'onTransact', ' Parcel', 'reply'] },
      { name: '消息处理流程', keywords: ['handleMessage', 'dispatchMessage', 'looper', 'handler'] },
      { name: 'View 绘制流程', keywords: ['onMeasure', 'onLayout', 'onDraw', 'invalidate'] },
    ],
    userspace: [
      { name: '主循环', keywords: ['main', 'loop', 'poll', 'epoll', 'select'] },
      { name: '请求处理', keywords: ['request', 'handle', 'process', 'response'] },
    ],
    // ART Runtime 特定流程
    art: [
      { name: 'Runtime 初始化', keywords: ['CreateRuntime', 'Init', 'StartRuntime', 'PreZygoteFork'] },
      { name: 'GC 回收流程', keywords: ['CollectGarbage', 'GC', 'Trace', 'Mark', 'Sweep', 'Compact'] },
      { name: '类加载流程', keywords: ['LoadClass', 'DefineClass', 'ResolveClass', 'LinkClass'] },
      { name: '编译优化流程', keywords: ['Compile', 'Optimize', 'GenerateCode', 'CodeGenerator'] },
      { name: '线程管理', keywords: ['Thread', 'Suspend', 'Resume', 'Sleep', 'Wait'] },
      { name: '方法调用', keywords: ['Invoke', 'Call', 'EnterInterp', 'ExitInterp', 'quick'] },
    ],
  };

  // 获取适用的流程模式
  let patterns = flowPatterns[repoType] || flowPatterns.userspace;
  // 如果不是特定类型，添加 art 模式
  if (repoType !== 'art' && repoType !== 'kernel') {
    patterns = [...patterns, ...(flowPatterns.art || [])];
  }

  // 扫描关键词出现位置
  for (const pattern of patterns) {
    const keywords = pattern.keywords;
    const locations = [];

    await scanFiles(repoPath, {
      extensions: ['.c', '.cc', '.cpp', '.h', '.java'],
      maxFiles: 50,
      maxDepth: 4,
      onFile: async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n');

          for (const kw of keywords) {
            lines.forEach((line, idx) => {
              if (line.includes(kw)) {
                locations.push({
                  keyword: kw,
                  file: filePath,
                  line: idx + 1,
                });
              }
            });
          }
        } catch (e) {
          // 忽略
        }
      },
    });

    if (locations.length > 0) {
      flows.push({
        name: pattern.name,
        keywords: pattern.keywords,
        occurrences: locations.length,
        locations: locations.slice(0, 20),
      });
    }
  }

  return flows;
}

/**
 * 完整分析关键路径
 */
async function analyzeKeyPaths(repoPath, options = {}) {
  console.log('开始分析关键路径...');

  const { repoType = 'generic' } = options;

  // 扫描调用关系
  const callPaths = await scanKeyPaths(repoPath, { repoType });

  // 识别核心流程
  const coreFlows = await identifyCoreFlows(repoPath, repoType);

  console.log(`分析完成，找到 ${callPaths.length} 条关键路径`);

  return {
    callPaths,
    coreFlows,
    stats: {
      totalPaths: callPaths.length,
      maxDepth: callPaths.length > 0 ? Math.max(...callPaths.map(p => p.depth)) : 0,
      totalFlows: coreFlows.length,
    },
  };
}

module.exports = {
  scanKeyPaths,
  identifyCoreFlows,
  analyzeKeyPaths,
};
