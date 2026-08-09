# PMS 深度探索执行计划

> **项目**: aosp-pms (PackageManagerService)
> **目标目录**: `~/aosp/base/services/core/java/com/android/server/pm/`
> **总文件数**: 278 个 Java 文件
> **日期**: 2026-08-09
> **状态**: Plan Mode - 等待用户批准执行

---

## 一、现状分析

### 1.1 已有的探索结果

| 文件 | 内容 | Phase 1/2 | 格式 | 状态 |
|------|------|-----------|------|------|
| `pms-exploration/01-PMS-Module-Map.md` | 模块地图 | Phase 1 R3 | MD | 存在但需转HTML |
| `pms-exploration/02-Settings-Persistence-Deep-Dive.md` | Settings模块深度 | Phase 2 | MD | 存在但需转HTML |
| `pms-exploration/03-Install-Scan-Deep-Dive.md` | Install/Scan深度 | Phase 2 | MD | 存在但需转HTML |
| `pms-exploration/04-User-Management-Deep-Dive.md` | User管理深度 | Phase 2 | MD | 存在但需转HTML |
| `pms-exploration/05-DEX-Optimization-Deep-Dive.md` | DEX优化深度 | Phase 2 | MD | 存在但需转HTML |
| `pms-exploration/PMS-installPackage-Critical-Path.html` | 安装关键路径 | Phase 2 | HTML | 存在 |

### 1.2 已完成 vs 待完成

```
Phase 1 (R1-R3):
  ✅ R1 File Inventory: 已完成 (MD)
  ✅ R2 Module Division: 已完成 (MD)
  ✅ R3 Module Map: 已完成 (MD)
  ⚠️  但全部是 MD 格式，需要重新输出为 HTML

Phase 2 (R0-R6 per module):
  Module 1 (Settings & Persistence): ✅ R0-R6 完成 (MD,需转HTML)
  Module 2 (User Management):        ✅ R0-R6 完成 (MD,需转HTML)
  Module 3 (Install & Scan):         ✅ R0-R6 完成 (MD,需转HTML)
  Module 4 (DEX Optimization):       ✅ R0-R6 完成 (MD,需转HTML)
  Module 5 (Launcher & Shortcuts):   ❌ 未完成
  Module 6 (Permission Management):  ❌ 未完成
```

### 1.3 需要完成的工作

**总计需要生成 6 个 HTML 文件：**

| 阶段 | 文件 | 行动 |
|------|------|------|
| Phase 1 | `aosp-pms-module-map.html` | 合并R1+R2+R3输出为HTML |
| Phase 2 | `aosp-pms-settings-deep-dive.html` | 将已有MD转为HTML |
| Phase 2 | `aosp-pms-user-management-deep-dive.html` | 将已有MD转为HTML |
| Phase 2 | `aosp-pms-install-scan-deep-dive.html` | 将已有MD转为HTML |
| Phase 2 | `aosp-pms-dex-optimization-deep-dive.html` | 将已有MD转为HTML |
| Phase 2 | `aosp-pms-launcher-shortcuts-deep-dive.html` | **新建 R0-R6** |
| Phase 2 | `aosp-pms-permission-management-deep-dive.html` | **新建 R0-R6** |

**加上 Phase 1 的 R1+R2 文件：**
| 阶段 | 文件 | 行动 |
|------|------|------|
| Phase 1 | `01-file-inventory.html` | **新建** (从已有文件读取) |
| Phase 1 | `02-module-division.html` | **新建** (从已有文件读取) |

---

## 二、CLEAN SLATE 执行流程

根据 skill 强制规则，执行前必须：

```bash
# Step 1: 检查现有目录
ls ~/aosp/base/docs/exploration/pms-exploration/

# Step 2: 删除旧目录 (已有旧MD文件，需要清理)
rm -rf ~/aosp/base/docs/exploration/pms-exploration/

# Step 3: 重建目录
mkdir -p ~/aosp/base/docs/exploration/pms-exploration/
```

---

## 三、Phase 1 执行计划 (R1-R3)

### Round 1: File Inventory (新建 HTML)

**输入**: 278个Java文件
**输出**: `pms-exploration/01-file-inventory.html`

**分组策略** (基于已有模块划分):

