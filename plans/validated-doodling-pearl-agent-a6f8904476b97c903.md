# Linux MM 子系统 HTML 报告实现计划

> 目标：面向初级工程师的 What-How-Why 教学报告
> 输出路径：`/home/cwtrocks/linux/docs/linux-mm-beginner-guide.html`
> 参考文档：VMA-BEGINNER-GUIDE.md, buddy-system-tutorial.md, linux-pagecache-guide.md, slub-allocator-analysis.md, vmscan-memory-reclaim-guide.html
>
> **新增：Linux 背景知识章节** - 涵盖虚拟内存、NUMA/UMA、内存管理发展历史等基础概念

---

## 一、HTML 结构大纲

### 1.1 整体架构（更新版）

```
<!DOCTYPE html>
├── <head>
│   ├── Mermaid.js CDN
│   ├── Google Fonts (Noto Sans SC)
│   ├── CSS 样式（深色主题）
│   └── Mermaid 初始化配置
│
├── <body>
│   ├── #navbar (固定顶部导航)
│   ├── #hero (开篇全景图)
│   ├── #toc (目录)
│   │
│   ├── Chapter 0: Linux MM 背景知识 ★ 新增
│   │   ├── 什么是操作系统内存管理
│   │   ├── 虚拟内存发展历史
│   │   ├── NUMA vs UMA 架构
│   │   ├── 物理内存与虚拟内存的关系
│   │   └── Linux 内存管理设计哲学
│   │
│   ├── Chapter 1: Linux MM 全景图
│   │   └── 模块依赖关系总览
│   │
│   ├── Chapter 2: VMA (虚拟内存区域)
│   │   ├── What - 什么是 VMA
│   │   ├── How - 数据结构和工作原理
│   │   ├── Why - 设计考量
│   │   └── 实战 - mmap 系统调用
│   │
│   ├── Chapter 3: Buddy System 页面分配器
│   │   ├── What - 页面分配器职责
│   │   ├── How - Buddy 算法详解
│   │   ├── Why - 优缺点分析
│   │   └── 实战 - 分配/释放流程
│   │
│   ├── Chapter 4: 页缓存机制
│   │   ├── What - 页缓存概念
│   │   ├── How - address_space 和 XArray
│   │   ├── Why - 为什么需要页缓存
│   │   └── 实战 - Page Fault 处理
│   │
│   ├── Chapter 5: SLUB 对象分配器
│   │   ├── What - SLUB 是什么
│   │   ├── How - per-CPU sheaves
│   │   ├── Why - vs SLAB/SLOB
│   │   └── 实战 - 分配/释放流程
│   │
│   ├── Chapter 6: 内存回收 (VMScan)
│   │   ├── What - 什么是内存回收
│   │   ├── How - LRU 链表机制
│   │   ├── Why - 冷热页面区分
│   │   └── 实战 - kswapd 和调优
│   │
│   ├── Chapter 7: 模块间关系
│   │   └── 完整调用链图
│   │
│   ├── Chapter 8: 常见问题与调试 ★ 新增
│   │   ├── OOM Killer 原理
│   │   ├── 内存泄漏检测
│   │   └── 碎片化问题
│   │
│   ├── Chapter 9: 学习路线图
│   │   └── 从入门到精通
│   │
│   └── #footer
│       └── 参考资料和源码路径
```

### 1.2 导航结构

```
固定顶部导航栏：
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] Linux MM 指南    [VMA] [Buddy] [PageCache] [SLUB] [VMScan] [总结] │
└─────────────────────────────────────────────────────────────────┘

锚点链接：
#vma          → 第 2 章
#buddy        → 第 3 章
#pagecache    → 第 4 章
#slub         → 第 5 章
#vmscan       → 第 6 章
#relationship → 第 7 章
#roadmap      → 第 8 章
```

---

## 二、每个章节的内容要点

### Chapter 0: Linux MM 背景知识 ★ 新增

**目标**：为初级工程师补充操作系统内存管理的基础概念，建立完整的知识背景

**0.1 什么是操作系统内存管理**

操作系统内存管理承担以下核心职责：

| 职责 | 说明 | 解决的问题 |
|------|------|-----------|
| **内存分配** | 为进程和内核分配内存区域 | 程序需要内存时如何获取 |
| **内存回收** | 释放不再使用的内存 | 内存有限，如何复用 |
| **地址转换** | 虚拟地址到物理地址的映射 | 程序如何使用大于物理内存的空间 |
| **内存保护** | 隔离不同进程的内存 | 进程间如何互不干扰 |
| **内存共享** | 支持共享内存机制 | 如何让进程共享数据 |

**直接使用物理内存的问题**：

```
问题 1: 地址空间碎片化
┌──────────────────────────────────────────────────────┐
│ 进程 A    进程 B    进程 C    进程 D                  │
│ [0-1MB] [2-3MB] [5-6MB] [8-9MB]                    │
│                                                      │
│ 如果进程 E 需要 4MB 连续空间？                       │
│ 需要移动其他进程，或等待内存整理                      │
└──────────────────────────────────────────────────────┘

问题 2: 内存保护困难
┌──────────────────────────────────────────────────────┐
│ 进程 A 的数据可能被进程 B 覆盖                       │
│ 无法限制进程的内存使用量                             │
└──────────────────────────────────────────────────────┘

问题 3: 程序地址不确定
┌──────────────────────────────────────────────────────┐
│ 程序编译时无法确定实际加载地址                       │
│ 需要复杂的链接器重定位                               │
└──────────────────────────────────────────────────────┘

虚拟内存的解决方案：
┌──────────────────────────────────────────────────────┐
│ 每个进程看到连续的 0x00000000 - 0xFFFFFFFF          │
│ 内核负责 VA → PA 的映射                            │
│ 进程间完全隔离                                       │
└──────────────────────────────────────────────────────┘
```

