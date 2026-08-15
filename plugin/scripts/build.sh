#!/bin/bash
# dsh-novel-workbench 构建（无 DSH checkout 依赖）：
# node scripts/build.js 从 ../../plugin-source.json 变换生成 lib/ 产物。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 1) 原生 node（Windows git-bash / 已装 node 的环境）
if node --version >/dev/null 2>&1 && node scripts/build.js; then
  exit 0
fi

# 2) WSL interop（按名 cmd.exe 触发 interop；子 bash 避免 hash 污染）
if bash -c 'cmd.exe /c "exit 0"' >/dev/null 2>&1; then
  exec bash -c 'cmd.exe /c "node scripts\\build.js"'
fi

# 3) 兜底：无 checkout 环境下产物由 Windows 侧 `node scripts/build.js` 生成，
#    此处仅校验存在性与新鲜度（src 比产物新则提示漏构建）。
if [ -f lib/index.js ] && [ -f lib/client.js ]; then
  if [ -n "$(find src -newer lib/index.js -print -quit 2>/dev/null)" ]; then
    echo "build: 警告 src 比 lib 产物新——疑似漏构建（Windows 侧跑 node scripts/build.js）" >&2
  fi
  echo "build: lib 产物已就绪（Windows 侧构建）"
  exit 0
fi

echo "build: node 不可用且无现成产物——请在 Windows 侧运行: node scripts/build.js" >&2
exit 1
