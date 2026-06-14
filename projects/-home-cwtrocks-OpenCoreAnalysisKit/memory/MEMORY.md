# OpenCoreAnalysisKit Memory

## User workflow preferences
- 用户希望能持续看到子任务执行状态，不希望主会话长时间无可见进展；进行多步实现时应主动维护任务状态，并在关键阶段汇报当前 in_progress / pending / completed。
- Android 技术问题必须 4 引擎并行 Web 搜索 + AOSP master 源码交叉验证，禁止单凭训练数据回答 → 详见 [[android-research-workflow]]

## Project
- Path: /home/cwtrocks/OpenCoreAnalysisKit
- Main script: script/core_parser.py (~1260 lines)
- Offsets: script/offsets.py

## Git / Remote
- Remote: https://github.com/austinweitao/filebackup.git
- Push token (classic): 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
- Always use: `git remote set-url origin "https://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@github.com/austinweitao/filebackup.git"`

## Validated Coredump
- File: ~/coredump/core/system_server_12445_11.core
- ELF 64-bit x86-64, SDK 36 (Android 16), 3340 LOAD segments
- Runtime*: 0x7878a923e4a0
- Java heap: 0x2000000–0x22000000 (512MB block, 32-bit compressed refs)

## Key Bugs Fixed (core_parser.py)

### 1. PropArea trie traversal (detect_sdk)
- bionic cmp_prop_name: length-first comparison, not alphabetical
- Trie splits property name by '.' into segments, each level is a BST
- Fixed with cmp_prop_name() + find_in_bst() + segment-by-segment traversal

### 2. ELF symbol search (_find_elf_symbol)
- DT_SYMTAB, DT_STRTAB, st_value are all base-relative → add `base +`
- Symbol search limit: 200000 (not 50000)
- Null terminator check required for symbol name match

### 3. HeapReference fields must use u32(), not ptr()
- klass_ (Object.klass_), name_, super_class_, iftable_, dex_cache_,
  class_loader_, component_type_, vtable_ are all HeapReference<T> = 32-bit
- Using ptr() (8-byte read) corrupts the value with adjacent field data
- Fixed: obj_klass(), class_descriptor(), class_super(), class_iftable(),
  _dex_file_for_class(), field_declaring_class(), method_name()

### 4. ART compact string layout (SDK >= 26)
- count_ = (length << 1) | compressed
- kCompressed=0 → Latin-1 (1 byte/char); kUncompressed=1 → UTF-16 (2 bytes/char)
- Layout: klass_(4) + monitor_(4) + count_(4) + hash_code_(4) + inline_data
- Data is INLINE at obj+16, NOT a pointer to a char array
- Fixed _read_java_string() to read inline data directly

### 5. obj_size_of for variable-size / Class objects
- object_size_=0 for String (variable), Class (uses class_size_ from object itself)
- object_size_=0xFFFFFFFF for some variable-size objects
- Fix: if object_size_==0 or 0xFFFFFFFF, fall back to u32(obj + class_size_off)

### 6. Class name matching (cmd_class)
- User passes simple name "ActivityManagerService", not full descriptor
- Fixed: if no '.' or '/' in classname, match by last path component exactly
- Inner classes (Outer$Inner) do NOT match simple name "Outer"

## ART Object Layout (SDK 36, 64-bit host, 32-bit compressed refs)
- Object: klass_(u32), monitor_(u32) = 8 bytes
- Class fields at offsets: name_=28, super_class_=32, dex_cache_=16,
  iftable_=24, fields_=40(native ptr), methods_=48(native ptr),
  class_size_=64, object_size_=88
- Meta-class (java.lang.Class): 0x700053e8 (self-referential)
- String class: 0x7000c410

## See Also
- details/art_heap_bugs.md (detailed bug analysis)

### 8. is_valid_object 对普通对象返回 False
- 错误检查：`klass != obj_klass(klass)` 对所有普通对象都为 True
- 修复：检查 `obj_klass(klass) == obj_klass(obj_klass(klass))`（meta-class 自引用）

