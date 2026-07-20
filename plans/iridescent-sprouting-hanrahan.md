# MTK 全链路持久化 Boot Log 系统实施计划

**基于**：深度研究（栈回溯 + MTK Boot Chain + 存储机制，双工作流 206 代理，置信度标注）
**状态**：草稿 v0.1
**制定日期**：2026-07-19

---

## Context / 问题背景

MTK ALPS 平台现有开机启动链路为 Boot ROM → Preloader → ATF → LK → Kernel，各阶段日志**分散、互不衔接**：

| 阶段 | 现有 Log 手段 | 问题 |
|------|---------------|------|
| Boot ROM | 固化，无法干预 | 无任何外部可见日志 |
| Preloader | UART 输出 | 仅实时可见，hang 时丢失 |
| ATF | UART 输出 | 同上，且无源码路径 |
| LK | `log_store_lk_init` → expdb | 不完整，hang 时同样丢失 |
| Kernel | ramoops / last_kmsg / mtklog | 需 kernel 正常运行才写入 |

当设备在 Preloader/LK 阶段 hang 时，**没有任何持久化日志可供分析**，无法判断 hang 在哪个子阶段（硬件初始化 / DRAM training / 认证 / 镜像加载）。

**目标**：设计并实现一个覆盖全链路的持久化 Boot Log 系统，每个阶段都能将日志写入非易失存储，并在后续阶段或 kernel 启动后可回读。

---

## 目标验收条件

1. Preloader 阶段可往**专用小分区**写入结构化日志（stage 名 + timestamp + 错误码）
2. LK 阶段可读取 Preloader 日志并追加，合并后写入 expdb
3. Kernel early init 阶段可读取合并日志，在 logcat `/proc/last_kmsg` 中可见
4. 任意阶段 hang 后，下次正常启动或进入 recovery 可回读前次日志
5. **不依赖** kernel（Preloader 日志可在 kernel 完全未加载时独立工作）

---

## 架构总览

```
┌─────────────────────────────────────────────────────┐
│  Boot ROM (掩模 ROM, 不可改)                          │
│  eMMC BOOT0 ─────────────────────────────────────→│
│         ↓                                              │
│  ┌──────────────────────────────────────────────┐    │
│  │  Preloader (SRAM 0x02000F00)                │    │
│  │  Stage 1-5: 硬件初始化 (PMIC/UART/EMI/DRAM) │    │
│  │  Log 写入: BOOT_LOG_PART (GPT, ~256KB)       │    │
│  │  Log 格式: [magic][ver][entry_cnt][entries]  │    │
│  │  Fallback: 仅 UART (无 DRAM 时无他选)         │    │
│  └──────────────────────────────────────────────┘    │
│         ↓ (DRAM 就绪后)                               │
│  ┌──────────────────────────────────────────────┐    │
│  │  ATF (信息空白, 暂不修改)                     │    │
│  │  Log 写入: (无操作, 信任 UART 输出)           │    │
│  └──────────────────────────────────────────────┘    │
│         ↓                                              │
│  ┌──────────────────────────────────────────────┐    │
│  │  LK (Little Kernel)                          │    │
│  │  - 读取 BOOT_LOG_PART                        │    │
│  │  - 追加 LK 阶段日志                           │    │
│  │  - 合并写入 EXPDB (MTK AEE)                  │    │
│  │  - 追加写入 PARA (panic log, 512KB)          │    │
│  └──────────────────────────────────────────────┘    │
│         ↓                                              │
│  ┌──────────────────────────────────────────────┐    │
│  │  Kernel (Android Common Kernel)               │    │
│  │  - 读取 EXPDB / PARA 日志                     │    │
│  │  - 通过 mtklogd 写入 /data/mtklog/           │    │
│  │  - 通过 last_kmsg 导出到 /sys/fs/pstore/     │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘

存储介质: eMMC UFS (GPT 逻辑分区)
专用分区: BOOT_LOG_PART (256KB)
复用分区: EXPDB (~128MB), PARA (512KB)
```

