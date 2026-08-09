# AOSP Power 模块深度探索 — 执行计划

**创建时间**: 2026-08-09
**目标目录**: ~/aosp/base/services/core/java/com/android/server/power/
**项目名称**: aosp-power
**服务名称**: Power (PowerManagerService)

---

## 目录现状分析

### 现有探索结果
- 存在目录: `~/aosp/base/docs/exploration/power-exploration/`
- 包含文件:
  - `01-Power-Module-Map.md`
  - `Power-wakeLockAcquire-Critical-Path.html`
- **按 Clean Slate Rule，必须删除重建**

### 文件统计
- 主目录 Java 文件: ~25 个
- stats 子模块: ~40 个文件
- batterysaver 子模块: ~4 个文件
- hint 子模块: ~1 个文件
- feature 子模块: ~2 个文件
- **总计约 70+ 个 Java 文件**

---

## Phase 1 模块划分

### 识别的功能模块 (共 7 个)

#### M1: PowerManagerService Core (核心)
- `PowerManagerService.java` (326KB) — 主服务类
- `Notifier.java` — 电源状态通知
- `PowerGroup.java` — 电源组管理
- `WakeLockLog.java` — WakeLock 日志
- 职责: 系统电源状态管理、WakeLock 分配、屏幕状态控制

#### M2: WakeLock & Suspend (唤醒锁管理)
- `SuspendBlocker.java` — Suspend 阻塞器
- `ScreenOnBlocker.java` — 屏幕亮屏阻塞
- 职责: 防止系统挂起

#### M3: Environment Awareness (环境感知)
- `AttentionDetector.java` — 注意力检测
- `FaceDownDetector.java` — 俯卧检测
- `ScreenUndimDetector.java` — 屏幕取消变暗检测
- `AmbientDisplaySuppressionController.java` — 环境显示抑制
- `InattentiveSleepWarningController.java` — 注意力不足警告
- 职责: 基于传感器判断用户是否在场

#### M4: Low Power Standby (低功耗待机)
- `LowPowerStandbyController.java` (57KB)
- `LowPowerStandbyControllerInternal.java`
- 职责: 低功耗待机模式控制

#### M5: Wakefulness & Thermal (唤醒状态与温控)
- `WakefulnessSessionObserver.java` (41KB)
- `ThermalManagerService.java` (96KB)
- 职责: 唤醒会话观察、热管理

#### M6: Shutdown (关机流程)
- `ShutdownThread.java` (39KB)
- `ShutdownCheckPoints.java`
- `PreRebootLogger.java`
- `FrameworkStatsLogger.java`
- 职责: 系统关机与重启

#### M7: Battery Stats (电池统计)
- `stats/` 子目录 (~40 个文件)
- 职责: 电池使用统计、PowerCalculator 链

---

## 执行计划 (共 58 个 Round)

### Phase 1: Module Map (Round 1-3)

| Round | 任务 | 输出文件 |
|-------|------|---------|
| R1 | 文件清单 — 枚举所有 70+ 个 Java 文件 | `01-file-inventory.html` |
| R2 | 模块划分 — 将文件分组为 7 个功能模块 | `02-module-division.html` |
| R3 | 模块地图 — 统一架构图 | `aosp-power-module-map.html` |

### Phase 2: Per-Module Deep Dive (Round 0-6 per module, 共 7 模块 × 7 = 49 个 Round)

| 模块 | R0 Anchor | R1 Architecture | R2 Class | R3 Data | R4 Call Chains | R5 Sequences | R6 Summary | 关键路径数 |
|------|-----------|-----------------|----------|---------|----------------|--------------|------------|-----------|
| M1: PMS Core | anchor | arch | class | data | chains | seq | summary | 8 |
| M2: WakeLock | anchor | arch | class | data | chains | seq | summary | 5 |
| M3: EnvAware | anchor | arch | class | data | chains | seq | summary | 6 |
| M4: LowPower | anchor | arch | class | data | chains | seq | summary | 5 |
| M5: Thermal | anchor | arch | class | data | chains | seq | summary | 5 |
| M6: Shutdown | anchor | arch | class | data | chains | seq | summary | 5 |
| M7: BatteryStats | anchor | arch | class | data | chains | seq | summary | 6 |

