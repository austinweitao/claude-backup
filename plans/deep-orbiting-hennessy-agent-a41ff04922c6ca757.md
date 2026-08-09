# WMS 代码深度探索执行计划

**创建时间:** 2026-08-09
**目标:** ~/aosp/base/services/core/java/com/android/server/wm/
**项目名:** aosp-wms
**服务名:** WMS (WindowManagerService)

---

## 一、现状分析

### 已完成的工作 (2026-08-08)
- **Phase 1 完成**: 文件清单 (01-file-inventory.md)、模块划分 (02-module-division.md)、模块地图 (WMS-Module-Map.md)
- **Phase 2 部分完成**: 8 个模块中只完成 4 个 (50%)，质量门失败

### 已有 Phase 1 输出（可复用）
| 轮次 | 文件 | 状态 |
|------|------|------|
| R1 文件清单 | `01-file-inventory.md` | ✅ 完整 |
| R2 模块划分 | `02-module-division.md` | ✅ 完整 |
| R3 模块地图 | `WMS-Module-Map.md` | ✅ 完整 |

### Phase 2 现状
| 模块 | 之前状态 | 本次需执行 |
|------|----------|-----------|
| M1: Window Container Hierarchy | FULL (需重验证) | R0-R6 |
| M2: Activity Task Management | PARTIAL (R4不完整) | R0-R6 |
| M3: Surface & Animation | FULL (需重验证) | R0-R6 |
| M4: Display & Policy | FULL (需重验证) | R0-R6 |
| M5: Input Management | Uncharted | R0-R6 |
| M6: Insets & IME | Uncharted | R0-R6 |
| M7: App Compatibility | Uncharted | R0-R6 |
| M8: Shell & Desktop Mode | Uncharted | R0-R6 |

### 决策：重置 Phase 2，保留 Phase 1

由于 Phase 2 输出质量不达标（行号漂移、架构路由错误），需要重做 Phase 2 所有模块。Phase 1 输出质量合格，可直接复用。

**执行命令:**
```bash
# 保留 Phase 1，删除 Phase 2
rm -rf ~/aosp/base/docs/exploration/wms-exploration/
mkdir -p ~/aosp/base/docs/exploration/wms-exploration/
```

---

## 二、模块列表与执行顺序

### 按依赖关系排序（被依赖的先做）

```
依赖顺序: M1(M7) → M3 → M4 → M2(M7) → M5 → M6 → M8

M1 Window Container Hierarchy     (依赖度: 高 — 所有模块依赖它)
M3 Surface & Animation            (依赖度: 中 — WindowState/Task 绑定)
M4 Display & Policy               (依赖度: 中 — DisplayContent 绑定)
M2 Activity Task Management       (依赖度: 高 — 依赖 M1 的 WindowContainer)
M7 App Compatibility              (依赖度: 低 — 可独立)
M5 Input Management               (依赖度: 中 — 依赖 WindowState)
M6 Insets & IME                   (依赖度: 中 — 依赖 DisplayContent)
M8 Shell & Desktop Mode           (依赖度: 中 — 依赖 WindowOrganizer)
```

---

## 三、每个模块的 5-10 条关键路径

### M1: Window Container Hierarchy (核心模块)

| # | Category | 路径名 | 入口方法 | Score |
|---|----------|--------|----------|-------|
| P1 | A Core | 添加窗口 | `WMS.addWindow()` | 25 |
| P2 | A Core | 窗口焦点变更 | `WMS.setFocusedApp()` | 24 |
| P3 | B Lifecycle | WMS 启动初始化 | `WMS.onSystemReady()` | 22 |
| P4 | C State | 窗口状态转换 | `WindowStateTransitioning.setWindowWallpaper()` | 20 |
| P5 | D Cross | ATMS 协调 | `RootWindowContainer.getTopVisibleDisplayAreaInfo()` | 21 |
| P6 | E Data | 窗口层级更新 | `WindowContainer.positionChildAt()` | 19 |
| P7 | A Core | 布局计算 | `WMS.performLayoutLocked()` | 23 |
| P8 | A Core | Surface 分配 | `WindowState.preparePreparedWindow()` | 22 |

### M2: Activity Task Management