**0.2 虚拟内存发展历史**

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           虚拟内存技术演进                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ 1960s  │ 分页概念提出                                                     │
│        │ IBM 推出分页系统                                                 │
│        ▼                                                                   │
│ 1974  │ Morris 论文提出现代分页                                          │
│        │ 多个进程共享物理内存                                             │
│        ▼                                                                   │
│ 1985  │ Intel 80386 实现硬件分页                                          │
│        │ 32 位线性地址空间                                                │
│        ▼                                                                   │
│ 1991  │ Linux 0.01 诞生                                                  │
│        │ 仅支持 386，无分页                                               │
│        ▼                                                                   │
│ 1992  │ Linux 0.95                                                      │
│        │ 引入 vmalloc                                                    │
│        ▼                                                                   │
│ 1996  │ Linux 2.0                                                       │
│        │ 支持多处理器 (SMP)                                              │
│        ▼                                                                   │
│ 2003  │ Linux 2.6                                                       │
│        │ O(1) 调度器                                                     │
│        │ SLUB 分配器引入                                                 │
│        ▼                                                                   │
│ 2007  │ VM 子系统大规模重构                                              │
│        │ Reverse Mapping (rmap)                                          │
│        ▼                                                                   │
│ 2011  │ Linux 3.0+                                                      │
│        │ Transparent HugePages (THP)                                     │
│        ▼                                                                   │
│ 2022  │ Linux 6.1                                                       │
│        │ Multi-Gen LRU (MGLRU)                                          │
│        ▼                                                                   │
│ 2024  │ Linux 6.6+                                                      │
│        │ Maple Tree 替换 Red-Black Tree                                  │
│        │ Rust 内存管理模块探索                                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**0.3 NUMA vs UMA 架构**

UMA (Uniform Memory Access) 架构：
```
┌────────────────────────────────────────────────────┐
│                     系统总线                        │
│         ┌─────────┬─────────┬─────────┐            │
│         │  CPU 0  │  CPU 1  │  CPU 2  │            │
│         └─────────┴─────────┴─────────┘            │
│                    │                                │
│         ┌─────────┴─────────┐                      │
│         │    统一内存       │                      │
│         │  (所有 CPU 相同   │                      │
│         │   访问延迟)       │                      │
│         └─────────────────┘                      │
└────────────────────────────────────────────────────┘

特点：
- 所有 CPU 访问内存延迟相同
- 总线带宽是瓶颈
- 适合少量 CPU (< 8)
- 示例：早期 x86 服务器
```

NUMA (Non-Uniform Memory Access) 架构：
```
┌────────────────────────────────────────────────────────────┐
│                    互连网络 (QPI/UPI)                      │
│    ┌─────────────────┬─────────────────┬─────────────────┐ │
│    │     Node 0      │     Node 1       │     Node 2      │ │
│    │  ┌───────────┐  │  ┌───────────┐  │  ┌───────────┐  │ │
│    │  │  CPU 0,1  │  │  │  CPU 2,3  │  │  │  CPU 4,5  │  │ │
│    │  └─────┬─────┘  │  └─────┬─────┘  │  └─────┬─────┘  │ │
│    │        │        │        │        │        │        │ │
│    │  ┌─────┴─────┐  │  ┌─────┴─────┐  │  ┌─────┴─────┐  │ │
│    │  │ 本地内存  │  │  │ 本地内存  │  │  │ 本地内存  │  │ │
│    │  │  延迟=50ns│  │  │ 延迟=50ns │  │  │ 延迟=50ns │  │ │
│    │  └───────────┘  │  └───────────┘  │  └───────────┘  │ │
│    │        │        │        │        │        │        │ │
│    │        └────────┼────────┼────────┼────────┘        │ │
│    │                 │ 远程访问延迟=150ns                    │ │
│    └─────────────────┴─────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

特点：
- 每个节点有本地内存和远程内存
- 本地访问快于远程访问
- 适合大量 CPU
- 现代服务器标配
```

Linux NUMA 支持：
```bash
# 查看 NUMA 拓扑
numactl --hardware

# 查看内存分布
cat /proc/self/numa_maps

# 设置 NUMA 策略
numactl --membind=0 -- cpulimit=0 ./my_program
```

**0.4 物理内存与虚拟内存的关系**

地址类型对照表：

| 类型 | 全称 | 说明 | 示例 |
|------|------|------|------|
| VA | Virtual Address | 进程看到的地址 | 0x7fff12345678 |
| PA | Physical Address | 硬件物理地址 | 0x12345678 |
| MA | Bus Address | 总线地址 (设备 DMA) | 0xFED00000 |
| GPA | Guest Physical Address | 虚拟机物理地址 | 虚拟机内 |
| HVA | Host Virtual Address | 宿主机虚拟地址 | 宿主机内 |
| HPA | Host Physical Address | 宿主机物理地址 | 实际硬件 |

**32 位 vs 64 位系统地址空间**：

```
32 位系统 (4GB 虚拟空间)：
┌────────────────────────────────────────────────────────────────┐
│ 0xFFFFFFFF ────────────────────────────────────────────────── │ 高地址
│                                                                │
│                      内核空间 (1GB)                            │
│                 0xC0000000 - 0xFFFFFFFF                       │
│                                                                │
│ ───────────────────────────────────────────────────────────── │
│                                                                │
│                      用户空间 (3GB)                            │
│                 0x00000000 - 0xBFFFFFFF                       │
│                                                                │
│ 0x00000000 ────────────────────────────────────────────────── │ 低地址
└────────────────────────────────────────────────────────────────┘

64 位系统 (256TB 实际使用)：
┌────────────────────────────────────────────────────────────────┐
│ 0xFFFFFFFFFFFFFFFF ────────────────────────────────────────── │ 高地址
│                                                                │
│                      内核空间 (128TB)                          │
│         0xFFFF800000000000 - 0xFFFFFFFFFFFFFFFF                │
│                                                                │
│ ───────────────────────────────────────────────────────────── │
│                                                                │
│                      未使用 (16EB - 256TB)                     │
│              0x0000800000000000 - 0xFFFF7FFFFFFFFFFF            │
│                                                                │
│ ───────────────────────────────────────────────────────────── │
│                                                                │
│                      用户空间 (128TB)                          │
│         0x0000000000000000 - 0x00007FFFFFFFFFFF                │
│                                                                │
│ 0x0000000000000000 ────────────────────────────────────────── │ 低地址
└────────────────────────────────────────────────────────────────┘
```

**页表转换过程**：