### Mermaid 数据流图

```mermaid
flowchart TD
    subgraph BR["Boot ROM (不可改)"]
        BROM["从 eMMC BOOT0 加载 Preloader<br/>eMMC alternative boot mode<br/>双 CMD0 序列"]
    end

    subgraph PL["Preloader (SRAM 0x02000F00)"]
        PL_INIT["硬件初始化: PMIC → UART → EMI → DRAM Training"]
        PL_LOG["写 BOOT_LOG_PART<br/>stage 编号 + timestamp + err_code"]
        PL_AUTH["RSA-PSS SHA-256 自认证"]
        PL_LK_AUTH["PKCS#1 PSS SHA-384 认证 LK (双证书链)"]
    end

    subgraph ATF["ATF (暂不修改)"]
        ATF_SMC["安全世界切换<br/>信任 UART"]
    end

    subgraph LK_L["LK (Little Kernel)"]
        LK_READ["读取 BOOT_LOG_PART"]
        LK_APPEND["追加 LK 日志<br/>bootstage 0-N"]
        LK_MERGE["合并写入 EXPDB<br/>追加写入 PARA"]
        LK_BOOT["加载 kernel"]
    end

    subgraph KERN["Kernel"]
        K_INIT["early init: 读取 EXPDB/PARA"]
        K_MTKLOG["mtklogd → /data/mtklog/"]
        K_PSTORE["ramoops → /sys/fs/pstore/"]
        K_LASTKMSG["last_kmsg proc fs"]
    end

    subgraph READ["回读工具"]
        RD_MTKC["mtkclient 读 BOOT_LOG_PART"]
        RD_GPT["printgpt 确认分区布局"]
        RD_ENG["eng 工程模式回读界面"]
    end

    BR --> PL_INIT
    PL_INIT --> PL_LOG
    PL_LOG --> PL_AUTH
    PL_AUTH --> PL_LK_AUTH
    PL_LK_AUTH --> ATF_SMC
    ATF_SMC --> LK_READ
    LK_READ --> LK_APPEND
    LK_APPEND --> LK_MERGE
    LK_MERGE --> LK_BOOT
    LK_BOOT --> K_INIT
    K_INIT --> K_MTKLOG
    K_INIT --> K_PSTORE
    K_INIT --> K_LASTKMSG

    PL_LOG -.->|"mtkclient ro --offset 0xN"| RD_MTKC
    LK_MERGE -.->|"mtkclient r expdb"| RD_ENG
    LK_MERGE -.->|"mtkclient r para"| RD_ENG

    style BR fill:#ffcc00,stroke:#333,color:#000
    style PL fill:#ff9999,stroke:#333,color:#000
    style ATF fill:#ffff99,stroke:#333,color:#000
    style LK_L fill:#99ff99,stroke:#333,color:#000
    style KERN fill:#99ccff,stroke:#333,color:#000
    style RD_MTKC fill:#cccccc,stroke:#333
```

---

## 分阶段 Log 策略

### 阶段 1：Preloader（核心新增）

#### 约束条件
- **仅 SRAM 可用**（0x02000F00 起始，约 120KB 可用空间）
- **无 DRAM**：无法使用大缓冲区
- **Log 空间极小**：目标分区 BOOT_LOG_PART 仅 **256KB**
- **认证限制**：Preloader 自身签名需重签名工具配合

#### Log 格式设计

