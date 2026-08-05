# Linux MM 初级工程师指南 - 实现计划

## 目标
生成一份面向初级工程师的 Linux MM (Memory Management) 技术文档，强调 What-How-Why 教学原则。

## 输出文件
`/home/cwtrocks/linux/docs/linux-mm-beginner-guide.html`

---

## HTML 报告结构

### 整体架构
- **固定导航栏**: Logo + 章节锚点链接
- **8 个章节**: 全景图 → 5 个核心模块 → 模块关系 → 学习路线
- **深色主题 CSS**: 减少眼睛疲劳
- **14 张 Mermaid 图表**: 架构图、流程图、时序图

### 章节大纲

```
┌─────────────────────────────────────────────────────────────┐
│  固定导航栏: [Logo] [VMA] [Buddy] [PageCache] [SLUB] [VMScan] [总结]  │
└─────────────────────────────────────────────────────────────┘

Chapter 1: Linux MM 全景图
├── 模块依赖关系总览图
└── 学习路线预览

Chapter 2: VMA (虚拟内存区域)
├── What: VMA 是什么，解决什么问题
├── How: vm_area_struct 数据结构 + mmap 流程 + Maple Tree
├── Why: 为什么要用 VMA 而非直接映射物理页
└── 实战: /proc/PID/maps 调试

Chapter 3: Buddy System 页面分配器
├── What: 页面分配器职责，Buddy System 概念
├── How: 算法原理图 + 分配/回收流程
├── Why: 优缺点分析，碎片问题
└── 实战: /proc/buddyinfo + 水印机制

Chapter 4: 页缓存机制
├── What: 什么是页缓存，为什么需要
├── How: address_space + XArray + Page Fault 处理
├── Why: 性能优化原理
└── 实战: drop_caches + free 命令

Chapter 5: SLUB 对象分配器
├── What: 内核小对象分配，vs SLAB/SLOB
├── How: per-CPU sheaves + kmem_cache 架构
├── Why: 锁竞争优化
└── 实战: slabtop + slabinfo

Chapter 6: 内存回收 (VMScan)
├── What: LRU 链表 + kswapd 机制
├── How: Active/Inactive 链表 + 扫描流程
├── Why: 冷热页面区分，MGLRU
└── 实战: vmstat + swappiness 调优

Chapter 7: 模块间关系
└── 完整调用链图，展示模块如何协同

Chapter 8: 学习路线图
└── 入门/进阶/精通三阶段建议
```

---

## Mermaid 图表清单 (14 张)

| 图表 | 类型 | 内容 |
|------|------|------|
| 1 | flowchart | Linux MM 全局架构图 |
| 2-1 | flowchart | mm_struct 和 VMA 关系图 |
| 2-2 | sequenceDiagram | mmap 系统调用时序图 |
| 3-1 | flowchart | Buddy 伙伴关系示意图 |
| 3-2 | flowchart | 分配流程状态机 |
| 4-1 | flowchart | address_space 和 XArray 结构 |
| 4-2 | flowchart | Page Fault 处理流程图 |
| 5-1 | flowchart | SLUB 整体架构图 |
| 5-2 | sequenceDiagram | 分配快速路径时序图 |
| 6-1 | flowchart | LRU 链表结构图 |
| 6-2 | sequenceDiagram | kswapd 工作流程图 |
| 7-1 | flowchart | 模块依赖关系总图 |

---

## 教学要点总结框模板

每章结尾统一格式：

```html
<div class="teaching-summary">
  <h3>📚 [模块名] 核心要点</h3>
  <ul>
    <li>✅ 要点 1</li>
    <li>✅ 要点 2</li>
    <li>✅ 要点 3</li>
  </ul>
</div>
```

---

## CSS 深色主题设计

```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-code: #21262d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-purple: #a371f7;
  --border: #30363d;
}
```

---

## 关键设计决策

| 决策 | 理由 |
|------|------|
| 深色主题 | 减少眼睛疲劳，适合长时间阅读代码 |
| What-How-Why 结构 | 符合教学认知规律 |
| Mermaid 图表 | 代码可控、可复制，无需外部图片 |
| 源码路径标注 | 帮助读者定位实际代码 |
| 每章实战部分 | 增强实用性，立即可调试 |
| 固定导航栏 | 方便快速跳转 |

---

## 参考文档（已生成）

1. `/home/cwtrocks/linux/docs/VMA-BEGINNER-GUIDE.md` - VMA 详解
2. `/home/cwtrocks/linux/docs/buddy-system-tutorial.md` - Buddy System
3. `/home/cwtrocks/linux/docs/linux-pagecache-guide.md` - 页缓存
4. `/home/cwtrocks/linux/drivers/android/docs/vmscan-memory-reclaim-guide.html` - 内存回收
5. `/home/cwtrocks/linux/drivers/android/docs/slub-allocator-tutorial.md` - SLUB

---

## 实现步骤

1. **读取参考文档** - 从已生成的模块分析中提取核心内容
2. **编写 HTML 结构** - 8 个章节 + 固定导航
3. **编写 CSS 样式** - 深色主题
4. **编写 Mermaid 图表** - 14 张图表
5. **整合内容** - 每章包含 What-How-Why + 实战
6. **测试渲染** - 确保 Mermaid 图表正确显示

---

## 验证方式

1. 生成 HTML 文件后，在浏览器中打开
2. 检查所有 Mermaid 图表是否正确渲染
3. 验证导航锚点链接是否生效
4. 检查各章节内容是否完整
