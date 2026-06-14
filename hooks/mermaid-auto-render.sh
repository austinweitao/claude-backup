#!/usr/bin/env bash
# PostToolUse hook: detect mermaid ```mermaid ...``` blocks in the just-written
# file, render each to PNG via mmdc, and (default) open an HTML viewer in
# Chrome / Chromium / Firefox.
#
# Trigger: Write / Edit / MultiEdit / NotebookEdit
#
# Default: MERMAID_HTML=1  → build an HTML with all PNGs, open in a real browser
#          MERMAID_TERM=0  → don't try to render in the terminal
#
# Browser detection (first hit wins):
#   1. CHROME_PATH env var (if set and executable)
#   2. ~/.cache/puppeteer/chrome/*/chrome-linux64/chrome  (Chrome for Testing)
#   3. ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
#   4. /usr/bin/google-chrome / google-chrome-stable / chromium / chromium-browser
#   5. xdg-open  (may fallback to vim/garcon if no browser — not great)
#   6. open (macOS)
#   7. gio open (GNOME)
#   8. wslview
# If nothing works, prints the HTML path so the user can open it manually.

set -u
set -o pipefail

LOG_PREFIX="[mermaid-auto-render]"

# --- 1. Read hook input from stdin (Claude Code passes the tool call JSON) ---
INPUT="$(cat || true)"
if [ -z "${INPUT}" ] && [ ! -t 0 ]; then
  INPUT="$(cat </dev/stdin || true)"
fi

TOOL_NAME="$(printf '%s' "${INPUT}" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print(d.get("tool_name", ""))
except Exception:
    print("")
')"

case "${TOOL_NAME}" in
  Write|Edit|MultiEdit|NotebookEdit) ;;
  *) exit 0 ;;
esac

# --- 2. Pull the text content out of the tool call ---
TEXT="$(printf '%s' "${INPUT}" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    p = d.get("tool_input", {}) or {}
    name = d.get("tool_name", "")
    parts = []
    if name == "Write":
        c = p.get("content", "")
        if c: parts.append(c)
    elif name == "Edit":
        c = p.get("new_string", "")
        if c: parts.append(c)
    elif name == "MultiEdit":
        for e in p.get("edits", []) or []:
            c = e.get("new_string", "")
            if c: parts.append(c)
    elif name == "NotebookEdit":
        c = p.get("new_source", "")
        if c: parts.append(c)
    print("\n\n".join(parts))
except Exception:
    print("")
')"

if [ -z "${TEXT}" ]; then
  exit 0
fi

# --- 3. Extract every ```mermaid ... ``` fenced block ---
RENDER_DIR="/tmp/mermaid-render"
mkdir -p "${RENDER_DIR}"

EXTRACT_OUT="$(printf '%s' "${TEXT}" | python3 -c '
import os, re, sys, hashlib
text = sys.stdin.read()
pat = re.compile(r"```(?:mermaid|Mermaid|MERMAID)\s*\n(.*?)\n```", re.DOTALL)
matches = pat.findall(text)
if not matches:
    sys.exit(0)
out_dir = os.environ.get("RENDER_DIR", "/tmp/mermaid-render")
stamp = hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]
for i, m in enumerate(matches, 1):
    path = os.path.join(out_dir, f"m_{stamp}_{i}.mmd")
    with open(path, "w", encoding="utf-8") as f:
        f.write(m)
    print(path)
')" || exit 0

if [ -z "${EXTRACT_OUT}" ]; then
  exit 0
fi

# --- 4. Render each .mmd -> .png via mmdc ---
#     Scale: MERMAID_SCALE env var (default 1). 2 / 3 / 4 makes PNG larger
#     so it stays sharp on HiDPI / large browser windows.
PUPPETEER_CFG="${RENDER_DIR}/puppeteer.json"
cat > "${PUPPETEER_CFG}" <<'JSON'
{
  "args": ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
}
JSON

# Sanitize MERMAID_SCALE (allow only positive integers 1..8; default 1)
MMDC_SCALE="${MERMAID_SCALE:-2}"
case "${MMDC_SCALE}" in
  ''|*[!0-9]*) MMDC_SCALE=1 ;;
esac
if [ "${MMDC_SCALE}" -lt 1 ] || [ "${MMDC_SCALE}" -gt 8 ]; then
  MMDC_SCALE=1
fi
echo "${LOG_PREFIX} scale: ${MMDC_SCALE}x (default 2; set MERMAID_SCALE=3|4 for HiDPI / sharper zoom)"

