# Claude Code 全局配置

## 📚 Android 源码本地优先规则

**当用户提问涉及 Android / AOSP 内部实现需要源码确认时，遵循以下优先级顺序：**

### Step 1 — 先用本地 `~/aosp` 源码确认（最快，最权威）

- 路径：`~/aosp`（已存在本地 AOSP 镜像）
- 结构：
  - `~/aosp/base`   — `frameworks/base`
  - `~/aosp/native` — `frameworks/native`
- 使用 Read / Grep 工具直接在本地打开对应文件

### Step 2 — 本地确实没有 / 路径缺失时，回退到远端确认

- 优先 AOSP master：`https://android.googlesource.com/platform/<repo>/+/refs/heads/main/<path>?format=TEXT`
- 抓取工具：`mcp__fetch__imageFetch`

### Step 3 — 标注规则

```
[知识来源: ~/aosp/base/<相对路径>/<file>.java 实测 - <具体行/字段>]
[知识来源: AOSP master - <URL>]
[置信度: 高/中/低]
```

### ⚠️ 重要约束

- **禁止用 `~/aosp/<repo>` 里 `android-X.Y.Z_rN` tag 的代码当"最新"**
- **禁止单凭训练数据写字段名** — 必须以实测为准
- 本地路径缺失时必须升级到远端确认

---

## ⛔ Android / AOSP / MTK / Linux kernel 强制协议

**本协议优先级高于本文档其他所有章节。**

### 诚实声明（最高优先级）

- **不能实测源码字段**：必须声明 `[本回答字段未经实测，仅基于训练数据推测]`
- **宁可不答，不可敷衍**

### 必须执行的硬性约束

1. **源码唯一可信来源**：
   - AOSP master：`https://android.googlesource.com/platform/<repo>/+/refs/heads/main/<path>?format=TEXT`
   - Linux kernel master：`https://github.com/torvalds/linux/blob/master/<path>`

2. **禁止使用的过时来源**：
   - ❌ `android-X.Y.Z_rN` tag（如 `android-10.0.0_r25`）—— 默认过时
   - ❌ `cs.android.com/...` —— 返回空内容
   - ❌ 训练数据中"猜的字段名"

3. **每篇回答必填**：
   - [ ] 所有字段名 / 函数签名 / 常量值 **实测确认**
   - [ ] 如文件返回 404，明确告知用户"**路径已变更**"
   - [ ] 结尾有"**硬性事实清单**"小节
   - [ ] 来源标注符合模板

---

## 📊 报告格式规范

**默认输出格式：Markdown（`.md`）**

### 默认规则

1. **默认格式**：所有报告使用 Markdown 格式输出
2. **Mermaid 图表**：使用 ` ```mermaid ` 代码块
3. **代码高亮**：使用 Markdown 原生代码块语法
4. **目录导航**：自动生成 TOC 链接

### HTML 报告（仅按需生成）

如果用户明确要求生成 HTML 格式报告，使用专业模板：
- 配色：暗色系护眼（`#1a1a2e` 背景）
- 字体：Inter + JetBrains Mono
- 图表：Mermaid.js CDN
- 响应式：支持移动端

---

## 图表生成规范（opt-in）

- **默认行为**: 写软件图表用 Mermaid 语法在 markdown 里**直接出 ` ```mermaid ` 代码块**
- **触发渲染**：用户明确说"画图"、"render"、"出图"时才渲染

---

## Bash 命令规范

- 所有 Bash 命令默认自动批准执行
- 危险操作（删除、强制推送等）需用户确认

---

## 结论溯源规则

每次回答必须包含来源标注：

```
[结论溯源]
- 使用的模型: <具体模型名称>
- 知识来源:
  - 源码: <具体文件路径或 URL>
  - 本地代码: <本地文件路径>:行号
- 置信度: 高/中/低
- 验证方式: 实测/推断
```

---

## 知识沉淀规范

**自动触发条件**：
1. 深度分析了代码实现机制（超过 3 个源文件）
2. 回答了架构/设计模式相关问题
3. 用户明确要求沉淀

**沉淀流程**：
1. 判断项目是否有 `docs/exploration/` 目录
2. 创建编号文档（如 `10-xxx.md`）
3. 更新项目 `CLAUDE.md` 的知识库索引

---

## 大型探索任务管理规则

### 核心问题

| 问题 | 症状 | 根因 |
|------|------|------|
| 上下文窗口溢出 | 系统自动 compact | 并行 agent 输出分散 |
| 内容重复/遗漏 | 摘要不全 | 没有统一整合点 |
| 任务状态丢失 | 中断后不知道做到哪了 | 没有进度跟踪 |

### 强制规则

1. **并行任务完成后必须立即整合**：任何 Workflow / 并行 Agent 任务完成后，**第一个工具调用**必须是整合输出
2. **大文件分批读取**：超过 500 行的文件使用 `limit` + `offset` 参数
3. **任务进度跟踪**：使用 Task 工具标记 `in_progress` / `completed`
4. **中断恢复策略**：依赖会话摘要恢复工作

---

## 📐 Mermaid 图表检查规范 (强制)

**所有包含 Mermaid 图标的 `.md` 文件，在生成或修改后必须进行语法检查。**

### 检查规则

1. **禁止在 Mermaid 图节点标签中使用中文**：
   - ❌ `A[节点标签]` 或 `A[中文]` → 中文可能引起解析错误
   - ✅ 使用英文标签，或在外部文本中说明

2. **禁止在 Mermaid 图中使用圆括号 `()`**：
   - ❌ `C[定时器触发 (默认1小时)]` → 括号在 Mermaid 中是特殊字符
   - ✅ `C[Timer Trigger]`

3. **禁止在标签中使用竖线 `|` 作为普通字符**：
   - ❌ `A -->|"Socket|"| B` → 第二个 `|` 被解析为分隔符
   - ✅ `A -->|"Unix Socket"| B`

4. **subgraph 标签必须使用双引号**：
   - ✅ `subgraph "Group Name"`

5. **Mermaid 代码块必须正确闭合**：
   - 以 ` ```mermaid ` 开头，必须以 ` ``` ` 结尾
   - 中间不能有未闭合的代码块

### 自动化检查命令

```bash
# 检查 Mermaid 图中的中文（排除注释和普通文本）
awk '/^```mermaid$/{p=1; next} /^```$/{if(p){print; p=0}; next} p' <file>.md | grep -E '[一-鿿]'

# 检查 Mermaid 图中的圆括号
awk '/^```mermaid$/{p=1; next} /^```$/{if(p){print; p=0}; next} p' <file>.md | grep '\[.*(.*).*\]'

# 检查竖线语法
grep -n 'Socket|' <file>.md
```

### 常见错误修复

| 错误类型 | 错误示例 | 正确写法 |
|----------|----------|----------|
| 中文标签 | `A[启动]` | `A[Start]` |
| 括号 | `B[定时(默认)]` | `B[Timer Default]` |
| 竖线 | `-->|"A|B"|` | `-->|"A or B"|` |
| subgraph | `subgraph 中文` | `subgraph "Chinese"` |

---

## 禁止事项

- 禁止省略知识来源标注
- 禁止在未经验证的情况下，对可能过时的知识做出确定性表述
- 禁止在回答深度技术问题后不进行知识沉淀（除非用户明确拒绝）
