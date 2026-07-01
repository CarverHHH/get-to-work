#!/bin/bash
# review-package.sh — 生成 task 的 diff 供 reviewer 审查
# 用法: review-package.sh [base-ref] [file1 file2 ...]
# 传 file 列表时只 diff 这些文件，避免跨 task 的 scope 泄漏
# （推荐从当前 task 的 Files 字段提取路径传入）。
#
# 示例:
#   bash workflow-plugin/scripts/review-package.sh HEAD                  # 全 diff（旧行为）
#   bash workflow-plugin/scripts/review-package.sh HEAD src/auth.ts src/auth.test.ts

set -euo pipefail

BASE_REF="${1:-HEAD}"
shift 2>/dev/null || true
FILES="$*"

do_diff() {
  local mode="$1"
  if [ -n "$FILES" ]; then
    # shellcheck disable=SC2086
    git diff "$mode" "$BASE_REF" -- $FILES 2>/dev/null || git diff "$mode" --cached -- $FILES 2>/dev/null || true
  else
    git diff "$mode" "$BASE_REF" 2>/dev/null || git diff "$mode" --cached 2>/dev/null || true
  fi
}

echo "=== FILES CHANGED ==="
do_diff --name-only
echo ""
echo "=== STATS ==="
do_diff --stat
echo ""
echo "=== DIFF ==="
do_diff