| # | Category | 路径名 | 入口方法 | Score |
|---|----------|--------|----------|-------|
| P1 | A Core | Activity 启动 | `ActivityStarter.execute()` | 25 |
| P2 | A Core | Activity 恢复 | `ActivityStackSupervisor.resumeFocusedStack()` | 24 |
| P3 | B Lifecycle | Process 启动绑定 | `ActivityTaskSupervisor.attachApplication()` | 22 |
| P4 | C State | Task 移动 | `Task.moveToFront()` | 20 |
| P5 | D Cross | AMS 进程管理 | `ActivityTaskManagerService.getTasks()` | 21 |
| P6 | A Core | Activity 结果返回 | `ActivityStarter.startActivityUnchecked()` | 23 |
| P7 | E Data | Activity 配置更新 | `ActivityRecord.onConfigurationChanged()` | 19 |

### M3: Surface & Animation

| # | Category | 路径名 | 入口方法 | Score |
|---|----------|--------|----------|-------|
| P1 | A Core | Surface 创建 | `WindowStateAnimator.performShowLocked()` | 25 |
| P2 | A Core | 窗口动画执行 | `SurfaceAnimator.animate()` | 24 |
| P3 | B Lifecycle | 动画线程初始化 | `SurfaceAnimationThread.run()` | 22 |
| P4 | C State | BLAST 同步 | `BLASTSyncEngine.sync()` | 20 |
| P5 | D Cross | 过渡动画 | `TransitionController.collect()` | 21 |
| P6 | E Data | Surface 事务 | `SurfaceControl.transaction()` | 23 |

### M4: Display & Policy

| # | Category | 路径名 | 入口方法 | Score |
|---|----------|--------|----------|-------|
| P1 | A Core | 显示旋转 | `DisplayRotation.updateRotation()` | 25 |
| P2 | A Core | 刷新率切换 | `RefreshRatePolicy.setRefreshRate()` | 24 |
| P3 | B Lifecycle | Display 初始化 | `DisplayContent.<init>()` | 22 |
| P4 | C State | 显示配置变更 | `DisplayContent.onConfigurationChanged()` | 20 |
| P5 | D Cross | 分辨率策略 | `DisplayPolicy.getStableInsets()` | 21 |

### M5: Input Management

| # | Category | 路径名 | 入口方法 | Score |
|---|----------|--------|----------|-------|
| P1 | A Core | 输入分发 | `InputMonitor.updateInputWindows()` | 25 |
| P2 | A Core | 触摸事件处理 | `InputDispatcher.dispatchMotion()` | 24 |
| P3 | B Lifecycle | InputChannel 注册 | `InputDispatcher.registerInputChannel()` | 22 |
| P4 | C State | 焦点窗口更新 | `InputMonitor.setFocusedWindow()` | 20 |
| P5 | D Cross | IME 交互 | `InputMethodManager.startInputOrWindowGainedFocus()` | 21 |

### M6: Insets & IME

| # | Category | 路径名 | 入口方法 | Score |
|---|----------|--------|----------|-------|
| P1 | A Core | IME 显示/隐藏 | `ImeInsetsSourceProvider.controlWindowInsets()` | 25 |
| P2 | A Core | Insets 状态计算 | `InsetsStateController.computeInsets()` | 24 |
| P3 | B Lifecycle | Insets 控制器初始化 | `InsetsStateController.<init>()` | 22 |
| P4 | C State | Insets 源提供者更新 | `InsetsSourceProvider.onWindowAdded()` | 20 |
| P5 | D Cross | 系统栏 Insets | `InsetsStateController.getSource()` | 21 |

### M7: App Compatibility

| # | Category | 路径名 | 入口方法 | Score |
|---|----------|--------|----------|-------|
| P1 | A Core | Letterbox 布局 | `AppCompatLetterboxPolicy.getCompatLayoutInfo()` | 25 |
| P2 | A Core | 长宽比适配 | `AppCompatAspectRatioPolicy.getAspectRatio()` | 24 |
| P3 | B Lifecycle | AppCompat 配置加载 | `AppCompatController.<init>()` | 22 |
| P4 | C State | 配置继承 | `ConfigurationContainer.getConfiguration()` | 20 |
| P5 | D Cross | 系统 UI 交互 | `AppCompatController.getImeInsetsAdjustment()` | 21 |

