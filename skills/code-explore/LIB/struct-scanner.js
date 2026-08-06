/**
 * 深度结构体扫描器
 * 扫描并分析代码仓库中的所有关键数据结构
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 扫描目录中的结构体定义
 * @param {string} dirPath - 要扫描的目录
 * @param {Object} options - 配置选项
 * @returns {Array} 结构体列表
 */
async function scanStructsInDir(dirPath, options = {}) {
  const {
    maxFilesPerDir = 50,      // 每个目录最多扫描文件数
    extensions = ['.h', '.cc', '.cpp', '.c', '.java', '.kt'],
    minFields = 1,           // 最少字段数
    maxDepth = 5,             // 最大递归深度
  } = options;

  const structs = [];
  let filesScanned = 0;

  async function walk(dir, depth) {
    if (depth > maxDepth || filesScanned > 1000) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // 跳过测试和构建目录
          if (['.git', 'test', 'tests', 'benchmark', 'benchmarks', 'build', 'out'].includes(entry.name)) {
            continue;
          }
          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!extensions.includes(ext)) continue;

          filesScanned++;
          if (filesScanned > 1000) break;

          await scanStructsInFile(fullPath, structs);
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  await walk(dirPath, 0);

  // 过滤并排序
  return structs
    .filter(s => s.fields.length >= minFields)
    .sort((a, b) => b.fields.length - a.fields.length);
}

/**
 * 扫描单个文件中的结构体
 */
async function scanStructsInFile(filePath, structs) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    if (['.h', '.cc', '.cpp', '.c'].includes(ext)) {
      scanCStructs(content, filePath, structs);
    } else if (['.java', '.kt'].includes(ext)) {
      scanJavaClasses(content, filePath, structs);
    }
  } catch (e) {
    // 忽略读取错误
  }
}

/**
 * 扫描 C/C++ 结构体
 */
function scanCStructs(content, filePath, structs) {
  // 匹配 struct 定义 (支持命名和匿名)
  const structRegex = /(?:struct|class|union)\s+(\w+)?\s*(?::\s*public\s+\w+\s*,?)*\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

  let match;
  while ((match = structRegex.exec(content)) !== null) {
    const name = match[1] || `anonymous_${structs.length}`;
    const body = match[0];

    // 提取字段
    const fields = extractCFields(body);

    // 提取方法 (C++ only)
    const methods = extractCMethods(body, content, filePath);

    // 提取基类 (C++ class)
    const baseClasses = extractBaseClasses(match[0]);

    structs.push({
      name,
      kind: body.startsWith('class') ? 'class' : (body.startsWith('union') ? 'union' : 'struct'),
      file: filePath,
      line: getLineNumber(content, match.index),
      fields,
      methods,
      baseClasses,
      fieldCount: fields.length,
      size: estimateStructSize(fields),
    });
  }
}

/**
 * 提取 C/C++ 字段
 */
function extractCFields(body) {
  const fields = [];

  // 移除方法体和初始化器
  const fieldSection = body.replace(/\{[^}]*\}/, '');

  // 匹配字段声明
  const fieldRegex = /(?:private:|protected:|public:)?\s*([\w:*&\[\]\s<>]+?)\s+(\w+)\s*(?:\[\d*\])?(?:\s*=\s*[^,;]+)?\s*(?:\/\/.*)?[,;]/g;

  let match;
  while ((match = fieldRegex.exec(fieldSection)) !== null) {
    const type = match[1].trim();
    const name = match[2].trim();

    // 跳过空名称和方法
    if (!name || name.includes('(') || name === 'private' || name === 'protected' || name === 'public') {
      continue;
    }

    // 分类字段类型
    const category = categorizeCField(type);

    fields.push({
      name,
      type: collapseWhitespace(type),
      category,
      isPointer: type.includes('*'),
      isReference: type.includes('&'),
    });
  }

  return fields;
}

/**
 * 提取 C++ 方法
 */
