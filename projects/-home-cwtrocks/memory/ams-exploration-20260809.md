---
name: ams-exploration-20260809
description: "AMS ActivityManagerService 完整探索结果 - 130个文件,10个模块"
metadata: 
  node_type: memory
  type: project
  originSessionId: 227236c3-e075-45ef-b752-f582adee3f3b
---

# AMS ActivityManagerService 探索结果

## 探索信息

| 属性 | 值 |
|------|-----|
| 探索时间 | 2026-08-09 22:45 |
| 目录 | `AMS-exploration-20260809-224547` |
| 最新链接 | `AMS-latest` |
| 源码目录 | `~/aosp/base/services/core/java/com/android/server/am/` |

## 代码规模

| 指标 | 值 |
|------|-----|
| 总文件数 | 130 个 Java 文件 |
| 总代码量 | ~118,174 行 |
| 核心文件 | `ActivityManagerService.java` (19,508 行) |

## 模块划分

| 模块 | 文件数 | 核心文件 |
|------|--------|----------|
| A: Process Management | 17 | ProcessList.java |
| B: Broadcast | 11 | BroadcastQueueImpl.java |
| C: Service | 9 | ActiveServices.java |
| D: Content Provider | 4 | ContentProviderHelper.java |
| E: User Management | 5 | UserController.java |
| F: App Errors | 9 | AppErrors.java |
| G: Battery & Stats | 4 | BatteryStatsService.java |
| H: App State Trackers | 10 | AppBatteryTracker.java |
| I: Compaction | 2 | CompactionStatsManager.java |
| J: Supporting | 39 | Various |
| K: AMS Core | 3 | ActivityManagerService.java |

## 生成文档

| 文档 | 说明 |
|------|------|
| `AMS-MASTER-REPORT.html` | 主报告 - 模块概览和文件清单 |
| `AMS-COMPLETE-ARCHITECTURE.html` | 架构总览 - 类图、时序图、数据流图 |
| `Module-B/C/D/E/F-*.html` | 各模块详细分析 |

**Why:** 记录探索结果，便于后续参考和复用。
**How to apply:** 查看文档时使用 `AMS-latest/docs/` 路径。
