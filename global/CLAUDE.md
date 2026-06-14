# Claude Code 全局配置

## 知识输出规范

- 知识来源必须标注：`[知识来源: 训练数据]` 或 `[知识来源: Web搜索 - "关键词"]`
- 涉及新技术/框架/版本时必须 Web 搜索
- Android 内部实现 → 参考 `memory/android.md`

### Android 技术问题（强制 4 引擎并行 + AOSP master 交叉验证）

所有 Android 相关问题（ART / framework / native / Java 层 / 系统服务 / GC / dex / oat / Runtime / Class / Object / String / 堆内存 / 内存空间 / 线程 / 类加载 等）**必须**按以下流程产出结论，不允许单凭训练数据回答：

**Step 1 — 4 引擎并行 Web 搜索**（必须全部调用，不允许省略）
- `mcp__serper__google_search` —— 官方文档、权威博客（Luoshengyang / Mark Allison / Android Code Search / 官方 source.android.com）
- `mcp__ddg-search__search` —— 开发者社区、Stack Overflow、Reddit、Hacker News
- `mcp__tavily__tavily_search` —— 学术论文、技术深度文章、search_depth=`advanced`
- `mcp__MiniMax__web_search` —— 中文社区（CSDN / 知乎 / 博客园），弥补国内 ART 源码分析文章

**Step 2 — AOSP master 分支源码交叉验证**（必须）
- 对涉及字段名、常量值、类结构、方法签名、继承关系的描述，**必须**用 WebFetch / fetch_content 抓 AOSP master 分支对应路径：
  - `https://android.googlesource.com/platform/art/+/master/<path>` —— 主仓
  - `https://cs.android.com/android/platform/superproject/+/master:art/<path>` —— Android Code Search（带行号）
  - `https://source.android.com/source/` —— 文档侧
- 抓取后核对：字段名拼写、常量数值、继承层次、API 是否已废弃/重命名
- **禁止**用训练数据中的"我猜的字段名"（如 `large_object_maps_` / `region_bitmap_`）直接作答——必须以 AOSP 源码中的实际 getter / 字段为准（如 `GetLiveBitmap()` / `GetMarkBitmap()`）

**Step 3 — 信息整合与置信度标注**
- AOSP 源码命中 = 强证据，直接采纳
- 4 引擎全部命中 = 强证据，直接采纳
- 4 引擎部分命中（1-3 个）= 需在结论后加 `[置信度: 中]` 并指出分歧点
- 4 引擎全部未命中 = 需明确标 `[知识来源: 训练数据，未交叉验证]` 并降级为"经验性描述"
- 涉及**版本/设备相关常量**（如 `kLargeObjectThreshold`、Region 大小）：**只能写范围/典型值**，不允许写绝对值

**Step 4 — 输出格式**
- 答案末尾附"知识来源"小节，列出本次实际调用的 4 引擎 query + AOSP 源码 URL
- 任何被推翻的训练数据假设，必须显式声明（如"我之前猜测 X，源码验证后正确为 Y"）

**反例（必须避免）**：
- ❌ 只调 1-2 个 Web 搜索就开始写答案
- ❌ 训练数据里记得的字段名直接写、不去 AOSP 验证
- ❌ "通常 ~12KB" 写成 "是 12KB"
- ❌ 一次回答里混杂"训练数据结论"和"搜索结论"而不区分

**正例模板**：
```
[知识来源: Web 搜索 - "ART Heap ContinuousSpace DiscontinuousSpace"]
[知识来源: AOSP master - android.googlesource.com/platform/art/+/master/runtime/gc/heap.cc]
[置信度: 高]
```

## Web 搜索规范

**强制规则：所有 Web 搜索必须多引擎并行，确保信息准确性和全面性**

### 核心引擎配置（4 个必须并行调用）

1. **`mcp__serper__google_search`** - Google 搜索（权威性、官方文档）
2. **`mcp__ddg-search__search`** - DuckDuckGo（隐私友好、开发者社区）
3. **`mcp__tavily__tavily_search`** - Tavily（技术深度、学术论文）
4. **`mcp__MiniMax__web_search`** - MiniMax（中文内容优化）

### 注意事项

- ❌ **不使用 `WebSearch`（Claude Code 内置）**
  - 原因：当前环境设置了 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
  - 该环境变量禁用了 WebSearch/WebFetch 功能
  - 如需启用：`unset CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 后重启会话
- ✅ **MCP 工具更可靠**：直连搜索 API，不依赖 Anthropic 后端
- ✅ **四引擎并行**：覆盖面更广，结果更准确

### 调用模板

```xml
<function_calls>
<invoke name="WebSearch">
<parameter name="query">搜索关键词