```
虚拟地址 (VA) 格式 (以 4KB 页、4 级页表为例)：

┌──────────────────────────────────────────────────────────────┐
│ 63        |  48  |  47      |  39      |  30      |  21      |  12     |  0 │
│ ──────────┴──────┴───────────┴──────────┴──────────┴──────────┴─────────┴────│
│    PGD     │   PUD      │    PMD      │    PTE      │   Offset           │
│   (页全局)  │  (页上级)   │  (页中间)   │  (页表项)    │                   │
│    9位     │    9位      │    9位      │    9位      │    12位            │
└──────────────────────────────────────────────────────────────┘

转换过程：

1. CPU 获取 CR3 寄存器（指向 PGD）
         │
         ▼
2. PGD[VA[47:39]] → 获取 PUD 页表地址
         │
         ▼
3. PUD[VA[38:30]] → 获取 PMD 页表地址
         │
         ▼
4. PMD[VA[29:21]] → 获取 PTE 页表地址
         │
         ▼
5. PTE[VA[20:12]] → 获取物理页框号 (PFN)
         │
         ▼
6. PA = PFN << 12 | VA[11:0]  (加上页内偏移)
```

**TLB (Translation Lookaside Buffer)**：

```
┌─────────────────────────────────────────────────────────────┐
│                         TLB 工作原理                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  VA → MMU → PA                                              │
│          │                                                  │
│          ├──→ TLB 命中 → 直接获取 PFN → PA (快速)           │
│          │                                                  │
│          └──→ TLB 未命中 → 遍历页表 → 更新 TLB → PA         │
│                              (慢速，数百周期)                │
│                                                              │
│ TLB 特性：                                                   │
│ - CPU 内置，访问延迟 ~1 周期                                 │
│ - 容量有限 (64-512 条目)                                    │
│ - 命中断言 > 99%                                            │
│ - 上下文切换时需要刷新 (或使用 PCID)                        │
│                                                              │
│ 相关命令：                                                   │
│ # 刷新 TLB                                                  │
│ echo 3 > /proc/sys/vmdrop_caches                            │
│ invlpg <addr>    # 失效单条 TLB                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**0.5 Linux 内存管理设计哲学**

Linux MM 子系统的核心设计原则：

| 原则 | 说明 | 示例 |
|------|------|------|
| **页面缓存优先** | 尽可能用内存缓存磁盘数据 | Page Cache 缓存所有文件读取 |
| **延迟分配** | 推迟实际物理内存分配 | mmap 不立即分配页 |
| **按需分页** | 缺页时才分配 | 首次访问触发 Page Fault |
| **内存超量分配** | 允许分配超过实际内存 | /proc/sys/vm/overcommit_memory |
| **页面回收** | 自动回收不常用页面 | VMScan LRU 扫描 |

**Linux vs Windows 的设计差异**：

```
┌─────────────────────────────────────────────────────────────┐
│                    Linux                    │     Windows     │
├─────────────────────────────────────────────┼────────────────┤
│ 页面缓存                                     │ 文件缓存       │
│ (所有文件 I/O 都经过 Page Cache)             │ (分开管理)      │
├─────────────────────────────────────────────┼────────────────┤
│ Buddy System                                 │ 分页池         │
│ (统一物理页分配)                             │ (分页/非分页)  │
├─────────────────────────────────────────────┼────────────────┤
│ slab/slub 分配器                            │ 堆管理器       │
│ (内核对象池)                                 │                │
├─────────────────────────────────────────────┼────────────────┤
│ 主动回收 (kswapd)                           │ 按需回收       │
│ (后台持续扫描)                               │ (紧张时回收)   │
├─────────────────────────────────────────────┼────────────────┤
│ 透明大页 (THP)                              │ 拉取大页       │
│ (自动管理)                                   │ (手动配置)     │
└─────────────────────────────────────────────┴────────────────┘
```

**0.6 关键概念速查表**

| 概念 | 全称 | 解释 |
|------|------|------|
| PFN | Page Frame Number | 物理页号，PA 高位 |
| PTE | Page Table Entry | 页表项，存储 PFN 和标志 |
| PGD | Page Global Directory | 顶级页表 |
| PUD | Page Upper Directory | 上层页表 (4级) |
| PMD | Page Middle Directory | 中间页表 (4级) |
| TLB | Translation Lookaside Buffer | MMU 的地址转换缓存 |
| CR3 | Control Register 3 | 指向 PGD 的寄存器 |
| PCID | Process Context Identifier | TLB 标签，避免上下文切换刷新 |
| MTRR | Memory Type Range Register | 内存类型范围寄存器 |
| PAT | Page Attribute Table | 页属性表 |

**内存区域 (Zone)**：

```
┌─────────────────────────────────────────────────────────────┐
│                     典型 x86-64 内存布局                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ZONE_DMA    │ 0 - 16MB                                     │
│              │ 早期设备的 ISA DMA 区域                       │
│              │ 现代系统基本不用                             │
│  ──────────────────────────────────────────────────────     │
│                                                              │
│  ZONE_DMA32  │ 0 - 4GB (部分)                              │
│              │ 仅 32 位设备可访问                           │
│              │ 64 位系统可同时访问 ZONE_NORMAL              │
│  ──────────────────────────────────────────────────────     │
│                                                              │
│  ZONE_NORMAL  │ 16MB - end                                  │
│              │ 内核直接映射的内存                           │
│              │ 高端内存以上的区域                           │
│  ──────────────────────────────────────────────────────     │
│                                                              │
│  ZONE_HIGHMEM │ (32 位系统专用)                             │
│               │ 内核无法直接映射的高端内存                  │
│               │ 64 位系统无此区域                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**教学要点总结框**：
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Linux MM 背景知识核心要点                                 │
├─────────────────────────────────────────────────────────────┤
│ ✅ 虚拟内存让程序看到连续地址空间，实际可能不连续            │
│ ✅ NUMA: 多节点架构，本地访问快于远程访问                   │
│ ✅ 页表实现 VA → PA 转换，TLB 加速                         │
│ ✅ Linux 设计哲学：缓存优先、延迟分配、按需分页            │
│ ✅ 内核空间 1GB (高 1GB)，用户空间 3GB (32 位)             │
│ ✅ 64 位系统理论支持 16EB，实际使用 48 位 (256TB)           │
└─────────────────────────────────────────────────────────────┘
```

---

### Chapter 1: Linux MM 全景图

**目标**：让读者建立整体概念，理解各模块的依赖关系

**内容要点**：
1. **模块概览表**
   - VMA: 虚拟地址空间管理
   - Buddy: 物理页分配
   - PageCache: 文件 I/O 缓存
   - SLUB: 小对象分配
   - VMScan: 内存回收

2. **依赖关系图**（Mermaid）
   ```
   用户进程
       ↓
   VMA (虚拟地址)
       ↓ (Page Fault)
   Buddy System (物理页)
       ↓
   SLUB (对象分配)
   PageCache (文件缓存)
       ↓
   VMScan (内存回收)
   ```

3. **一句话总结每个模块**
   - VMA: "把你的程序地址空间切成一块块来管理"
   - Buddy: "把物理内存切成 2^n 页的大块来分配"
   - PageCache: "把磁盘文件缓存在内存里"
   - SLUB: "把 Buddy 分的页切成小对象来分配"
   - VMScan: "当内存不够时，回收不常用的页面"

---

### Chapter 2: VMA (虚拟内存区域)

**What - 什么是 VMA**：
- VMA 是进程虚拟地址空间中一段**连续地址范围**的抽象
- 每个 VMA 有相同的属性（权限、文件映射等）
- 类比：就像租房子时签的合同，规定了一块区域的使用规则

**How - 核心机制**：
- `struct vm_area_struct` 数据结构图
- `struct mm_struct` 持有所有 VMA (Maple Tree)
- mmap 系统调用流程时序图
- VMA 合并/拆分示意图

**Why - 设计考量**：
- 为什么需要 VMA？（批量管理、按需分配、COW）
- 为什么用 Maple Tree？（RCU 安全、迭代器稳定）
- 为什么延迟映射？（节省内存）

**实战要点**：
- `/proc/PID/maps` 查看 VMA
- `cat /proc/self/maps` 示例
- 关键调试命令

**教学要点总结框**：
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 VMA 核心要点                                             │
├─────────────────────────────────────────────────────────────┤
│ ✅ VMA = 连续虚拟地址范围 + 统一属性                        │
│ ✅ mm_struct.mm_mt (Maple Tree) 存储所有 VMA               │
│ ✅ mmap 创建 VMA，但页表延迟建立                            │
│ ✅ 相邻同属性 VMA 会自动合并                                │
│ ✅ fork 后共享 VMA，写时复制 (COW)                          │
└─────────────────────────────────────────────────────────────┘
```