function extractCMethods(body, content, filePath) {
  const methods = [];

  // 匹配方法声明
  const methodRegex = /(?:private:|protected:|public:)?\s*([\w:*&\s\[\]<>]+?)\s+(\w+)\s*\([^)]*\)\s*(?:const)?\s*(?:override)?\s*(?:final)?\s*[,;{]/g;

  let match;
  while ((match = methodRegex.exec(body)) !== null) {
    const retType = match[1].trim();
    const name = match[2].trim();

    if (!name || name.includes('operator') || name === 'private' || name === 'protected' || name === 'public') {
      continue;
    }

    methods.push({
      name,
      returnType: collapseWhitespace(retType),
      isVirtual: content.slice(match.index - 20, match.index).includes('virtual'),
      isConst: match[0].includes('const'),
    });
  }

  return methods.slice(0, 30);  // 限制方法数量
}

/**
 * 提取基类
 */
function extractBaseClasses(structDef) {
  const bases = [];

  const baseRegex = /:\s*public\s+(\w+)/g;
  let match;
  while ((match = baseRegex.exec(structDef)) !== null) {
    bases.push(match[1]);
  }

  return bases;
}

/**
 * 扫描 Java/Kotlin 类
 */
function scanJavaClasses(content, filePath, structs) {
  // 匹配 class/interface/enum 定义
  const classRegex = /(?:public|private|protected)?\s*(?:abstract|final)?\s*(?:class|interface|enum|record)\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;

  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const name = match[1];
    const extends_ = match[2] || null;
    const implements_ = match[3] ? match[3].split(',').map(s => s.trim()) : [];

    // 提取字段
    const fields = extractJavaFields(content, filePath);

    // 提取方法
    const methods = extractJavaMethods(content);

    structs.push({
      name,
      kind: match[0].includes('interface') ? 'interface' :
            match[0].includes('enum') ? 'enum' : 'class',
      file: filePath,
      line: getLineNumber(content, match.index),
      fields,
      methods,
      extends: extends_,
      implements: implements_,
      fieldCount: fields.length,
      methodCount: methods.length,
    });
  }
}

/**
 * 提取 Java 字段
 */
function extractJavaFields(content, filePath) {
  const fields = [];

  // 匹配字段声明
  const fieldRegex = /(?:private|public|protected)?\s*(?:static|final|volatile|transient)?\s*([\w<>\[\]]+?)\s+(\w+)\s*(?:=\s*[^,;]+)?\s*[,;]/g;

  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    const type = match[1].trim();
    const name = match[2].trim();

    if (!name || name === 'class') continue;

    fields.push({
      name,
      type: collapseWhitespace(type),
      category: categorizeJavaField(type),
      isStatic: match[0].includes('static'),
      isFinal: match[0].includes('final'),
    });
  }

  return fields;
}

/**
 * 提取 Java 方法
 */
function extractJavaMethods(content) {
  const methods = [];

  // 匹配方法声明
  const methodRegex = /(?:private|public|protected)?\s*(?:static|final|abstract|synchronized)?\s*([\w<>\[\]\s]*?)\s+(\w+)\s*\(([^)]*)\)/g;

  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const retType = match[1].trim();
    const name = match[2].trim();
    const params = match[3].trim();

    if (!name || name === 'class' || name === 'constructor') continue;

    methods.push({
      name,
      returnType: collapseWhitespace(retType),
      parameters: params.split(',').map(p => p.trim()).filter(p => p),
    });
  }

  return methods.slice(0, 50);
}

/**
 * 分类 C 字段类型
 */
function categorizeCField(type) {
  const t = type.toLowerCase();

  if (t.includes('*') || t.includes('&')) return 'pointer';
  if (t.includes('spinlock') || t.includes('mutex') || t.includes('lock')) return 'lock';
  if (t.includes('list_head') || t.includes('rb_')) return 'list';
  if (t.includes('refcount') || t.includes('atomic')) return 'atomic';
  if (t.includes('bool') || t.includes('int') || t.includes('char') || t.includes('long') || t.includes('uint')) return 'primitive';
  if (t.includes('callback') || t.includes('func') || t.includes('ops')) return 'callback';

  return 'object';
}

