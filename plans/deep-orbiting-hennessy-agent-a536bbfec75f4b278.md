# Sensor 模块深度探索计划

## 目标
- **目标目录**: ~/aosp/base/services/core/java/com/android/server/sensors/
- **项目名称**: aosp-sensor
- **服务名称**: SensorService

## 模块概览

### 已识别的源文件
| 文件 | 职责 |
|------|------|
| `SensorService.java` | 主服务类，管理传感器生命周期和运行时传感器 |
| `SensorManagerInternal.java` | 系统内部传感器 API 接口定义 |
| `OWNERS` | 文件所有权配置 |

### 模块特性
- **模块规模**: 小型（仅 2 个核心 Java 文件）
- **Native 依赖**: 强依赖（SensorService 通过 JNI 调用 native 服务）
- **核心功能**:
  1. 运行时传感器注册/注销（Runtime Sensor Management）
  2. 接近传感器监听（Proximity Sensor Listeners）
  3. 传感器事件转发（Sensor Event Dispatching）

---

## Phase 1: Module Map 计划

### Round 1: 文件清单
- [ ] 枚举所有 .java 文件
- [ ] 读取每个文件的类声明和关键方法
- [ ] 分类：Core（主逻辑）vs Supporting（工具类）

### Round 2: 模块划分
- [ ] 按功能职责分组
- [ ] 识别入口点（Binder AIDL, public API, Handler messages）
- [ ] 验证依赖关系

### Round 3: 模块地图文档
- [ ] 创建 Mermaid 架构图
- [ ] 文档化模块关系
- [ ] 提供探索顺序

---

## Phase 2: Per-Module Deep Dive 计划

### 单一模块：SensorService Core

由于模块规模较小，所有功能在 `SensorService.java` 中实现，需要探索的关键路径：

#### 5-10 个关键路径（按类别分类）

| # | 路径名称 | 类别 | 入口点 | 描述 |
|---|----------|------|--------|------|
| P1 | 运行时传感器创建 | A - Core Business | `LocalService.createRuntimeSensor()` | 创建并注册运行时传感器 |
| P2 | 运行时传感器注销 | A - Core Business | `LocalService.removeRuntimeSensor()` | 注销运行时传感器 |
| P3 | 运行时传感器事件发送 | A - Core Business | `LocalService.sendSensorEvent()` | 发送传感器事件到框架 |
| P4 | 接近传感器监听器注册 | A - Core Business | `LocalService.addProximityActiveListener()` | 注册接近传感器状态监听 |
| P5 | 接近传感器监听器注销 | A - Core Business | `LocalService.removeProximityActiveListener()` | 注销接近传感器监听 |
| P6 | 服务初始化与启动 | B - Lifecycle | `SensorService.<init>()` | 服务构造和 native 初始化 |
| P7 | Boot 阶段处理 | B - Lifecycle | `SensorService.onBootPhase()` | 处理 PHASE_WAIT_FOR_SENSOR_SERVICE |
| P8 | Native 服务启动 | D - Cross-Module | `startSensorServiceNative()` | 启动 native 传感器服务 |
| P9 | 接近传感器状态回调 | C - State Management | `ProximityListenerDelegate.onProximityActive()` | 处理接近传感器状态变化 |
| P10 | 直接通道配置 | E - Data Flow | `RuntimeSensorCallback.onDirectChannelConfigured()` | 配置直接传感器通道 |

#### 5 类别覆盖
- **A. Core Business**: P1, P2, P3, P4, P5 (5 个)
- **B. Lifecycle**: P6, P7 (2 个)
- **C. State Management**: P9 (1 个)
- **D. Cross-Module**: P8 (1 个)
- **E. Data Flow**: P10 (1 个)

---

## 关键发现（Phase 0 扫描）

### SensorService 核心结构
```
SensorService extends SystemService
├── mLock: Object (同步锁)
├── mProximityListeners: ArrayMap<ProximityActiveListener, ProximityListenerProxy>
├── mRuntimeSensorHandles: Set<Integer>
├── mSensorServiceStart: Future<?>
├── mPtr: long (native 指针)

内部类:
├── LocalService extends SensorManagerInternal (系统内部 API 实现)
│   ├── createRuntimeSensor()
│   ├── removeRuntimeSensor()
│   ├── sendSensorEvent()
│   ├── sendSensorAdditionalInfo()
│   ├── addProximityActiveListener()
│   └── removeProximityActiveListener()
├── ProximityListenerProxy (执行器包装)
└── ProximityListenerDelegate implements ProximityActiveListener
```

### Native 方法
| 方法 | 描述 |
|------|------|
| `startSensorServiceNative()` | 启动 native 传感器服务 |
| `registerProximityActiveListenerNative()` | 注册接近传感器监听 |
| `unregisterProximityActiveListenerNative()` | 注销接近传感器监听 |
| `registerRuntimeSensorNative()` | 注册运行时传感器 |
| `unregisterRuntimeSensorNative()` | 注销运行时传感器 |
| `sendRuntimeSensorEventNative()` | 发送运行时传感器事件 |
| `sendRuntimeSensorAdditionalInfoNative()` | 发送额外信息 |

---

## 输出目标

### 文件结构
```
~/aosp/base/docs/exploration/
├── 01-file-inventory.html
├── 02-module-division.html
├── aosp-sensor-module-map.html
├── aosp-sensor-SensorService-anchor.html
└── aosp-sensor-SensorService-deep-dive.html
```

---

## 清理检查
根据 Clean Slate Rule：
- [x] 确认 sensors/ 目录存在（2 个文件）
- [ ] 需要创建新的 exploration 子目录
- [ ] 删除旧的 sensors 相关探索文件（如果存在）

---

## 执行时间估计

| Phase | Round | 预计时间 |
|-------|-------|----------|
| P1 | R1 文件清单 | 5 分钟 |
| P1 | R2 模块划分 | 10 分钟 |
| P1 | R3 模块地图 | 15 分钟 |
| P2 | R0 Anchor | 10 分钟 |
| P2 | R1 架构 | 10 分钟 |
| P2 | R2 类图 | 15 分钟 |
| P2 | R3 数据结构 | 10 分钟 |
| P2 | R4 调用链 | 30 分钟 |
| P2 | R5 时序图 | 15 分钟 |
| P2 | R6 总结 | 10 分钟 |
| **总计** | | **~130 分钟** |

---

## 验证清单

### Anti-Hallucination 规则
- [ ] 每个方法名必须从源码验证
- [ ] 每个字段名必须从源码验证
- [ ] 每个锁类型必须从 synchronized 块验证
- [ ] 每个线程类型必须从 Looper/Handler 验证

### 执行顺序检查
- [ ] Phase 1 完成前不开始 Phase 2
- [ ] R0 完成前不开始 R1
- [ ] R1 完成前不开始 R2
- [ ] (依此类推)