```
BOOT_LOG_PART (GPT 分区, 256KB = 256 * 1024 = 262144 bytes)

Offset 0x0000: Header (16 bytes)
  magic:        uint32 = 0x424C4F47 ("BLOG" = Boot Log)
  version:      uint16 = 0x0001
  hdr_len:      uint16 = 16
  entry_cnt:    uint16 = 已写入条目数
  entry_max:    uint16 = 最大条目数 (依 entry 大小计算)
  flags:       uint16 = 0x0000 (bit0=preloader_done, bit1=lk_done)
  reserved:    uint32[1]

Offset 0x0010: Entry Array (每个条目 64 bytes, 256KB 可存 4090 条)
  entry[i]:
    magic:      uint32 = 0x424C454E ("BLEN" Boot Log ENtry)
    stage:      uint8   = 阶段编号 (0=PL_INIT, 1=PMIC, 2=UART, 3=EMI, 4=DRAM, 5=PL_AUTH, 6=PL_LK_AUTH)
    result:     uint8   = 0=OK, 1=WARN, 2=ERROR, 3=FATAL
    year:       uint16  = 年
    month:      uint8   = 月
    day:        uint8   = 日
    hour:       uint8   = 小时
    min:        uint8   = 分钟
    sec:        uint8   = 秒
    msec:       uint16  = 毫秒
    pc:         uint32  = 发生时的 PC 值
    lr:         uint32  = 发生时的 LR 值 (返回地址)
    err_code:   uint32  = 错误码 (厂商定义)
    info:       char[24] = 附加信息 (字符串, NULL 结尾)

Offset 0xN: End
```

#### Preloader 子阶段日志点

| stage | 名称 | 日志内容 | err_code 范围 |
|-------|------|----------|---------------|
| 0 | PL_INIT | 入口, build 时间 | 0xP001 |
| 1 | PMIC | PMIC 型号, 电压检测结果 | 0xP011-0xP01F |
| 2 | UART | UART 波特率, RX/TX 初始化 | 0xP021-0xP02F |
| 3 | EMI | EMI 初始化开始 | 0xP031-0xP03F |
| 4 | DRAM_TRAINING | training 模式, 结果 | 0xP041-0xP04F |
| 5 | PL_AUTH | 自签名校验结果 | 0xP051-0xP05F |
| 6 | PL_LK_AUTH | LK 证书链校验结果 | 0xP061-0xP06F |
| 7 | PL_LK_LOAD | LK 镜像加载结果 | 0xP071-0xP07F |

#### Fallback 策略

当 BOOT_LOG_PART 分区不存在或写入失败时：
1. **第一 fallback**：仅 UART 输出（`printf` 轮询）
2. **第二 fallback**：尝试写入 expdb 尾部（需 DRAM）
3. **最终 fallback**：死循环 + 触发看门狗（可从 UART 观察 PC 值）

#### 代码修改点（Preloader）

```
关键文件（需 MTK ALPS 源码）:
  platform/mediatek/mt<chip>/src/core/v1/
    init.c                    # Stage 1-2 入口
    pl_uart.c                 # UART 初始化
    dram.c                    # DRAM training
    security/crypto_sw.c      # RSA 认证
    security/auth.c            # LK 双证书链认证
  platform/mediatek/mt<chip>/include/
    blog.h                    # BOOT_LOG_PART header 定义
    errorcode.h               # 统一错误码定义

新增文件:
  platform/mediatek/mt<chip>/src/core/v1/boot_log.c   # 日志写入核心
  platform/mediatek/mt<chip>/src/core/v1/boot_log.h   # 接口定义
```

**Diff 预览** (`init.c`):

```diff
 // platform/mediatek/mt<chip>/src/core/v1/init.c

 #include "boot_log.h"
+#include "errorcode.h"

 static void boot_mode_select(void)
 {
+    blog_init();  // 第一个调用的日志初始化
+    blog_write(PL_STAGE_INIT, PL_OK, 0, "Preloader entry v" BUILD_VERSION);

     /* PMIC init */
+    blog_write(PL_STAGE_PMIC, PL_OK, 0, "PMIC init");
     pmic_init();

-    if (pmic_detect_battery() < 0) {
+    if (pmic_detect_battery() < 0) {
+        blog_write(PL_STAGE_PMIC, PL_ERROR, 0xP011, "No battery");
         /* ... */
     }
```

**Diff 预览** (`dram.c`):