### M8: Shell & Desktop Mode

| # | Category | 路径名 | 入口方法 | Score |
|---|----------|--------|----------|-------|
| P1 | A Core | PiP 模式进入 | `PinnedTaskController.enterPictureInPictureMode()` | 25 |
| P2 | A Core | Shell 命令执行 | `WindowOrganizerController.dispatchAppTransition()` | 24 |
| P3 | B Lifecycle | Shell Root 初始化 | `ShellRoot.<init>()` | 22 |
| P4 | C State | 任务组织器 | `TaskOrganizerController.attachOrganizer()` | 20 |
| P5 | D Cross | 锁屏任务 | `LockTaskController.startLockTask()` | 21 |

---

## 四、输出文件结构

```
~/aosp/base/docs/exploration/wms-exploration/
├── 01-file-inventory.html        (从 .md 转换)
├── 02-module-division.html       (从 .md 转换)
├── WMS-Module-Map.html           (从 .md 转换)
├── WMS-M1-WindowContainer-anchor.html   (R0)
├── WMS-M1-WindowContainer-deep-dive.html (R4-R6)
├── WMS-M2-ActivityTask-anchor.html
├── WMS-M2-ActivityTask-deep-dive.html
├── WMS-M3-SurfaceAnimation-anchor.html
├── WMS-M3-SurfaceAnimation-deep-dive.html
├── WMS-M4-DisplayPolicy-anchor.html
├── WMS-M4-DisplayPolicy-deep-dive.html
├── WMS-M5-InputManagement-anchor.html
├── WMS-M5-InputManagement-deep-dive.html
├── WMS-M6-InsetsIME-anchor.html
├── WMS-M6-InsetsIME-deep-dive.html
├── WMS-M7-AppCompat-anchor.html
├── WMS-M7-AppCompat-deep-dive.html
├── WMS-M8-ShellDesktopMode-anchor.html
├── WMS-M8-ShellDesktopMode-deep-dive.html
└── ledger.html                   (进度跟踪)
```

---

## 五、执行策略

### Phase 1 复用
- 读取已有的 `.md` 文件，转换为 HTML 格式
- 验证内容准确性，必要时更正

### Phase 2 并行化
为提高效率，将 8 个模块分成 2 组并行执行：

**Agent 1:** M1, M2, M3, M4 (核心业务模块)
**Agent 2:** M5, M6, M7, M8 (功能增强模块)

### 每个模块的执行流程
```
R0 (Anchor) → R1 (Architecture) → R2 (Class Diagram)
→ R3 (Data Structures) → R4 (Call Chains) → R5 (Sequences) → R6 (Summary)
```

### 时间预算
- Phase 1 复用: ~30 分钟
- Phase 2 每模块: ~45-60 分钟 (R0-R3 基础 + R4-R6 深度)
- 总计: ~8-10 小时 (8 模块 × 1 小时)

---

## 六、质量保证

### Anti-Hallucination 强制检查
1. 每个方法调用必须通过 `grep -n` 验证行号
2. 每个类继承必须通过 `class Xxx extends Yyy` 验证
3. 每个字段类型必须通过 `field type` 声明验证
4. 每个跨模块调用必须标记 `[REF - cross-module]`

### 输出质量门
| 指标 | 目标 |
|------|------|
| Completeness | ≥ 8/8 modules (100%) |
| Granularity | 函数级 + 锁/线程/Binder 注解 |
| Correctness | 所有引用带行号 |
| High Issues | 0 |

---

## 七、执行命令摘要

```bash
# Step 1: 重置 Phase 2 目录（保留 Phase 1）
cd ~/aosp/base/docs/exploration/
mv wms-exploration/01-file-inventory.md /tmp/
mv wms-exploration/02-module-division.md /tmp/
mv wms-exploration/WMS-Module-Map.md /tmp/
rm -rf wms-exploration/
mkdir -p wms-exploration/
mv /tmp/01-file-inventory.md wms-exploration/
mv /tmp/02-module-division.md wms-exploration/
mv /tmp/WMS-Module-Map.md wms-exploration/

# Step 2: 验证目录
ls ~/aosp/base/docs/exploration/wms-exploration/
```

---

*计划版本: v1.0*
*状态: 待执行 (Plan Mode)*
