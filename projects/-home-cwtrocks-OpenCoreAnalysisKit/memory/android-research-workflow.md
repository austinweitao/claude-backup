---
name: android-research-workflow
description: Android 技术问题必须 4 引擎并行 Web 搜索 + AOSP master 源码交叉验证的工作流（已写进全局 CLAUDE.md）
metadata: 
  node_type: memory
  type: reference
  originSessionId: 261b78be-c370-4968-8bdb-0984c331c9e3
---

所有 Android 技术问题（ART/framework/native/系统服务/GC/dex/oat/Runtime/Class/Object/String/堆/线程/类加载 等）必须按以下流程产出。

**Why:** 训练数据中关于 AOSP 字段名、常量值、类层次有大量"模糊记忆"（如 `large_object_maps_`、`kLargeObjectThreshold=12KB`、Region 大小 256KB/1MB），这些细节版本/分支敏感，写错会误导工具开发和 bug 分析。OpenCoreAnalysisKit 项目本身就在做 ART 内存解析，依赖对 AOSP 内部实现的精确理解，**单凭训练数据不可信**。

**How to apply:**

### 1. 4 引擎并行 Web 搜索（必须全部调用）
- `mcp__serper__google_search` — 官方文档、Luoshengyang、Mark Allison、官方 source.android.com
- `mcp__ddg-search__search` — 开发者社区、Stack Overflow、Reddit
- `mcp__tavily__tavily_search` — 学术论文 + search_depth=`advanced`
- `mcp__MiniMax__web_search` — 中文 CSDN/知乎/博客园（国内 ART 源码分析文章质量高）

### 2. AOSP master 源码交叉验证（必须）
- 主仓：`https://android.googlesource.com/platform/art/+/master/<path>`
- Android Code Search（带行号）：`https://cs.android.com/android/platform/superproject/+/master:art/<path>`
- 文档侧：`https://source.android.com/source/`

常用抓取路径（按 ART 子系统）：
- 堆/GC：`art/runtime/gc/heap.{h,cc}`、`art/runtime/gc/space/*.{h,cc}`
- 对象/类/字符串：`art/runtime/mirror/{object,class,string,array}.h`
- GC 算法：`art/runtime/gc/collector/*.cc`、`art/runtime/gc/accounting/*.h`
- Dex/OAT：`art/runtime/dex_file*.h`、`art/oat/`
- 线程：`art/runtime/thread.{h,cc}`

### 3. 置信度与输出
- AOSP 命中 = 强证据；4 引擎全命中 = 强证据
- 部分命中 = 标 `[置信度: 中]` 并指出分歧
- 全部未命中 = 标 `[知识来源: 训练数据，未交叉验证]` 并降级为经验性描述
- 版本/设备相关常量（`kLargeObjectThreshold`、Region 大小）→ 只写范围/典型值
- 答案末尾附"知识来源"小节，列出实际 query + AOSP URL
- 推翻训练数据假设时显式声明（如"我之前猜 X，源码验证后正确为 Y"）

### 4. 反例（必须避免）
- ❌ 只调 1-2 个搜索就开始答
- ❌ 训练数据里的字段名直接写
- ❌ "通常 12KB" 写成 "是 12KB"
- ❌ 训练数据结论与搜索结论混杂不区分

### 5. 触发场景（必须走这个流程的）
- 用户问 ART 内部类层次、字段偏移、方法签名
- 用户问 GC 算法、空间分类、RegionSpace / LOS / MallocSpace 行为
- 用户问 OAT/Dex/dex2oat/vdex 布局
- 用户问 String/Class/Object 内存布局（特别是 32-bit 压缩引用下的差异）
- 用户问 system_server / AMS / WMS / PMS 等服务内部状态机
- 用户问 ART 编译、解释执行、JIT/AOT 策略

**See Also**: 全局 `~/.claude/CLAUDE.md`「Android 技术问题」章节（与本记忆是同一规则的两层记录）