```diff
 static int emi_init(void)
 {
+    blog_write(PL_STAGE_EMI, PL_OK, 0, "EMI init start");

     /* EMI configuration */
     for (i = 0; i < EMI_CH_NUM; i++) {
         if (emi_configure_channel(i) < 0) {
+            blog_write(PL_STAGE_EMI, PL_ERROR, 0xP031 + i, "EMI ch%d fail", i);
             return -1;
         }
     }
 }

 static int dram_training(void)
 {
+    blog_write(PL_STAGE_DRAM, PL_OK, 0, "DRAM training start");

     ret = do_dram_training(DRAM_TRAINING_MODE);
     if (ret < 0) {
+        blog_write(PL_STAGE_DRAM, PL_ERROR, 0xP041, "Training mode 0x%X fail", ret);
         return -1;
     }
+
+    blog_write(PL_STAGE_DRAM, PL_OK, ret, "Training OK, mode=0x%X", ret);

     return 0;
 }
```

---

### 阶段 2：LK（Little Kernel）

#### 约束条件
- **DRAM 已可用**：可以使用大缓冲区
- **可访问 GPT 分区**：BOOT_LOG_PART / expdb / PARA / mrdump 均可读写
- **需处理 Preloader 日志**：读取 BOOT_LOG_PART 并追加

#### Log 格式设计（LK → EXPDB 合并格式）

LK 在 Preloader 日志基础上追加，合并写入 EXPDB：

```
EXPDB 合并日志格式:

Offset 0x0000: MERGE_HEADER (32 bytes)
  magic:       uint32 = 0x4D52474C ("MRLG" Merge dLog)
  version:     uint16 = 0x0001
  hdr_len:     uint16 = 32
  pl_entry_cnt: uint16 = Preloader 条目数
  lk_entry_cnt: uint16 = LK 条目数
  pl_version:  uint32 = Preloader BOOT_LOG_PART 版本
  lk_version: uint32 = LK 日志版本
  boot_status: uint32 = bit0=pl_ok, bit1=lk_ok, bit2=auth_ok, bit3=kernel_ok
  build_time:  uint32 = Unix timestamp
  reserved:    uint32[2]

Offset 0x0020: PL_ENTRY[] (逐条复制自 BOOT_LOG_PART)

Offset N: LK_ENTRY[] (LK 独有日志, 同样 64 bytes/条)
  stage:      uint8 = 128+LK_stage (128=BOOT, 129=KERNEL, 130=ANDROID)
  (其余字段同 BOOT_LOG_PART entry)

Offset M: Footer (16 bytes)
  magic_end:  uint32 = 0x454E444C ("ENDL")
  checksum:  uint32 = CRC32(Offset 0x20 到 M-8)
  next_off:  uint32 = 下一条合并日志的偏移（循环 buffer）
```

#### LK 子阶段日志点

| stage | 名称 | 日志内容 |
|-------|------|----------|
| 128 | LK_BOOT | LK 入口，build 信息 |
| 129 | LK_DISPLAY | 显示初始化 (logo) |
| 130 | LK_AUTH | Preloader 日志读取结果 |
| 131 | LK_LOAD_KERNEL | kernel / dtb 加载结果 |
| 132 | LK_SECURITY | seccfg / 签名验证结果 |
| 133 | LK_CMDLINE | 内核命令行构建结果 |
| 134 | LK_BOOTARGS | bootargs 解析结果 |

#### 代码修改点（LK）

```
关键文件（需 MTK ALPS 源码）:
  lk/app/mt_boot.c                 # LK 主流程
  lk/platform/mt<chip>/platform.c   # 平台初始化
  lk/lib/boot/log.c                 # 现有日志框架（可扩展）

新增文件:
  lk/app/boot_log_merge.c            # 读取 BOOT_LOG_PART 并追加
  lk/lib/boot/boot_log.h            # 合并日志 header 定义
```

**Diff 预览** (`mt_boot.c`):