## 图表生成规范（opt-in: 仅当用户明确要求出图时才渲染）

- **默认行为**: 写软件图表用 Mermaid 语法在 markdown 里**直接出 ` ```mermaid ` 代码块**, 不做 PNG 渲染, 不弹浏览器。
  - 用户拿到的是可复制 / 可改的源代码, **而不是图片**
  - **除非用户在 prompt 里明确说要"画图" / "生成图" / "render" / "出图" / "给我看图" / "show diagram" / "可视化" / "画一下"**, 否则**只输出代码块**
- **触发渲染的明确信号**（任一即触发, **必须出现在用户 prompt 里**, 不能自我授权）:
  - "画图" / "画一下" / "出个图" / "生成图" / "render" / "show diagram" / "可视化" / "画个图给我看"
  - "在浏览器看" / "弹图" / "把图打开" / "show me the image"
  - "PNG" / "截图" / "导出图片"
  - **任何**用户 prompt 末尾的 "画图" / "出图" / "render this" / "可视化" 后缀
- **绝不触发的反例**:
  - 用户只问"是什么 / 为什么 / 怎么走 / 区别" → **不**渲染, 只给文字 + 代码块
  - 用户重复同样的问题 → **不**渲染 (除非本轮明确说"画图")
  - 我自己回复里说"画图" → **不**自我授权
- **一旦触发**: 流程跟之前一样 — mermaid 代码块同步 Write 到 `/tmp/mermaid-auto/<ISO>-<n>.md`, hook 接管, 浏览器自动打开
- **关键: hook 只监听 Write/Edit/MultiEdit/NotebookEdit**,不会因为 markdown 文本里出现 ` ```mermaid ` 就自动触发。因此**每段 mermaid 都要同步用 Write 工具写一个临时文件**,hook 才会接管渲染:
  - 文件路径:`/tmp/mermaid-auto/<ISO 时间戳>-<n>.md`
  - 内容: ``` ```mermaid\n<diagram>\n``` ``` (只放这一段 mermaid)
  - 写完后,回复里仍要保留原始 mermaid 代码块 (供人复制),但**额外**这步 Write 是触发渲染的唯一手段
  - 例: `Write /tmp/mermaid-auto/2026-06-13T21-50-00-1.md` 内容只含一段 mermaid 块
- **Mermaid 源码安全写法**（避免 mmdc 解析失败 —— 4 类踩过的坑）:
  1. **节点文本 (`[xxx]`) 禁用保留字符**: `,` `[` `]` `(` `)` `{` `}` `\|` —— 会被 mermaid 解析器当成分隔符/属性。
     - ❌ `A[live_bitmap_<br/>1 bit = 8 B]` (内部 `=` 不算保留,但行内 `<br/>` 加上 `,` 会让 AST 错位)
     - ❌ `R[[addr, addr+size)]` (cylinder 节点 + 逗号 = 解析失败)
     - ❌ `A[obj 首地址 (klass_ 字段)]` (括号 = 圆角节点触发)
     - ✅ `A[obj 首地址 klass_ 字段]` / `B[1 bit 等于 8 B]` / `R[区间: addr 到 addr+size]`
  2. **classDef 名称 / `:::xxx` class 名禁用关键字**: mermaid 在 flowchart 模式里 `end` `subgraph` `class` `default` `direction` `graph` 等是保留 token,用作名字会触发 `got 'end'` 错误。
     - ❌ `classDef end fill:#...` / `AA["..."]:::end`
     - ✅ `classDef stop fill:#...` / `AA["..."]:::borderend`
  3. **形状语法含内部逗号时禁用**: `[/.../]` (parallelogram) `[\...\]` (alt parallelogram) `[(...)]` (cylinder) `[(\...\)]` —— 只要文本里含 `,` 就会和 shape 语法冲突。
     - ❌ `R[[addr, addr+size)]` / `R[/[addr, addr+size)/]`
     - ✅ 直接用矩形 `R[区间: addr 到 addr+size]`
  4. **subgraph 标签 (`subgraph ID["..."]`) 禁用括号**: `subgraph Space["连续空间 (begin_..end_)"]` 同样会失败。
     - ✅ `subgraph Space["连续空间 begin_ 到 end_"]`