/**
 * 分类 Java 字段类型
 */
function categorizeJavaField(type) {
  const t = type.toLowerCase();

  if (t === 'int' || t === 'long' || t === 'boolean' || t === 'char' || t === 'byte' || t === 'short' || t === 'float' || t === 'double') {
    return 'primitive';
  }
  if (t.includes('[]')) return 'array';
  if (t.includes('list') || t.includes('arraylist') || t.includes('map') || t.includes('set')) return 'collection';
  if (t.includes('lock') || t.includes('mutex')) return 'lock';

  return 'object';
}

/**
 * 估算结构体大小
 */
function estimateStructSize(fields) {
  let size = 0;

  for (const field of fields) {
    const type = field.type.toLowerCase();

    if (type.includes('int64') || type.includes('long')) size += 8;
    else if (type.includes('int') || type.includes('uint')) size += 4;
    else if (type.includes('short')) size += 2;
    else if (type.includes('char') || type.includes('bool')) size += 1;
    else if (type.includes('double')) size += 8;
    else if (type.includes('float')) size += 4;
    else if (field.isPointer) size += 8;  // 64-bit pointer
    else size += 8;  // 默认对象引用
  }

  return size;
}

/**
 * 获取行号
 */
function getLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

/**
 * 折叠多余空白
 */
function collapseWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * 按类别分组结构体
 */
function groupStructsByCategory(structs) {
  const groups = {
    core: [],       // 核心运行时结构
    memory: [],     // 内存管理相关
    thread: [],     // 线程/同步相关
    io: [],         // 输入输出相关
    network: [],    // 网络相关
    parser: [],     // 解析器相关
    other: [],      // 其他
  };

  const keywords = {
    core: ['runtime', 'context', 'manager', 'config'],
    memory: ['heap', 'gc', 'allocator', 'mem', 'pool', 'buffer', 'cache'],
    thread: ['thread', 'task', 'worker', 'job', 'queue', 'lock', 'mutex', 'spinlock'],
    io: ['file', 'stream', 'reader', 'writer', 'buffer'],
    network: ['socket', 'conn', 'session', 'request', 'response', 'endpoint'],
    parser: ['parser', 'lexer', 'token', 'ast', 'node', 'expr', 'stmt'],
  };

  for (const struct of structs) {
    const name = struct.name.toLowerCase();
    let categorized = false;

    for (const [category, kws] of Object.entries(keywords)) {
      if (kws.some(kw => name.includes(kw))) {
        groups[category].push(struct);
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      groups.other.push(struct);
    }
  }

  return groups;
}

/**
 * 完整分析结构体
 */
async function analyzeStructs(repoPath, options = {}) {
  console.log('开始扫描结构体...');

  const structs = await scanStructsInDir(repoPath, options);

  console.log(`扫描完成，共 ${structs.length} 个结构体`);

  // 按字段数排序
  structs.sort((a, b) => b.fieldCount - a.fieldCount);

  // 分组
  const groups = groupStructsByCategory(structs);

  // 统计
  const stats = {
    total: structs.length,
    byKind: {
      struct: structs.filter(s => s.kind === 'struct').length,
      class: structs.filter(s => s.kind === 'class').length,
      interface: structs.filter(s => s.kind === 'interface').length,
      enum: structs.filter(s => s.kind === 'enum').length,
    },
    byCategory: {
      core: groups.core.length,
      memory: groups.memory.length,
      thread: groups.thread.length,
      io: groups.io.length,
      network: groups.network.length,
      parser: groups.parser.length,
      other: groups.other.length,
    },
    topByFields: structs.slice(0, 50),
  };

  return {
    stats,
    groups,
    allStructs: structs,
  };
}

module.exports = {
  scanStructsInDir,
  analyzeStructs,
  groupStructsByCategory,
};