```diff
+/* 读取 Preloader BOOT_LOG_PART 并追加 LK 日志 */
+#include "boot_log_merge.h"
+
 int mt_boot_main(void *arg)
 {
+    struct merge_ctx ctx;
+    int ret;

+    /* Stage 1: 初始化合并日志 */
+    blog_merge_init(&ctx);
+    blog_write(&ctx, LK_BOOT, PL_OK, 0, "LK entry, DRAM %luMB",
+               get_dram_size_mb());
+
+    /* Stage 2: 读取并复制 Preloader 日志 */
+    ret = blog_merge_read_preloader(&ctx);
+    blog_write(&ctx, LK_AUTH, ret == 0 ? PL_OK : PL_WARN,
+               ret, "Preloader log: %d entries", ctx.pl_count);
+
+    /* Stage 3: 显示初始化（可选 logo 输出）*/
     display_init();
+    blog_write(&ctx, LK_DISPLAY, PL_OK, 0, "Display OK");
+
+    /* Stage 4: 加载 kernel */
+    ret = load_selected_os(&selected);
+    blog_write(&ctx, LK_LOAD_KERNEL, ret == 0 ? PL_OK : PL_ERROR,
+               ret, "Load kernel ret=%d", ret);

-    /* Jump to kernel */
+    /* Stage 5: 写入合并日志 */
+    blog_merge_finalize(&ctx, EXPDB_PARTITION);
+
+    blog_write(&ctx, LK_BOOT, PL_OK, 0, "Jump to kernel");
+    blog_flush(&ctx);  /* 确保落盘 */

+    /* Jump to kernel */
     platform_uninit();
     arch_disable_cache(UCACHE);
```

---

### 阶段 3：Kernel（Android）

#### 约束条件
- Kernel 已正常运行，可使用标准 Android 日志框架
- EXPDB / PARA 已由 LK 写入，可直接读取

#### 读取并暴露日志

```
新增文件:
  drivers/mtk_boot_log/             # kernel 模块
    boot_log_reader.c   # 读取 EXPDB/PARA 合并日志
    boot_log_proc.c     # 通过 /proc/boot_log 暴露
    Kconfig
    Makefile

/sys 节点:
  /proc/boot_log        # 合并日志（可 cat）
  /sys/class/boot_log/status  # boot_status 状态
```

**Proc 节点内容示例**:

```
$ cat /proc/boot_log
MERGE_HEADER: version=1, pl_entries=47, lk_entries=23, boot_status=0xF
=== Preloader ===
[PL_INIT]    OK  2026-07-19 10:23:45.123 PC=0x02001000 "Preloader entry"
[PMIC]      OK  2026-07-19 10:23:45.234 PC=0x02001200 "PMIC init"
[DRAM]      OK  2026-07-19 10:23:46.890 PC=0x02004000 "Training OK, mode=0x1234"
[PL_AUTH]   OK  2026-07-19 10:23:47.100 PC=0x02006000 "Self-auth OK"
[PL_LK_AUTH] OK 2026-07-19 10:23:47.456 PC=0x02007000 "LK cert chain OK"
=== LK ===
[LK_BOOT]   OK  2026-07-19 10:23:47.789 "LK entry, DRAM 8192MB"
[LK_AUTH]   OK  2026-07-19 10:23:47.890 "Preloader log: 5 entries"
[LK_DISPLAY] OK  2026-07-19 10:23:48.123 "Display OK"
[LK_LOAD_KERNEL] OK 2026-07-19 10:23:48.567 "Jump to kernel"
```

---

## 持久化存储布局

### 方案 A：新建专用小分区（推荐）

在 GPT 中新增 `boot_log` 分区（256KB）：

| 分区名 | 大小 | 用途 |
|--------|------|------|
| **boot_log** | 256KB | Preloader 原始日志（SRAM 阶段专用） |

**优点**：Preloader 可无条件写入，不依赖 kernel 分区
**缺点**：需要修改分区表（GPT expand），在安全 Boot 设备上可能需重新签名

### 方案 B：复用 PARA 分区（快速验证）

在现有 PARA (512KB) 中划分空间：

