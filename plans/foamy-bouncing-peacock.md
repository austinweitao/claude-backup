# Inject 模式让单个 App 支持 OpenCoreSDK

## Context

用户希望不修改目标 App 的任何代码，只通过 inject .so 的方式让某个特定 App 支持 opencore coredump 生成。

**约束条件**：
- 不修改目标 App 代码
- 有 root / system 权限
- 目标 Android 12 (API 31)

## 关键技术发现

### 1. Inject .so 工作机制

`opencore_jni.cpp` 行 211-246 的 `#if defined(INJECT_OPENCORE_DIR)` 块：

```cpp
extern "C"
void __attribute__((constructor)) opencore_ctor_init() {
    Opencore::SetDir(INJECT_OPENCORE_DIR);  // 设置 dump 目录
    Opencore::SetTimeout(180);             // 180s 超时
    Opencore::SetFlag(FLAG_CORE | FLAG_PROCESS_COMM | FLAG_PID | FLAG_TIMESTAMP);
    Opencore::SetFilter(FILTER_SPECIAL_VMA | FILTER_SANITIZER_SHADOW_VMA | ...);
    Opencore::Enable();                     // 注册信号处理器
}
```

**关键点**：
- `__attribute__((constructor))` 在 .so 被 `dlopen()` / `LD_PRELOAD` 加载时**由 linker 自动调用**，无需 Java 参与
- 完全不调用 JNI，不需要 `JNI_OnLoad`
- 纯 native 信号处理器注册，适用任何进程

### 2. Inject 版本编译方式

当前 `build_opencore.sh` **不支持** inject 构建，需要手动指定编译参数：

```bash
cmake -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake \
      -DANDROID_ABI=arm64-v8a \
      -DANDROID_NDK=$ANDROID_NDK_HOME \
      -DANDROID_PLATFORM=android-30 \
      -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_CXX_FLAGS='-DINJECT_OPENCORE_DIR="/data/coredump"' \
      opencore/src/main/cpp/CMakeLists.txt \
      -B output/aosp/inject/android/arm64-v8a/lib

make -C output/aosp/inject/android/arm64-v8a/lib -j8
```

输出：`output/aosp/inject/android/arm64-v8a/lib/libopencore.so`

### 3. 单个 App 注入的方法

**方法 A：wrap.sh（最简单，无需修改 init.rc）**

```bash
# 1. 编译 inject 版本
# 2. 推送到目标 app 的 native lib 目录
adb push libopencore.so /data/app/com.example.myapp/lib/arm64/

# 3. 创建 wrap.sh
cat > /data/local/tmp/opencore_wrap.sh << 'EOF'
#!/system/bin/sh
export LD_PRELOAD=/data/app/com.example.myapp/lib/arm64/libopencore.so
exec "$@"
EOF
chmod 755 /data/local/tmp/opencore_wrap.sh

# 4. 通过 setprop 设置 wrap.sh
adb shell "setprop wrap.com.example.myapp /data/local/tmp/opencore_wrap.sh"

# 5. 重启 app
adb shell "am force-stop com.example.myapp"
adb shell "monkey -p com.example.myapp -c android.intent.category.LAUNCHER 1"
```

**方法 B：直接 push 到 app lib 目录（需 App 主动加载）**

如果 App 已经有 `System.loadLibrary("opencore")` 调用，直接 push 即可：
```bash
adb push libopencore.so /data/app/com.example.myapp/lib/arm64/
```

但**普通 App 没有这行代码**，所以不适用。

**方法 C：init.rc 全局注入（需修改 system 分区）**

在 `/system/etc/init/hw/init.rc` 或对应的 ueventd 中添加：
```rc
on property:persist.ld.preload.opencore=*
    setenv LD_PRELOAD ${persist.ld.preload.opencore}
```

然后：
```bash
adb shell "setprop persist.ld.preload.opencore /data/local/tmp/libopencore.so"
adb reboot
```

### 4. 为什么 push 到 app lib/ 目录不能自动加载？

Android linker **不会自动扫描目录下的 .so 文件**。只有：
- `System.loadLibrary("name")` → dlopen("/data/app/<pkg>/lib/<abi>/libname.so")
- `dlopen()` 显式调用
- `LD_PRELOAD` 在进程启动时注入

所以**方法 A（wrap.sh）是唯一不修改 App 代码、也不修改 system 分区的方法**。

## 实现方案

### Step 1：修改 build_opencore.sh 支持 inject 构建

新增环境变量 `BUILD_INJECT_DIR`，当设置时传递 `-DINJECT_OPENCORE_DIR`：

```bash
# 在 build_opencore.sh 的 cmake 命令中添加：
if [ -n "$BUILD_INJECT_DIR" ]; then
    INJECT_CMAKE_FLAGS="-DCMAKE_CXX_FLAGS='-DINJECT_OPENCORE_DIR=\"$BUILD_INJECT_DIR\"'"
    INJECT_OUTPUT_SUFFIX="/inject"
fi

cmake ... $INJECT_CMAKE_FLAGS ...
```

### Step 2：编译 inject 版本

```bash
export ANDROID_NDK_HOME=/path/to/ndk
export BUILD_INJECT_DIR="/data/coredump"
./script/build_opencore.sh
```

### Step 3：部署到目标 App

```bash
APP_PKG="com.example.myapp"
ABI="arm64"

# 推送 inject 版本
adb push output/aosp/inject/android/$ABI/lib/libopencore.so \
    /data/local/tmp/opencore.so

# 创建 wrap.sh
adb shell "cat > /data/local/tmp/opencore_wrap.sh << 'EOF'"
#!/system/bin/sh
export LD_PRELOAD=/data/local/tmp/opencore.so
exec "$@"
EOF"

adb shell "chmod 755 /data/local/tmp/opencore_wrap.sh"

# 绑定到目标 app
adb shell "setprop wrap.$APP_PKG /data/local/tmp/opencore_wrap.sh"

# 重启 app 使生效
adb shell "am force-stop $APP_PKG"
adb shell "monkey -p $APP_PKG -c android.intent.category.LAUNCHER 1"
```

### Step 4：验证

```bash
# 检查 app 进程 maps 中是否包含 libopencore.so
adb shell "cat /proc/$(pidof com.example.myapp)/maps" | grep opencore

# 触发 native crash
adb shell "kill -SEGV $(pidof com.example.myapp)"

# 检查 coredump 文件
adb shell "ls -la /data/coredump/"
```

## 关键文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `script/build_opencore.sh` | 增加 `BUILD_INJECT_DIR` 环境变量支持，生成 inject 版本 |
| README.md | 补充 inject 版本编译和注入指南 |

## 风险清单

| 风险 | 级别 | 缓解 |
|------|------|------|
| wrap.sh 路径变更 | Low | 确认 /data/local/tmp 目录在 SELinux 允许范围内 |
| 目标 App ABI 不是 arm64 | Medium | 编译时指定正确的 ABI 或编译所有 ABI 版本 |
| App 使用多进程架构 | Low | 每个进程都继承 LD_PRELOAD，全部生效 |
| SELinux 阻止 wrap.sh 执行 | Medium | 使用 `chcon` 修改 context 或在 permissive 模式下测试 |