RENDERED=()
# Track every diagram in the same order they were extracted, so we can build
# a coherent numbered list in the HTML (including failed ones).
MMD_ORDER=()
for mmd in ${EXTRACT_OUT}; do
  [ -f "${mmd}" ] || continue
  png="${mmd%.mmd}.png"
  abs_mmd="$(readlink -f "${mmd}")"
  abs_png="$(readlink -f "${png}")"
  MMD_ORDER+=("${abs_mmd}")
  echo "${LOG_PREFIX} rendering ${abs_mmd##*/} -> ${abs_png##*/}"
  if npx --yes -p @mermaid-js/mermaid-cli@latest \
      mmdc -i "${abs_mmd}" -o "${abs_png}" \
      -p "${PUPPETEER_CFG}" \
      -b transparent -q --scale "${MMDC_SCALE}" 2>"${abs_mmd}.err"; then
    RENDERED+=("${abs_png}")
    echo "${LOG_PREFIX} OK: ${abs_png##*/}"
  else
    echo "${LOG_PREFIX} FAILED: ${abs_mmd##*/} (see ${abs_mmd}.err)"
  fi
done

if [ "${#MMD_ORDER[@]}" -eq 0 ]; then
  exit 0
fi

# --- 5. Build an HTML viewer with rendered PNGs (and inline errors for failures) ---
HTML_OUT="/tmp/mermaid-auto/view.html"
HTML_DIR="$(dirname "${HTML_OUT}")"
mkdir -p "${HTML_DIR}"

SECTIONS=""
i=0
for abs_mmd in "${MMD_ORDER[@]}"; do
  i=$((i+1))
  png="${abs_mmd%.mmd}.png"
  err="${abs_mmd}.err"
  base="$(basename "${png}")"
  mmd_base="$(basename "${abs_mmd}")"

  if [ -f "${png}" ]; then
    cp "${png}" "${HTML_DIR}/${base}" 2>/dev/null || true
    SECTIONS="${SECTIONS}
    <section>
      <h2>图 ${i} — ${base}</h2>
      <div class=\"img-wrap\"><img src=\"${base}\" alt=\"${base}\"></div>
    </section>"
  else
    # Inline the error so the user sees it without tailing logs.
    err_text=""
    if [ -f "${err}" ]; then
      err_text="$(head -c 4000 "${err}" | python3 -c '
import html, sys
print(html.escape(sys.stdin.read()))
')"
    fi
    src_text=""
    if [ -f "${abs_mmd}" ]; then
      src_text="$(head -c 2000 "${abs_mmd}" | python3 -c '
import html, sys
print(html.escape(sys.stdin.read()))
')"
    fi
    SECTIONS="${SECTIONS}
    <section class=\"failed\">
      <h2>图 ${i} — ${mmd_base} (render failed)</h2>
      <details open>
        <summary>mermaid 源码</summary>
        <pre class=\"src\">${src_text}</pre>
      </details>
      <details open>
        <summary>错误日志</summary>
        <pre class=\"err\">${err_text}</pre>
      </details>
    </section>"
  fi
done