---

### Chapter 3: Buddy System 页面分配器

**What - 什么是 Buddy System**：
- 物理内存页面分配器
- 按 2 的幂次分配页面（1, 2, 4, 8...页）
- 相邻的等大块互为 "buddy"
- 释放时自动合并

**How - 核心算法**：
- `struct page` 和 `struct free_area` 数据结构
- buddy 计算公式: `buddy_pfn = page_pfn ^ (1 << order)`
- 分配流程：分裂大块
- 回收流程：合并小块
- 完整的分配/释放图解（ASCII 艺术）

**Why - 设计考量**：
- 优点：无内部碎片、分配高效、缓存友好
- 缺点：只能分配 2 的幂次、有外部碎片
- 迁移类型（MIGRATE_MOVABLE 等）防止碎片

**实战要点**：
- `cat /proc/buddyinfo` 查看空闲块
- 水印机制（min/low/high watermark）
- 内存压缩 (compaction)

**教学要点总结框**：
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Buddy System 核心要点                                     │
├─────────────────────────────────────────────────────────────┤
│ ✅ 按 2^n 页分配，buddy 块可自动合并                         │
│ ✅ free_area[order] 存储各阶空闲块链表                       │
│ ✅ 分配时分裂，释放时向上合并                                │
│ ✅ zone 概念：DMA/Normal/HighMem                            │
│ ✅ 迁移类型防止碎片：MOVABLE/UNMOVABLE/CMA                  │
└─────────────────────────────────────────────────────────────┘
```

---

### Chapter 4: 页缓存机制

**What - 什么是页缓存**：
- 磁盘文件数据在内存中的缓存
- 读文件时先加载到页缓存
- 后续读直接命中内存

**How - 核心机制**：
- `struct address_space` 数据结构
- XArray 索引结构（图示）
- read() 系统调用 → filemap_read() → XArray 查找
- Page Fault 处理：filemap_fault()
- COW 机制流程图

**Why - 设计考量**：
- 为什么需要页缓存？（磁盘比内存慢 100,000 倍）
- 为什么用 XArray？（高效、大 folio 支持）
- 为什么 COW？（fork 延迟复制）

**实战要点**：
- `cat /proc/meminfo | grep -E "^Cached|^SwapCached"`
- `echo 3 > /proc/sys/vm/drop_caches` 清除缓存
- `free -h` 查看内存使用

**教学要点总结框**：
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Page Cache 核心要点                                       │
├─────────────────────────────────────────────────────────────┤
│ ✅ address_space 持有 XArray 索引缓存页                      │
│ ✅ XArray key = 文件页偏移 (pgoff_t)                         │
│ ✅ folio = 缓存页容器 (可 > 4KB)                             │
│ ✅ Page Fault 时 filemap_fault() 加载数据                    │
│ ✅ COW: fork 后共享只读页，写时复制                           │
└─────────────────────────────────────────────────────────────┘
```

---

### Chapter 5: SLUB 对象分配器

**What - 什么是 SLUB**：
- 内核小对象分配器（kmalloc/slab allocator）
- 基于 Buddy System 分配的页面
- 特点：per-CPU sheaves、无锁快速路径

**How - 核心机制**：
- `struct kmem_cache` 缓存描述符
- `struct slab_sheaf` per-CPU 对象缓存
- 三层 sheaves: main + spare + rcu_free
- node_barn NUMA 平衡层
- 分配：alloc_from_pcs() 快速路径
- 释放：free_to_pcs() 快速路径
- 慢速路径：partial slab / new_slab

**Why - 设计考量**：
- vs SLAB: 简化设计、per-CPU sheaves
- vs SLOB: 支持 NUMA、减少碎片
- 为什么无锁？（cmpxchg_double）
- 为什么三层 sheaves？（避免锁竞争）

**实战要点**：
- `cat /proc/slabinfo` 查看缓存状态
- `slabtop` 实时监控
- 调试标志：slub_debug=FZP

