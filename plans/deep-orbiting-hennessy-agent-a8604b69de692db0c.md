# AMS 代码深度探索计划

**项目**: aosp-ams
**目标目录**: ~/aosp/base/services/core/java/com/android/server/am/
**输出目录**: ~/aosp/base/docs/exploration/
**总文件数**: 130 个 Java 文件

## 当前状态分析

### 现有探索结果
- 已存在 `ams-exploration/` (旧版本: R1-R3 + 部分模块 R4-R6)
- 已存在 `ams-deep-exploration/` (47 个 MD 文件)
- 已存在 `ams-deep-exploration-html/` (HTML 版本)
- 已存在 `AMS-Master-Guide.md` 和 `AMS-Master-Guide.html`

### Clean Slate 决策
根据 skill 的 **Clean Slate Rule**，需要删除旧目录并从零开始。但现有探索内容质量较高，且 `AMS-Master-Guide.md` 是综合报告。

**决策**: 按照 skill 规范执行完整的 Phase 1 + Phase 2，但在最终输出时整合为高质量的综合报告。

---

## Phase 1: Module Map (R1-R3)

### Round 1: File Inventory
- **输入**: ~/aosp/base/services/core/java/com/android/server/am/*.java
- **输出**: 01-file-inventory.html
- **任务**: 枚举所有 130 个 Java 文件，确定职责
- **分类**: Core (主逻辑) vs Supporting (工具类)

### Round 2: Module Division
- **输入**: 01-file-inventory.html
- **输出**: 02-module-division.html
- **任务**: 按功能分组，确定模块边界
- **预期模块**:
  1. Process Management (进程管理)
  2. Service Management (服务管理)
  3. Broadcast Management (广播管理)
  4. OOM Adjustment (内存调整)
  5. ContentProvider Management (内容提供者)
  6. User/Multi-User Management (用户管理)
  7. System Infrastructure (系统基础设施)
  8. Memory Compaction (内存压缩)
  9. App State Tracking (应用状态追踪)
  10. Utility Classes (工具类)

### Round 3: Module Map Document
- **输入**: 01-file-inventory.html + 02-module-division.html
- **输出**: aosp-ams-module-map.html
- **任务**: 统一模块地图，含架构图

---

## Phase 2: Per-Module Deep Dive (R0-R6 per module)

### 模块处理顺序（按依赖关系）

#### 基础模块 (Foundation - 先处理)
1. **Process Management** - 进程管理
2. **System Infrastructure** - 系统基础设施

#### 核心业务模块 (Core Business)
3. **Service Management** - 服务管理
4. **Broadcast Management** - 广播管理
5. **ContentProvider Management** - 内容提供者管理

#### 资源管理模块 (Resource Management)
6. **OOM Adjustment** - OOM 调整
7. **Memory Compaction** - 内存压缩

#### 辅助模块 (Supporting)
8. **User/Multi-User Management** - 用户管理
9. **App State Tracking** - 应用状态追踪

### 每个模块的 Round 流程

| Round | 任务 | 输出文件 |
|-------|------|---------|
| R0 | Anchor (锚点) | <name>-<module>-anchor.html |
| R1 | Architecture (架构) | append to anchor |
| R2 | Class Diagram (类图) | append to anchor |
| R3 | Data Structures (数据结构) | append to anchor |
| R4 | Call Chains (调用链) | <name>-<module>-deep-dive.html |
| R5 | Sequences (时序图) | append to deep-dive |
| R6 | Summary (总结) | <name>-<module>-deep-dive.html |

### 每个模块的 5-10 个关键路径

根据 skill 规范，每个模块需要选择 5-10 个关键路径，覆盖以下类别:
- **A. Core Business** (核心业务): 最少 2 个
- **B. Lifecycle** (生命周期): 最少 1 个
- **C. State Management** (状态管理): 最少 1 个
- **D. Cross-Module** (跨模块): 最少 1 个
- **E. Data Flow** (数据流): 最少 1 个

---

## Process Management 模块关键路径 (8 个)

| 路径 | 入口 | 类别 |
|------|------|------|
| P1 | ProcessList.startProcess() | A-Core Business |
| P2 | AMS.attachApplication() | B-Lifecycle |
| P3 | AMS.killProcess() | A-Core Business |
| P4 | OomAdjuster.computeOomAdj() | C-State Management |
| P5 | ProcessList.updateLruProcess() | E-Data Flow |
| P6 | ProcessRecord.appDied() | B-Lifecycle |
| P7 | AMS.checkPermission() → PMS | D-Cross-Module |
| P8 | ProcessList.removeProcessLocked() | A-Core Business |

---

## Service Management 模块关键路径 (6 个)

| 路径 | 入口 | 类别 |
|------|------|------|
| S1 | ActiveServices.startServiceLocked() | A-Core Business |
| S2 | ActiveServices.bindServiceLocked() | A-Core Business |
| S3 | ActiveServices.stopServiceLocked() | A-Core Business |
| S4 | ActiveServices.publishServiceLocked() | C-State Management |
| S5 | ServiceRecord.startService() | B-Lifecycle |
| S6 | ActiveServices.bringDownServiceLocked() | B-Lifecycle |

---

## Broadcast Management 模块关键路径 (6 个)

| 路径 | 入口 | 类别 |
|------|------|------|
| B1 | BroadcastQueue.scheduleBroadcastsLocked() | A-Core Business |
| B2 | BroadcastQueue.processNextBroadcast() | A-Core Business |
| B3 | BroadcastQueue.rescheduleBroadcast() | C-State Management |
| B4 | BroadcastQueue.finishBroadcast() | B-Lifecycle |
| B5 | BroadcastController.receiverDispatched() | E-Data Flow |
| B6 | BroadcastQueue.goParallel() | D-Cross-Module |

---

## OOM Adjustment 模块关键路径 (5 个)

| 路径 | 入口 | 类别 |
|------|------|------|
| O1 | OomAdjuster.computeOomAdj() | A-Core Business |
| O2 | OomAdjusterModernImpl.updateOomAdjLocked() | A-Core Business |
| O3 | ProcessList.reclaimProcess() | D-Cross-Module |
| O4 | OomAdjuster.setProcessState() | C-State Management |
| O5 | ProcessList.doLowMemory() | B-Lifecycle |

---

## ContentProvider Management 模块关键路径 (5 个)

| 路径 | 入口 | 类别 |
|------|------|------|
| C1 | ContentProviderHelper.publishContentProviders() | A-Core Business |
| C2 | ContentProviderRecord.waitProviderReady() | C-State Management |
| C3 | ContentProviderHelper.removeDyingProvider() | A-Core Business |
| C4 | ContentProviderConnection.reconnected() | D-Cross-Module |
| C5 | ContentProviderRecord.incTransientCount() | E-Data Flow |

---

## User/Multi-User Management 模块关键路径 (5 个)

| 路径 | 入口 | 类别 |
|------|------|------|
| U1 | UserController.startUser() | A-Core Business |
| U2 | UserController.stopUser() | A-Core Business |
| U3 | UserController.switchUser() | C-State Management |
| U4 | ActiveUids.updateOomAdj() | D-Cross-Module |
| U5 | UserController.removeUser() | B-Lifecycle |

---

## System Infrastructure 模块关键路径 (5 个)

| 路径 | 入口 | 类别 |
|------|------|------|
| I1 | AMS.onBootPhase() | B-Lifecycle |
| I2 | AppErrors.handleAppCrash() | A-Core Business |
| I3 | AnrHelper.appNotResponding() | A-Core Business |
| I4 | ProcessStatsService.onCleanupApplicationData() | E-Data Flow |
| I5 | CoreSettingsObserver.onChange() | C-State Management |

---

## Memory Compaction 模块关键路径 (5 个)

| 路径 | 入口 | 类别 |
|------|------|------|
| M1 | CompactionStatsManager.performCompaction() | A-Core Business |
| M2 | CompactionStatsManager.requestCompaction() | C-State Management |
| M3 | LmkdConnection.notifyKilled() | D-Cross-Module |
| M4 | LowMemDetector.onDetect() | B-Lifecycle |
| M5 | CacheOomRanker.rankTasks() | E-Data Flow |

---

## 执行预算

- **Phase 1**: ~30 分钟 (R1-R3)
- **Phase 2**: ~5 小时 (8 个模块 × 7 Rounds × ~5 分钟/Round)
- **总计**: ~6 小时

---

## 质量保证

### 源码验证要求
- 每个方法名必须通过 grep 验证存在于源文件
- 每个行号必须从实际读取的源码获取
- 每个跨模块调用必须验证目标类存在该方法

### 反幻觉检查
- [ ] 所有字段名已从源码验证
- [ ] 所有继承关系已验证 (extends/implements)
- [ ] 所有锁类型已验证 (synchronized/Lock)
- [ ] 所有线程信息已标注

### HTML 输出规范
- 使用 skill 提供的 HTML 模板
- 包含 Mermaid.js CDN
- 包含 mermaid.initialize() 配置
- 包含 SVG 宽度修复脚本

---

## 进度跟踪

将在 `.exploration/ledger.html` 中跟踪每个 Round 的完成状态。