**总计: 52 个 Round 输出文件**

---

## Phase 2 关键路径规划 (共 40 条)

### M1: PowerManagerService Core (8 条)

| # | 路径名 | Category | Entry Point | Score |
|---|--------|----------|-------------|-------|
| 1 | WakeLock 申请 | A - Core | `acquireWakeLock()` | 25 |
| 2 | WakeLock 释放 | A - Core | `releaseWakeLock()` | 25 |
| 3 | 屏幕开关 | A - Core | `goToSleep()` / `wakeUp()` | 24 |
| 4 | 用户活动上报 | A - Core | `userActivity()` | 20 |
| 5 | 服务启动初始化 | B - Lifecycle | `systemReady()` | 22 |
| 6 | 电源状态变更通知 | C - State | `Notifier.setScreenState()` | 21 |
| 7 | PowerGroup 管理 | C - State | `PowerGroup.updatePowerState()` | 23 |
| 8 | WMS 跨模块调用 | D - Cross | `mWindowManager.waitForScreenOn()` | 19 |

### M2: WakeLock & Suspend (5 条)

| # | 路径名 | Category | Entry Point |
|---|--------|----------|-------------|
| 1 | SuspendBlocker 获取 | A - Core | `acquireSuspendBlocker()` |
| 2 | WakeLock 引用计数 | A - Core | `PowerGroup.acquireWakeLockInternal()` |
| 3 | Early WakeLock 释放 | B - Lifecycle | `PowerGroup.releaseWakeLockInternal()` |
| 4 | 电源状态 → SuspendBlocker | C - State | `updatePowerStateInternal()` |
| 5 | mWakeLockSemaphore 控制 | D - Cross | `PowerGroup.acquireWakeLock()` |

### M3: Environment Awareness (6 条)

| # | 路径名 | Category | Entry Point |
|---|--------|----------|-------------|
| 1 | 注意力检测流程 | A - Core | `AttentionDetector.onSensorChanged()` |
| 2 | 俯卧检测 | A - Core | `FaceDownDetector.updateOrientation()` |
| 3 | 屏幕取消变暗 | A - Core | `ScreenUndimDetector.detect()` |
| 4 | 环境显示抑制 | C - State | `AmbientDisplaySuppressionController.shouldSuppress()` |
| 5 | 传感器注册 | B - Lifecycle | `registerSensors()` |
| 6 | 警告控制器 | D - Cross | `InattentiveSleepWarningController.checkAndShowWarning()` |

### M4: Low Power Standby (5 条)

| # | 路径名 | Category | Entry Point |
|---|--------|----------|-------------|
| 1 | 低功耗待机启用 | A - Core | `LowPowerStandbyController.enable()` |
| 2 | 活跃窗口限制 | A - Core | `applyActiveWindowRestrictions()` |
| 3 | 强制暂停 | A - Core | `forceSuspend()` |
| 4 | 组件状态管理 | C - State | `updateComponentState()` |
| 5 | WMS 跨模块交互 | D - Cross | `LowPowerStandbyControllerInternal` |

### M5: Wakefulness & Thermal (5 条)

| # | 路径名 | Category | Entry Point |
|---|--------|----------|-------------|
| 1 | 唤醒状态机 | A - Core | `WakefulnessSessionObserver.onWakefulnessChange()` |
| 2 | 温控阈值触发 | A - Core | `ThermalManagerService.updateThermalStatus()` |
| 3 | CPU 功率限制 | A - Core | `ThermalManagerService.throttleCpu()` |
| 4 | 热状态监听器注册 | B - Lifecycle | `registerThermalGeneratorListener()` |
| 5 | 性能提示服务 | D - Cross | `HintManagerService.request()` |