**教学要点总结框**：
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 SLUB 核心要点                                             │
├─────────────────────────────────────────────────────────────┤
│ ✅ kmem_cache = 一种对象类型的分配器                         │
│ ✅ slab = 一组连续页面，存储多个对象                         │
│ ✅ per-CPU sheaves: main/spare/rcu_free 三层                 │
│ ✅ 分配优先从 main sheaves，无锁 LIFO                        │
│ ✅ main 空时从 node_barn 获取或分配新 slab                   │
└─────────────────────────────────────────────────────────────┘
```

---

### Chapter 6: 内存回收 (VMScan)

**What - 什么是内存回收**：
- 当可用内存不足时，释放不常用页面
- 防止 OOM killer 触发
- 基于 LRU 链表判断冷热页面

**How - 核心机制**：
- 双链表 LRU：Active + Inactive
- 四路 LRU：Anon/File × Active/Inactive
- 页面标志：PG_active、PG_referenced、PG_workingset
- kswapd 内核线程
- MGLRU（多代 LRU，Linux 6.1+）
- 扫描流程：shrink_active_list → shrink_inactive_list

**Why - 设计考量**：
- 为什么区分冷热页面？（保护工作集）
- 为什么需要 swap？（匿名页必须换出）
- swappiness 参数的作用

**实战要点**：
- `cat /proc/vmstat | grep -E "pgscan|pgsteal"`
- `cat /proc/zoneinfo` 查看水位
- `vm.swappiness` 调优
- `vm.min_free_kbytes` 调优

**教学要点总结框**：
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 VMScan 核心要点                                           │
├─────────────────────────────────────────────────────────────┤
│ ✅ LRU: Active 存热页面，Inactive 存冷页面                   │
│ ✅ 回收优先选择 Inactive 尾部（最不常用）                    │
│ ✅ kswapd 在后台扫描，维持 watermark                         │
│ ✅ PG_referenced 检测页面是否被访问过                        │
│ ✅ MGLRU 用多代替代两链表，更精确                            │
└─────────────────────────────────────────────────────────────┘
```

---

### Chapter 7: 模块间关系

**完整调用链图**（Mermaid sequenceDiagram）：
```
应用程序
    ↓ mmap()
VMA 创建（vm_area_struct + Maple Tree）
    ↓ 首次访问触发 Page Fault
Buddy System 分配物理页
    ↓
页表建立映射
    ↓
文件 I/O → PageCache (address_space + XArray)
    ↓
SLUB 分配内核对象
    ↓
VMScan 回收不常用页面
    ↓
Buddy System 合并释放的页面
```

**模块依赖矩阵**：
| 模块 | 依赖 | 被依赖 |
|------|------|--------|
| VMA | 页表 | 用户进程、SLUB |
| Buddy | 无（最底层）| VMA、SLUB、PageCache |
| PageCache | Buddy、VMA | VMScan |
| SLUB | Buddy | VMA、PageCache |
| VMScan | PageCache、Buddy | 所有模块 |

---

### Chapter 8: 常见问题与调试 ★ 新增

**目标**：帮助工程师解决实际内存问题

**8.1 OOM Killer 原理**
- 触发条件：所有内存回收失败后
- oom_score 计算：基于内存使用量、进程nice值、oom_score_adj
- 选择 victim 进程的策略
- /proc/PID/oom_score 查看评分
- 如何防止关键进程被杀掉

**8.2 内存泄漏检测**
- kmemleak 工具原理
- 使用方法：echo scan > /sys/kernel/debug/kmemleak
- 常见泄漏场景
- 调试技巧：slabtrace

**8.3 碎片化问题**
- 内部碎片 vs 外部碎片
- compaction 机制
- memory fragmentation index (MFI)
- 针对大页分配的碎片对策

**8.4 性能调优参数**
| 参数 | 默认值 | 说明 |
|------|--------|------|
| vm.swappiness | 60 | anon/file 扫描比例 |
| vm.min_free_kbytes | 动态 | 最小空闲内存 |
| vm.vfs_cache_pressure | 100 | dentry/inode 回收压力 |
| vm.zone_reclaim_mode | 0 | NUMA 本地回收 |
| vm.overcommit_memory | 0 | 内存超量分配策略 |

**教学要点总结框**：
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 常见问题与调试核心要点                                    │
├─────────────────────────────────────────────────────────────┤
│ ✅ OOM Killer 选择 oom_score 最高的进程                     │
│ ✅ kmemleak 可检测内核内存泄漏                               │
│ ✅ compaction 解决外部碎片                                   │
│ ✅ vm.swappiness 控制 anon/file 回收比例                    │
│ ✅ 监控 /proc/meminfo, /proc/vmstat, /proc/zoneinfo        │
└─────────────────────────────────────────────────────────────┘
```

---

### Chapter 9: 学习路线图

**阶段 1: 入门（1-2 周）**
- 理解虚拟内存概念
- 学会查看 /proc/meminfo、/proc/PID/maps
- 理解 Page Fault 基本流程

**阶段 2: 进阶（2-4 周）**
- 深入 VMA 数据结构
- 理解 Buddy System 算法
- 学习 SLUB 分配流程

**阶段 3: 精通（1-2 月）**
- 理解 VMScan 和 LRU 机制
- 学习内存回收调优
- 理解 NUMA 和碎片管理

**推荐学习资源**：
- 源码：`mm/vma.c`, `mm/page_alloc.c`, `mm/filemap.c`, `mm/slub.c`, `mm/vmscan.c`
- 书籍：《Understanding the Linux Kernel》《Linux Kernel Development》
- 工具：perf、strace、/proc 接口

---

## 三、Mermaid 图表清单

### 3.0 背景知识图表（Chapter 0）★ 新增

**图表 0-1: NUMA vs UMA 架构对比**
```mermaid
flowchart LR
    subgraph UMA["UMA (统一内存访问)"]
        direction TB
        CPU1["CPU 0"] --> BUS["系统总线"]
        CPU2["CPU 1"] --> BUS
        CPU3["CPU 2"] --> BUS
        CPU4["CPU 3"] --> BUS
        BUS --> MEM["统一内存"]
        MEM --> BUS
    end

    subgraph NUMA["NUMA (非统一内存访问)"]
        direction TB
        subgraph Node0["Node 0"]
            CPU0["CPU 0"]
            MEM0["本地内存<br/>延迟=50ns"]
        end
        subgraph Node1["Node 1"]
            CPU1n["CPU 1"]
            MEM1["本地内存<br/>延迟=50ns"]
        end
        subgraph Node2["Node 2"]
            CPU2n["CPU 2"]
            MEM2["本地内存<br/>延迟=50ns"]
        end
        CPU0 -.->|"远程访问<br/>延迟=150ns"| MEM1
        CPU1n -.->|"远程访问<br/>延迟=150ns"| MEM2
        INTERCONNECT["互连网络<br/>QPI/UPI/HyperTransport"]
        Node0 --> INTERCONNECT
        Node1 --> INTERCONNECT
        Node2 --> INTERCONNECT
    end
