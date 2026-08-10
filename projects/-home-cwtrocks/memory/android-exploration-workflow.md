---
name: android-exploration-workflow
description: Android 代码探索工作流规范 - 确保每次探索使用带时间戳的新目录
metadata: 
  node_type: memory
  type: project
  originSessionId: 227236c3-e075-45ef-b752-f582adee3f3b
---

# Android 代码探索工作流规范

## 核心规则

### 1. 探索目录命名规范

**必须使用时间戳创建新目录**，格式：
```
<target>-exploration-<YYYYMMDD-HHMMSS>
```

**正确示例：**
```
AMS-exploration-20260809-230000
binder-exploration-20260809-140000
```

**错误示例：**
```
docs/exploration/                    # ❌ 复用已有目录
docs/exploration-20260809-111415     # ⚠️ 上次探索目录
```

### 2. 工作流程

```
Step 1: 创建带时间戳的新目录
  TARGET_DIR="<项目>/<模块>-exploration-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$TARGET_DIR/docs"

Step 2: 在新目录中进行探索
  所有 HTML 文档、临时文件都放在新目录

Step 3: 探索完成后，创建稳定版本链接
  ln -sf "$TARGET_DIR" "<项目>/<模块>-latest"
```

### 3. 目录结构模板

```
<项目>-exploration-YYYYMMDD-HHMMSS/
├── docs/                    # HTML 报告
│   ├── 01-file-inventory.html
│   ├── 02-module-division.html
│   ├── <module>-deep-dive.html
│   └── MASTER-REPORT.html
├── temp/                    # 临时文件
└── logs/                    # 日志
```

### 4. 禁止行为

- ❌ 禁止向已有探索目录追加新探索结果
- ❌ 禁止使用 `docs/exploration/` 作为输出目录（不带时间戳）
- ❌ 禁止覆盖 `*-latest` 链接指向的目录

### 5. 为什么要这样做

- 避免上次探索的结果被意外覆盖
- 保留历史版本，便于回溯对比
- 便于分享特定时间点的探索结果
- Workflow resume 时不会混淆旧目录

## AMS 探索示例

```bash
# 正确的探索流程
TARGET_DIR="~/aosp/base/services/core/java/com/android/server/am/AMS-exploration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TARGET_DIR/docs"

# 在新目录中创建文档
# ...

# 完成后链接为 latest
cd ~/aosp/base/services/core/java/com/android/server/am/
ln -sfn "AMS-exploration-$(date +%Y%m%d-%H%M%S)" AMS-latest
```

**Why:** 防止探索结果被覆盖，保留历史版本。
**How to apply:** 每次开始新探索时，先执行 `mkdir -p <模块>-exploration-$(date +%Y%m%d-%H%M%S)`。
