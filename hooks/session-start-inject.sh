#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SessionStart hook: 自动注入 Android / AOSP / MTK / Linux kernel 协议
# 每次 Claude Code 启动时自动执行
# ═══════════════════════════════════════════════════════════════

cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║  ⛔ Android / AOSP / MTK / Linux kernel 协议已自动加载             ║
╚══════════════════════════════════════════════════════════════════╝

## 📋 本会话 Android / AOSP / MTK / Linux kernel 强制协议

### 唯一可信源码 URL
- AOSP master: https://android.googlesource.com/platform/<repo>/+/refs/heads/main/<path>?format=TEXT
  （必须带 ?format=TEXT 才能被 fetch 工具抓取）
- Linux kernel master: https://github.com/torvalds/linux/blob/master/<path>

### ❌ 禁止
- 引用 android-X.Y.Z_rN tag（如 android-10.0.0_r25）—— 默认过时
- 引用 cs.android.com 网页 —— 实测返回空内容
- 基于训练数据"猜"字段名 / 函数签名 / 常量值
- 伪造 "4 引擎 Web 搜索" 来源标注（不调用却声称调用）
- 引用超过 3 年的博客源码当作最新现状

### ✅ 必须
- 涉及 AOSP / Linux kernel 内部实现：必须用 ?format=TEXT 实测源码
- 4 引擎 Web 搜索（serper / ddg / tavily / MiniMax）：必须真实调用后才标注
- 每篇回答结尾：必有"硬性事实清单"
- 文件 404：明确告知用户"路径已变更"，不编造替代内容
- 字段 / API / 常量：实测确认后再写

### ⚠️ 诚实声明（最高优先级）
如果本轮回答不能 100% 遵守协议：
1. 在回答开头明确声明 [本回答不保证遵守 Android 协议，原因：xxx]
2. 宁可不答，不可敷衍
3. 伪造来源标注属于严重违规（比直接基于训练数据回答更恶劣）

EOF

# 检查 memory/android.md 是否存在
if [ -f /home/cwtrocks/.claude/projects/-home-cwtrocks-boot-procedure/memory/android.md ]; then
    echo "✓ memory/android.md 已加载（详细协议见该文件）"
fi

echo ""
echo "🔍 已知 404 路径（不要尝试，会浪费工具调用）"
echo "  - frameworks/base/services/core/java/com/android/server/RescueParty.java"
echo "    （master 上已迁移，需先 grep 找新路径）"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "协议已注入。可开始回答，但必须严格遵守上述约束。"
echo "═══════════════════════════════════════════════════════════════════"