```

**图表 0-2: 虚拟地址到物理地址转换**
```mermaid
flowchart TB
    subgraph VA["虚拟地址 (VA)"]
        VPN["虚拟页号 (VPN)"] --> OFFSET["页内偏移"]
    end

    subgraph MMU["MMU 硬件"]
        TLB["TLB 缓存"]
        PT["页表 (PTE)"]
    end

    subgraph PA["物理地址 (PA)"]
        PPN["物理页号 (PPN)"] --> P_OFFSET["页内偏移"]
    end

    VA -->|查询| TLB
    TLB -->|"命中"| PA
    TLB -->|"未命中| 查询页表"| PT
    PT -->|"遍历多级页表"| TLB
    TLB -->|"缓存 PTE"| PT
    PT -->|转换| PA
```

**图表 0-3: 32位 vs 64位地址空间**
```mermaid
flowchart LR
    subgraph 32bit["32 位系统 (4GB)"]
        direction TB
        KERNEL32["内核空间 1GB<br/>0xC0000000-0xFFFFFFFF"]
        USER32["用户空间 3GB<br/>0x00000000-0xBFFFFFFF"]
    end

    subgraph 64bit["64 位系统 (256TB)"]
        direction TB
        HOLE1["空洞<br/>0x0000800000000000-0xFFFF7FFFFFFFFFFF"]
        USER64["用户空间 128TB<br/>0x0000000000000000-0x00007FFFFFFFFFFF"]
        HOLE2["空洞<br/>0xFFFF800000000000-0xFFFF80007FFFFFFF"]
        KERNEL64["内核空间 128TB<br/>0xFFFF800000000000-0xFFFFFFFFFFFFFFFF"]
    end
```

**图表 0-4: Linux 内存管理演进时间线**
```mermaid
timeline
    title Linux MM 子系统发展历史
    section 早期
        1991 : Linus 写第一个 Linux
             : 仅支持 386 (无分页)
        1992-1994 : 基础分页支持
                   : 简单页面置换
    section 成熟期
        1996 : vmalloc 机制
              : 物理内存映射
        1999 : 2.3.x 分支开发
              : 引入 2.6 O(1) 调度器
        2003 : SLAB 分配器
              : VM子系统重构
    section 现代
        2004 : 2.6 合并 SLUB
              : Per-CPU 优化
        2007 : Buddy + LRU 完善
              : 反向映射 (rmap)
        2011 : 3.0+ THP (Transparent HugePages)
        2022 : 6.1 MGLRU (Multi-Gen LRU)
        2024-2025 : Maple Tree 替换 rbtree
```

### 3.1 全局架构图（Chapter 1）

```mermaid
flowchart TB
    subgraph User["用户空间"]
        APP[应用程序]
    end

    subgraph MM_Subsystem["Linux MM 子系统"]
        subgraph Upper["上层抽象"]
            VMA[VMA 管理<br/>vm_area_struct]
            SLUB[SLUB 分配器<br/>kmem_cache]
        end

        subgraph Mid["中层缓存"]
            PC[页缓存<br/>PageCache]
        end

        subgraph Lower["底层分配"]
            BUDDY[Buddy System<br/>页面分配器]
        end

        subgraph Reclaim["回收机制"]
            VMSCAN[VMScan<br/>LRU 回收]
        end
    end

    subgraph Hardware["硬件"]
        CPU[CPU]
        RAM[物理内存]
        DISK[磁盘]
    end

    APP -->|mmap/munmap| VMA
    APP -->|kmalloc/kfree| SLUB
    APP -->|read/write| PC

    VMA -.->|Page Fault| BUDDY
    SLUB -.->|分配页面| BUDDY
    PC -.->|读写文件| BUDDY

    BUDDY --> RAM
    PC <--> DISK
    VMSCAN -.->|回收页面| BUDDY

    CPU -->|访问内存| VMA
    VMA -->|映射| RAM
```

### 3.2 VMA 章节图表

**图表 2-1: mm_struct 和 VMA 关系图**
```mermaid
flowchart TB
    subgraph MM["struct mm_struct"]
        MT["mm_mt (Maple Tree)"]
        LOCK["mmap_lock"]
        PGDB["pgd_t *pgd"]
    end

    subgraph VMAs["VMA 集合"]
        VMA1["VMA 1: 代码段<br/>[0x400000-0x401000)<br/>r-x"]
        VMA2["VMA 2: 堆<br/>[0x601000-0x602000)<br/>rw-"]
        VMA3["VMA 3: 栈<br/>[0x7fff0000-0x7ffe0000)<br/>rw-"]
    end

    MT --> VMA1
    MT --> VMA2
    MT --> VMA3

    VMA1 -->|vm_file| FILE1["/bin/exec"]
    VMA2 -->|anon| ANON["anonymous"]
    VMA3 -->|anon| ANON
```

**图表 2-2: mmap 系统调用时序图**
```mermaid
sequenceDiagram
    participant User as 用户空间
    participant Kernel as sys_mmap
    participant VMA as VMA Manager
    participant MT as Maple Tree

    User->>Kernel: mmap(addr, len, prot, flags, fd, offset)
    Kernel->>Kernel: do_mmap()
    Kernel->>Kernel: 验证参数、计算 vm_flags
    Kernel->>Kernel: get_unmapped_area()
    Kernel->>VMA: mmap_region()
    VMA->>VMA: vma_iter_store() 插入 Maple Tree
    VMA->>VMA: vma_merge() 尝试合并
    Kernel-->>User: 返回映射地址

    Note over User,Kernel: 页表在首次访问时建立
```

### 3.3 Buddy System 章节图表

**图表 3-1: 伙伴关系示意图**
```
物理地址 (PFN):
0      1      2      3      4      5      6      7
|--------|--------|--------|--------|--------|--------|--------|--------|
 Block 0  Block 1  Block 2  Block 3  Block 4  Block 5  Block 6  Block 7

Order 0 (1页) buddies:
  0↔1, 2↔3, 4↔5, 6↔7

Order 1 (2页) buddies:
  [0+1]↔[2+3], [4+5]↔[6+7]

Order 2 (4页) buddies:
  [0..3]↔[4..7]