| 分组 | 文件数 | 核心文件 |
|------|--------|----------|
| A. 核心服务主类 | 3 | PackageManagerService.java, PackageManagerServiceInjector.java, PackageManagerLocal.java |
| B. 设置持久化 | 5 | Settings.java, PackageSetting.java, SharedUserSetting.java, PackageState*.java, SettingsXml.java |
| C. 安装与扫描 | 8 | InstallPackageHelper.java, ScanPackageUtils.java, PackageParser*.java, PackageSession*.java |
| D. DEX优化 | 6 | PackageDexOptimizer.java, DexOptHelper.java, DexManager.java, ArtManagerService.java |
| E. 用户管理 | 3 | UserManagerService.java, UserManagerInternal.java, UserTypeFactory.java |
| F. 启动器与快捷方式 | 5 | ShortcutService.java, LauncherAppsService.java, Shortcut*.java |
| G. 权限管理 | 12 | PermissionManagerService.java, Permission.java, UidPermissionState.java 等 |
| H. 包状态管理 | 8 | PackageState*.java, PackageUserState*.java, PackageUserStateWrite.java |
| I. 域名验证 | 14 | DomainVerification*.java (verify/domain/) |
| J. 解析与兼容 | 12 | PackageParser*.java, PackageCacher.java (parsing/) |
| K. 组件解析 | 5 | ComponentResolver*.java (resolution/) |
| L. 安装器服务 | 4 | PackageInstallerService.java, InstallingSession.java |
| M. 广播与删除 | 6 | BroadcastHelper.java, DeletePackageHelper.java, RemovePackageHelper.java |
| N. 其他支持 | ~10 | CompilerStats.java, PackageUsage.java, ResilientAtomicFile.java 等 |

**验证方法**: 每个文件读取 class 声明 + Javadoc

### Round 2: Module Division (新建 HTML)

**输入**: R1 输出
**输出**: `pms-exploration/02-module-division.html`

**模块边界定义** (已验证):

```
Module 1: Settings & Persistence
  - Settings.java (8209行)
  - PackageSetting.java
  - SharedUserSetting.java
  - 入口: addPackageSettingLPw() [Settings.java:1411]

Module 2: User Management
  - UserManagerService.java (6000行)
  - 入口: onBootPhase() [UserManagerService.java:986]

Module 3: Install & Scan
  - InstallPackageHelper.java (3606行)
  - ScanPackageUtils.java
  - 入口: scanPackageNew() [InstallPackageHelper.java:4215]

Module 4: DEX Optimization
  - PackageDexOptimizer.java
  - DexOptHelper.java
  - 入口: performDexOpt() [PackageDexOptimizer.java]

Module 5: Launcher & Shortcuts
  - ShortcutService.java (4000行)
  - LauncherAppsService.java
  - 入口: queryActivitiesForPackage() [LauncherAppsService.java:795]

Module 6: Permission Management
  - PermissionManagerService.java (1790行)
  - DefaultPermissionGrantPolicy.java
  - 入口: checkPermission() [PermissionManagerService.java:227]
```

### Round 3: Module Map (新建 HTML)

**输入**: R1 + R2 输出
**输出**: `pms-exploration/aosp-pms-module-map.html`

包含:
- Mermaid 架构图
- 模块依赖关系
- 锁模型总结
- 线程模型
- 探索顺序

---

## 四、Phase 2 执行计划 (R0-R6 per module)

### 4.1 已完成模块 (需要转换为 HTML)

| 模块 | 已有MD文件 | 转换为HTML | 需补充Call Chains |
|------|-----------|-----------|-------------------|
| Settings & Persistence | 02-xxx.md | aosp-pms-settings-deep-dive.html | 检查是否完整 |
| User Management | 04-xxx.md | aosp-pms-user-management-deep-dive.html | 检查是否完整 |
| Install & Scan | 03-xxx.md | aosp-pms-install-scan-deep-dive.html | 检查是否完整 |
| DEX Optimization | 05-xxx.md | aosp-pms-dex-optimization-deep-dive.html | 检查是否完整 |

### 4.2 新建模块 (需要完整执行 R0-R6)

#### Module 5: Launcher & Shortcuts (新建)

**核心文件**:
- `ShortcutService.java` (~4000行)
- `LauncherAppsService.java` (~3500行)

**关键路径 (5-10个)**:

| # | 路径 | Entry Point | Category |
|---|------|-------------|----------|
| 1 | 查询应用图标 | `LauncherAppsService.resolveIcon()` | A/Core |
| 2 | 创建快捷方式 | `ShortcutService.createShortcutResult()` | A/Core |
| 3 | 动态快捷方式更新 | `ShortcutService.updateShortcuts()` | A/Core |
| 4 | ShortcutService初始化 | `ShortcutService.onBootPhase()` | B/Lifecycle |
| 5 | LauncherApps服务启动 | `LauncherAppsService.onServiceReady()` | B/Lifecycle |
| 6 | 快捷方式状态管理 | `ShortcutService.getForPackage()` | C/State |
| 7 | PMS交叉模块调用 | `LauncherAppsService.getActivitiesForPackage()` | D/Cross |
| 8 | 快捷方式持久化 | `ShortcutService.saveToXml()` | E/Data |