### M6: Shutdown (5 条)

| # | 路径名 | Category | Entry Point |
|---|--------|----------|-------------|
| 1 | 关机序列 | A - Core | `ShutdownThread.shutdown()` |
| 2 | 安全模式关机 | A - Core | `ShutdownThread.rebootSafeMode()` |
| 3 | 检查点保存 | E - Data | `ShutdownCheckPoints.saveCheckpoints()` |
| 4 | 电池统计刷新 | E - Data | `FrameworkStatsLogger.flush()` |
| 5 | 重启流程 | A - Core | `ShutdownThread.reboot()` |

### M7: Battery Stats (6 条)

| # | 路径名 | Category | Entry Point |
|---|--------|----------|-------------|
| 1 | 电量计算器链 | A - Core | `PowerCalculator.calculatePower()` |
| 2 | 内核 WakeLock 读取 | A - Core | `KernelWakelockReader.readKernelWakelockStats()` |
| 3 | 电池外部统计 | A - Core | `BatteryExternalStatsWorker.scheduleReport()` |
| 4 | uid 功耗解析 | E - Data | `PowerStatsUidResolver.resolveUid()` |
| 5 | PowerStats 持久化 | E - Data | `PowerStatsStore.store()` |
| 6 | Stats 调度 | B - Lifecycle | `PowerStatsScheduler.schedule()` |

---

## 优先级排序 (按模块依赖关系)

```
M2 (WakeLock) ← M1 (PMS Core)  ← M7 (BatteryStats) ← M5 (Thermal)
                                       ↓
                                  M3 (EnvAware)
                                       ↓
                                  M4 (LowPower)
                                       ↓
                                  M6 (Shutdown)
```

**建议执行顺序**: M2 → M1 → M7 → M5 → M3 → M4 → M6

---

## 预估工作量

| 阶段 | Round 数 | 预计 Token 消耗 |
|------|---------|----------------|
| Phase 1 | 3 | ~15K |
| Phase 2 | 49 | ~300K |
| **总计** | **52** | **~315K** |

---

## 质量门控检查点

### Phase 1 Checkpoint
- [ ] 70+ 文件全部被读取
- [ ] 7 个模块边界清晰
- [ ] 架构图与源码一致

### Phase 2 Checkpoint (每模块)
- [ ] R0: 核心类完整读取 (PowerManagerService.java)
- [ ] R1: 内部组件 + 外部依赖验证
- [ ] R2: 继承关系、字段类型全部验证
- [ ] R3: 状态机转换点全部验证
- [ ] R4: 关键路径 5-10 条函数级展开
- [ ] R5: Mermaid 时序图与调用链一致
- [ ] R6: 无未验证声明

### 完整性门控
- 每个模块: 7 个 Round 全部完成 → FULL
- 缺失任意 Round → PARTIAL
- 未探索 → Uncharted
- 目标: 7/7 FULL

---

## 资源清单

- 参考实现: `code-deep-exploration-validation-report.html`
- Mermaid 规范: `memory/mermaid.md`
- Android 协议: `memory/android.md`
- HTML 模板: skill 内置 v2.7 格式

---

## 执行状态

- [ ] Phase 1 R1: 待执行
- [ ] Phase 1 R2: 待执行
- [ ] Phase 1 R3: 待执行
- [ ] M1 PMS Core R0-R6: 待执行
- [ ] M2 WakeLock R0-R6: 待执行
- [ ] M3 EnvAware R0-R6: 待执行
- [ ] M4 LowPower R0-R6: 待执行
- [ ] M5 Thermal R0-R6: 待执行
- [ ] M6 Shutdown R0-R6: 待执行
- [ ] M7 BatteryStats R0-R6: 待执行