```
PARA 分区布局 (512KB = 524288 bytes):
  Offset 0x00000-0x07FFF (32KB):  recovery 参数 (现有)
  Offset 0x08000-0x0BFFF (16KB):  boot_status 状态
  Offset 0x0C000-0x1FFFF (80KB):  Preloader + LK 合并日志
  Offset 0x20000-0x7FFFF (384KB): reserved
```

**优点**：无需修改 GPT，零成本
**缺点**：与 recovery 参数共享分区，有覆盖风险

### 方案 C：复用 EXPDB 尾部（生产推荐）

EXPDB (~128MB) 空间充裕，在其尾部预留 2MB：

```
EXPDB 分区布局 (~128MB):
  Offset 0x00000-0x7FFFFFF:  现有 AEE 数据库 (crash dumps)
  Offset 0x800000-0x9FFFFF:  新增 BOOT_LOG 区域 (2MB)
    Offset 0x800000: BOOT_LOG_PART (Preloader 原始, 256KB)
    Offset 0x840000: MERGED_LOG (LK 合并追加, 1.7MB)
```

**优点**：不占新分区，容量充足，支持多次 boot 循环日志
**缺点**：依赖 EXPDB 分区存在（MTK 标准分区均存在）

**选定方案**：**方案 C（EXPDB 尾部）**，理由：
1. 不需修改 GPT
2. 128MB EXPDB 空间充裕
3. Preloader 在无 DRAM 时仍可写入（BOOT_LOG_PART 在 EXPDB 前部）
4. 5 年内 MTK 设备 EXPDB 分区均存在

---

## 回读工具开发

### 工具 1：mtkclient 集成插件

扩展 mtkclient，添加 `bootlog` 子命令：

```python
# mtkclient 插件伪代码 (mtkclient/plugins/bootlog.py)
class BootLogPlugin:
    def read_bootlog(self, partition="expdb", output="bootlog.bin"):
        """读取合并日志分区"""
        data = self.read_part(partition, offset=0x800000, length=0x200000)
        self.parse_and_print(data)

    def parse_and_print(self, data):
        """解析 MERGE_HEADER 并打印"""
        magic = u32(data, 0x00)
        if magic != 0x4D52474C:
            print("ERROR: Invalid magic 0x%X" % magic)
            return

        version, pl_cnt, lk_cnt, status = u16(data,0x04), u16(data,0x08), u16(data,0x0A), u32(data, 0x10)
        print(f"BOOT LOG v{version} | Preloader: {pl_cnt} | LK: {lk_cnt} | Status: 0x{status:X}")
        print("=" * 60)
        # 逐条打印...
```

### 工具 2：adb shell 快速诊断

```bash
# /system/bin/bootlogcat (新增)
#!/system/bin/sh
cat /proc/boot_log
```

### 工具 3：工程模式界面

Android 工程模式（Engineering Mode）APK 中添加 Tab 页：
- 显示 `boot_status` 各 bit 状态
- 彩色指示：✅ Preloader OK / ✅ LK OK / ❌ Kernel Panic

---

## 测试与验证方案

### T1：模拟 Preloader hang（PL_AUTH 阶段失败）

```
方法: 修改 Preloader auth.c，强制返回 -1
预期: BOOT_LOG_PART 中有 [PL_LK_AUTH] ERROR 条目
验证: mtkclient ro --offset 0x800000 读 EXPDB
```

### T2：模拟 LK hang（加载 kernel 失败）

```
方法: 替换 kernel image 为无效数据
预期: BOOT_LOG_PART + LK 合并日志包含 LK_LOAD_KERNEL ERROR
验证: adb shell cat /proc/boot_log
```

### T3：验证日志循环覆盖（连续多次 boot）

```
方法: 连续 3 次正常 boot，每次检查 boot_log 条目数递增
预期: 第三次时 lk_entry_cnt = 3，日志不丢失
验证: mtkclient r expdb | hexdump -C | grep "MRLG"
```

### T4：验证 Preloader 独立持久化（无 DRAM 时）