cat > "${HTML_OUT}" <<HTML
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Mermaid Diagrams</title>
  <style>
    :root { --bg:#0f1115; --card:#161a22; --border:#2a3140; --fg:#e6e6e6; --muted:#9aa3b2; --accent:#7dd3fc; }
    * { box-sizing: border-box; }
    body { margin:0; padding:24px; background:var(--bg); color:var(--fg);
           font-family: -apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
    h1 { color:var(--accent); margin:0 0 18px; font-size:22px; }
    h2 { color:var(--accent); margin:0 0 10px; font-size:14px; }
    section { background:var(--card); border:1px solid var(--border);
              border-radius:10px; padding:16px 18px; margin:0 0 18px; }
    /* img-wrap honors the original PNG's natural size; image is set to its
       native pixel width so it stays crisp. If you want to scale, use the
       browser zoom (Ctrl++) or set MERMAID_SCALE=3|4 before re-render. */
    .img-wrap { background:#ffffff; border-radius:6px; padding:8px; overflow:auto; }
    .img-wrap img { display:block; height:auto; margin:0 auto;
                    max-width:none; width:auto;
                    image-rendering: -webkit-optimize-contrast; }
    p { color:var(--muted); font-size:13px; margin:0 0 10px; }
    .hint { background:#1a2230; border-left:3px solid var(--accent);
            padding:8px 12px; margin:0 0 18px; color:var(--muted); font-size:12.5px; }
    .zoom-controls { position:fixed; top:12px; right:12px;
                     background:var(--card); border:1px solid var(--border);
                     border-radius:6px; padding:6px 10px; z-index:99; }
    .zoom-controls button { background:transparent; color:var(--fg);
                           border:1px solid var(--border); border-radius:4px;
                           padding:2px 8px; margin:0 2px; cursor:pointer; }
    .zoom-controls button:hover { background:#2a3140; }
    section.failed { border-color:#c62828; background:#1a0f10; }
    section.failed h2 { color:#ff7b7b; }
    section.failed pre {
      background:#0b0d12; color:#ffb3b3; border:1px solid #4a1d1d;
      border-radius:4px; padding:8px 10px; margin:6px 0 0;
      max-height:240px; overflow:auto; font-size:11.5px; white-space:pre-wrap;
    }
    section.failed pre.src { color:#d6d6d6; border-color:#2a3140; }
  </style>
</head>
<body>
  <div class="zoom-controls">
    <button onclick="zoom(0.8)" title="缩小">−</button>
    <button onclick="zoom(1)" title="原始">1×</button>
    <button onclick="zoom(1.5)">1.5×</button>
    <button onclick="zoom(2)">2×</button>
    <button onclick="zoom(3)">3×</button>
  </div>
  <h1>Mermaid Diagrams</h1>
  <div class="hint">提示: 浏览器 <kbd>Ctrl++</kbd> / <kbd>Ctrl+-</kbd> 缩放, 或点右上方按钮。
       重新生成更大图: 在 shell 里设 <code>MERMAID_SCALE=3</code> 再 Write 一次 mermaid。</div>
  ${SECTIONS}
  <script>
    let cur = 1;
    function zoom(f) {
      cur = f;
      document.querySelectorAll('.img-wrap img').forEach(img => {
        img.style.transform = (f === 1) ? '' : ('scale(' + f + ')');
        img.style.transformOrigin = 'top center';
      });
    }
  </script>
</body>
</html>
HTML

echo "${LOG_PREFIX} HTML: file://${HTML_OUT}"

# --- 6. Open the HTML in a real browser ---
open_in_browser() {
  local url="$1"

  # 6a) explicit CHROME_PATH
  if [ -n "${CHROME_PATH:-}" ] && [ -x "${CHROME_PATH}" ]; then
    echo "${LOG_PREFIX} open: CHROME_PATH=${CHROME_PATH}"
    nohup "${CHROME_PATH}" --new-window "${url}" >/dev/null 2>&1 &
    return 0
  fi

  # 6b) Puppeteer's Chrome for Testing (the common case on this machine)
  local p_chrome
  p_chrome="$(find "${HOME}/.cache/puppeteer/chrome" -maxdepth 4 -name 'chrome' -type f -executable 2>/dev/null | sort -V | tail -1)"
  if [ -n "${p_chrome}" ] && [ -x "${p_chrome}" ]; then
    echo "${LOG_PREFIX} open: puppeteer chrome = ${p_chrome}"
    nohup "${p_chrome}" --new-window "${url}" >/dev/null 2>&1 &
    return 0
  fi

  # 6c) Playwright's chromium
  local pw_chrome
  pw_chrome="$(find "${HOME}/.cache/ms-playwright" -maxdepth 5 -name 'chrome' -type f -executable 2>/dev/null | grep -v node_modules | head -1)"
  if [ -n "${pw_chrome}" ] && [ -x "${pw_chrome}" ]; then
    echo "${LOG_PREFIX} open: playwright chrome = ${pw_chrome}"
    nohup "${pw_chrome}" --new-window "${url}" >/dev/null 2>&1 &
    return 0
  fi

  # 6d) system browsers
  for b in google-chrome google-chrome-stable chromium chromium-browser firefox firefox-esr; do
    if command -v "${b}" >/dev/null 2>&1; then
      echo "${LOG_PREFIX} open: ${b}"
      nohup "${b}" --new-window "${url}" >/dev/null 2>&1 &
      return 0
    fi
  done

  # 6e) generic xdg-open / open (last resort — may fallback to vim)
  if command -v xdg-open >/dev/null 2>&1; then
    echo "${LOG_PREFIX} open: xdg-open (fallback — may open text viewer)"
    nohup xdg-open "${url}" >/dev/null 2>&1 &
    return 0
  elif command -v gio >/dev/null 2>&1; then
    nohup gio open "${url}" >/dev/null 2>&1 &
    return 0
  elif command -v open >/dev/null 2>&1; then
    nohup open "${url}" >/dev/null 2>&1 &
    return 0
  fi

  echo "${LOG_PREFIX} no browser available; please open: ${url}"
  return 1
}

if [ "${MERMAID_HTML:-1}" != "0" ]; then
  open_in_browser "file://${HTML_OUT}"
fi

# Always exit 0 so the hook never blocks the agent.
exit 0