- 详细规范 + 4 类坑的真实错误信息 → `memory/mermaid.md`
- 工作机制（实现细节，便于排查）：
  1. `settings.json` 注册了 `PostToolUse` hook，matcher 为 `Write|Edit|MultiEdit|NotebookEdit`。
  2. hook 脚本扫描工具入参里的 `content` / `new_string` / `new_source` 文本，提取所有 ` ```mermaid ... ` fenced block，写到 `/tmp/mermaid-render/m_<hash>_<n>.mmd`。
  3. 对每个 `.mmd` 调用 `npx -p @mermaid-js/mermaid-cli@latest mmdc -i ... -o ...png -p puppeteer.json -b transparent -q --scale ${MERMAID_SCALE:-2}` 渲染为 PNG (默认 scale=2, HiDPI 友好)。
  4. 渲染成功后**默认**:把所有 PNG 嵌入一个 HTML 页面, 在浏览器中打开 (按顺序探测 `$CHROME_PATH` → `~/.cache/puppeteer/chrome/.../chrome` → `~/.cache/ms-playwright/.../chrome` → `google-chrome` / `chromium` / `firefox` → `xdg-open` / `open` / `gio` / `wslview`)。**这个路径是默认**,因为它在任何 TTY / OS / 终端能力下都能工作。
  5. **HTML 里有缩放按钮** (右上角: − / 1× / 1.5× / 2× / 3×), 点哪个哪个就 CSS scale 放大 (不重新渲染)。
  6. **渲染失败时**: hook 不会静默忽略,会把 .mmd 源码和 mmdc 错误日志**内嵌进 HTML 的红色错误框** (按图序号对齐),用户能直接在浏览器看到失败原因。回复里**也要显式说明**第几张图失败、错误关键字。
  7. hook 始终 `exit 0`，失败不阻塞 agent。
- 环境变量旋钮:
  - `MERMAID_SCALE=N` (1..8, **默认 2**) —— mmdc 像素放大倍率。
    - 1: 普通 1080p 屏幕, 1:1 显示
    - 2 (默认): 普通 1080p + 偶尔缩放, 性价比最高
    - 3: HiDPI 笔记本 (Retina / 2K 屏) + 想放大看细节
    - 4: 大屏 4K 或多张图并排
    - 5-8: 极少用, 体积大、慢
  - `MERMAID_HTML=0` —— 关闭 HTML 生成, 改为走终端直显路径
  - `MERMAID_TERM=1` —— (与 HTML 互斥) 终端直显: `timg -ph --color8` (256 色 ANSI) → `chafa` → `viu` → `img2sixel` → `catimg` → `npx -p picture-tube` 兜底
  - `MERMAID_BROWSER=0` —— 不调用任何浏览器 / 看图软件, 只生成文件
  - `CHROME_PATH=/path/to/chrome` —— 强制指定 Chrome 路径
- 失败兜底：若 hook 没生效或 mmdc 缺失，回复里必须**显式说明**并给出可执行命令（`npx -p @mermaid-js/mermaid-cli mmdc -i x.mmd -o x.png` + 用 Chrome 直接打开: `~/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome --new-window file://<png 路径>`），不得静默忽略。

## Bash 命令规范

- 所有 Bash 命令默认自动批准执行
- 危险操作（删除、强制推送等）需用户确认

## 知识沉淀规范

**自动触发条件**（满足任一即触发）：
1. 深度分析了代码实现机制（超过 3 个源文件）
2. 回答了架构/设计模式相关问题
3. 解释了复杂的技术流程（包含流程图/时序图）
4. 用户明确要求沉淀知识

**沉淀流程**：
1. 判断项目是否有 `docs/exploration/` 目录
   - 有：创建编号文档（如 `10-xxx.md`）
   - 无：询问用户是否创建知识库目录
2. 文档格式：
   - 标题：`# [主题] 详解`
   - 章节：问题背景 → 核心流程 → 实现细节 → 应用场景 → 总结
   - 包含：代码示例、流程图、关键数据结构
3. 更新项目 `CLAUDE.md` 的知识库索引
4. 告知用户：`✅ 知识已沉淀至 docs/exploration/XX-xxx.md`

**特殊规则**：
- 简单问答（单文件查看、命令帮助）不沉淀
- 多轮对话结束后，主动询问是否需要沉淀
- 用户说"不要沉淀"或"skip"时跳过

## 禁止事项

- 禁止省略知识来源标注
- 禁止在未经 Web 搜索验证的情况下，对可能过时的知识做出确定性表述
- 禁止在回答深度技术问题后不进行知识沉淀（除非用户明确拒绝）