公式: buddy_pfn = pfn XOR (1 << order)
```

**图表 3-2: 分配流程图**
```mermaid
flowchart TD
    Start([分配 4KB]) --> Check0{order=0 有空闲?}
    Check0 -->|否| Check1{order=1 有空闲?}
    Check1 -->|否| Check2{order=2 有空闲?}
    Check2 -->|是| Split1[分裂 order=2 为 2 个 order=1]
    Check2 -->|否| Check3{更高阶...}

    Split1 --> Split2[分裂 order=1 为 2 个 order=0]
    Split2 --> Return[返回 1 页，其余放回空闲链表]

    Check3 -->|有| SplitN[分裂到 order=0]
    Check3 -->|无| Fail[分配失败]

    SplitN --> Return
```

### 3.4 PageCache 章节图表

**图表 4-1: address_space 和 XArray 关系**
```mermaid
flowchart TB
    subgraph Inode["struct inode"]
        AS["address_space"]
    end

    subgraph AS_Fields["address_space 字段"]
        IPAGES["i_pages (XArray)"]
        AOPS["a_ops (文件系统操作)"]
        HOST["host (指向 inode)"]
        NR["nrpages (缓存页数)"]
    end

    subgraph XArray["XArray 结构"]
        ROOT["root"]
        L1["L1 节点 [0-15]"]
        L2["L2 节点 [0-7]"]
        LEAF["叶子节点"]
    end

    subgraph Folios["缓存的 Folios"]
        F1["Folio 0: 页 0-3"]
        F2["Folio 1: 页 4-7"]
        F3["Folio N: ..."]
    end

    AS --> IPAGES
    AS --> AOPS
    AS --> HOST
    AS --> NR

    IPAGES --> ROOT
    ROOT --> L1
    ROOT --> L2
    L1 --> LEAF

    LEAF --> F1
    LEAF --> F2
    LEAF --> F3
```

**图表 4-2: Page Fault 处理流程**
```mermaid
flowchart TD
    Start([CPU 访问虚拟地址]) --> PF[Page Fault 中断]
    PF --> CHECK{PTE 存在?}
    CHECK -->|否| ANON{匿名映射?}
    CHECK -->|是| PERM[权限错误]

    ANON -->|是| ANON_ALLOC[匿名页分配]
    ANON -->|否| FILE_MAP{文件映射?}
    FILE_MAP -->|是| FILE_FAULT[filemap_fault]
    FILE_MAP -->|否| SWAP{在 swap?}
    SWAP -->|是| SWAP_IN[从 swap 恢复]

    ANON_ALLOC --> COW{COW 页?}
    COW -->|是| DO_COW[do_cow_page 复制]
    COW -->|否| ALLOC_PAGE[alloc_page 分配]

    FILE_FAULT --> CACHE_HIT{页在缓存?}
    CACHE_HIT -->|是| RETURN_HIT[返回缓存页]
    CACHE_HIT -->|否| DISK_READ[从磁盘读取]

    DO_COW --> SETUP_PTE[建立页表]
    ALLOC_PAGE --> SETUP_PTE
    DISK_READ --> ADD_CACHE[加入页缓存]
    ADD_CACHE --> SETUP_PTE

    SETUP_PTE --> Return([返回用户])
    RETURN_HIT --> Return
    SWAP_IN --> SETUP_PTE
```

### 3.5 SLUB 章节图表

**图表 5-1: SLUB 架构图**
```mermaid
flowchart TB
    subgraph CPU["Per-CPU 结构"]
        PCS["slub_percpu_sheaves"]
        MAIN["main sheaves<br/>(永不为空)"]
        SPARE["spare sheaves"]
        RCU["rcu_free sheaves"]
    end

    subgraph BARN["node_barn (NUMA)"]
        LOCK["spinlock"]
        FULL["sheaves_full 链表"]
        EMPTY["sheaves_empty 链表"]
    end

    subgraph NODE["per-node 结构"]
        KCN["kmem_cache_node"]
        PARTIAL["partial 链表"]
    end

    subgraph SLAB["slab (struct page)"]
        FREELIST["freelist 指针"]
        INUSE["inuse: 已分配数"]
        OBJECTS["objects: 总对象数"]
    end

    PCS --> MAIN
    PCS --> SPARE
    PCS --> RCU

    BARN -.->|获取/存放| FULL
    BARN -.->|获取/存放| EMPTY

    NODE --> PARTIAL
    PARTIAL --> SLAB
```

**图表 5-2: 分配快速路径**
```mermaid
sequenceDiagram
    participant Caller as kmem_cache_alloc
    participant Fast as alloc_from_pcs
    participant PCS as per-CPU sheaves
    participant Barn as node_barn

    Caller->>Fast: 调用
    Fast->>PCS: local_trylock 获取锁
    alt main->size > 0
        Fast->>PCS: objects[--size] 弹出
        Fast->>PCS: local_unlock
        Fast-->>Caller: 返回对象
    else main 为空
        Fast->>Fast: __pcs_replace_empty_main()
        alt spare 有满 sheaves
            Fast->>PCS: swap main/spare
        else barn 有满 sheaves
            Fast->>Barn: barn_get_full_sheaf
            Note over Barn: 跨 NUMA 节点获取
        else 分配新 slab
            Fast->>Fast: allocate_slab
            Fast->>Fast: refill_sheaf
        end
        Fast->>PCS: objects[--size] 弹出
        Fast-->>Caller: 返回对象
    end
```

### 3.6 VMScan 章节图表

**图表 6-1: LRU 链表结构**
```mermaid
flowchart LR
    subgraph Active["Active LRU (热页面)"]
        A1["最近访问"] --> A2["..."] --> A3["较旧访问"]
    end

    subgraph Inactive["Inactive LRU (冷页面)"]
        I1["最近加入"] --> I2["..."] --> I3["最旧 (优先回收)"]
    end

    subgraph Flags["页面标志"]
        PG_A["PG_active = 1"]
        PG_R["PG_referenced"]
    end

    A3 -.->|未访问<br/>shrink_active| I1
    I3 -.->|回收| EVICT["pageout/swap"]
    PG_R -->|"访问时设置"| PG_A
```

**图表 6-2: kswapd 工作流程**
```mermaid
sequenceDiagram
    participant Alloc as 页面分配器
    participant Zone as Zone 水位检测
    participant Kswapd as kswapd 线程
    participant LRU as LRU 链表

    Alloc->>Zone: alloc_pages()
    Zone->>Zone: free_pages < low_wmark?
    alt 是
        Zone->>Kswapd: wakeup_kswapd()
    end

    Kswapd->>Kswapd: balance_pgdat()
    loop 扫描
        Kswapd->>LRU: shrink_active_list()
        Note over LRU: 隔离并检查引用
        Kswapd->>LRU: shrink_inactive_list()
        Note over LRU: 回收尾部页面
    end

    Kswapd->>Zone: free_pages >= high_wmark?
    alt 是
        Kswapd->>Kswapd: 进入睡眠
    else 否
        Kswapd->>Kswapd: 继续扫描
    end
