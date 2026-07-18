#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Source Freshness 检查器（被 post-tool-use-audit.sh 调用）
# 检查内容中的源码引用是否新鲜
# ═══════════════════════════════════════════════════════════════

CONTENT="$1"

if [ -z "$CONTENT" ]; then
    exit 0
fi

VIOLATIONS=""

# 1. 检查过时 tag
OUTDATED_TAGS=$(echo "$CONTENT" | grep -oE "android-[0-9]+\.[0-9]+\.[0-9]+_r[0-9]+" | sort -u)
if [ -n "$OUTDATED_TAGS" ]; then
    VIOLATIONS="${VIOLATIONS}\n⚠️ 检测到过时 AOSP tag：\n"
    for tag in $OUTDATED_TAGS; do
        VIOLATIONS="${VIOLATIONS}   - $tag\n"
    done
    VIOLATIONS="${VIOLATIONS}   规则：必须使用 master（refs/heads/main）\n"
fi

# 2. 检查 cs.android.com
CS_ANDROID_COUNT=$(echo "$CONTENT" | grep -c "cs.android.com" 2>/dev/null || echo 0)
if [ "$CS_ANDROID_COUNT" -gt 0 ] 2>/dev/null; then
    VIOLATIONS="${VIOLATIONS}\n⚠️ 检测到 cs.android.com 引用（$CS_ANDROID_COUNT 处）\n"
    VIOLATIONS="${VIOLATIONS}   规则：实测返回空内容，禁止使用\n"
    VIOLATIONS="${VIOLATIONS}   替代：android.googlesource.com/+/refs/heads/main/?format=TEXT\n"
fi

# 3. 检查 AOSP master URL 是否缺 ?format=TEXT
MASTER_NO_FMT=$(echo "$CONTENT" | grep -E "android\.googlesource\.com.*\+/(refs/heads/)?main" | grep -v "format=TEXT" | head -3)
if [ -n "$MASTER_NO_FMT" ]; then
    VIOLATIONS="${VIOLATIONS}\n⚠️ AOSP master URL 缺少 ?format=TEXT 后缀：\n$MASTER_NO_FMT\n"
fi

# 4. 检查 Android 相关但缺 master 引用
if echo "$CONTENT" | grep -qE "Android|AOSP|init\.cpp|reboot\.cpp|PowerManagerService|PhoneWindowManager|RecoverySystem|bootloader_message"; then
    if ! echo "$CONTENT" | grep -qE "master|refs/heads/main"; then
        VIOLATIONS="${VIOLATIONS}\n⚠️ 涉及 Android 内部实现，但未引用 master\n"
        VIOLATIONS="${VIOLATIONS}   规则：必须引用 master 源码\n"
    fi
fi

# 5. 检查是否提到具体函数名但未带 master 引用（可能的猜字段名）
FUNC_NAMES=$(echo "$CONTENT" | grep -oE "HandlePowerctlMessage|DoReboot|RebootSystem|installPackage|rebootWipeUserData|rebootPromptAndWipeData|shutdownOrRebootInternal|interceptKeyBeforeQueueing" | sort -u)
if [ -n "$FUNC_NAMES" ]; then
    if ! echo "$CONTENT" | grep -qE "master"; then
        VIOLATIONS="${VIOLATIONS}\n⚠️ 涉及具体 Android 函数名但未引用 master 源码：\n"
        for fn in $FUNC_NAMES; do
            VIOLATIONS="${VIOLATIONS}   - $fn\n"
        done
    fi
fi

# 6. 检查"硬性事实清单"
if echo "$CONTENT" | grep -qE "AOSP master|Linux kernel master"; then
    if ! echo "$CONTENT" | grep -qE "硬性事实清单|硬性事实"; then
        VIOLATIONS="${VIOLATIONS}\n⚠️ 涉及 AOSP / Linux kernel master 引用但缺 '硬性事实清单' 小节\n"
    fi
fi

# 输出结果
if [ -n "$VIOLATIONS" ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "🛡️  Source Freshness 检查结果"
    echo "═══════════════════════════════════════════════════════════════════"
    echo -e "$VIOLATIONS"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
fi

exit 0