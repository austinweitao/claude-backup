# Init-Explore Skill 配置

## 自动更新检查

### 检查脚本
- **位置**: `~/.claude/skills/init-explore/check-update.sh`
- **功能**: 检查知识库是否需要更新
- **触发条件**:
  - 距上次运行 >= 7 天
  - 代码变更 >= 10 个文件

### 使用方式

```bash
# 手动检查是否需要更新
bash ~/.claude/skills/init-explore/check-update.sh

# 如果提示更新，在 Claude Code 中运行
/init-explore
```

## 配置项

### 更新间隔
在 `check-update.sh` 中修改：
```bash
UPDATE_INTERVAL_DAYS=7  # 修改为你想要的天数
```

### 变更阈值
```bash
if [ $CHANGED_FILES -ge 10 ]; then  # 修改为你想要的文件数
```

### 对话级自动捕获配置

在项目的 `scripts/auto-capture-skill.sh` 中配置：

```bash
# 质量阈值（达到此分数触发自动沉淀）
QUALITY_THRESHOLD=4

# 是否启用自动捕获（1=启用，0=禁用）
ENABLE_AUTO_CAPTURE=1

# 自动捕获的文档分类
AUTO_CAPTURE_CATEGORY="对话沉淀"
```

或在环境变量中设置：
```bash
export OPENCORE_QUALITY_THRESHOLD=4
export OPENCORE_AUTO_CAPTURE=1
```

## 集成到项目

### 方式 1: Git Hook 集成

在项目的 `.git/hooks/post-commit` 中添加：
```bash
# 检查是否需要重新运行 /init-explore
if [ -f "$HOME/.claude/skills/init-explore/check-update.sh" ]; then
    bash "$HOME/.claude/skills/init-explore/check-update.sh"
fi
```

### 方式 2: 定时任务

添加到 crontab：
```bash
# 每周一早上检查
0 9 * * 1 cd /path/to/project && bash ~/.claude/skills/init-explore/check-update.sh
```

### 方式 3: GitHub Actions

在 `.github/workflows/check-knowledge.yml`:
```yaml
name: Check Knowledge Update

on:
  schedule:
    - cron: '0 9 * * 1'  # 每周一早上

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check if update needed
        run: |
          # 检查逻辑
          echo "检查知识库是否需要更新..."
```

## 状态文件

### `.understand-anything/last-explore.txt`
- 记录上次运行 /init-explore 的时间戳
- 格式: Unix timestamp

### 更新时间戳
在 workflow 的最后添加：
```javascript
// 更新时间戳
const fs = require('fs')
const timestamp = Math.floor(Date.now() / 1000)
fs.mkdirSync('.understand-anything', { recursive: true })
fs.writeFileSync('.understand-anything/last-explore.txt', timestamp.toString())
```

## 手动触发

### 何时需要重新运行 /init-explore

1. **架构重构**: 修改了核心架构
2. **新增模块**: 添加了新的主要功能模块
3. **依赖变更**: 更新了主要依赖或框架
4. **文档过期**: 发现文档与代码不一致
5. **定期更新**: 每月或每季度刷新一次

### 增量更新 vs 完整重建

**增量更新**（推荐日常使用）:
- 使用 `scripts/update-knowledge.sh`
- Git Hook 自动触发
- 只更新变更的文档

**完整重建**（推荐定期执行）:
- 运行 `/init-explore`
- 重新分析整个代码库
- 生成完整的知识库

## 最佳实践

1. **日常开发**: 依靠 Git Hook 自动更新
2. **周期检查**: 每周运行 `check-update.sh`
3. **重大变更**: 手动运行 `/init-explore`
4. **定期刷新**: 每月或每季度完整重建一次
5. **对话沉淀**: 深度回答后自动捕获高质量知识

## 故障排查

### 检查脚本未运行
```bash
# 确保脚本可执行
chmod +x ~/.claude/skills/init-explore/check-update.sh

# 手动测试
bash ~/.claude/skills/init-explore/check-update.sh
```

### 时间戳文件不存在
```bash
# 手动创建
mkdir -p .understand-anything
date +%s > .understand-anything/last-explore.txt
```

### Git 日志查询失败
确保在 Git 仓库中运行，且有提交历史

## 相关文件

- `SKILL.md` - Skill 说明文档
- `check-update.sh` - 更新检查脚本
- `CONFIG.md` - 配置文档（本文件）
- `auto-capture-skill.sh` - 对话质量评估脚本
- `auto-capture.py` - Python 版质量评估

## 对话级自动捕获

### 触发条件

当回答达到质量阈值（默认 4 分）时自动触发：

| 条件 | 分值 |
|------|------|
| 分析 3+ 源文件 | +3 |
| 架构/设计模式讨论 | +2 |
| 包含 Mermaid 图表 | +2 |
| 集成/使用指南 | +2 |
| 复杂技术流程 | +1 |
| 设计决策说明 | +1 |

### 手动测试

```bash
# 测试质量评估
cd /path/to/project
bash scripts/auto-capture-skill.sh "回答内容" "file1.cpp,file2.h"

# Python 版（更精确）
python3 scripts/auto-capture.py
```

### 注意事项

- 自动捕获仅在知识库已初始化后生效（运行过 `/init-explore`）
- 已存在相同主题的文档时跳过
- 捕获后更新 `.knowledge-system.json` 中的 `lastUpdateBy: conversation`