```

### 3.7 模块关系图（Chapter 7）

**图表 7-1: 完整调用链**
```mermaid
flowchart TB
    subgraph User["应用层"]
        PROC[用户进程]
    end

    subgraph Virt["虚拟内存层"]
        VMA[VMA 管理]
        MMU[MMU / 页表]
    end

    subgraph Alloc["分配层"]
        SLUB[SLUB 分配器]
        BUDDY[Buddy System]
    end

    subgraph Cache["缓存层"]
        PC[页缓存 PageCache]
        XA[XArray 索引]
    end

    subgraph Reclaim["回收层"]
        VM[VMScan]
        LRU[LRU 链表]
    end

    subgraph HW["硬件层"]
        RAM[物理内存]
        DISK[磁盘]
    end

    PROC -->|mmap| VMA
    PROC -->|kmalloc| SLUB
    PROC -->|read/write| PC

    VMA -.->|Page Fault| MMU
    MMU -.->|缺页| BUDDY

    SLUB -->|分配页面| BUDDY
    PC -->|读写页| BUDDY

    BUDDY --> RAM
    PC <-->|缓存/回写| DISK

    VM -.->|回收| LRU
    LRU -.->|选择页面| VM
    VM -.->|释放页| BUDDY
```

---

## 四、CSS 样式设计

### 4.1 深色主题配色方案

```css
:root {
    /* 背景色 */
    --bg-primary: #0d1117;      /* 主背景：深灰黑 */
    --bg-secondary: #161b22;    /* 次背景：稍浅灰 */
    --bg-tertiary: #21262d;     /* 第三背景：卡片背景 */
    --bg-code: #1c2128;         /* 代码背景 */

    /* 文字色 */
    --text-primary: #e6edf3;    /* 主要文字：浅灰白 */
    --text-secondary: #8b949e;  /* 次要文字：中灰 */
    --text-muted: #6e7681;      /* 淡化文字 */

    /* 强调色 */
    --accent-blue: #58a6ff;     /* 蓝色链接 */
    --accent-green: #3fb950;    /* 绿色成功/强调 */
    --accent-purple: #a371f7;   /* 紫色重点 */
    --accent-orange: #d29922;   /* 橙色警告 */
    --accent-red: #f85149;      /* 红色错误 */

    /* 边框 */
    --border-default: #30363d;
    --border-muted: #21262d;

    /* 渐变 */
    --gradient-hero: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1a1f29 100%);
    --gradient-card: linear-gradient(145deg, #21262d 0%, #161b22 100%);
    --gradient-accent: linear-gradient(135deg, #58a6ff 0%, #a371f7 100%);
}
```

### 4.2 组件样式

```css
/* 导航栏 */
#navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(13, 17, 23, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border-default);
    z-index: 1000;
}

/* 章节标题 */
.chapter-title {
    font-size: 2rem;
    color: var(--text-primary);
    border-bottom: 2px solid var(--accent-blue);
    padding-bottom: 0.5rem;
    margin-top: 3rem;
}

/* 教学要点框 */
.summary-box {
    background: var(--gradient-card);
    border: 1px solid var(--border-default);
    border-left: 4px solid var(--accent-blue);
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1.5rem 0;
}

.summary-box h4 {
    color: var(--accent-blue);
    margin-top: 0;
}

/* 代码块 */
pre {
    background: var(--bg-code);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.9rem;
}

code {
    background: var(--bg-code);
    color: var(--accent-green);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
}

/* Mermaid 图表容器 */
.mermaid {
    background: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1.5rem 0;
    text-align: center;
}

/* 表格 */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

th, td {
    border: 1px solid var(--border-default);
    padding: 0.75rem;
    text-align: left;
}

th {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

tr:nth-child(even) {
    background: var(--bg-tertiary);
}

/* 锚点样式 */
:target {
    background: var(--accent-blue);
    opacity: 0.1;
}
```

### 4.3 响应式设计

```css
@media (max-width: 768px) {
    #navbar {
        flex-wrap: wrap;
        padding: 0.5rem;
    }

    .chapter-title {
        font-size: 1.5rem;
    }

    pre {
        font-size: 0.8rem;
    }
}
```

---

## 五、实现检查清单

### 5.1 结构检查

- [ ] 深色主题 CSS
- [ ] 固定顶部导航栏
- [ ] 锚点链接
- [ ] 响应式设计
- [ ] Mermaid 图表

### 5.2 内容检查

- [ ] Chapter 1: 全景图和模块依赖
- [ ] Chapter 2: VMA What-How-Why
- [ ] Chapter 3: Buddy System What-How-Why
- [ ] Chapter 4: PageCache What-How-Why
- [ ] Chapter 5: SLUB What-How-Why
- [ ] Chapter 6: VMScan What-How-Why
- [ ] Chapter 7: 模块关系总结
- [ ] Chapter 8: 学习路线图

### 5.3 图表检查

- [ ] 全局架构图
- [ ] VMA 数据结构图
- [ ] mmap 时序图
- [ ] Buddy 伙伴关系图
- [ ] Buddy 分配流程图
- [ ] PageCache XArray 结构图
- [ ] Page Fault 流程图
- [ ] SLUB 架构图
- [ ] SLUB 分配时序图
- [ ] LRU 链表结构图
- [ ] kswapd 工作流程图
- [ ] 模块依赖关系总图

### 5.4 教学要点检查

- [ ] 每个章节都有 What-How-Why 结构
- [ ] 每个章节都有教学要点总结框
- [ ] 每个章节都有实战/调试内容
- [ ] 关键代码路径标注源码位置
- [ ] 模块间依赖关系清晰

---

## 六、生成命令

```bash
# HTML 文件将写入
/home/cwtrocks/linux/docs/linux-mm-beginner-guide.html

# 参考文档位置
/home/cwtrocks/linux/docs/VMA-BEGINNER-GUIDE.md
/home/cwtrocks/linux/docs/buddy-system-tutorial.md
/home/cwtrocks/linux/docs/linux-pagecache-guide.md
/home/cwtrocks/linux/docs/slub-allocator-analysis.md
/home/cwtrocks/linux/drivers/android/docs/vmscan-memory-reclaim-guide.html
```