### 9. class_descriptor 对懒初始化类返回空字符串
- name_ 字段（+28）对未初始化的类为 null（ART 懒初始化）
- 修复：fallback 到 dex_type_idx_（offset 76）+ DexFile 查询类型描述符
- dex_type_idx_ 在 Class 对象 +76 处（低 16 位）

### 10. HeapWalker 跳过非 RegionSpace 的空间
- 某些空间（如 non-moving space）的 num_regions_ 偏移读到垃圾值（如 37）
- regions_ptr 为 0x1000（无效），导致误判为 RegionSpace
- 修复：验证 regions_ptr > 0x10000 才当作 RegionSpace，否则 fallback 线性扫描

### 11. obj_size_of 对伪对象返回超大 class_size_
- 某些非法对象的 class_size_ 字段为 1000000，导致线性扫描跳过大量合法对象
- 修复：class_size_ fallback 时加上限 512KB，超出则返回 0

### 12. 数组/集合类型全面支持 (2026-03)
- 基本类型数组 [B/Z/C/S/I/J/F/D：read_primitive_array() + obj_size_of 按 12+len*esz 计算
- Object[] 递归展开元素字段（depth≤2）
- ArrayMap：read_arraymap_entries() → mArray[2i]=key, mArray[2i+1]=val
- SparseArray：read_sparsearray_entries() → mKeys(int[]) + mValues(Object[])
- ArraySet：read_arrayset_elements() → mArray[0..mSize-1]
- class_descriptor 新增：primitive name→desc char，component_type_ 推导数组描述符
- obj_size_of 新增：数组对象 size = 12 + length * elem_size（避免 class_size_ 误读）
- mForegroundServiceStateListeners @ 0x2083de0 (size=1, elementData=0x30f81a0)
- 元素 [0] = AppFGSTracker @ 0x20d3dc8，字段完整打印 ✓
- cmd_print 支持 ArrayList/CopyOnWriteArrayList 展开，深度 ≤ 2


## AOSP main 分支验证结论 (2026-03)
所有 SDK 36 偏移与 AOSP art/runtime/mirror/{object,class,string}.h 完全吻合：
- HeapReference<T> 始终 4 字节（32-bit 压缩引用）
- String: count_@8, hash_code_@12, inline_data@16; kCompressed=0=Latin1, kUncompressed=1=UTF16
- Class: 所有 HeapRef 字段 4B，fields_/methods_ 为 native ptr（8B on 64-bit）
- object_size_=0 对 String/Class 是正常的（variable-size 或 Class 用自身 class_size_）

## 交叉验证通过的类
- ActivityManagerService @ 0x2080bf8 (MY_PID=12445 ✓, sTheRealBuildSerial="EMULATOR36X4X10X0" ✓)
- WindowManagerService @ 0x20ea740 (MY_PID=12445 ✓, MY_UID=1000 ✓)
- InputManagerService @ 0x2031fb0 ✓
- PowerManagerService @ 0x2005578 ✓

## services.odex oatdump 闭环 (2026-03)
- 样本：`~/coredump/core/system_server_12445_11.core`
- 已验证命令：`python3 script/core_parser.py <core> oatdump services.odex --map-vma 0x787767400000 --extract-dir <dir> --output <txt> --force`
- 命中 odex：`/system/framework/oat/x86_64/services.odex`
- 关联 dex 容器可从 core 自动恢复：`/system/framework/services.jar`
- `services.jar` 需要自动补建 ZIP central directory / EOCD，修复后可被 `zipfile` 与 `oatdump --dex-file` 正常使用
- Android 16 的 `services.vdex` 是 sectioned layout；`_vdex_computed_size()` 必须优先按 section table 计算逻辑大小，旧版 fixed-header 算法会把 type lookup table 错裁掉
- 修复后 `oatdump.android16-release` 不再报 `Could not find associated dex files of oat file` / `truncated type lookup table`
- 输出已进入 dex/method 级内容，不再是 header-only；验证命中示例：`android.adpf.ISessionManager.associateSessionToLayers(... ) (dex_method_idx=146)`
- `cmd_oatdump()` 现会自动打印 summary（LOCATION / DEX FILE COUNT / 前几个 dex_method_idx 行），用于快速确认输出质量
- 根目录旧副本 `core_parser.py` 已删除，统一只使用 `script/core_parser.py`