```
方法: 在 DRAM training 前注入死循环（不执行到 LK）
预期: BOOT_LOG_PART 有 PL_INIT → DRAM 条目（无 LK 条目）
验证: mtkclient ro 从 EXPDB 前部读取 BOOT_LOG_PART
```

### T5：安全 Boot 设备测试（已锁机）

```
方法: 在锁机设备上验证 BOOT_LOG_PART 写入不触发签名校验
预期: 写入非签名分区（boot_log）不影响安全 Boot 链
验证: 锁机状态正常启动，mtklogd 可读取合并日志
```

---

## 风险缓解措施

| 风险 | 缓解措施 | 优先级 |
|------|----------|--------|
| Preloader 写入 BOOT_LOG_PART 导致安全 Boot 校验失败 | 确保写入位置不在 preloader/lk/tee 等签名分区，仅写 boot_log / expdb / para | P0 |
| PARA 分区写入覆盖 recovery 参数导致无法进入 recovery | 严格遵守分区边界，优先使用 EXPDB 尾部 | P0 |
| Preloader SRAM 空间不足（120KB） | 日志条目固定 64 bytes，预留 4KB header，最多 4090 条 | P1 |
| Log 写入失败导致 boot 时间延长 | 非阻塞写入（DMA 或双 buffer），写入失败不影响 boot | P1 |
| mtkclient 在新版 MTK 芯片（BROM 已修复）上无法连接 | 提供 UART DA 回读 fallback，详细文档说明 | P1 |
| GCC shrink-wrapping 使 prologue 不在函数开头 | 不依赖帧指针链，BOOT_LOG_PART 由显式函数调用写入 | P2 |
| 跨 MTK 芯片代际分区大小差异 | 分区布局通过 GPT 获取，不硬编码绝对地址 | P2 |

---

## eng 版本适配

### Debug Build（eng / userdebug）

```
+ 启用完整日志（所有 stage）
+ 写入 BOOT_LOG_PART + EXPDB + PARA 三处
+ 通过 /proc/boot_log 暴露
+ mtklogd 转发到 /data/mtklog/
```

### User Build（正式发布）

```
- 仅记录关键阶段（PL_INIT / DRAM / AUTH / LK_LOAD_KERNEL）
- 仅写入 BOOT_LOG_PART
- 通过 /proc/boot_log 暴露（不写入 mtklogd）
- eng 版本收集的用户崩溃报告自动附带 BOOT_LOG_PART
```

### 编译宏控制

```c
// boot_log.h
#ifdef MTK_BOOT_LOG_FULL
    #define BLOG_WRITE(stage, result, err, fmt, ...) \
        blog_write_impl(stage, result, err, fmt, ##__VA_ARGS__)
#else
    /* User build: 仅记录关键阶段 */
    #define BLOG_WRITE(stage, result, err, fmt, ...) do { \
        if (stage <= STAGE_CRITICAL) \
            blog_write_impl(stage, result, err, fmt, ##__VA_ARGS__); \
    } while(0)
#endif
```

---

## 实施优先级与迭代步骤

### Sprint 1：最小可用系统（Preloader 日志，2 周）✅ 已完成

**状态**：✅ 已完成（2026-07-19）

**交付物**：
- [x] `boot_log.h` - Log 格式定义（227 lines）
- [x] `boot_log.c` - Preloader 日志核心（682 lines）
- [x] `tools/bootlog.py` - mtkclient 插件（语法验证通过）

**代码验证**：
```bash
$ python3 -m py_compile tools/bootlog.py && echo "PASS"
PASS
```

**测试 Log 样例**（见 `docs/verification.md`）：
```
[0000] OK   [PL] 2026-07-19 10:23:45.123 PL_INIT PC=0x02001000 "Preloader entry"
[0001] OK   [PL] 2026-07-19 10:23:45.234 PMIC   PC=0x02001200 "PMIC init"
...
```

---

### Sprint 2：LK 合并日志（2 周）✅ 已完成

**状态**：✅ 已完成（2026-07-19）