#### Module 6: Permission Management (新建)

**核心文件**:
- `permission/PermissionManagerService.java` (~1790行)
- `permission/Permission.java`
- `permission/UidPermissionState.java`
- `permission/DefaultPermissionGrantPolicy.java`

**关键路径 (5-10个)**:

| # | 路径 | Entry Point | Category |
|---|------|-------------|----------|
| 1 | 运行时权限检查 | `checkPermission()` | A/Core |
| 2 | 运行时权限授予 | `grantRuntimePermission()` | A/Core |
| 3 | 权限撤销 | `revokeRuntimePermission()` | A/Core |
| 4 | 默认权限授予 | `DefaultPermissionGrantPolicy.grantDefaultPermissions()` | B/Lifecycle |
| 5 | 权限状态变更通知 | `PermissionManagerService.onPermissionGrantResult()` | C/State |
| 6 | AppOps检查 | `PermissionManagerService.checkPackagePermission()` | D/Cross |
| 7 | 权限数据持久化 | `UidPermissionState.write()` | E/Data |

---

## 五、执行顺序

```
Phase 1 (串行):
  R1 File Inventory (快速扫描278文件，分组)
  → R2 Module Division (确认模块边界)
  → R3 Module Map (生成统一架构图)

Phase 2 (模块间可并行，模块内串行):
  Settings & Persistence → User Management → Install & Scan → DEX Optimization
  (以上4个: 转换已有MD为HTML，补充Call Chains验证)
  ↓ (串行依赖)
  Launcher & Shortcuts → Permission Management
  (以上2个: 完整新建 R0-R6)
```

---

## 六、输出文件清单

| # | 文件名 | 内容 | 来源 |
|---|--------|------|------|
| 1 | `01-file-inventory.html` | 文件清单 | 新建 |
| 2 | `02-module-division.html` | 模块划分 | 新建 |
| 3 | `aosp-pms-module-map.html` | 统一模块地图 | 新建 (合并R1-R3) |
| 4 | `aosp-pms-settings-deep-dive.html` | Settings模块深度 | 转换+验证 |
| 5 | `aosp-pms-user-management-deep-dive.html` | User管理深度 | 转换+验证 |
| 6 | `aosp-pms-install-scan-deep-dive.html` | Install/Scan深度 | 转换+验证 |
| 7 | `aosp-pms-dex-optimization-deep-dive.html` | DEX优化深度 | 转换+验证 |
| 8 | `aosp-pms-launcher-shortcuts-deep-dive.html` | Launcher/Shortcuts深度 | 新建 |
| 9 | `aosp-pms-permission-management-deep-dive.html` | Permission管理深度 | 新建 |

---

## 七、验证检查点

### Phase 1 检查
- [ ] 所有278个Java文件已分组
- [ ] 每个文件的 class 声明已验证
- [ ] 模块边界已确认
- [ ] Mermaid 图无语法错误

### Phase 2 检查 (每个模块)
- [ ] R0: Anchor 文件存在
- [ ] R1: Architecture 包含 internal/external 边界
- [ ] R2: Class Diagram 包含完整字段
- [ ] R3: Data Structures 包含状态机
- [ ] R4: Call Chains 包含 5-10 个关键路径
- [ ] R5: Sequences 包含 Mermaid 序列图
- [ ] R6: Summary 包含完整引用

### 质量检查
- [ ] 所有 HTML 文件包含 Mermaid.js CDN
- [ ] 所有图表使用 `div class="mermaid"`
- [ ] 所有引用包含 `[Source: file.java:line]`
- [ ] 无 `[UNVERIFIED]` 标记

---

## 八、时间估算

| 阶段 | 预计时间 |
|------|----------|
| Phase 1 R1 (文件扫描) | 15-20分钟 |
| Phase 1 R2 (模块划分) | 10分钟 |
| Phase 1 R3 (模块地图) | 10分钟 |
| Phase 2 Module 5 (新建) | 60-90分钟 |
| Phase 2 Module 6 (新建) | 60-90分钟 |
| 已有文件 HTML 转换 | 30分钟 |
| **总计** | **~3-4 小时** |

---

## 九、Plan Mode 执行指令

在 Plan Mode 下，我将只执行以下操作：

1. **删除旧目录并重建** (clean slate)
2. **执行 Phase 1 R1** - 文件扫描 (快速扫描278文件)
3. **执行 Phase 1 R2** - 模块划分
4. **执行 Phase 1 R3** - 模块地图HTML
5. **执行 Phase 2 Module 5** - Launcher & Shortcuts (R0-R6)
6. **执行 Phase 2 Module 6** - Permission Management (R0-R6)
7. **转换已有文档** - 4个已有MD→HTML

---

*计划编制完成，等待用户批准执行*