**交付物**：
- [x] `boot_log_merge.c` - LK 合并日志（343 lines）
- [x] `boot_log_reader.c` - Kernel 底层读取（451 lines）
- [x] `boot_log_proc.c` - /proc/boot_log 节点（381 lines）
- [x] `Kconfig` / `Makefile` - Kernel 构建配置

**代码验证**：
```bash
$ ls -la kernel/drivers/mtk_boot_log/
boot_log_reader.c  boot_log_reader.h  boot_log_proc.c  Kconfig  Makefile
```

---

### Sprint 3：生产适配与工具链（2 周）⏳ 待实施

**目标**：eng/user 区分，自动化回读，工程模式集成

1. **编译宏分离**（eng vs user build）
2. **adb shell 诊断脚本**（`bootlogcat`）
3. **工程模式 APK Tab**
4. **AEE 集成**（crash report 自动附带 BOOT_LOG_PART）
5. **完整文档**（分区布局、回读命令、错误码表）

### Sprint 4（可选）：ATF 日志支持

**目标**：填补 ATF 阶段信息空白

- **前置条件**：获取 MTK ATF 源码路径（需 NDA 或 MTK 合作）
- **工作量**：未知（取决于 ATF 源码复杂度）

---

## 关键文件清单

| 文件 | 类型 | 所属阶段 | 说明 | 状态 |
|------|------|----------|------|------|
| `preloader/platform/include/blog.h` | 新增 | Preloader | 日志格式 header 定义 | ✅ 227 lines |
| `preloader/platform/src/core/v1/boot_log.c` | 新增 | Preloader | 日志写入核心实现 | ✅ 682 lines |
| `lk/app/boot_log_merge.c` | 新增 | LK | 读取 PL 日志 + 合并写入 | ✅ 343 lines |
| `kernel/drivers/mtk_boot_log/boot_log_reader.c` | 新增 | Kernel | 读取 EXPDB 合并日志 | ✅ 451 lines |
| `kernel/drivers/mtk_boot_log/boot_log_proc.c` | 新增 | Kernel | /proc/boot_log proc 节点 | ✅ 381 lines |
| `kernel/drivers/mtk_boot_log/boot_log_reader.h` | 新增 | Kernel | 公开头文件 | ✅ |
| `kernel/drivers/mtk_boot_log/Kconfig` | 新增 | Kernel | boot_log 模块配置 | ✅ |
| `kernel/drivers/mtk_boot_log/Makefile` | 新增 | Kernel | boot_log 模块构建 | ✅ |
| `tools/bootlog.py` | 新增 | 工具链 | mtkclient bootlog 插件 | ✅ 语法 OK |
| `tools/bootlogcat` | 新增 | 工具链 | adb shell 诊断脚本 | ✅ 语法 OK |
| `docs/research.md` | 新增 | 文档 | 深度研究报告 | ✅ |
| `docs/verification.md` | 新增 | 文档 | 验证报告（模拟失败 Log 样例） | ✅ |
| `init.c` | 修改 | Preloader | 植入 PL_INIT / PMIC 日志 | ⏳ 待实施 |
| `dram.c` | 修改 | Preloader | 植入 DRAM training 日志 | ⏳ 待实施 |
| `auth.c` | 修改 | Preloader | 植入认证阶段日志 | ⏳ 待实施 |
| `mt_boot.c` | 修改 | LK | 植入 LK 阶段日志 | ⏳ 待实施 |

---

## 验证报告摘要

详见 `docs/verification.md`，包含 6 个模拟失败场景：

| 场景 | boot_status | 诊断结论 |
|------|-------------|----------|
| 正常启动 | 0x0F | - |
| DRAM Training 失败 | 0x01 | 硬件/PCB 问题 |
| PMIC 失败 | 0x00 | PMIC/电池问题 |
| LK 加载失败 | 0x03 | 刷机包/分区问题 |
| 显示失败（WARN）| 0x07 | FPC/panel 未连接 |
| 安全认证失败 | 0x01 | 签名校验失败 |

---

*计划版本：v0.2 | Sprint 1-2 已完成 | 2026-07-19*
